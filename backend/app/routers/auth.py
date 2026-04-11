# app/routers/auth.py
import secrets
import time
from threading import Lock

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.schemas.user_schema import (
    UserCreate, UserLogin, TokenResponse, UserResponse,
    ProfileUpdate, ChangePassword, ActivityResponse,
    ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest,
)
from app.services.auth_service import (
    create_user, authenticate_user,
    update_profile, change_password, get_activity,
)
from app.services import password_reset_service
from app.services import google_auth_service
from app.utils.security import create_access_token
from app.utils.dependencies import get_db, get_current_user
from app.utils.rate_limit import limiter, Limits
from app.utils.config import settings
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Auth"])


# ════════════════════════════════════════════
# EMAIL/PASSWORD AUTH
# ════════════════════════════════════════════

@router.post("/register", response_model=TokenResponse)
def register(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    limiter.check(request, "register", **Limits.REGISTER)
    db_user = create_user(db, user.email, user.password, user.username)
    token   = create_access_token({"sub": db_user.email})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=db_user.id, email=db_user.email,
            username=db_user.username, avatar=db_user.avatar, bio=db_user.bio,
            avatar_url=db_user.avatar_url, is_google=db_user.is_google,
        ),
    )


@router.post("/login", response_model=TokenResponse)
def login(request: Request, user: UserLogin, db: Session = Depends(get_db)):
    limiter.check(request, "login", **Limits.LOGIN)
    db_user = authenticate_user(db, user.email, user.password)
    if not db_user:
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")

    from app.utils.rate_limit import limiter as _lim
    _lim.reset("login", _lim._get_ip(request))

    token = create_access_token({"sub": db_user.email})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=db_user.id, email=db_user.email,
            username=db_user.username, avatar=db_user.avatar, bio=db_user.bio,
            avatar_url=db_user.avatar_url, is_google=db_user.is_google,
        ),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/profile", response_model=UserResponse)
def update_profile_endpoint(
    request: Request,
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    limiter.check(request, "profile_update", max_calls=10, window_sec=60)
    return update_profile(db, current_user, data)


@router.post("/change-password")
def change_password_endpoint(
    request: Request,
    data: ChangePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    limiter.check(request, "change_password", **Limits.CHANGE_PASSWORD)
    return change_password(db, current_user, data)


@router.get("/activity", response_model=ActivityResponse)
def activity(
    request: Request,
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    limiter.check(request, "activity", **Limits.READ_GENERAL)
    return get_activity(db, current_user.id, limit)


# ════════════════════════════════════════════
# PASSWORD RESET
# ════════════════════════════════════════════

@router.post("/forgot-password")
def forgot_password(request: Request, body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    limiter.check(request, "forgot_password", max_calls=3, window_sec=300)
    return password_reset_service.request_otp(db, body.email)


@router.post("/verify-otp")
def verify_otp(request: Request, body: VerifyOTPRequest, db: Session = Depends(get_db)):
    limiter.check(request, "verify_otp", max_calls=10, window_sec=60)
    return password_reset_service.verify_otp(db, body.email, body.otp)


@router.post("/reset-password")
def reset_password(request: Request, body: ResetPasswordRequest, db: Session = Depends(get_db)):
    limiter.check(request, "reset_password", max_calls=5, window_sec=300)
    return password_reset_service.reset_password(db, body.email, body.otp, body.new_password)


# ════════════════════════════════════════════
# GOOGLE OAUTH2
# ════════════════════════════════════════════

# TTL-aware in-memory state store (chống CSRF).
# Mỗi state tự hết hạn sau STATE_TTL_SECONDS giây.
# Thread-safe qua Lock — FastAPI chạy handler trong threadpool.
# Production nên migrate sang Redis để hỗ trợ multi-process.
STATE_TTL_SECONDS = 600   # 10 phút — đủ cho user hoàn thành OAuth flow
STATE_MAX_SIZE    = 1000  # hard cap để tránh OOM nếu bị tấn công


class OAuthStateStore:
    """
    Dict { state_token → expires_at } với TTL và hard cap.

    - add(state)    : thêm state mới, tự purge các state hết hạn trước
    - pop(state)    : xác thực và xóa state (one-time use)
    - _purge_expired: xóa đúng các entry hết hạn, không clear toàn bộ
    """

    def __init__(self) -> None:
        self._store: dict[str, float] = {}   # state → expires_at (epoch)
        self._lock  = Lock()

    def add(self, state: str) -> None:
        with self._lock:
            self._purge_expired()
            # Nếu vẫn còn đầy sau purge → từ chối (tránh OOM)
            if len(self._store) >= STATE_MAX_SIZE:
                raise RuntimeError("OAuth state store đầy — thử lại sau.")
            self._store[state] = time.monotonic() + STATE_TTL_SECONDS

    def pop(self, state: str) -> bool:
        """Trả về True nếu state hợp lệ và chưa hết hạn, đồng thời xóa nó."""
        with self._lock:
            expires_at = self._store.pop(state, None)
            if expires_at is None:
                return False
            return time.monotonic() < expires_at

    def _purge_expired(self) -> None:
        """Xóa đúng các state đã hết hạn — KHÔNG clear toàn bộ."""
        now = time.monotonic()
        expired = [s for s, exp in self._store.items() if exp <= now]
        for s in expired:
            del self._store[s]

    def __len__(self) -> int:
        with self._lock:
            return len(self._store)


_oauth_states = OAuthStateStore()


@router.get("/google/login")
def google_login(request: Request):
    """
    Bước 1: FE gọi endpoint này (hoặc redirect thẳng trình duyệt vào đây).
    BE tạo state ngẫu nhiên, lưu vào store có TTL, rồi redirect sang Google.
    """
    limiter.check(request, "google_login", max_calls=20, window_sec=60)

    state = secrets.token_urlsafe(32)
    try:
        _oauth_states.add(state)
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Máy chủ bận, vui lòng thử lại.")

    auth_url = google_auth_service.build_google_auth_url(state)
    return RedirectResponse(url=auth_url)


@router.get("/google/callback")
def google_callback(
    request: Request,
    code:  str = Query(...),
    state: str = Query(...),
    error: str = Query(None),
    db: Session = Depends(get_db),
):
    """
    Bước 2: Google redirect về đây với code + state.
    BE xác thực state (one-time use + TTL), đổi code lấy userinfo,
    upsert User, phát JWT, rồi redirect sang FE kèm token.
    """
    frontend = settings.FRONTEND_ORIGIN

    # User huỷ consent
    if error:
        return RedirectResponse(url=f"{frontend}/login?oauth_error=cancelled")

    # Kiểm tra CSRF state — pop() vừa xác thực vừa xóa (one-time use)
    if not _oauth_states.pop(state):
        return RedirectResponse(url=f"{frontend}/login?oauth_error=invalid_state")

    # Đổi code → userinfo
    try:
        userinfo = google_auth_service.exchange_code_for_userinfo(code)
        user     = google_auth_service.get_or_create_google_user(db, userinfo)
        token    = google_auth_service.create_jwt_for_user(user)
    except HTTPException as e:
        return RedirectResponse(url=f"{frontend}/login?oauth_error={e.detail}")
    except Exception as e:
        import logging
        logging.getLogger("films").error(f"Google callback error: {e}")
        return RedirectResponse(url=f"{frontend}/login?oauth_error=server_error")

    # Redirect sang FE kèm token + thông tin user cơ bản
    import urllib.parse
    user_param = urllib.parse.quote(user.username or user.email.split("@")[0])
    redirect_url = (
        f"{frontend}/oauth/callback"
        f"?token={token}"
        f"&user_email={urllib.parse.quote(user.email)}"
        f"&user_name={user_param}"
        f"&user_avatar={urllib.parse.quote(user.avatar or '')}"
        f"&user_avatar_url={urllib.parse.quote(user.avatar_url or '')}"
        f"&user_id={user.id}"
        f"&is_google=true"
    )
    return RedirectResponse(url=redirect_url)
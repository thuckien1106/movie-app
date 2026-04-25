# app/routers/auth.py
import secrets
import time
from threading import Lock

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.schemas.user_schema import (
    UserCreate, UserLogin, TokenResponse, UserResponse,
    ProfileUpdate, ChangePassword, ActivityResponse,
    ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest,
    RefreshRequest, RefreshResponse,
    VerifyEmailRequest,
    DeleteAccountRequest, 
)
from app.services.auth_service import (
    create_user, authenticate_user,
    update_profile, change_password, get_activity,
)
from app.services import password_reset_service
from app.services import google_auth_service
from app.services import token_service
from app.utils.dependencies import get_db, get_current_user
from app.utils.rate_limit import limiter, Limits
from app.utils.config import settings
from app.models.user import User
from sqlalchemy import func
router  = APIRouter(prefix="/auth", tags=["Auth"])
_bearer = HTTPBearer(auto_error=False)


# ════════════════════════════════════════════
# EMAIL/PASSWORD AUTH
# ════════════════════════════════════════════

@router.post("/register", response_model=TokenResponse)
def register(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    limiter.check(request, "register", **Limits.REGISTER)
    db_user = create_user(db, user.email, user.password, user.username)

    tokens = token_service.issue_token_pair(db, db_user.id, db_user.email)
    return TokenResponse(
        **tokens,
        user=UserResponse(
            id=db_user.id, email=db_user.email,
            username=db_user.username, avatar=db_user.avatar, bio=db_user.bio,
            avatar_url=db_user.avatar_url, is_google=db_user.is_google,
            role=db_user.role,            # ← THÊM
            is_banned=db_user.is_banned,  # ← THÊM
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

    tokens = token_service.issue_token_pair(db, db_user.id, db_user.email)
    return TokenResponse(
        **tokens,
        user=UserResponse(
            id=db_user.id, email=db_user.email,
            username=db_user.username, avatar=db_user.avatar, bio=db_user.bio,
            avatar_url=db_user.avatar_url, is_google=db_user.is_google,
            role=db_user.role,            # ← THÊM
            is_banned=db_user.is_banned,  # ← THÊM
        ),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
# ════════════════════════════════════════════
# PUBLIC PROFILE  ← THÊM MỚI
# ════════════════════════════════════════════
 
@router.get("/users/{username}")
def get_public_profile(
    request:  Request,
    username: str,
    db:       Session = Depends(get_db),
):

    limiter.check(request, "public_profile", max_calls=60, window_sec=60)
 
    from app.models.watchlist import Watchlist
    from sqlalchemy import func
 
    user = db.query(User).filter(
        User.username == username,
        User.is_banned == False,
    ).first()
 
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
 
    # Thống kê watchlist
    total   = db.query(func.count(Watchlist.id)).filter(Watchlist.user_id == user.id).scalar()
    watched = db.query(func.count(Watchlist.id)).filter(
        Watchlist.user_id  == user.id,
        Watchlist.is_watched == True,
    ).scalar()
 
    # Top genres từ genre_ids
    from collections import Counter
    genre_rows = db.query(Watchlist.genre_ids).filter(
        Watchlist.user_id  == user.id,
        Watchlist.genre_ids != None,
    ).all()
 
    genre_counter = Counter()
    for (g_str,) in genre_rows:
        if g_str:
            for gid in g_str.split(","):
                try:
                    genre_counter[int(gid.strip())] += 1
                except ValueError:
                    pass
 
    GENRE_NAMES = {
        28:"Hành động",12:"Phiêu lưu",16:"Hoạt hình",35:"Hài",80:"Tội phạm",
        99:"Tài liệu",18:"Chính kịch",10751:"Gia đình",14:"Kỳ ảo",36:"Lịch sử",
        27:"Kinh dị",10402:"Âm nhạc",9648:"Bí ẩn",10749:"Lãng mạn",
        878:"Sci-Fi",53:"Giật gân",10752:"Chiến tranh",37:"Cao bồi",
    }
    top_genres = [
        {"genre_id": gid, "genre_name": GENRE_NAMES.get(gid, str(gid)), "count": cnt}
        for gid, cnt in genre_counter.most_common(5)
    ]
 
    # Watchlist gần nhất (public — chỉ lấy title + poster)
    recent = db.query(Watchlist).filter(
        Watchlist.user_id == user.id,
    ).order_by(Watchlist.added_at.desc()).limit(6).all()
 
    recent_movies = [
        {"movie_id": m.movie_id, "title": m.title, "poster": m.poster, "is_watched": m.is_watched}
        for m in recent
    ]
 
    return {
        "id":           user.id,
        "username":     user.username,
        "avatar":       user.avatar,
        "avatar_url":   user.avatar_url,
        "bio":          user.bio,
        "is_google":    user.is_google,
        "stats": {
            "total":      total,
            "watched":    watched,
            "top_genres": top_genres,
        },
        "recent_movies": recent_movies,
    }

@router.get("/users")
def search_users(
    request: Request,
    q:       str     = Query(..., min_length=1, max_length=50),
    limit:   int     = Query(6, ge=1, le=20),
    db:      Session = Depends(get_db),
):

    limiter.check(request, "search_users", max_calls=30, window_sec=60)
 
    term = f"%{q.lower()}%"
    users = (
        db.query(User)
        .filter(
            User.username   != None,
            User.is_banned  == False,
            func.lower(User.username).like(term),
        )
        .order_by(User.username)
        .limit(limit)
        .all()
    )
 
    return [
        {
            "id":         u.id,
            "username":   u.username,
            "avatar":     u.avatar,
            "avatar_url": u.avatar_url,
            "bio":        u.bio,
        }
        for u in users
    ]
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
# EMAIL VERIFICATION  ← THÊM MỚI
# ════════════════════════════════════════════

@router.post("/verify-email")
def verify_email(
    request: Request,
    body:    VerifyEmailRequest,
    db:      Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Xác thực email bằng OTP 6 chữ số.
    User phải đã đăng nhập (có access token) để gọi endpoint này.
    Sau khi verify thành công, is_verified = True.
    """
    limiter.check(request, "verify_email", max_calls=10, window_sec=60)

    from app.services.email_verify_service import verify_email as _verify
    _verify(db, current_user, body.otp)
    return {"message": "Xác thực email thành công!"}


@router.post("/resend-verify")
def resend_verify(
    request: Request,
    db:      Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Gửi lại OTP xác thực email.
    Có rate limit — tối đa 3 lần / 5 phút.
    """
    limiter.check(request, "resend_verify", max_calls=3, window_sec=300)

    if current_user.is_verified:
        return {"message": "Email của bạn đã được xác thực."}

    from app.services.email_verify_service import send_verification
    send_verification(db, current_user)
    return {"message": "Đã gửi lại mã xác thực. Vui lòng kiểm tra email."}

# ════════════════════════════════════════════
# XOÁ TÀI KHOẢN
# ════════════════════════════════════════════

@router.delete("/account")
def delete_account(
    request: Request,
    body: DeleteAccountRequest,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Xoá tài khoản vĩnh viễn.

    - User thường: phải nhập mật khẩu để xác nhận.
    - Google user: không cần mật khẩu, chỉ cần confirm=True.
    - Sau khi xoá: blacklist access token + revoke refresh token.

    Body: { "password": "...", "confirm": true }
    """
    limiter.check(request, "delete_account", max_calls=3, window_sec=300)

    from app.services.auth_service import authenticate_user
    from app.services import token_service as _ts

    # Bắt buộc xác nhận
    if not body.confirm:
        raise HTTPException(status_code=400, detail="Vui lòng xác nhận xoá tài khoản.")

    # User thường phải nhập đúng mật khẩu
    if not current_user.is_google:
        if not body.password:
            raise HTTPException(status_code=400, detail="Vui lòng nhập mật khẩu để xác nhận.")

        verified = authenticate_user(db, current_user.email, body.password)
        if not verified:
            raise HTTPException(status_code=400, detail="Mật khẩu không đúng.")

    # Blacklist access token
    if credentials:
        _ts.blacklist_access_token(db, credentials.credentials)

    # Revoke toàn bộ refresh tokens
    _ts.revoke_all_refresh_tokens(db, current_user.id)

    # Xoá user (cascade)
    db.delete(current_user)
    db.commit()

    return {"message": "Tài khoản đã được xoá vĩnh viễn."}
# ════════════════════════════════════════════
# REFRESH TOKEN
# ════════════════════════════════════════════

@router.post("/refresh", response_model=RefreshResponse)
def refresh_token(
    request: Request,
    body: RefreshRequest,
    db: Session = Depends(get_db),
):
    """
    Đổi refresh token cũ lấy cặp token mới (access + refresh).

    - Refresh token cũ bị revoke ngay sau khi dùng (token rotation).
    - Nếu refresh token đã bị revoke trước đó → phát hiện token reuse attack
      → revoke toàn bộ session của user → buộc đăng nhập lại.

    FE nên gọi endpoint này khi nhận được 401 từ bất kỳ API nào.
    """
    limiter.check(request, "refresh", max_calls=20, window_sec=60)
    return token_service.rotate_refresh_token(db, body.refresh_token)


# ════════════════════════════════════════════
# LOGOUT
# ════════════════════════════════════════════

@router.post("/logout")
def logout(
    request: Request,
    body: RefreshRequest,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
):
    """
    Đăng xuất phía server:
      1. Blacklist access token hiện tại (vô hiệu hoá ngay lập tức).
      2. Revoke toàn bộ refresh token của user (đăng xuất tất cả thiết bị).

    FE gửi:
      Header: Authorization: Bearer <access_token>
      Body:   { "refresh_token": "<refresh_token>" }

    Dù gửi token không hợp lệ, endpoint vẫn trả 200 (best-effort logout).
    """
    limiter.check(request, "logout", max_calls=10, window_sec=60)

    # Blacklist access token
    if credentials:
        token_service.blacklist_access_token(db, credentials.credentials)

    # Revoke refresh token (lấy user_id từ refresh token để revoke đúng user)
    try:
        from jose import jwt as _jwt
        payload = _jwt.decode(
            body.refresh_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        email = payload.get("sub")
        if email:
            from app.models.user import User as _User
            user = db.query(_User).filter(_User.email == email).first()
            if user:
                token_service.revoke_all_refresh_tokens(db, user.id)
    except Exception:
        pass  # Best-effort — không fail logout dù refresh token lỗi

    return {"message": "Đăng xuất thành công."}


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

STATE_TTL_SECONDS = 600
STATE_MAX_SIZE    = 1000


class OAuthStateStore:
    def __init__(self) -> None:
        self._store: dict[str, float] = {}
        self._lock  = Lock()

    def add(self, state: str) -> None:
        with self._lock:
            self._purge_expired()
            if len(self._store) >= STATE_MAX_SIZE:
                raise RuntimeError("OAuth state store đầy — thử lại sau.")
            self._store[state] = time.monotonic() + STATE_TTL_SECONDS

    def pop(self, state: str) -> bool:
        with self._lock:
            expires_at = self._store.pop(state, None)
            if expires_at is None:
                return False
            return time.monotonic() < expires_at

    def _purge_expired(self) -> None:
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
    frontend = settings.FRONTEND_ORIGIN

    if error:
        return RedirectResponse(url=f"{frontend}/login?oauth_error=cancelled")

    if not _oauth_states.pop(state):
        return RedirectResponse(url=f"{frontend}/login?oauth_error=invalid_state")

    try:
        userinfo = google_auth_service.exchange_code_for_userinfo(code)
        user     = google_auth_service.get_or_create_google_user(db, userinfo)

        # Tạo cặp token mới thay vì chỉ access token
        tokens = token_service.issue_token_pair(db, user.id, user.email)

    except HTTPException as e:
        return RedirectResponse(url=f"{frontend}/login?oauth_error={e.detail}")
    except Exception as e:
        import logging
        logging.getLogger("films").error(f"Google callback error: {e}")
        return RedirectResponse(url=f"{frontend}/login?oauth_error=server_error")

    import urllib.parse
    user_param  = urllib.parse.quote(user.username or user.email.split("@")[0])
    redirect_url = (
        f"{frontend}/oauth/callback"
        f"?token={tokens['access_token']}"
        f"&refresh_token={tokens['refresh_token']}"
        f"&user_email={urllib.parse.quote(user.email)}"
        f"&user_name={user_param}"
        f"&user_avatar={urllib.parse.quote(user.avatar or '')}"
        f"&user_avatar_url={urllib.parse.quote(user.avatar_url or '')}"
        f"&user_id={user.id}"
        f"&is_google=true"
    )
    return RedirectResponse(url=redirect_url)
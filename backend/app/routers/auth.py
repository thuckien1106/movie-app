from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.schemas.user_schema import (
    UserCreate, UserLogin, TokenResponse, UserResponse,
    ProfileUpdate, ChangePassword, ActivityResponse,
)
from app.services.auth_service import (
    create_user, authenticate_user,
    update_profile, change_password, get_activity,
)
from app.utils.security import create_access_token
from app.utils.dependencies import get_db, get_current_user
from app.utils.rate_limit import limiter, Limits
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse)
def register(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    # 3 lần đăng ký / 5 phút / IP
    limiter.check(request, "register", **Limits.REGISTER)

    db_user = create_user(db, user.email, user.password, user.username)
    token   = create_access_token({"sub": db_user.email})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=db_user.id, email=db_user.email,
            username=db_user.username, avatar=db_user.avatar, bio=db_user.bio,
        ),
    )


@router.post("/login", response_model=TokenResponse)
def login(request: Request, user: UserLogin, db: Session = Depends(get_db)):
    # 5 lần đăng nhập / phút / IP — chống brute-force
    limiter.check(request, "login", **Limits.LOGIN)

    db_user = authenticate_user(db, user.email, user.password)
    if not db_user:
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")

    # Reset counter sau khi đăng nhập thành công
    from app.utils.rate_limit import limiter as _lim
    _lim.reset("login", _lim._get_ip(request))

    token = create_access_token({"sub": db_user.email})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=db_user.id, email=db_user.email,
            username=db_user.username, avatar=db_user.avatar, bio=db_user.bio,
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
    # Strict: 5 lần / 5 phút / IP
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
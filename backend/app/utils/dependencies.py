# app/utils/dependencies.py
from typing import Optional

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.database.connection import SessionLocal
from app.models.user import User
from app.utils.config import settings

security          = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _decode_and_validate_access_token(token: str, db: Session) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc đã hết hạn.")

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Sai loại token.")

    jti = payload.get("jti")
    if jti:
        from app.models.token import TokenBlacklist
        if db.query(TokenBlacklist).filter(TokenBlacklist.jti == jti).first():
            raise HTTPException(status_code=401, detail="Token đã bị thu hồi.")

    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Token không hợp lệ.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Người dùng không tồn tại.")

    # ← THÊM: kiểm tra tài khoản bị ban
    if user.is_banned:
        reason = f" Lý do: {user.ban_reason}" if user.ban_reason else ""
        raise HTTPException(
            status_code=403,
            detail=f"Tài khoản của bạn đã bị khoá.{reason}",
        )

    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    return _decode_and_validate_access_token(credentials.credentials, db)


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not credentials:
        return None
    try:
        return _decode_and_validate_access_token(credentials.credentials, db)
    except HTTPException:
        return None
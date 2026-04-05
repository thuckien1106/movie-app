# app/utils/dependencies.py  (phiên bản cập nhật — thêm get_optional_user)

from typing import Optional

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.database.connection import SessionLocal
from app.models.user import User
from app.utils.config import settings

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)   # ← THÊM MỚI


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


# ── THÊM MỚI ─────────────────────────────────────────────
def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Trả về User nếu có Bearer token hợp lệ, None nếu không có / hết hạn.
    Dùng cho endpoint public nhưng muốn personalise khi đã đăng nhập.
    """
    if not credentials:
        return None
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        if not email:
            return None
        return db.query(User).filter(User.email == email).first()
    except (JWTError, Exception):
        return None

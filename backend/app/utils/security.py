# app/utils/security.py
import hashlib
import uuid
from datetime import datetime, timedelta

from jose import jwt
from passlib.context import CryptContext

from app.utils.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── Access Token ──────────────────────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    """
    Tạo access token ngắn hạn (mặc định 15 phút).
    Thêm `jti` (JWT ID) để có thể blacklist khi logout.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "jti": str(uuid.uuid4()),   # unique id để blacklist
        "type": "access",
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# ── Refresh Token ─────────────────────────────────────────────────────────────

def create_refresh_token(data: dict) -> tuple[str, datetime]:
    """
    Tạo refresh token dài hạn (mặc định 30 ngày).
    Trả về (raw_token, expires_at) để lưu vào DB.
    Raw token KHÔNG lưu vào DB — chỉ lưu hash của nó.
    """
    to_encode = data.copy()
    expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({
        "exp": expires_at,
        "jti": str(uuid.uuid4()),
        "type": "refresh",
    })
    raw_token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return raw_token, expires_at


def hash_token(raw_token: str) -> str:
    """SHA-256 hash của raw token để lưu vào DB (tránh lộ token nếu DB bị leak)."""
    return hashlib.sha256(raw_token.encode()).hexdigest()
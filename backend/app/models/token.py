# app/models/token.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Index
from sqlalchemy.sql import func
from app.database.base import Base


class RefreshToken(Base):
    """
    Lưu refresh token hợp lệ của từng user.
    Mỗi lần login tạo 1 bản ghi mới.
    Logout hoặc rotate sẽ đánh dấu is_revoked = True.
    """
    __tablename__ = "refresh_tokens"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(64), unique=True, nullable=False)   # SHA-256 hex của raw token
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_rt_user_revoked", "user_id", "is_revoked"),
    )


class TokenBlacklist(Base):
    """
    Blacklist access token khi user logout.
    Chỉ cần lưu đến khi access token hết hạn tự nhiên.
    Job dọn dẹp sẽ xoá các bản ghi đã quá expires_at.
    """
    __tablename__ = "token_blacklist"

    id         = Column(Integer, primary_key=True, index=True)
    jti        = Column(String(36), unique=True, nullable=False, index=True)  # JWT ID (uuid4)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
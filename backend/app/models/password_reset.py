# app/models/password_reset.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from app.database.base import Base


class PasswordReset(Base):
    __tablename__ = "password_resets"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    otp        = Column(String(6), nullable=False)          # 6-digit OTP
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used       = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

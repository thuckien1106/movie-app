# app/services/email_verify_service.py
"""
Xác thực email sau khi đăng ký.

Luồng:
  1. register()     → tạo user (is_verified=False) + gửi OTP verify
  2. POST /auth/verify-email  → nhập OTP → is_verified=True → trả token
  3. POST /auth/resend-verify → gửi lại OTP (nếu hết hạn / chưa nhận)

Tái sử dụng bảng password_resets với scope riêng để không conflict với
flow reset password. Phân biệt bằng cột otp prefix "V-" (handled trong code).

Thực ra đơn giản hơn: dùng bảng EmailVerification riêng cho rõ ràng.
"""
import random
import string
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.database.base import Base
from app.models.user import User
from app.services.email_service import send_verify_email

logger = logging.getLogger("films.verify")

OTP_EXPIRE_MINUTES = 15
MAX_ACTIVE_OTPS    = 3


# ── Model ─────────────────────────────────────────────────────────────────────

class EmailVerification(Base):
    """OTP xác thực email — tách riêng khỏi password_resets cho rõ ràng."""
    __tablename__ = "email_verifications"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    otp        = Column(String(6), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used       = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

def _get_valid_record(db: Session, user_id: int, otp: str):
    now = _utcnow()
    return (
        db.query(EmailVerification)
        .filter(
            EmailVerification.user_id    == user_id,
            EmailVerification.otp        == otp,
            EmailVerification.used       == False,
            EmailVerification.expires_at >  now,
        )
        .first()
    )


# ── Public API ────────────────────────────────────────────────────────────────

def send_verification(db: Session, user: User) -> None:
    """
    Tạo OTP và gửi email xác thực.
    Gọi ngay sau khi tạo user mới (trong auth_service.create_user).
    """
    now = _utcnow()

    # Chống spam: không quá MAX_ACTIVE_OTPS OTP còn hiệu lực
    active_count = (
        db.query(EmailVerification)
        .filter(
            EmailVerification.user_id    == user.id,
            EmailVerification.used       == False,
            EmailVerification.expires_at >  now,
        )
        .count()
    )
    if active_count >= MAX_ACTIVE_OTPS:
        raise HTTPException(
            status_code=429,
            detail="Bạn đã yêu cầu gửi lại quá nhiều lần. Vui lòng chờ.",
        )

    # Vô hiệu hoá OTP cũ
    db.query(EmailVerification).filter(
        EmailVerification.user_id == user.id,
        EmailVerification.used    == False,
    ).delete(synchronize_session=False)

    otp        = _generate_otp()
    expires_at = now + timedelta(minutes=OTP_EXPIRE_MINUTES)

    db.add(EmailVerification(
        user_id    = user.id,
        otp        = otp,
        expires_at = expires_at,
    ))
    db.commit()

    send_verify_email(
        to_email  = user.email,
        otp       = otp,
        username  = user.username or "",
    )
    logger.info(f"Verification email sent to user_id={user.id}")


def verify_email(db: Session, user: User, otp: str) -> None:
    """
    Xác thực OTP. Nếu đúng → đặt is_verified=True.
    Raise HTTPException nếu OTP sai / hết hạn.
    """
    if user.is_verified:
        return   # đã verify rồi, không cần làm gì

    record = _get_valid_record(db, user.id, otp)
    if not record:
        raise HTTPException(
            status_code=400,
            detail="Mã xác thực không đúng hoặc đã hết hạn.",
        )

    record.used      = True
    user.is_verified = True
    db.commit()
    logger.info(f"Email verified for user_id={user.id}")
# app/services/password_reset_service.py
import random
import string
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.user import User
from app.models.password_reset import PasswordReset
from app.utils.security import hash_password
from app.services.email_service import send_otp_email

logger = logging.getLogger("films.reset")

OTP_EXPIRE_MINUTES = 15
MAX_ACTIVE_OTPS    = 3   # chặn spam tạo OTP liên tục


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ─────────────────────────────────────────────────────────
# STEP 1 — Gửi OTP
# ─────────────────────────────────────────────────────────

def request_otp(db: Session, email: str) -> dict:
    """
    Tạo OTP 6 chữ số, lưu vào DB, gửi email.
    Luôn trả về HTTP 200 dù email không tồn tại (chống user enumeration).
    """
    user: User | None = db.query(User).filter(User.email == email).first()

    # Nếu email không tồn tại → vẫn trả 200, không tiết lộ
    if not user:
        logger.info(f"reset_otp requested for non-existent email: {email}")
        return {"message": "Nếu email tồn tại, mã OTP đã được gửi."}

    # Chặn spam: không được có > MAX_ACTIVE_OTPS OTP còn hiệu lực
    now = _utcnow()
    active_count = (
        db.query(PasswordReset)
        .filter(
            PasswordReset.user_id == user.id,
            PasswordReset.used == False,
            PasswordReset.expires_at > now,
        )
        .count()
    )
    if active_count >= MAX_ACTIVE_OTPS:
        raise HTTPException(
            status_code=429,
            detail="Bạn đã yêu cầu quá nhiều lần. Vui lòng chờ trước khi thử lại.",
        )

    # Vô hiệu hoá các OTP cũ của user (chưa dùng, chưa hết hạn) → 1 OTP tại 1 thời điểm
    db.query(PasswordReset).filter(
        PasswordReset.user_id == user.id,
        PasswordReset.used == False,
    ).delete(synchronize_session=False)

    otp = _generate_otp()
    expires_at = now + timedelta(minutes=OTP_EXPIRE_MINUTES)

    record = PasswordReset(
        user_id    = user.id,
        otp        = otp,
        expires_at = expires_at,
        used       = False,
    )
    db.add(record)
    db.commit()

    send_otp_email(
        to_email  = user.email,
        otp       = otp,
        username  = user.username or "",
    )

    return {"message": "Nếu email tồn tại, mã OTP đã được gửi."}


# ─────────────────────────────────────────────────────────
# STEP 2 — Xác thực OTP (optional pre-check)
# ─────────────────────────────────────────────────────────

def verify_otp(db: Session, email: str, otp: str) -> dict:
    """Kiểm tra OTP hợp lệ mà không đặt lại mật khẩu (dùng cho bước 2 UI)."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Mã OTP không hợp lệ hoặc đã hết hạn.")

    record = _get_valid_record(db, user.id, otp)
    if not record:
        raise HTTPException(status_code=400, detail="Mã OTP không hợp lệ hoặc đã hết hạn.")

    return {"valid": True}


# ─────────────────────────────────────────────────────────
# STEP 3 — Đặt lại mật khẩu
# ─────────────────────────────────────────────────────────

def reset_password(db: Session, email: str, otp: str, new_password: str) -> dict:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Mã OTP không hợp lệ hoặc đã hết hạn.")

    record = _get_valid_record(db, user.id, otp)
    if not record:
        raise HTTPException(status_code=400, detail="Mã OTP không hợp lệ hoặc đã hết hạn.")

    # Đánh dấu đã dùng
    record.used = True

    # Cập nhật mật khẩu
    user.password = hash_password(new_password)

    db.commit()
    logger.info(f"Password reset successful for user {user.id}")
    return {"message": "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại."}


# ─────────────────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────────────────

def _get_valid_record(db: Session, user_id: int, otp: str) -> PasswordReset | None:
    now = _utcnow()
    return (
        db.query(PasswordReset)
        .filter(
            PasswordReset.user_id    == user_id,
            PasswordReset.otp        == otp,
            PasswordReset.used       == False,
            PasswordReset.expires_at >  now,
        )
        .first()
    )
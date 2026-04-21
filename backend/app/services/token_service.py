# app/services/token_service.py
"""
Tất cả logic liên quan đến refresh token và blacklist access token.

Luồng chính:
  Login  → tạo access + refresh → lưu RefreshToken vào DB
  Gọi API → access token hết hạn → FE tự động gọi /auth/refresh
  Refresh → validate refresh token → tạo cặp token mới → xoá token cũ (rotate)
  Logout  → blacklist access token + revoke refresh token
"""

import logging
from datetime import datetime, timezone

from fastapi import HTTPException
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.models.token import RefreshToken, TokenBlacklist
from app.utils.config import settings
from app.utils.security import create_access_token, create_refresh_token, hash_token

logger = logging.getLogger("films")


# ── Tạo cặp token mới ─────────────────────────────────────────────────────────

def issue_token_pair(db: Session, user_id: int, email: str) -> dict:
    """
    Tạo access token + refresh token mới và lưu refresh token vào DB.
    Trả về dict để dễ dùng trong router.
    """
    access_token  = create_access_token({"sub": email})
    raw_refresh, expires_at = create_refresh_token({"sub": email})

    # Lưu hash của refresh token vào DB (không lưu raw)
    db_rt = RefreshToken(
        user_id    = user_id,
        token_hash = hash_token(raw_refresh),
        expires_at = expires_at,
        is_revoked = False,
    )
    db.add(db_rt)
    db.commit()

    return {
        "access_token":  access_token,
        "refresh_token": raw_refresh,
        "token_type":    "bearer",
    }


# ── Rotate refresh token (dùng trong /auth/refresh) ──────────────────────────

def rotate_refresh_token(db: Session, raw_refresh: str) -> dict:
    """
    Xác thực refresh token, xoá token cũ, tạo cặp mới.
    Nếu token đã bị revoke → có thể đang bị tấn công → revoke toàn bộ token của user.
    """
    # 1. Decode để lấy email (jose tự kiểm hạn hạn + chữ ký)
    try:
        payload = jwt.decode(
            raw_refresh, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Refresh token không hợp lệ hoặc đã hết hạn.")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Sai loại token.")

    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Refresh token không hợp lệ.")

    # 2. Tìm trong DB bằng hash
    token_hash = hash_token(raw_refresh)
    db_rt = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash
    ).first()

    if not db_rt:
        raise HTTPException(status_code=401, detail="Refresh token không tồn tại.")

    if db_rt.is_revoked:
        # Token reuse attack: revoke toàn bộ refresh token của user này
        logger.warning(f"[token] Refresh token reuse detected for user_id={db_rt.user_id}")
        db.query(RefreshToken).filter(
            RefreshToken.user_id == db_rt.user_id
        ).update({"is_revoked": True})
        db.commit()
        raise HTTPException(
            status_code=401,
            detail="Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
        )

    # 3. Revoke token cũ (rotate — mỗi refresh token chỉ dùng 1 lần)
    db_rt.is_revoked = True
    db.commit()

    # 4. Tạo cặp token mới
    return issue_token_pair(db, db_rt.user_id, email)


# ── Blacklist access token (dùng trong /auth/logout) ─────────────────────────

def blacklist_access_token(db: Session, raw_access: str) -> None:
    """
    Thêm access token vào blacklist để vô hiệu hoá ngay lập tức.
    Chỉ cần lưu đến khi token hết hạn tự nhiên.
    """
    try:
        payload = jwt.decode(
            raw_access, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
    except JWTError:
        # Token đã hết hạn hoặc không hợp lệ → không cần blacklist
        return

    jti        = payload.get("jti")
    expires_at = payload.get("exp")

    if not jti or not expires_at:
        return

    # Tránh duplicate nếu gọi logout 2 lần
    exists = db.query(TokenBlacklist).filter(TokenBlacklist.jti == jti).first()
    if not exists:
        bl = TokenBlacklist(
            jti        = jti,
            expires_at = datetime.utcfromtimestamp(expires_at),
        )
        db.add(bl)
        db.commit()


# ── Revoke toàn bộ refresh token của user (dùng trong logout) ─────────────────

def revoke_all_refresh_tokens(db: Session, user_id: int) -> int:
    """Đánh dấu tất cả refresh token của user là revoked. Trả về số bản ghi bị revoke."""
    updated = db.query(RefreshToken).filter(
        RefreshToken.user_id   == user_id,
        RefreshToken.is_revoked == False,
    ).update({"is_revoked": True})
    db.commit()
    return updated


# ── Dọn dẹp token hết hạn (gọi từ scheduler) ────────────────────────────────

def cleanup_expired_tokens(db: Session) -> dict:
    """
    Xoá các bản ghi token đã hết hạn để giữ DB gọn.
    Nên chạy 1 lần / ngày qua scheduler.
    """
    now = datetime.utcnow()

    deleted_bl = db.query(TokenBlacklist).filter(
        TokenBlacklist.expires_at < now
    ).delete()

    deleted_rt = db.query(RefreshToken).filter(
        RefreshToken.expires_at < now
    ).delete()

    db.commit()
    logger.info(f"[token cleanup] blacklist={deleted_bl}, refresh={deleted_rt}")
    return {"blacklist": deleted_bl, "refresh_tokens": deleted_rt}
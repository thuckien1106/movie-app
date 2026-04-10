# app/services/google_auth_service.py
"""
Google OAuth2 — Authorization Code Flow

Luồng:
  1. FE → GET /auth/google/login  → redirect sang Google consent screen
  2. Google → GET /auth/google/callback?code=...&state=...
  3. BE đổi code lấy access_token từ Google
  4. BE lấy thông tin user từ Google
  5. BE upsert User trong DB
  6. BE phát JWT của riêng app
  7. BE redirect về FE kèm token trong query string
     (FE đọc ?token=... rồi lưu localStorage)
"""

import secrets
import logging
import httpx

from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.user import User
from app.utils.security import create_access_token
from app.utils.config import settings

logger = logging.getLogger("films.google_auth")

# ── Google endpoints ──────────────────────────────────────
GOOGLE_AUTH_URL    = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL   = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL= "https://www.googleapis.com/oauth2/v3/userinfo"

# Scope cần thiết: email + profile
SCOPES = "openid email profile"


# ─────────────────────────────────────────────────────────
# STEP 1 — Tạo URL redirect sang Google
# ─────────────────────────────────────────────────────────

def build_google_auth_url(state: str) -> str:
    """
    Tạo URL Google consent screen.
    state là random token để chống CSRF.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth chưa được cấu hình. Liên hệ admin.",
        )

    params = {
        "client_id":     settings.GOOGLE_CLIENT_ID,
        "redirect_uri":  settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope":         SCOPES,
        "state":         state,
        "access_type":   "offline",
        "prompt":        "select_account",   # Luôn hiện màn hình chọn tài khoản
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{GOOGLE_AUTH_URL}?{query}"


# ─────────────────────────────────────────────────────────
# STEP 2 — Đổi authorization code lấy token + userinfo
# ─────────────────────────────────────────────────────────

def exchange_code_for_userinfo(code: str) -> dict:
    """
    Gọi Google token endpoint → lấy access_token
    Gọi Google userinfo endpoint → lấy email, name, picture
    Trả về dict: { email, name, picture, sub (google_id) }
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Google OAuth chưa được cấu hình.")

    # Đổi code → tokens
    try:
        with httpx.Client(timeout=10) as client:
            token_resp = client.post(GOOGLE_TOKEN_URL, data={
                "code":          code,
                "client_id":     settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri":  settings.GOOGLE_REDIRECT_URI,
                "grant_type":    "authorization_code",
            })
            token_resp.raise_for_status()
            tokens = token_resp.json()

            access_token = tokens.get("access_token")
            if not access_token:
                logger.error(f"No access_token in Google response: {tokens}")
                raise HTTPException(status_code=400, detail="Xác thực Google thất bại.")

            # Lấy userinfo
            userinfo_resp = client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            userinfo_resp.raise_for_status()
            return userinfo_resp.json()

    except httpx.HTTPStatusError as e:
        logger.error(f"Google OAuth HTTP error: {e.response.status_code} — {e.response.text}")
        raise HTTPException(status_code=400, detail="Xác thực Google thất bại. Thử lại.")
    except httpx.RequestError as e:
        logger.error(f"Google OAuth request error: {e}")
        raise HTTPException(status_code=503, detail="Không thể kết nối đến Google. Thử lại.")


# ─────────────────────────────────────────────────────────
# STEP 3 — Upsert user + phát JWT
# ─────────────────────────────────────────────────────────

def get_or_create_google_user(db: Session, userinfo: dict) -> User:
    """
    Logic:
      - Nếu đã có user với google_id → trả về ngay (login)
      - Nếu có email nhưng chưa liên kết Google → link account + update avatar
      - Nếu chưa có email → tạo mới (register)
    """
    google_id  = userinfo.get("sub")
    email      = (userinfo.get("email") or "").lower().strip()
    name       = userinfo.get("name") or ""
    picture    = userinfo.get("picture")

    if not email or not google_id:
        raise HTTPException(status_code=400, detail="Không lấy được thông tin từ Google.")

    # Kiểm tra email đã verify chưa (Google thường luôn verify)
    if not userinfo.get("email_verified", True):
        raise HTTPException(status_code=400, detail="Email Google chưa được xác minh.")

    # ── Tìm theo google_id trước ──
    user = db.query(User).filter(User.google_id == google_id).first()
    if user:
        # Cập nhật avatar_url nếu Google đổi ảnh
        if picture and user.avatar_url != picture:
            user.avatar_url = picture
            db.commit()
        return user

    # ── Tìm theo email (tài khoản đã đăng ký email+pass) ──
    user = db.query(User).filter(User.email == email).first()
    if user:
        # Link Google vào account hiện có
        user.google_id  = google_id
        user.avatar_url = picture
        user.is_google  = True   # Đánh dấu đã liên kết (vẫn giữ password cũ)
        db.commit()
        db.refresh(user)
        return user

    # ── Tạo tài khoản mới ──
    # Tạo username từ tên Google, đảm bảo unique
    base_username = _make_username(name, email)
    username = _ensure_unique_username(db, base_username)

    user = User(
        email      = email,
        username   = username,
        password   = None,        # Google user không có password
        avatar     = "🎬",        # emoji mặc định
        avatar_url = picture,
        google_id  = google_id,
        is_google  = True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info(f"New Google user created: {email}")
    return user


def create_jwt_for_user(user: User) -> str:
    return create_access_token({"sub": user.email})


# ── Helpers ───────────────────────────────────────────────

def _make_username(name: str, email: str) -> str:
    """Tạo username sạch từ tên Google hoặc email."""
    import re
    raw = name.strip() if name.strip() else email.split("@")[0]
    # Chỉ giữ chữ cái, số, underscore
    clean = re.sub(r"[^a-zA-Z0-9_]", "", raw.replace(" ", "_"))
    clean = clean[:30] or "user"
    return clean.lower()


def _ensure_unique_username(db: Session, base: str) -> str:
    """Thêm suffix số nếu username đã tồn tại."""
    candidate = base
    counter   = 1
    while db.query(User).filter(User.username == candidate).first():
        candidate = f"{base}_{counter}"
        counter  += 1
    return candidate
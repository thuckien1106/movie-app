# app/utils/config.py
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL                = os.getenv("DATABASE_URL")
    SECRET_KEY                  = os.getenv("SECRET_KEY")
    ALGORITHM                   = os.getenv("ALGORITHM", "HS256")

    # ── Token TTL ──────────────────────────────────────────
    # Access token ngắn hạn — đủ để dùng, không quá lâu nếu bị lộ
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    # Refresh token dài hạn — user không phải login lại thường xuyên
    REFRESH_TOKEN_EXPIRE_DAYS   = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

    # ── Database pool (PostgreSQL) ─────────────────────────
    # SQLite tự động bỏ qua các giá trị này
    DB_POOL_SIZE     = int(os.getenv("DB_POOL_SIZE",     "10"))
    DB_MAX_OVERFLOW  = int(os.getenv("DB_MAX_OVERFLOW",  "20"))
    DB_POOL_TIMEOUT  = int(os.getenv("DB_POOL_TIMEOUT",  "30"))  # giây chờ lấy connection
    DB_POOL_RECYCLE  = int(os.getenv("DB_POOL_RECYCLE",  "1800")) # recycle sau 30 phút

    TMDB_API_KEY = os.getenv("TMDB_API_KEY")

    # ── Internal API key (dùng cho cron job / scheduler) ───
    INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")
    GEMINI_API_KEY  = os.getenv("GEMINI_API_KEY", "")

    # ── Google OAuth2 ───────────────────────────────────────
    GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
    GOOGLE_REDIRECT_URI  = os.getenv(
        "GOOGLE_REDIRECT_URI",
        "http://localhost:8000/auth/google/callback",
    )
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

    # ── CORS — danh sách origin được phép ──────────────────
    # Trong .env: ALLOWED_ORIGINS=https://filmverse.app,https://www.filmverse.app
    # Để trống hoặc không set → fallback về localhost (dev)
    @property
    def ALLOWED_ORIGINS(self) -> list[str]:
        raw = os.getenv("ALLOWED_ORIGINS", "")
        if raw.strip():
            return [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]
        # Dev fallback
        return ["http://localhost:5173", "http://localhost:3000"]


settings = Settings()
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

    TMDB_API_KEY = os.getenv("TMDB_API_KEY")

    # ── Internal API key (dùng cho cron job / scheduler) ───
    INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")

    # ── Google OAuth2 ───────────────────────────────────────
    GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
    GOOGLE_REDIRECT_URI  = os.getenv(
        "GOOGLE_REDIRECT_URI",
        "http://localhost:8000/auth/google/callback",
    )
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")


settings = Settings()
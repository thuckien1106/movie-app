# app/utils/config.py
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL               = os.getenv("DATABASE_URL")
    SECRET_KEY                 = os.getenv("SECRET_KEY")
    ALGORITHM                  = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    TMDB_API_KEY = os.getenv("TMDB_API_KEY")

    # ── Google OAuth2 ─────────────────────────────────
    GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
    # URL frontend gọi sau khi Google redirect về BE
    # BE sẽ đổi code → token → redirect sang FE với JWT
    GOOGLE_REDIRECT_URI  = os.getenv(
        "GOOGLE_REDIRECT_URI",
        "http://localhost:8000/auth/google/callback",
    )
    # Sau khi hoàn tất OAuth, redirect sang FE trang này
    FRONTEND_ORIGIN      = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")


settings = Settings()
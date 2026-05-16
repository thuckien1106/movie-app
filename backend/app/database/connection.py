import logging
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from app.utils.config import settings

logger = logging.getLogger(__name__)

_url = settings.DATABASE_URL or ""
_is_sqlite = _url.startswith("sqlite")

if _is_sqlite:
    # ── SQLite: chỉ dùng cho dev local ──────────────────────
    # check_same_thread=False cần thiết khi uvicorn chạy multi-thread
    # NullPool để tránh SQLite bị lock giữa các thread
    from sqlalchemy.pool import StaticPool
    engine = create_engine(
        _url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,   # 1 connection dùng chung — an toàn cho dev
    )
    logger.warning("⚠️  Đang dùng SQLite — chỉ phù hợp cho môi trường dev!")
else:
    # ── PostgreSQL (hoặc DB khác): production-ready pool ───
    engine = create_engine(
        _url,
        pool_size=settings.DB_POOL_SIZE,       # số connection thường trực
        max_overflow=settings.DB_MAX_OVERFLOW,  # connection tạm thêm khi pool đầy
        pool_timeout=settings.DB_POOL_TIMEOUT,  # giây chờ trước khi raise timeout
        pool_recycle=settings.DB_POOL_RECYCLE,  # tái tạo connection sau N giây (tránh stale)
        pool_pre_ping=True,                     # kiểm tra connection còn sống trước khi dùng
    )
    logger.info(
        f"🐘 PostgreSQL pool: size={settings.DB_POOL_SIZE}, "
        f"max_overflow={settings.DB_MAX_OVERFLOW}, "
        f"recycle={settings.DB_POOL_RECYCLE}s"
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
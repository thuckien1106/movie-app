# app/main.py
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.database.connection import engine
from app.database.base import Base
from app.models import user, watchlist
from app.models import review as review_models
from app.models import reminder as reminder_models
from app.models import password_reset as password_reset_models
from app.models import token as token_models 
from app.services import email_verify_service         
from app.routers import auth, movies, watchlist as watchlist_router
from app.routers import mood as mood_router
from app.routers import reminder as reminder_router
from app.routers import recommendations as recommendations_router
from app.routers import reviews as reviews_router
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.executors.pool import ThreadPoolExecutor
from app.routers import admin as admin_router
from app.models import comment as comment_models
from app.routers import comments as comments_router
from app.models import follow as follow_models
from app.routers import follow as follow_router
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("films")


# ════════════════════════════════════════════
# SCHEDULER JOBS
# ════════════════════════════════════════════

def _run_check_and_fire():
    from app.database.connection import SessionLocal
    from app.services.reminder_service import check_and_fire
    db = SessionLocal()
    try:
        fired = check_and_fire(db)
        logger.info(f"[scheduler] reminder check_and_fire → {fired} fired")
    except Exception as e:
        logger.error(f"[scheduler] reminder error: {e}")
    finally:
        db.close()


def _run_token_cleanup():
    """Dọn dẹp token hết hạn trong DB — chạy 1 lần / ngày."""
    from app.database.connection import SessionLocal
    from app.services.token_service import cleanup_expired_tokens
    db = SessionLocal()
    try:
        result = cleanup_expired_tokens(db)
        logger.info(f"[scheduler] token cleanup → {result}")
    except Exception as e:
        logger.error(f"[scheduler] token cleanup error: {e}")
    finally:
        db.close()


# ════════════════════════════════════════════
# REQUEST SIZE GUARD MIDDLEWARE
# ════════════════════════════════════════════

class RequestSizeMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_bytes: int = 64 * 1024):
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_bytes:
            return JSONResponse(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                content={
                    "error":   "Request quá lớn",
                    "message": f"Kích thước tối đa là {self.max_bytes // 1024} KB.",
                },
            )
        return await call_next(request)


# ════════════════════════════════════════════
# LIFESPAN
# ════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    logger.info("🎬 Films API v2.4 starting up...")

    scheduler = BackgroundScheduler(
        timezone="Asia/Ho_Chi_Minh",
        executors={"default": ThreadPoolExecutor(max_workers=1)},
        job_defaults={
            "misfire_grace_time": 600,
            "coalesce": True,
            "max_instances": 1,
        },
    )

    # Job 1: Kiểm tra và gửi reminder mỗi 10 phút
    scheduler.add_job(
        _run_check_and_fire,
        trigger="interval",
        minutes=10,
        id="reminder_check",
        next_run_time=datetime.now(tz=scheduler.timezone),
    )

    # Job 2: Dọn token hết hạn mỗi ngày lúc 3:00 sáng
    scheduler.add_job(
        _run_token_cleanup,
        trigger="cron",
        hour=3,
        minute=0,
        id="token_cleanup",
    )

    if not scheduler.running:
        scheduler.start()
        logger.info("🔔 Scheduler started (reminder: 10min, token cleanup: daily 3AM).")

    yield

    scheduler.shutdown(wait=False)
    logger.info("Films API shutting down.")


# ════════════════════════════════════════════
# APP
# ════════════════════════════════════════════

app = FastAPI(
    title="Films API",
    description="Movie Discovery & Watchlist API",
    version="2.4.0",
    lifespan=lifespan,
)

app.add_middleware(RequestSizeMiddleware, max_bytes=64 * 1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handlers ─────────────

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field = " → ".join(str(loc) for loc in err["loc"] if loc != "body")
        errors.append({
            "field":   field or "body",
            "message": err["msg"].replace("Value error, ", ""),
            "type":    err["type"],
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": "Dữ liệu không hợp lệ", "details": errors},
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        return JSONResponse(
            status_code=exc.status_code, content=detail,
            headers=getattr(exc, "headers", None) or {},
        )
    return JSONResponse(
        status_code=exc.status_code, content={"error": detail},
        headers=getattr(exc, "headers", None) or {},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error on {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Lỗi máy chủ nội bộ. Vui lòng thử lại sau."},
    )


# ── Routers ───────────────────────────────

app.include_router(auth.router)
app.include_router(movies.router)
app.include_router(watchlist_router.router)
app.include_router(mood_router.router)
app.include_router(reminder_router.router)
app.include_router(recommendations_router.router)
app.include_router(reviews_router.router)
app.include_router(admin_router.router)
app.include_router(comments_router.router)
app.include_router(follow_router.router)
@app.get("/")
def root():
    return {"message": "Films API v2.4 running", "docs": "/docs"}


@app.get("/health")
def health(request: Request):
    from app.utils.rate_limit import limiter
    return {"status": "ok", "rate_limiter": limiter.stats()}
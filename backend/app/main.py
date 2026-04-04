import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.database.connection import engine
from app.database.base import Base
from app.models import user, watchlist
from app.routers import auth, movies, watchlist as watchlist_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("films")


# ════════════════════════════════════════════
# REQUEST SIZE GUARD MIDDLEWARE
# ════════════════════════════════════════════

class RequestSizeMiddleware(BaseHTTPMiddleware):
    """Từ chối request body > max_bytes (mặc định 64 KB)."""

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
    logger.info("🎬 Films API v2.2 starting up...")
    yield
    logger.info("Films API shutting down.")


# ════════════════════════════════════════════
# APP
# ════════════════════════════════════════════

app = FastAPI(
    title="Films API",
    description="Movie Discovery & Watchlist API",
    version="2.2.0",
    lifespan=lifespan,
)


# ── Middleware ────────────────────────────────────────────

app.add_middleware(RequestSizeMiddleware, max_bytes=64 * 1024)   # 64 KB

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handlers ─────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Trả về lỗi validation theo format thống nhất, dễ đọc hơn."""
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
        content={
            "error":   "Dữ liệu không hợp lệ",
            "details": errors,
        },
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Format thống nhất cho mọi HTTPException."""
    detail = exc.detail
    # 429: detail là dict (từ rate limiter)
    if isinstance(detail, dict):
        return JSONResponse(
            status_code=exc.status_code,
            content=detail,
            headers=getattr(exc, "headers", None) or {},
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": detail},
        headers=getattr(exc, "headers", None) or {},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Bắt mọi lỗi không xử lý được — không lộ stack trace ra client."""
    logger.exception(f"Unhandled error on {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Lỗi máy chủ nội bộ. Vui lòng thử lại sau."},
    )


# ── Routers ───────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(movies.router)
app.include_router(watchlist_router.router)


# ── Root / Health ─────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Films API v2.2 running", "docs": "/docs"}


@app.get("/health")
def health(request: Request):
    from app.utils.rate_limit import limiter
    return {
        "status":       "ok",
        "rate_limiter": limiter.stats(),
    }
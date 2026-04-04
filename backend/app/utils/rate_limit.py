"""
In-memory sliding-window rate limiter.

Không cần Redis hay thư viện ngoài — chỉ dùng stdlib.
Thread-safe nhờ Lock (uvicorn dùng async nhưng handler chạy trong threadpool).

Cách dùng trong router:

    from app.utils.rate_limit import limiter, RateLimitExceeded

    @router.post("/login")
    def login(request: Request, ...):
        limiter.check(request, "login", max_calls=5, window_sec=60)
        ...
"""

import time
import threading
from collections import defaultdict, deque
from fastapi import Request, HTTPException


class SlidingWindowLimiter:
    """
    Sliding window counter: giữ timestamps của tất cả request
    trong cửa sổ thời gian `window_sec`.

    Key = (scope, identifier) — identifier thường là IP.
    """

    def __init__(self):
        # { key: deque[timestamp] }
        self._windows: dict = defaultdict(deque)
        self._lock = threading.Lock()

    # ── public API ────────────────────────────────────────

    def check(
        self,
        request: Request,
        scope: str,
        max_calls: int,
        window_sec: int,
        identifier: str = None,
    ) -> None:
        """
        Kiểm tra rate limit. Raise HTTP 429 nếu vượt ngưỡng.

        Args:
            request:    FastAPI Request (để lấy IP)
            scope:      tên nhóm limit ("login", "register", "search" ...)
            max_calls:  số request tối đa trong window
            window_sec: cửa sổ thời gian tính bằng giây
            identifier: override IP (mặc định lấy từ request)
        """
        ip  = identifier or self._get_ip(request)
        key = f"{scope}:{ip}"
        now = time.monotonic()
        cutoff = now - window_sec

        with self._lock:
            dq = self._windows[key]

            # xoá timestamps cũ ngoài cửa sổ
            while dq and dq[0] <= cutoff:
                dq.popleft()

            count = len(dq)
            if count >= max_calls:
                retry_after = int(window_sec - (now - dq[0])) + 1
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error":       "Quá nhiều yêu cầu",
                        "message":     f"Vui lòng thử lại sau {retry_after} giây.",
                        "retry_after": retry_after,
                        "limit":       max_calls,
                        "window_sec":  window_sec,
                    },
                    headers={"Retry-After": str(retry_after)},
                )

            dq.append(now)

    def reset(self, scope: str, identifier: str) -> None:
        """Xoá record của 1 IP (dùng sau khi login thành công)."""
        key = f"{scope}:{identifier}"
        with self._lock:
            self._windows.pop(key, None)

    def stats(self) -> dict:
        """Trả về số buckets đang tracked (debug)."""
        with self._lock:
            return {"active_buckets": len(self._windows)}

    # ── internal ──────────────────────────────────────────

    @staticmethod
    def _get_ip(request: Request) -> str:
        """
        Lấy real IP — hỗ trợ X-Forwarded-For khi đứng sau proxy/nginx.
        Fallback về request.client.host.
        """
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "unknown"


# singleton dùng chung toàn app
limiter = SlidingWindowLimiter()


# ── Preset limits (dùng như constants) ───────────────────
class Limits:
    # Auth — bảo vệ brute-force
    LOGIN           = dict(max_calls=5,   window_sec=60)    # 5 lần / phút
    REGISTER        = dict(max_calls=3,   window_sec=300)   # 3 lần / 5 phút
    CHANGE_PASSWORD = dict(max_calls=5,   window_sec=300)   # 5 lần / 5 phút

    # Tìm kiếm phim
    SEARCH          = dict(max_calls=30,  window_sec=60)    # 30 lần / phút

    # Watchlist mutations (thêm/xoá/sửa)
    WATCHLIST_WRITE = dict(max_calls=60,  window_sec=60)    # 60 lần / phút

    # Đọc dữ liệu chung
    READ_GENERAL    = dict(max_calls=120, window_sec=60)    # 120 lần / phút
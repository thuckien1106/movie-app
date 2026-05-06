# app/routers/history.py
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.utils.dependencies import get_db, get_current_user
from app.utils.rate_limit import limiter
from app.models.user import User
from app.models.view_history import ViewHistory

router = APIRouter(prefix="/history", tags=["History"])

_WRITE = dict(max_calls=60,  window_sec=60)
_READ  = dict(max_calls=120, window_sec=60)


# ── Log / upsert 1 lượt xem ─────────────────────────────────
@router.post("", status_code=204)
def log_view(
    request:      Request,
    body:         dict,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """
    Ghi lại lần xem phim (upsert).
    Body: { movie_id, title, poster }
    """
    limiter.check(request, "history_write", **_WRITE)

    movie_id = int(body.get("movie_id", 0))
    title    = str(body.get("title",    ""))[:255]
    poster   = str(body.get("poster",   "") or "")[:500] or None

    if not movie_id or not title:
        return  # silent

    now = datetime.now(timezone.utc)

    existing = db.query(ViewHistory).filter(
        ViewHistory.user_id  == current_user.id,
        ViewHistory.movie_id == movie_id,
    ).first()

    if existing:
        existing.title     = title
        existing.poster    = poster
        existing.viewed_at = now   # ← Python datetime, SQLite-compatible
    else:
        db.add(ViewHistory(
            user_id   = current_user.id,
            movie_id  = movie_id,
            title     = title,
            poster    = poster,
            viewed_at = now,
        ))

    db.commit()


# ── Lấy danh sách lịch sử ───────────────────────────────────
@router.get("")
def get_history(
    request:      Request,
    limit:        int = Query(20, ge=1, le=50),
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """Trả về `limit` phim được xem gần nhất, mới nhất trước."""
    limiter.check(request, "history_read", **_READ)

    rows = (
        db.query(ViewHistory)
        .filter(ViewHistory.user_id == current_user.id)
        .order_by(ViewHistory.viewed_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "movie_id":  r.movie_id,
            "title":     r.title,
            "poster":    r.poster,
            "viewed_at": r.viewed_at.isoformat() if r.viewed_at else None,
        }
        for r in rows
    ]


# ── Xoá 1 mục ───────────────────────────────────────────────
@router.delete("/{movie_id}", status_code=204)
def delete_history_item(
    request:      Request,
    movie_id:     int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    limiter.check(request, "history_write", **_WRITE)
    db.query(ViewHistory).filter(
        ViewHistory.user_id  == current_user.id,
        ViewHistory.movie_id == movie_id,
    ).delete()
    db.commit()


# ── Xoá toàn bộ lịch sử ─────────────────────────────────────
@router.delete("", status_code=204)
def clear_history(
    request:      Request,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    limiter.check(request, "history_write", **_WRITE)
    db.query(ViewHistory).filter(
        ViewHistory.user_id == current_user.id,
    ).delete()
    db.commit()
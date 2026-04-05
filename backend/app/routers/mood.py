# app/routers/mood.py
"""
Mood-based movie discovery endpoints.

GET /mood/              → danh sách tất cả mood (public)
GET /mood/{mood_id}     → phim gợi ý theo mood (public, nhưng nếu login sẽ lọc watchlist)
"""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from typing import Optional

from app.services import mood_service
from app.utils.dependencies import get_db, get_optional_user
from app.utils.rate_limit import limiter, Limits
from app.models.user import User

router = APIRouter(prefix="/mood", tags=["Mood Discovery"])

VALID_MOOD_IDS = set(mood_service.MOODS.keys())


@router.get("/")
def list_moods(request: Request):
    """Trả về danh sách tất cả mood để FE render UI chọn."""
    limiter.check(request, "mood_read", **Limits.READ_GENERAL)
    return mood_service.get_all_moods()


@router.get("/{mood_id}")
def movies_by_mood(
    request:      Request,
    mood_id:      str,
    page:         int          = Query(1, ge=1, le=50),
    db:           Session      = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Trả về phim phù hợp với mood.
    - Nếu user đã login → lọc bỏ phim đã có trong watchlist.
    - Nếu mood_id không hợp lệ → 404.
    """
    limiter.check(request, "mood_read", **Limits.READ_GENERAL)

    if mood_id not in VALID_MOOD_IDS:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=404,
            detail=f"Mood '{mood_id}' không tồn tại. Các mood hợp lệ: {', '.join(sorted(VALID_MOOD_IDS))}",
        )

    result = mood_service.get_movies_by_mood(
        mood_id=mood_id,
        page=page,
        db=db,
        user_id=current_user.id if current_user else None,
    )
    return result

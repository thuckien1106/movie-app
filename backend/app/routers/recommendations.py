# app/routers/recommendations.py
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from typing import Optional

from app.services import recommendation_service
from app.utils.dependencies import get_db, get_current_user, get_optional_user
from app.utils.rate_limit import limiter, Limits
from app.models.user import User

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.get("/")
def get_recommendations(
    request:      Request,
    page:         int            = Query(1, ge=1, le=10),
    db:           Session        = Depends(get_db),
    current_user: User           = Depends(get_current_user),
):
    """
    Trả về danh sách phim gợi ý cá nhân hoá cho user đang đăng nhập.

    Response:
    {
      "movies":          [...],
      "reason":          "Dựa trên sở thích của bạn: Hành động, Sci-Fi",
      "profile":         { "top_genre_ids": [...], "total_saved": 12, "total_watched": 5 },
      "is_personalized": true
    }
    """
    limiter.check(request, "recommendations", max_calls=30, window_sec=60)
    return recommendation_service.get_recommendations(db, current_user.id, page)
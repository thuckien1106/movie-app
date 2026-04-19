# app/routers/reviews.py
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from typing import Optional

from app.schemas.review_schema import ReviewCreate, ReviewUpdate
from app.services import review_service
from app.utils.dependencies import get_db, get_current_user, get_optional_user
from app.utils.rate_limit import limiter
from app.models.user import User

router = APIRouter(prefix="/reviews", tags=["Reviews"])

_WRITE = dict(max_calls=20, window_sec=60)
_READ  = dict(max_calls=120, window_sec=60)


# ── Summary (public, personalised nếu đã login) ──────────
@router.get("/movies/{movie_id}/summary")
def rating_summary(
    movie_id:     int,
    db:           Session       = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Trả về điểm trung bình, phân phối rating, my_rating của user."""
    return review_service.get_rating_summary(
        db, movie_id, current_user.id if current_user else None
    )


# ── List reviews (public) ─────────────────────────────────
@router.get("/movies/{movie_id}")
def list_reviews(
    request:  Request,
    movie_id: int,
    sort:     str = Query("recent", pattern="^(recent|top)$"),
    page:     int = Query(1, ge=1, le=100),
    db:       Session        = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    limiter.check(request, "reviews_read", **_READ)
    return review_service.get_reviews(
        db, movie_id,
        current_user_id = current_user.id if current_user else None,
        sort = sort,
        page = page,
    )


# ── Create ────────────────────────────────────────────────
@router.post("/movies/{movie_id}")
def create_review(
    request:      Request,
    movie_id:     int,
    data:         ReviewCreate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    limiter.check(request, "reviews_write", **_WRITE)
    return review_service.create_review(db, current_user.id, movie_id, data)


# ── Update ────────────────────────────────────────────────
@router.patch("/{review_id}")
def update_review(
    request:      Request,
    review_id:    int,
    data:         ReviewUpdate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    limiter.check(request, "reviews_write", **_WRITE)
    return review_service.update_review(db, current_user.id, review_id, data)


# ── Delete ────────────────────────────────────────────────
@router.delete("/{review_id}")
def delete_review(
    request:      Request,
    review_id:    int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    limiter.check(request, "reviews_write", **_WRITE)
    return review_service.delete_review(db, current_user.id, review_id)


# ── Like / Unlike ─────────────────────────────────────────
@router.post("/{review_id}/like")
def toggle_like(
    request:      Request,
    review_id:    int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    limiter.check(request, "reviews_like", max_calls=60, window_sec=60)
    return review_service.toggle_like(db, current_user.id, review_id)
# app/services/review_service.py
from typing import Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.review import Review, ReviewLike
from app.models.user import User
from app.schemas.review_schema import ReviewCreate, ReviewUpdate


# ════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════

def _enrich(review: Review, db: Session, current_user_id: Optional[int]) -> dict:
    """Gắn thêm author + liked_by_me vào review dict."""
    author = db.query(User).filter(User.id == review.user_id).first()
    liked = False
    if current_user_id:
        liked = db.query(ReviewLike).filter(
            ReviewLike.user_id   == current_user_id,
            ReviewLike.review_id == review.id,
        ).first() is not None

    return {
        "id":         review.id,
        "movie_id":   review.movie_id,
        "rating":     review.rating,
        "content":    review.content,
        "is_spoiler": review.is_spoiler,
        "likes":      review.likes,
        "liked_by_me": liked,
        "author": {
            "id":         author.id       if author else 0,
            "username":   author.username if author else "Người dùng",
            "avatar":     author.avatar   if author else None,
            "avatar_url": author.avatar_url if author else None,
        },
        "created_at": review.created_at,
        "updated_at": review.updated_at,
    }


# ════════════════════════════════════════════
# CRUD
# ════════════════════════════════════════════

def create_review(
    db: Session,
    user_id: int,
    movie_id: int,
    data: ReviewCreate,
) -> dict:
    existing = db.query(Review).filter(
        Review.user_id  == user_id,
        Review.movie_id == movie_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail={"error": "Bạn đã review phim này rồi.", "review_id": existing.id},
        )

    review = Review(
        user_id    = user_id,
        movie_id   = movie_id,
        rating     = data.rating,
        content    = data.content,
        is_spoiler = data.is_spoiler,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return _enrich(review, db, user_id)


def update_review(
    db: Session,
    user_id: int,
    review_id: int,
    data: ReviewUpdate,
) -> dict:
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review không tồn tại.")
    if review.user_id != user_id:
        raise HTTPException(status_code=403, detail="Không có quyền chỉnh sửa review này.")

    if data.rating is not None:
        review.rating = data.rating
    if data.content is not None:
        review.content = data.content
    if data.is_spoiler is not None:
        review.is_spoiler = data.is_spoiler

    db.commit()
    db.refresh(review)
    return _enrich(review, db, user_id)


def delete_review(db: Session, user_id: int, review_id: int) -> dict:
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review không tồn tại.")
    if review.user_id != user_id:
        raise HTTPException(status_code=403, detail="Không có quyền xóa review này.")

    db.query(ReviewLike).filter(ReviewLike.review_id == review_id).delete()
    db.delete(review)
    db.commit()
    return {"message": "Đã xóa review.", "review_id": review_id}


# ════════════════════════════════════════════
# READ
# ════════════════════════════════════════════

def get_reviews(
    db: Session,
    movie_id: int,
    current_user_id: Optional[int],
    sort: str = "recent",   # "recent" | "top"
    page: int = 1,
    page_size: int = 10,
) -> dict:
    query = db.query(Review).filter(Review.movie_id == movie_id)

    if sort == "top":
        query = query.order_by(Review.likes.desc(), Review.created_at.desc())
    else:
        query = query.order_by(Review.created_at.desc())

    total = query.count()
    reviews = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "reviews":    [_enrich(r, db, current_user_id) for r in reviews],
        "total":      total,
        "page":       page,
        "page_size":  page_size,
        "total_pages": max(1, -(-total // page_size)),  # ceiling division
    }


def get_rating_summary(
    db: Session,
    movie_id: int,
    current_user_id: Optional[int],
) -> dict:
    rows = db.query(Review.rating, func.count(Review.id)).filter(
        Review.movie_id == movie_id
    ).group_by(Review.rating).all()

    total = sum(cnt for _, cnt in rows)
    avg   = (sum(r * c for r, c in rows) / total) if total else None

    dist = {str(i): 0 for i in range(1, 11)}
    for rating, cnt in rows:
        dist[str(rating)] = cnt

    my_rating    = None
    my_review_id = None
    if current_user_id:
        mine = db.query(Review).filter(
            Review.user_id  == current_user_id,
            Review.movie_id == movie_id,
        ).first()
        if mine:
            my_rating    = mine.rating
            my_review_id = mine.id

    return {
        "movie_id":     movie_id,
        "average":      round(avg, 1) if avg else None,
        "count":        total,
        "distribution": dist,
        "my_rating":    my_rating,
        "my_review_id": my_review_id,
    }


# ════════════════════════════════════════════
# LIKE / UNLIKE
# ════════════════════════════════════════════

def toggle_like(db: Session, user_id: int, review_id: int) -> dict:
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review không tồn tại.")

    existing = db.query(ReviewLike).filter(
        ReviewLike.user_id   == user_id,
        ReviewLike.review_id == review_id,
    ).first()

    if existing:
        db.delete(existing)
        review.likes = max(0, review.likes - 1)
        liked = False
    else:
        db.add(ReviewLike(user_id=user_id, review_id=review_id))
        review.likes += 1
        liked = True

    db.commit()
    return {"liked": liked, "likes": review.likes}
# app/services/review_service.py
from typing import Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.review  import Review, ReviewLike
from app.models.user    import User
from app.models.reminder import InAppNotification
from app.schemas.review_schema import ReviewCreate, ReviewUpdate

PAGE_SIZE = 20


def _enrich(review: Review, db: Session, current_user_id: Optional[int]) -> dict:
    author = db.query(User).filter(User.id == review.user_id).first()
    liked  = False
    if current_user_id:
        liked = db.query(ReviewLike).filter(
            ReviewLike.user_id   == current_user_id,
            ReviewLike.review_id == review.id,
        ).first() is not None

    return {
        "id":          review.id,
        "movie_id":    review.movie_id,
        "user_id":     review.user_id,
        "content":     review.content,
        "rating":      review.rating,
        "is_spoiler":  review.is_spoiler,
        "likes":       review.likes,
        "liked_by_me": liked,
        "created_at":  review.created_at,
        "updated_at":  review.updated_at,
        "author": {
            "id":         author.id         if author else 0,
            "username":   author.username   if author else "Người dùng",
            "avatar":     author.avatar     if author else None,
            "avatar_url": author.avatar_url if author else None,
        },
    }


def get_rating_summary(
    db: Session,
    movie_id: int,
    current_user_id: Optional[int] = None,
) -> dict:
    reviews = (
        db.query(Review)
        .filter(Review.movie_id == movie_id, Review.is_hidden == False)
        .all()
    )

    count = len(reviews)
    distribution = {str(i): 0 for i in range(1, 11)}
    total_score  = 0

    for r in reviews:
        total_score += r.rating
        key = str(r.rating)
        if key in distribution:
            distribution[key] += 1

    average = round(total_score / count, 2) if count > 0 else None

    my_rating    = None
    my_review_id = None
    if current_user_id:
        my = db.query(Review).filter(
            Review.user_id  == current_user_id,
            Review.movie_id == movie_id,
        ).first()
        if my:
            my_rating    = my.rating
            my_review_id = my.id

    return {
        "movie_id":     movie_id,
        "average":      average,
        "count":        count,
        "distribution": distribution,
        "my_rating":    my_rating,
        "my_review_id": my_review_id,
    }


def get_reviews(
    db: Session,
    movie_id: int,
    current_user_id: Optional[int] = None,
    sort: str = "recent",
    page: int = 1,
) -> dict:
    q = db.query(Review).filter(
        Review.movie_id  == movie_id,
        Review.is_hidden == False,
    )

    if sort == "top":
        q = q.order_by(Review.likes.desc(), Review.created_at.desc())
    else:
        q = q.order_by(Review.created_at.desc())

    total   = q.count()
    offset  = (page - 1) * PAGE_SIZE
    reviews = q.offset(offset).limit(PAGE_SIZE).all()

    return {
        "reviews":   [_enrich(r, db, current_user_id) for r in reviews],
        "total":     total,
        "page":      page,
        "page_size": PAGE_SIZE,
        "has_next":  offset + PAGE_SIZE < total,
    }


def get_user_reviews(
    db: Session,
    user_id: int,
    current_user_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    q = (
        db.query(Review)
        .filter(Review.user_id == user_id, Review.is_hidden == False)
        .order_by(Review.created_at.desc())
    )
    total   = q.count()
    reviews = q.offset(offset).limit(limit).all()
    return {
        "reviews": [_enrich(r, db, current_user_id) for r in reviews],
        "total":   total,
    }


def create_review(db: Session, user_id: int, movie_id: int, data: ReviewCreate) -> dict:
    existing = db.query(Review).filter(
        Review.user_id  == user_id,
        Review.movie_id == movie_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Bạn đã đánh giá phim này rồi.")

    review = Review(
        user_id    = user_id,
        movie_id   = movie_id,
        content    = data.content,
        rating     = data.rating,
        is_spoiler = data.is_spoiler,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return _enrich(review, db, user_id)


def update_review(db: Session, user_id: int, review_id: int, data: ReviewUpdate) -> dict:
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review không tồn tại.")
    if review.user_id != user_id:
        raise HTTPException(status_code=403, detail="Không có quyền sửa review này.")

    if data.content    is not None: review.content    = data.content
    if data.rating     is not None: review.rating     = data.rating
    if data.is_spoiler is not None: review.is_spoiler = data.is_spoiler
    db.commit()
    db.refresh(review)
    return _enrich(review, db, user_id)


def delete_review(db: Session, user_id: int, review_id: int) -> dict:
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review không tồn tại.")
    if review.user_id != user_id:
        raise HTTPException(status_code=403, detail="Không có quyền xoá review này.")

    db.delete(review)
    db.commit()
    return {"message": "Đã xoá review.", "review_id": review_id}


def toggle_like(db: Session, user_id: int, review_id: int) -> dict:
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review không tồn tại.")

    existing_like = db.query(ReviewLike).filter(
        ReviewLike.user_id   == user_id,
        ReviewLike.review_id == review_id,
    ).first()

    if existing_like:
        db.delete(existing_like)
        review.likes = max(0, review.likes - 1)
        liked = False
    else:
        db.add(ReviewLike(user_id=user_id, review_id=review_id))
        review.likes += 1
        liked = True

        # ── Notification cho chủ review ──────────────────────────────────────
        if review.user_id != user_id:
            liker      = db.query(User).filter(User.id == user_id).first()
            liker_name = (liker.username or "Ai đó") if liker else "Ai đó"

            cutoff  = datetime.utcnow() - timedelta(hours=24)
            already = db.query(InAppNotification).filter(
                InAppNotification.user_id    == review.user_id,
                InAppNotification.review_id  == review_id,
                InAppNotification.notif_type == "like",
                InAppNotification.created_at >= cutoff,
            ).first()

            if not already:
                preview = (f' "{review.content[:60]}…"' if review.content else "")
                db.add(InAppNotification(
                    user_id    = review.user_id,
                    movie_id   = review.movie_id,
                    review_id  = review_id,
                    title      = f"❤️ {liker_name} thích review của bạn",
                    body       = f"Review của bạn vừa nhận được lượt thích mới!{preview}",
                    poster     = None,
                    notif_type = "like",
                    is_read    = False,
                ))

    db.commit()
    return {"liked": liked, "likes": review.likes}
from typing import Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.review import Review, ReviewLike
from app.models.user import User
from app.models.reminder import InAppNotification
from app.schemas.review_schema import ReviewCreate, ReviewUpdate


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
        "rating":      review.rating,
        "content":     review.content,
        "is_spoiler":  review.is_spoiler,
        "likes":       review.likes,
        "liked_by_me": liked,
        "author": {
            "id":         author.id         if author else 0,
            "username":   author.username   if author else "Người dùng",
            "avatar":     author.avatar     if author else None,
            "avatar_url": author.avatar_url if author else None,
        },
        "created_at":  review.created_at,
        "updated_at":  review.updated_at,
    }


def create_review(db, user_id, movie_id, data: ReviewCreate) -> dict:
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
    db.add(review); db.commit(); db.refresh(review)
    return _enrich(review, db, user_id)


def update_review(db, user_id, review_id, data: ReviewUpdate) -> dict:
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review không tồn tại.")
    if review.user_id != user_id:
        raise HTTPException(status_code=403, detail="Không có quyền chỉnh sửa review này.")
    if data.rating     is not None: review.rating     = data.rating
    if data.content    is not None: review.content    = data.content
    if data.is_spoiler is not None: review.is_spoiler = data.is_spoiler
    db.commit(); db.refresh(review)
    return _enrich(review, db, user_id)


def delete_review(db, user_id, review_id) -> dict:
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review không tồn tại.")
    if review.user_id != user_id:
        raise HTTPException(status_code=403, detail="Không có quyền xóa review này.")
    db.query(ReviewLike).filter(ReviewLike.review_id == review_id).delete()
    db.delete(review); db.commit()
    return {"message": "Đã xóa review.", "review_id": review_id}


def get_reviews(
    db, movie_id, current_user_id,
    sort="recent", page=1, page_size=10,
) -> dict:
    query = db.query(Review).filter(
        Review.movie_id  == movie_id,
        Review.is_hidden == False,    # ← THÊM: lọc review bị mod ẩn
    )
    if sort == "top":
        query = query.order_by(Review.likes.desc(), Review.created_at.desc())
    else:
        query = query.order_by(Review.created_at.desc())

    total   = query.count()
    reviews = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "reviews":     [_enrich(r, db, current_user_id) for r in reviews],
        "total":       total,
        "page":        page,
        "page_size":   page_size,
        "total_pages": max(1, -(-total // page_size)),
    }


def get_rating_summary(db, movie_id, current_user_id) -> dict:
    rows  = db.query(Review.rating, func.count(Review.id)).filter(
        Review.movie_id  == movie_id,
        Review.is_hidden == False,   # ← THÊM
    ).group_by(Review.rating).all()

    total = sum(cnt for _, cnt in rows)
    avg   = (sum(r * c for r, c in rows) / total) if total else None
    dist  = {str(i): 0 for i in range(1, 11)}
    for rating, cnt in rows:
        dist[str(rating)] = cnt

    my_rating = my_review_id = None
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


def toggle_like(db, user_id, review_id) -> dict:
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

        # ── Gửi in-app notification cho chủ review ───────────────
        # Không tự notify chính mình
        if review.user_id != user_id:
            liker = db.query(User).filter(User.id == user_id).first()
            liker_name = (liker.username or "Ai đó") if liker else "Ai đó"

            # Tránh spam: chỉ tạo 1 notif nếu chưa có notif like từ
            # cùng liker cho cùng review trong vòng 24 giờ
            from datetime import datetime, timezone, timedelta
            cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
            already = db.query(InAppNotification).filter(
                InAppNotification.user_id  == review.user_id,
                InAppNotification.title.like(f"%{liker_name}%"),
                InAppNotification.created_at >= cutoff,
                # dùng body chứa review_id để identify chính xác
                InAppNotification.body.like(f"%#{review_id}%"),
            ).first()

            if not already:
                db.add(InAppNotification(
                    user_id  = review.user_id,
                    movie_id = review.movie_id,
                    title    = f"❤️ {liker_name} thích review của bạn",
                    body     = (
                        f"Review #{review_id} của bạn vừa nhận được lượt thích mới!"
                        + (f' "{review.content[:60]}…"' if review.content else "")
                    ),
                    poster   = None,
                    is_read  = False,
                ))

    db.commit()
    return {"liked": liked, "likes": review.likes}
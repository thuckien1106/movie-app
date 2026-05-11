# app/services/comment_service.py
from typing import Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.comment import Comment
from app.models.review  import Review
from app.models.user    import User
from app.models.reminder import InAppNotification
from app.schemas.comment_schema import CommentCreate


def _author(db: Session, user_id: int) -> dict:
    u = db.query(User).filter(User.id == user_id).first()
    return {
        "id":         u.id         if u else 0,
        "username":   u.username   if u else "Người dùng",
        "avatar":     u.avatar     if u else None,
        "avatar_url": u.avatar_url if u else None,
    }


def _fmt(c: Comment, db: Session, replies: list = None) -> dict:
    return {
        "id":         c.id,
        "review_id":  c.review_id,
        "parent_id":  c.parent_id,
        "content":    c.content,
        "author":     _author(db, c.user_id),
        "created_at": c.created_at,
        "updated_at": c.updated_at,
        "replies":    replies or [],
    }


def get_comments(db: Session, review_id: int) -> dict:
    all_comments = (
        db.query(Comment)
        .filter(Comment.review_id == review_id, Comment.is_hidden == False)
        .order_by(Comment.created_at.asc())
        .all()
    )

    top_level = [c for c in all_comments if c.parent_id is None]
    reply_map: dict[int, list] = {}
    for c in all_comments:
        if c.parent_id is not None:
            reply_map.setdefault(c.parent_id, []).append(c)

    result = []
    for c in top_level:
        replies = [_fmt(r, db) for r in reply_map.get(c.id, [])]
        result.append(_fmt(c, db, replies))

    return {"comments": result, "total": len(top_level)}


def create_comment(db: Session, user_id: int, review_id: int, data: CommentCreate) -> dict:
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review không tồn tại.")

    if data.parent_id is not None:
        parent = db.query(Comment).filter(Comment.id == data.parent_id).first()
        if not parent or parent.review_id != review_id:
            raise HTTPException(status_code=404, detail="Bình luận gốc không tồn tại.")
        if parent.parent_id is not None:
            raise HTTPException(status_code=400, detail="Chỉ hỗ trợ 1 cấp trả lời.")

    c = Comment(
        review_id = review_id,
        user_id   = user_id,
        parent_id = data.parent_id,
        content   = data.content,
    )
    db.add(c)
    db.commit()
    db.refresh(c)

    # ── Gửi notification cho chủ review (không tự notify mình) ──────────────
    if review.user_id != user_id:
        commenter = db.query(User).filter(User.id == user_id).first()
        commenter_name = (commenter.username or "Ai đó") if commenter else "Ai đó"

        # Chống spam: 1 notif / commenter / review trong 10 phút
        cutoff = datetime.utcnow() - timedelta(minutes=10)
        already = db.query(InAppNotification).filter(
            InAppNotification.user_id    == review.user_id,
            InAppNotification.review_id  == review_id,
            InAppNotification.notif_type == "comment",
            InAppNotification.created_at >= cutoff,
        ).first()

        if not already:
            preview = data.content[:60] + ("…" if len(data.content) > 60 else "")
            db.add(InAppNotification(
                user_id    = review.user_id,
                movie_id   = review.movie_id,
                review_id  = review_id,
                title      = f"💬 {commenter_name} đã bình luận review của bạn",
                body       = f'"{preview}"',
                poster     = None,
                notif_type = "comment",
                is_read    = False,
            ))
            db.commit()

    return _fmt(c, db)


def delete_comment(db: Session, user_id: int, comment_id: int) -> dict:
    c = db.query(Comment).filter(Comment.id == comment_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Bình luận không tồn tại.")
    if c.user_id != user_id:
        raise HTTPException(status_code=403, detail="Không có quyền xoá bình luận này.")

    db.query(Comment).filter(Comment.parent_id == comment_id).delete()
    db.delete(c)
    db.commit()
    return {"message": "Đã xoá bình luận.", "comment_id": comment_id}
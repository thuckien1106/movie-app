# app/services/admin_service.py
"""
Toàn bộ business logic cho trang Admin:
  - Thống kê tổng quan
  - Quản lý user: danh sách, tìm kiếm, set role, ban/unban
  - Quản lý review: danh sách, filter flagged, ẩn/hiện, xoá
"""
from typing import Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.user import User, UserRole
from app.models.review import Review, ReviewLike


# ════════════════════════════════════════════
# THỐNG KÊ
# ════════════════════════════════════════════

def get_stats(db: Session) -> dict:
    total_users     = db.query(func.count(User.id)).scalar()
    banned_users    = db.query(func.count(User.id)).filter(User.is_banned == True).scalar()
    moderators      = db.query(func.count(User.id)).filter(User.role == UserRole.moderator).scalar()
    admins          = db.query(func.count(User.id)).filter(User.role == UserRole.admin).scalar()
    total_reviews   = db.query(func.count(Review.id)).scalar()
    flagged_reviews = db.query(func.count(Review.id)).filter(Review.is_flagged == True).scalar()
    hidden_reviews  = db.query(func.count(Review.id)).filter(Review.is_hidden == True).scalar()

    return {
        "total_users":     total_users,
        "banned_users":    banned_users,
        "total_reviews":   total_reviews,
        "flagged_reviews": flagged_reviews,
        "hidden_reviews":  hidden_reviews,
        "moderators":      moderators,
        "admins":          admins,
    }


# ════════════════════════════════════════════
# QUẢN LÝ USER
# ════════════════════════════════════════════

def list_users(
    db:        Session,
    page:      int = 1,
    page_size: int = 20,
    search:    Optional[str] = None,
    role:      Optional[UserRole] = None,
    banned:    Optional[bool] = None,
) -> dict:
    query = db.query(User)

    if search:
        term = f"%{search.lower()}%"
        query = query.filter(
            (func.lower(User.email).like(term)) |
            (func.lower(User.username).like(term))
        )
    if role is not None:
        query = query.filter(User.role == role)
    if banned is not None:
        query = query.filter(User.is_banned == banned)

    query = query.order_by(User.id.desc())
    total = query.count()

    users = query.offset((page - 1) * page_size).limit(page_size).all()

    # Đếm số review của từng user
    user_ids  = [u.id for u in users]
    rev_counts = {}
    if user_ids:
        rows = (
            db.query(Review.user_id, func.count(Review.id))
            .filter(Review.user_id.in_(user_ids))
            .group_by(Review.user_id)
            .all()
        )
        rev_counts = {uid: cnt for uid, cnt in rows}

    result = []
    for u in users:
        result.append({
            "id":           u.id,
            "email":        u.email,
            "username":     u.username,
            "avatar":       u.avatar,
            "avatar_url":   u.avatar_url,
            "role":         u.role,
            "is_banned":    u.is_banned,
            "ban_reason":   u.ban_reason,
            "is_google":    u.is_google,
            "review_count": rev_counts.get(u.id, 0),
        })

    return {
        "users":       result,
        "total":       total,
        "page":        page,
        "page_size":   page_size,
        "total_pages": max(1, -(-total // page_size)),
    }


def set_role(db: Session, actor: User, target_id: int, new_role: UserRole) -> dict:
    """
    Đổi role của user.
    Chỉ admin mới đổi được role.
    Admin không thể tự hạ role chính mình.
    """
    if actor.id == target_id:
        raise HTTPException(status_code=400, detail="Không thể đổi role của chính mình.")

    target = db.query(User).filter(User.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    # Không thể đổi role của admin khác (bảo vệ tài khoản admin)
    if target.role == UserRole.admin:
        raise HTTPException(status_code=403, detail="Không thể thay đổi role của admin khác.")

    target.role = new_role
    db.commit()
    return {"message": f"Đã đổi role thành {new_role.value}.", "user_id": target_id, "role": new_role}


def ban_user(db: Session, actor: User, target_id: int, reason: Optional[str]) -> dict:
    """Ban tài khoản. Admin và moderator đều có thể ban user thường."""
    if actor.id == target_id:
        raise HTTPException(status_code=400, detail="Không thể tự ban chính mình.")

    target = db.query(User).filter(User.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    # Moderator không được ban admin / moderator khác
    if actor.role == UserRole.moderator and target.role != UserRole.user:
        raise HTTPException(
            status_code=403,
            detail="Moderator chỉ có thể ban người dùng thường.",
        )

    if target.is_banned:
        raise HTTPException(status_code=409, detail="Tài khoản này đã bị ban.")

    target.is_banned  = True
    target.ban_reason = reason
    db.commit()
    return {"message": "Đã ban tài khoản.", "user_id": target_id}


def unban_user(db: Session, target_id: int) -> dict:
    target = db.query(User).filter(User.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    if not target.is_banned:
        raise HTTPException(status_code=409, detail="Tài khoản này chưa bị ban.")

    target.is_banned  = False
    target.ban_reason = None
    db.commit()
    return {"message": "Đã gỡ ban tài khoản.", "user_id": target_id}


# ════════════════════════════════════════════
# QUẢN LÝ REVIEW
# ════════════════════════════════════════════

def list_reviews(
    db:        Session,
    page:      int = 1,
    page_size: int = 20,
    flagged:   Optional[bool] = None,
    hidden:    Optional[bool] = None,
) -> dict:
    query = db.query(Review)

    if flagged is not None:
        query = query.filter(Review.is_flagged == flagged)
    if hidden is not None:
        query = query.filter(Review.is_hidden == hidden)

    query = query.order_by(Review.is_flagged.desc(), Review.created_at.desc())
    total = query.count()

    reviews = query.offset((page - 1) * page_size).limit(page_size).all()

    # Lấy author info
    author_ids = list({r.user_id for r in reviews})
    authors    = {}
    if author_ids:
        rows = db.query(User).filter(User.id.in_(author_ids)).all()
        authors = {u.id: u for u in rows}

    result = []
    for r in reviews:
        author = authors.get(r.user_id)
        result.append({
            "id":          r.id,
            "movie_id":    r.movie_id,
            "movie_title": None,   # FE tự lookup nếu cần
            "rating":      r.rating,
            "content":     r.content,
            "is_spoiler":  r.is_spoiler,
            "is_flagged":  r.is_flagged,
            "flag_reason": r.flag_reason,
            "is_hidden":   r.is_hidden,
            "likes":       r.likes,
            "created_at":  r.created_at,
            "author": {
                "id":         author.id         if author else 0,
                "username":   author.username   if author else "?",
                "avatar":     author.avatar     if author else None,
                "avatar_url": author.avatar_url if author else None,
            },
        })

    return {
        "reviews":     result,
        "total":       total,
        "page":        page,
        "page_size":   page_size,
        "total_pages": max(1, -(-total // page_size)),
    }


def hide_review(db: Session, review_id: int) -> dict:
    """Ẩn review vi phạm — không xoá, vẫn giữ lịch sử."""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review không tồn tại.")
    review.is_hidden  = True
    review.is_flagged = False   # đã xử lý, bỏ flag
    db.commit()
    return {"message": "Đã ẩn review.", "review_id": review_id}


def unhide_review(db: Session, review_id: int) -> dict:
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review không tồn tại.")
    review.is_hidden = False
    db.commit()
    return {"message": "Đã hiện lại review.", "review_id": review_id}


def delete_review_by_admin(db: Session, review_id: int) -> dict:
    """Xoá hẳn review — dùng khi nội dung vi phạm nghiêm trọng."""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review không tồn tại.")
    db.query(ReviewLike).filter(ReviewLike.review_id == review_id).delete()
    db.delete(review)
    db.commit()
    return {"message": "Đã xoá review.", "review_id": review_id}
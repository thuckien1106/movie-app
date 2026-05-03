# app/routers/follow.py
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.utils.dependencies import get_db, get_current_user, get_optional_user
from app.utils.rate_limit import limiter
from app.models.user import User
from app.models.follow import Follow
from app.models.watchlist import Watchlist
from app.models.reminder import InAppNotification

router = APIRouter(prefix="/follow", tags=["Follow"])

_WRITE = dict(max_calls=30,  window_sec=60)
_READ  = dict(max_calls=120, window_sec=60)


# ── Toggle follow / unfollow ──────────────────────────────────
@router.post("/{username}")
def toggle_follow(
    request:      Request,
    username:     str,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """Follow hoặc unfollow một user theo username."""
    limiter.check(request, "follow_write", **_WRITE)

    target = db.query(User).filter(
        User.username == username,
        User.is_banned == False,
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Bạn không thể follow chính mình.")

    existing = db.query(Follow).filter(
        Follow.follower_id  == current_user.id,
        Follow.following_id == target.id,
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"following": False, "message": f"Đã unfollow @{username}"}
    else:
        db.add(Follow(follower_id=current_user.id, following_id=target.id))

        # Notification cho người được follow
        follower_name = current_user.username or "Ai đó"
        db.add(InAppNotification(
            user_id  = target.id,
            movie_id = None,
            title    = f"👤 {follower_name} đã follow bạn",
            body     = f"@{follower_name} vừa bắt đầu theo dõi bạn. Hãy xem profile của họ!",
            poster   = None,
            is_read  = False,
        ))

        db.commit()
        return {"following": True, "message": f"Đã follow @{username}"}


# ── Trạng thái follow + số lượng ──────────────────────────────
@router.get("/status/{username}")
def follow_status(
    request:      Request,
    username:     str,
    db:           Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    limiter.check(request, "follow_read", **_READ)
    if not current_user:
        target = db.query(User).filter(User.username == username).first()
        if not target:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
        followers       = db.query(Follow).filter(Follow.following_id == target.id).count()
        following_count = db.query(Follow).filter(Follow.follower_id  == target.id).count()
        return {"following": False, "followers": followers, "following_count": following_count}

    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    is_following = db.query(Follow).filter(
        Follow.follower_id  == current_user.id,
        Follow.following_id == target.id,
    ).first() is not None

    followers       = db.query(Follow).filter(Follow.following_id == target.id).count()
    following_count = db.query(Follow).filter(Follow.follower_id  == target.id).count()

    return {
        "following":       is_following,
        "followers":       followers,
        "following_count": following_count,
    }


# ── Danh sách followers ───────────────────────────────────────
@router.get("/{username}/followers")
def list_followers(
    request:  Request,
    username: str,
    page:     int = Query(1, ge=1),
    db:       Session = Depends(get_db),
):
    limiter.check(request, "follow_read", **_READ)
    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    page_size = 20
    rows  = db.query(Follow).filter(Follow.following_id == target.id).order_by(Follow.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    total = db.query(Follow).filter(Follow.following_id == target.id).count()
    users = [_user_summary(db.query(User).filter(User.id == r.follower_id).first()) for r in rows if db.query(User).filter(User.id == r.follower_id).first()]
    return {"users": users, "total": total, "page": page}


# ── Danh sách following ───────────────────────────────────────
@router.get("/{username}/following")
def list_following(
    request:  Request,
    username: str,
    page:     int = Query(1, ge=1),
    db:       Session = Depends(get_db),
):
    limiter.check(request, "follow_read", **_READ)
    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    page_size = 20
    rows  = db.query(Follow).filter(Follow.follower_id == target.id).order_by(Follow.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    total = db.query(Follow).filter(Follow.follower_id == target.id).count()
    users = [_user_summary(db.query(User).filter(User.id == r.following_id).first()) for r in rows if db.query(User).filter(User.id == r.following_id).first()]
    return {"users": users, "total": total, "page": page}


# ── Social feed ───────────────────────────────────────────────
@router.get("/feed/activity")
def social_feed(
    request:      Request,
    page:         int = Query(1, ge=1),
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """Phim mới được thêm bởi những người mình follow."""
    limiter.check(request, "follow_read", **_READ)

    following_ids = [
        row.following_id
        for row in db.query(Follow.following_id).filter(Follow.follower_id == current_user.id).all()
    ]
    if not following_ids:
        return {"items": [], "total": 0, "page": page, "has_more": False}

    page_size = 20
    total = db.query(Watchlist).filter(Watchlist.user_id.in_(following_ids)).count()
    rows  = (
        db.query(Watchlist)
        .filter(Watchlist.user_id.in_(following_ids))
        .order_by(Watchlist.added_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for wl in rows:
        actor = db.query(User).filter(User.id == wl.user_id).first()
        if not actor:
            continue
        items.append({
            "movie_id":   wl.movie_id,
            "title":      wl.title,
            "poster":     wl.poster,
            "is_watched": wl.is_watched,
            "added_at":   wl.added_at.isoformat() if wl.added_at else None,
            "user":       _user_summary(actor),
        })

    return {"items": items, "total": total, "page": page, "has_more": (page * page_size) < total}


def _user_summary(u: User) -> dict:
    return {"id": u.id, "username": u.username, "avatar": u.avatar, "avatar_url": u.avatar_url}
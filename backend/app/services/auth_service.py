from sqlalchemy.orm import Session
from app.models.user import User
from app.models.watchlist import Watchlist, Collection
from app.utils.security import hash_password, verify_password
from app.schemas.user_schema import ProfileUpdate, ChangePassword, ActivityItem, ActivityResponse
from fastapi import HTTPException
from typing import Optional


def create_user(db: Session, email: str, password: str, username: Optional[str] = None):
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email đã tồn tại")
    if username and db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="Username đã được sử dụng")
    user = User(email=email, password=hash_password(password), username=username)
    db.add(user); db.commit(); db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password):
        return None
    return user


def update_profile(db: Session, user: User, data: ProfileUpdate):
    if data.username is not None and data.username != user.username:
        conflict = db.query(User).filter(
            User.username == data.username, User.id != user.id
        ).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Username đã được sử dụng")
        user.username = data.username
    if data.avatar is not None:
        user.avatar = data.avatar
    if data.bio is not None:
        user.bio = data.bio
    db.commit(); db.refresh(user)
    return user


def change_password(db: Session, user: User, data: ChangePassword):
    if not verify_password(data.current_password, user.password):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng")
    user.password = hash_password(data.new_password)
    db.commit()
    return {"message": "Đổi mật khẩu thành công"}


def get_activity(db: Session, user_id: int, limit: int = 30) -> ActivityResponse:
    """Merge watchlist additions + watched events + collection creations into a timeline."""
    items = []

    # Movies added (most recent first)
    added = db.query(Watchlist).filter(
        Watchlist.user_id == user_id
    ).order_by(Watchlist.added_at.desc()).limit(limit).all()

    for m in added:
        if m.added_at:
            items.append(ActivityItem(
                type="added", title=m.title, poster=m.poster,
                movie_id=m.movie_id, col_name=None, at=m.added_at,
            ))
        # Also surface "watched" milestone separately
        if m.is_watched and m.added_at:
            items.append(ActivityItem(
                type="watched", title=m.title, poster=m.poster,
                movie_id=m.movie_id, col_name=None, at=m.added_at,
            ))

    # Collections created
    cols = db.query(Collection).filter(
        Collection.user_id == user_id
    ).order_by(Collection.created_at.desc()).all()

    for c in cols:
        if c.created_at:
            items.append(ActivityItem(
                type="collection_created", title=c.name,
                poster=None, movie_id=None, col_name=c.name, at=c.created_at,
            ))

    # Sort all by time desc, cap at limit
    items.sort(key=lambda x: x.at, reverse=True)
    return ActivityResponse(items=items[:limit])
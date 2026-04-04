import secrets
from collections import Counter
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.watchlist import Watchlist, Collection, WatchlistShare
from app.models.user import User
from app.schemas.watchlist_schema import (
    WatchlistCreate, WatchlistStats, GenreStat,
    CollectionCreate, CollectionResponse,
)


# ════════════════════════════════════════════
# WATCHLIST CRUD
# ════════════════════════════════════════════

def add_to_watchlist(db: Session, user_id: int, data: WatchlistCreate):
    # Tránh trùng lặp
    existing = db.query(Watchlist).filter(
        Watchlist.user_id == user_id,
        Watchlist.movie_id == data.movie_id
    ).first()
    if existing:
        return existing  # idempotent — không báo lỗi, trả về item cũ

    item = Watchlist(
        user_id=user_id,
        movie_id=data.movie_id,
        title=data.title,
        poster=data.poster,
        runtime=data.runtime,
        genre_ids=data.genre_ids,
        collection_id=data.collection_id,
        added_at=datetime.utcnow(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def get_watchlist(db: Session, user_id: int, collection_id: int = None):
    q = db.query(Watchlist).filter(Watchlist.user_id == user_id)

    if collection_id is not None:
        q = q.filter(Watchlist.collection_id == collection_id)

    items = q.order_by(Watchlist.added_at.desc()).all()

    # ✅ FIX NULL runtime
    from datetime import datetime
    for item in items:
        if not item.added_at:
            item.added_at = datetime.utcnow()

    return items

def remove_from_watchlist(db: Session, user_id: int, movie_id: int):
    item = db.query(Watchlist).filter(
        Watchlist.user_id == user_id,
        Watchlist.movie_id == movie_id
    ).first()
    if item:
        db.delete(item)
        db.commit()
    return {"message": "Removed"}


def mark_as_watched(db: Session, user_id: int, movie_id: int):
    item = db.query(Watchlist).filter(
        Watchlist.user_id == user_id,
        Watchlist.movie_id == movie_id
    ).first()
    if item:
        item.is_watched = not item.is_watched   # toggle
        db.commit()
        db.refresh(item)
    return item


def update_note(db: Session, user_id: int, movie_id: int, note: str):
    item = db.query(Watchlist).filter(
        Watchlist.user_id == user_id,
        Watchlist.movie_id == movie_id
    ).first()
    if not item:
        return None
    item.note = note
    db.commit()
    db.refresh(item)
    return item


def move_to_collection(db: Session, user_id: int, movie_id: int, collection_id: int | None):
    item = db.query(Watchlist).filter(
        Watchlist.user_id == user_id,
        Watchlist.movie_id == movie_id
    ).first()
    if not item:
        return None
    item.collection_id = collection_id
    db.commit()
    db.refresh(item)
    return item


# ════════════════════════════════════════════
# STATS
# ════════════════════════════════════════════

def get_watchlist_stats(db: Session, user_id: int) -> WatchlistStats:
    movies = db.query(Watchlist).filter(Watchlist.user_id == user_id).all()

    watched_items = [m for m in movies if m.is_watched]

    total_runtime = sum(m.runtime or 0 for m in movies)
    watched_runtime = sum(m.runtime or 0 for m in watched_items)

    # Tính top genres từ genre_ids string
    all_genre_ids = []
    for m in movies:
        if m.genre_ids:
            all_genre_ids.extend(m.genre_ids.split(","))
    genre_counter = Counter(all_genre_ids)
    top_genres = [
        GenreStat(genre_id=gid, count=cnt)
        for gid, cnt in genre_counter.most_common(5)
    ]

    return WatchlistStats(
        total=len(movies),
        watched=len(watched_items),
        unwatched=len(movies) - len(watched_items),
        total_runtime_minutes=total_runtime,
        watched_runtime_minutes=watched_runtime,
        top_genres=top_genres,
    )


# ════════════════════════════════════════════
# COLLECTIONS
# ════════════════════════════════════════════

def get_collections(db: Session, user_id: int):
    collections = db.query(Collection).filter(Collection.user_id == user_id).all()
    result = []
    for col in collections:
        count = db.query(Watchlist).filter(
            Watchlist.user_id == user_id,
            Watchlist.collection_id == col.id
        ).count()
        result.append(CollectionResponse(
            id=col.id,
            name=col.name,
            description=col.description,
            movie_count=count,
            created_at=col.created_at,
        ))
    return result


def create_collection(db: Session, user_id: int, data: CollectionCreate):
    col = Collection(user_id=user_id, name=data.name, description=data.description)
    db.add(col)
    db.commit()
    db.refresh(col)
    return CollectionResponse(id=col.id, name=col.name, description=col.description,
                              movie_count=0, created_at=col.created_at)


def delete_collection(db: Session, user_id: int, collection_id: int):
    col = db.query(Collection).filter(
        Collection.id == collection_id,
        Collection.user_id == user_id
    ).first()
    if not col:
        return False
    # Gỡ phim khỏi collection (không xoá phim)
    db.query(Watchlist).filter(
        Watchlist.user_id == user_id,
        Watchlist.collection_id == collection_id
    ).update({"collection_id": None})
    db.delete(col)
    db.commit()
    return True


# ════════════════════════════════════════════
# SHARE
# ════════════════════════════════════════════

def get_or_create_share(db: Session, user_id: int) -> WatchlistShare:
    share = db.query(WatchlistShare).filter(WatchlistShare.user_id == user_id).first()
    if not share:
        token = secrets.token_urlsafe(32)
        share = WatchlistShare(user_id=user_id, share_token=token)
        db.add(share)
        db.commit()
        db.refresh(share)
    return share


def toggle_share(db: Session, user_id: int) -> WatchlistShare:
    share = get_or_create_share(db, user_id)
    share.is_active = not share.is_active
    db.commit()
    db.refresh(share)
    return share


def get_public_watchlist(db: Session, share_token: str):
    """Trả về watchlist public không cần auth"""
    share = db.query(WatchlistShare).filter(
        WatchlistShare.share_token == share_token,
        WatchlistShare.is_active == True
    ).first()
    if not share:
        return None

    user = db.query(User).filter(User.id == share.user_id).first()
    movies = db.query(Watchlist).filter(
        Watchlist.user_id == share.user_id
    ).order_by(Watchlist.added_at.desc()).all()

    return {
        "owner_username": user.username if user else None,
        "total": len(movies),
        "watched": sum(1 for m in movies if m.is_watched),
        "movies": movies,
    }
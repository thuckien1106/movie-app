import secrets
from collections import Counter
from typing import Optional
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
    from datetime import datetime, timezone
    item = db.query(Watchlist).filter(
        Watchlist.user_id == user_id,
        Watchlist.movie_id == movie_id
    ).first()
    if item:
        item.is_watched = not item.is_watched
        # Ghi lại thời điểm đánh dấu đã xem, xóa khi bỏ đánh dấu
        item.watched_at = datetime.now(timezone.utc) if item.is_watched else None
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

# Map TMDB genre ID → tên tiếng Việt
# Nguồn: https://api.themoviedb.org/3/genre/movie/list
_TMDB_GENRES: dict[str, str] = {
    "28":    "Hành động",
    "12":    "Phiêu lưu",
    "16":    "Hoạt hình",
    "35":    "Hài hước",
    "80":    "Tội phạm",
    "99":    "Tài liệu",
    "18":    "Chính kịch",
    "10751": "Gia đình",
    "14":    "Giả tưởng",
    "36":    "Lịch sử",
    "27":    "Kinh dị",
    "10402": "Âm nhạc",
    "9648":  "Bí ẩn",
    "10749": "Tình cảm",
    "878":   "Khoa học viễn tưởng",
    "10770": "Phim truyền hình",
    "53":    "Giật gân",
    "10752": "Chiến tranh",
    "37":    "Cao bồi",
}


def _genre_name(genre_id: str) -> str:
    """Trả về tên thể loại từ TMDB genre ID, fallback về ID nếu chưa có."""
    return _TMDB_GENRES.get(genre_id.strip(), f"Thể loại {genre_id}")


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
        GenreStat(genre_id=gid, genre_name=_genre_name(gid), count=cnt)
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


MAX_COLLECTIONS_PER_USER = 20   # Giới hạn số collection mỗi user


def create_collection(db: Session, user_id: int, data: CollectionCreate):
    from fastapi import HTTPException
    current_count = db.query(Collection).filter(Collection.user_id == user_id).count()
    if current_count >= MAX_COLLECTIONS_PER_USER:
        raise HTTPException(
            status_code=400,
            detail=f"Bạn đã đạt giới hạn {MAX_COLLECTIONS_PER_USER} bộ sưu tập. Xoá bớt trước khi tạo mới.",
        )
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
    """Trả về watchlist public không cần auth — bao gồm collections, stats, avatar"""
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

    # ── Stats ──────────────────────────────────────────────
    total_runtime = sum(m.runtime or 0 for m in movies)

    all_genre_ids = []
    for m in movies:
        if m.genre_ids:
            all_genre_ids.extend(gid.strip() for gid in m.genre_ids.split(",") if gid.strip())
    genre_counter = Counter(all_genre_ids)
    top_genres = [
        GenreStat(genre_id=gid, genre_name=_genre_name(gid), count=cnt)
        for gid, cnt in genre_counter.most_common(5)
    ]

    # ── Group theo collection ───────────────────────────────
    # Lấy tất cả collection của user có phim trong watchlist
    col_ids = {m.collection_id for m in movies if m.collection_id is not None}
    col_map: dict[int, Collection] = {}
    if col_ids:
        cols = db.query(Collection).filter(Collection.id.in_(col_ids)).all()
        col_map = {c.id: c for c in cols}

    # Nhóm phim theo collection
    groups_dict: dict[Optional[int], list] = {}
    for m in movies:
        key = m.collection_id
        groups_dict.setdefault(key, []).append(m)

    # Sắp xếp: collection có tên lên trước, "Không có bộ sưu tập" xuống cuối
    from app.schemas.watchlist_schema import PublicCollectionGroup
    collection_groups = []
    for col_id, col_movies in sorted(
        groups_dict.items(),
        key=lambda kv: (kv[0] is None, col_map.get(kv[0], Collection()).name if kv[0] else ""),
    ):
        if col_id is not None and col_id in col_map:
            col = col_map[col_id]
            collection_groups.append(PublicCollectionGroup(
                id=col_id,
                name=col.name,
                description=col.description,
                movies=col_movies,
            ))
        else:
            collection_groups.append(PublicCollectionGroup(
                id=None,
                name="Chưa phân loại",
                description=None,
                movies=col_movies,
            ))

    return {
        "owner_username":        user.username if user else None,
        "owner_avatar":          user.avatar if user else None,
        "owner_avatar_url":      user.avatar_url if user else None,
        "owner_bio":             user.bio if user else None,
        "total":                 len(movies),
        "watched":               sum(1 for m in movies if m.is_watched),
        "total_runtime_minutes": total_runtime,
        "top_genres":            top_genres,
        "collections":           collection_groups,
        "movies":                movies,
    }
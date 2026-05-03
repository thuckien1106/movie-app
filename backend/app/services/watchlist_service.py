import secrets
import threading
import logging
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

_svc_logger = logging.getLogger(__name__)


def _fetch_and_patch_runtime(movie_id: int, watchlist_id: int) -> None:
    """
    Chạy trong background thread — gọi TMDB lấy runtime rồi patch vào DB.
    Dùng SessionLocal riêng để tránh conflict với session của request chính.
    """
    from app.database.connection import SessionLocal
    from app.services import tmdb_service

    db = SessionLocal()
    try:
        item = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
        if not item:
            return
        # Không làm gì nếu đã có runtime hợp lệ
        if item.runtime and item.runtime > 0:
            return

        detail = tmdb_service.get_movie_detail(movie_id)
        if "error" in detail:
            _svc_logger.warning(f"[runtime_fetch] TMDB error for movie_id={movie_id}: {detail}")
            return

        changed = False
        runtime = detail.get("runtime")
        if runtime and runtime > 0:
            item.runtime = runtime
            changed = True

        genre_ids = detail.get("genre_ids")
        if genre_ids and not item.genre_ids:
            if isinstance(genre_ids, list):
                item.genre_ids = ",".join(str(g) for g in genre_ids)
            elif isinstance(genre_ids, str):
                item.genre_ids = genre_ids
            changed = True

        if changed:
            db.commit()
            _svc_logger.info(
                f"[runtime_fetch] patched movie_id={movie_id} "
                f"runtime={runtime} genre_ids={item.genre_ids}"
            )
    except Exception as e:
        _svc_logger.error(f"[runtime_fetch] movie_id={movie_id} exception: {e}")
    finally:
        db.close()


# ════════════════════════════════════════════
# WATCHLIST CRUD
# ════════════════════════════════════════════

def add_to_watchlist(db: Session, user_id: int, data: WatchlistCreate):
    """
    Thêm phim vào watchlist.

    - Nếu phim đã tồn tại: cập nhật runtime/genre_ids nếu lần này có data tốt hơn.
    - Nếu phim mới + thiếu runtime: tự động fetch TMDB trong background thread
      (không block response, user không cần làm gì thêm).
    """
    # ── Phim đã tồn tại ──────────────────────────────────────────
    existing = db.query(Watchlist).filter(
        Watchlist.user_id == user_id,
        Watchlist.movie_id == data.movie_id,
    ).first()
    if existing:
        changed = False
        if data.runtime and data.runtime > 0 and (not existing.runtime or existing.runtime == 0):
            existing.runtime = data.runtime
            changed = True
        if data.genre_ids and not existing.genre_ids:
            existing.genre_ids = data.genre_ids
            changed = True
        if changed:
            db.commit()
            db.refresh(existing)

        # Nếu vẫn thiếu runtime (cả 2 lần đều không có) → fetch background
        if not existing.runtime or existing.runtime == 0:
            t = threading.Thread(
                target=_fetch_and_patch_runtime,
                args=(existing.movie_id, existing.id),
                daemon=True,
            )
            t.start()

        return existing

    # ── Phim mới ─────────────────────────────────────────────────
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

    # Nếu thiếu runtime → fetch TMDB ngay trong background
    if not item.runtime or item.runtime == 0:
        t = threading.Thread(
            target=_fetch_and_patch_runtime,
            args=(item.movie_id, item.id),
            daemon=True,
        )
        t.start()
        _svc_logger.info(
            f"[runtime_fetch] spawned background fetch for "
            f"movie_id={item.movie_id} watchlist_id={item.id}"
        )

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


def update_rating(db: Session, user_id: int, movie_id: int, rating: int | None):
    """
    Cập nhật đánh giá cá nhân (1-10) cho phim trong watchlist.
    Truyền rating=None để xoá đánh giá.
    """
    item = db.query(Watchlist).filter(
        Watchlist.user_id == user_id,
        Watchlist.movie_id == movie_id
    ).first()
    if not item:
        return None
    item.rating = rating
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

def update_collection(db: Session, user_id: int, collection_id: int, data) -> CollectionResponse | None:
    """
    Đổi tên / mô tả bộ sưu tập.
    Trả về None nếu không tìm thấy hoặc không có quyền.
    """
    col = db.query(Collection).filter(
        Collection.id == collection_id,
        Collection.user_id == user_id,
    ).first()
    if not col:
        return None
 
    if data.name is not None:
        col.name = data.name.strip()
    if data.description is not None:
        col.description = data.description.strip() or None
 
    db.commit()
    db.refresh(col)
 
    count = db.query(Watchlist).filter(
        Watchlist.user_id == user_id,
        Watchlist.collection_id == col.id,
    ).count()
 
    return CollectionResponse(
        id=col.id,
        name=col.name,
        description=col.description,
        movie_count=count,
        created_at=col.created_at,
    )
 
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

# ════════════════════════════════════════════
# DETAILED STATS (dùng cho Statistics dashboard)
# ════════════════════════════════════════════

def get_detailed_stats(db: Session, user_id: int):
    """
    Trả về stats đầy đủ cho trang Statistics:
    - Tất cả genres (không giới hạn top 5)
    - Monthly activity 12 tháng gần nhất (added + watched)
    - Streak tháng liên tiếp có xem phim
    - Avg runtime của phim đã xem
    """
    from datetime import date, timezone
    from collections import defaultdict
    from app.schemas.watchlist_schema import (
        GenreStat, MonthlyActivity, DetailedStats,
    )

    movies = db.query(Watchlist).filter(Watchlist.user_id == user_id).all()
    watched_items = [m for m in movies if m.is_watched]

    # ── Runtimes ──────────────────────────────
    total_runtime   = sum(m.runtime or 0 for m in movies)
    watched_runtime = sum(m.runtime or 0 for m in watched_items)
    avg_runtime = (
        watched_runtime // len(watched_items) if watched_items else 0
    )

    # ── All genres ────────────────────────────
    all_genre_ids: list[str] = []
    for m in movies:
        if m.genre_ids:
            all_genre_ids.extend(gid.strip() for gid in m.genre_ids.split(",") if gid.strip())
    genre_counter = Counter(all_genre_ids)
    top_genres = [
        GenreStat(genre_id=gid, genre_name=_genre_name(gid), count=cnt)
        for gid, cnt in genre_counter.most_common(5)
    ]
    all_genres = [
        GenreStat(genre_id=gid, genre_name=_genre_name(gid), count=cnt)
        for gid, cnt in genre_counter.most_common()
    ]

    # ── Monthly activity (12 tháng gần nhất) ──
    today = date.today()
    months: list[tuple[int, int]] = []
    for i in range(11, -1, -1):
        m_offset = today.month - 1 - i
        y = today.year + m_offset // 12
        mo = m_offset % 12 + 1
        months.append((y, mo))

    added_map:   dict[tuple, int] = defaultdict(int)
    watched_map: dict[tuple, int] = defaultdict(int)

    for item in movies:
        if item.added_at:
            try:
                dt = item.added_at
                if hasattr(dt, "tzinfo") and dt.tzinfo:
                    dt = dt.replace(tzinfo=None)
                key = (dt.year, dt.month)
                added_map[key] += 1
            except Exception:
                pass

    for item in watched_items:
        if item.watched_at:
            try:
                dt = item.watched_at
                if hasattr(dt, "tzinfo") and dt.tzinfo:
                    dt = dt.replace(tzinfo=None)
                key = (dt.year, dt.month)
                watched_map[key] += 1
            except Exception:
                pass

    monthly_activity = [
        MonthlyActivity(
            year=y, month=mo,
            added=added_map.get((y, mo), 0),
            watched=watched_map.get((y, mo), 0),
        )
        for y, mo in months
    ]

    # ── Streak (tháng liên tiếp có xem phim) ──
    # Tính trên toàn bộ lịch sử, không chỉ 12 tháng
    watched_months: set[tuple] = set()
    for item in watched_items:
        if item.watched_at:
            try:
                dt = item.watched_at
                if hasattr(dt, "tzinfo") and dt.tzinfo:
                    dt = dt.replace(tzinfo=None)
                watched_months.add((dt.year, dt.month))
            except Exception:
                pass

    def prev_month(y: int, m: int) -> tuple[int, int]:
        return (y, m - 1) if m > 1 else (y - 1, 12)

    # Current streak: đếm ngược từ tháng hiện tại
    current_streak = 0
    cy, cm = today.year, today.month
    while (cy, cm) in watched_months:
        current_streak += 1
        cy, cm = prev_month(cy, cm)

    # Best streak: quét toàn bộ
    best_streak = 0
    if watched_months:
        all_sorted = sorted(watched_months)
        streak = 1
        for i in range(1, len(all_sorted)):
            py, pm = all_sorted[i - 1]
            cy2, cm2 = all_sorted[i]
            ny, nm = (py, pm + 1) if pm < 12 else (py + 1, 1)
            if (cy2, cm2) == (ny, nm):
                streak += 1
                best_streak = max(best_streak, streak)
            else:
                streak = 1
        best_streak = max(best_streak, streak, current_streak)

    # ── Most active month ─────────────────────
    most_active_month: Optional[str] = None
    if watched_map:
        best_key = max(watched_map, key=lambda k: watched_map[k])
        most_active_month = f"{best_key[0]}-{best_key[1]:02d}"

    return DetailedStats(
        total=len(movies),
        watched=len(watched_items),
        unwatched=len(movies) - len(watched_items),
        total_runtime_minutes=total_runtime,
        watched_runtime_minutes=watched_runtime,
        top_genres=top_genres,
        all_genres=all_genres,
        monthly_activity=monthly_activity,
        current_streak=current_streak,
        best_streak=best_streak,
        avg_runtime_minutes=avg_runtime,
        most_active_month=most_active_month,
    )


# ════════════════════════════════════════════
# BACKFILL — cập nhật runtime + genre_ids cho phim thiếu data
# ════════════════════════════════════════════

def backfill_missing_runtime(db: Session, user_id: int) -> int:
    
    import logging
    import time
    logger = logging.getLogger(__name__)

    # Lấy tất cả phim thiếu runtime — dùng is_(None) thay vì == None
    from sqlalchemy import or_
    items = db.query(Watchlist).filter(
        Watchlist.user_id == user_id,
        or_(Watchlist.runtime.is_(None), Watchlist.runtime == 0),
    ).all()

    if not items:
        return 0

    updated = 0
    for item in items:
        try:
            detail = tmdb_service.get_movie_detail(item.movie_id)
            runtime   = detail.get("runtime")
            genre_ids = detail.get("genre_ids")  # list of ints from format_movie_detail

            changed = False
            if runtime and runtime > 0:
                item.runtime = runtime
                changed = True
            if genre_ids:
                if isinstance(genre_ids, list):
                    item.genre_ids = ",".join(str(g) for g in genre_ids)
                elif isinstance(genre_ids, str) and genre_ids:
                    item.genre_ids = genre_ids
                changed = True

            if changed:
                updated += 1

            # Tránh spam TMDB API — 250ms giữa mỗi request
            time.sleep(0.25)

        except Exception as e:
            logger.warning(f"[backfill] movie_id={item.movie_id} error: {e}")
            continue

    db.commit()
    logger.info(f"[backfill] user_id={user_id} → updated {updated}/{len(items)} items")
    return updated

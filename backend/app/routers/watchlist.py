from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import Optional
import re

from app.schemas.watchlist_schema import (
    WatchlistCreate, WatchlistResponse, WatchlistNoteUpdate,
    WatchlistMoveCollection, WatchlistRatingUpdate, WatchlistStats,
    CollectionCreate, CollectionUpdate, CollectionResponse,
    ShareResponse, PublicWatchlistResponse,
)
from app.services import watchlist_service
from app.utils.dependencies import get_db, get_current_user
from app.utils.rate_limit import limiter, Limits
from app.models.user import User

router = APIRouter(prefix="/watchlist", tags=["Watchlist"])

# Share token: chỉ cho phép alphanumeric + dash/underscore (URL-safe base64)
_TOKEN_RE = re.compile(r'^[A-Za-z0-9_\-]{10,128}$')


def _validate_movie_id(movie_id: int) -> int:
    if movie_id <= 0 or movie_id > 10_000_000:
        raise HTTPException(status_code=422, detail="movie_id không hợp lệ.")
    return movie_id


def _validate_collection_id(collection_id: int) -> int:
    if collection_id <= 0 or collection_id > 10_000_000:
        raise HTTPException(status_code=422, detail="collection_id không hợp lệ.")
    return collection_id


# ════════════════════════════════════════════
# WATCHLIST CORE
# ════════════════════════════════════════════

@router.get("/", response_model=list[WatchlistResponse])
def get_all(
    request:       Request,
    collection_id: Optional[int] = Query(None, ge=1),
    db:            Session       = Depends(get_db),
    current_user:  User          = Depends(get_current_user),
):
    limiter.check(request, "watchlist_read", **Limits.READ_GENERAL)
    return watchlist_service.get_watchlist(db, current_user.id, collection_id)


@router.post("/", response_model=WatchlistResponse)
def add_movie(
    request:      Request,
    data:         WatchlistCreate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    limiter.check(request, "watchlist_write", **Limits.WATCHLIST_WRITE)
    return watchlist_service.add_to_watchlist(db, current_user.id, data)


@router.delete("/{movie_id}")
def delete_movie(
    request:      Request,
    movie_id:     int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    limiter.check(request, "watchlist_write", **Limits.WATCHLIST_WRITE)
    _validate_movie_id(movie_id)
    return watchlist_service.remove_from_watchlist(db, current_user.id, movie_id)


@router.put("/{movie_id}/toggle-watched", response_model=WatchlistResponse)
def toggle_watched(
    request:      Request,
    movie_id:     int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    limiter.check(request, "watchlist_write", **Limits.WATCHLIST_WRITE)
    _validate_movie_id(movie_id)
    item = watchlist_service.mark_as_watched(db, current_user.id, movie_id)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy phim trong watchlist.")
    return item


@router.patch("/{movie_id}/note", response_model=WatchlistResponse)
def update_note(
    request:      Request,
    movie_id:     int,
    body:         WatchlistNoteUpdate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    limiter.check(request, "watchlist_write", **Limits.WATCHLIST_WRITE)
    _validate_movie_id(movie_id)
    item = watchlist_service.update_note(db, current_user.id, movie_id, body.note)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy phim trong watchlist.")
    return item


@router.patch("/{movie_id}/rating", response_model=WatchlistResponse)
def update_rating(
    request:      Request,
    movie_id:     int,
    body:         WatchlistRatingUpdate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """Đặt hoặc xoá đánh giá cá nhân (1-10) cho phim trong watchlist."""
    limiter.check(request, "watchlist_write", **Limits.WATCHLIST_WRITE)
    _validate_movie_id(movie_id)
    item = watchlist_service.update_rating(db, current_user.id, movie_id, body.rating)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy phim trong watchlist.")
    return item


@router.patch("/{movie_id}/collection", response_model=WatchlistResponse)
def move_collection(
    request:      Request,
    movie_id:     int,
    body:         WatchlistMoveCollection,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    limiter.check(request, "watchlist_write", **Limits.WATCHLIST_WRITE)
    _validate_movie_id(movie_id)
    item = watchlist_service.move_to_collection(db, current_user.id, movie_id, body.collection_id)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy phim trong watchlist.")
    return item


# ════════════════════════════════════════════
# STATS
# ════════════════════════════════════════════

@router.get("/stats", response_model=WatchlistStats)
def get_stats(
    request:      Request,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    limiter.check(request, "watchlist_read", **Limits.READ_GENERAL)
    return watchlist_service.get_watchlist_stats(db, current_user.id)


@router.get("/stats/detail")
def get_stats_detail(
    request:      Request,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """Stats chi tiết cho trang Statistics dashboard — monthly activity, streak, all genres."""
    limiter.check(request, "watchlist_read", **Limits.READ_GENERAL)
    return watchlist_service.get_detailed_stats(db, current_user.id)


# ════════════════════════════════════════════
# COLLECTIONS
# ════════════════════════════════════════════

@router.get("/collections", response_model=list[CollectionResponse])
def get_collections(
    request:      Request,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    limiter.check(request, "watchlist_read", **Limits.READ_GENERAL)
    return watchlist_service.get_collections(db, current_user.id)


@router.post("/collections", response_model=CollectionResponse)
def create_collection(
    request:      Request,
    data:         CollectionCreate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    # Limit tạo collection: 20 lần / phút (chặn tạo hàng loạt)
    limiter.check(request, "create_collection", max_calls=20, window_sec=60)
    return watchlist_service.create_collection(db, current_user.id, data)


@router.delete("/collections/{collection_id}")
def delete_collection(
    request:       Request,
    collection_id: int,
    db:            Session = Depends(get_db),
    current_user:  User    = Depends(get_current_user),
):
    limiter.check(request, "watchlist_write", **Limits.WATCHLIST_WRITE)
    _validate_collection_id(collection_id)
    ok = watchlist_service.delete_collection(db, current_user.id, collection_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy bộ sưu tập.")
    return {"message": "Đã xoá bộ sưu tập."}


@router.patch("/collections/{collection_id}", response_model=CollectionResponse)
def update_collection(
    request:       Request,
    collection_id: int,
    data:          CollectionUpdate,
    db:            Session = Depends(get_db),
    current_user:  User    = Depends(get_current_user),
):
    """Đổi tên hoặc mô tả bộ sưu tập."""
    limiter.check(request, "watchlist_write", **Limits.WATCHLIST_WRITE)
    _validate_collection_id(collection_id)
    col = watchlist_service.update_collection(db, current_user.id, collection_id, data)
    if not col:
        raise HTTPException(status_code=404, detail="Không tìm thấy bộ sưu tập.")
    return col


# ════════════════════════════════════════════
# SHARE
# ════════════════════════════════════════════

@router.get("/share/link", response_model=ShareResponse)
def get_share_link(
    request:      Request,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    limiter.check(request, "watchlist_read", **Limits.READ_GENERAL)
    share    = watchlist_service.get_or_create_share(db, current_user.id)
    base_url = str(request.base_url).rstrip("/")
    return ShareResponse(
        share_token=share.share_token,
        share_url=f"{base_url}/watchlist/public/{share.share_token}",
        is_active=share.is_active,
    )


@router.post("/share/toggle", response_model=ShareResponse)
def toggle_share(
    request:      Request,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    limiter.check(request, "share_toggle", max_calls=10, window_sec=60)
    share    = watchlist_service.toggle_share(db, current_user.id)
    base_url = str(request.base_url).rstrip("/")
    return ShareResponse(
        share_token=share.share_token,
        share_url=f"{base_url}/watchlist/public/{share.share_token}",
        is_active=share.is_active,
    )


# ════════════════════════════════════════════
# PUBLIC — không cần auth
# ════════════════════════════════════════════

@router.get("/public/{share_token}", response_model=PublicWatchlistResponse)
def public_watchlist(
    request:     Request,
    share_token: str,
    db:          Session = Depends(get_db),
):
    # Giới hạn truy cập link public để tránh scraping
    limiter.check(request, "public_watchlist", max_calls=30, window_sec=60)

    # Validate token format trước khi query DB
    if not _TOKEN_RE.match(share_token):
        raise HTTPException(status_code=400, detail="Share token không hợp lệ.")

    data = watchlist_service.get_public_watchlist(db, share_token)
    if data is None:
        raise HTTPException(status_code=404, detail="Watchlist không tìm thấy hoặc chưa bật chia sẻ.")
    return data


# ════════════════════════════════════════════
# BACKFILL — cập nhật runtime + genre_ids cho phim thiếu data
# ════════════════════════════════════════════

@router.post("/backfill-runtime")
def backfill_runtime(
    request:      Request,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """
    Quét toàn bộ watchlist của user, tìm các phim thiếu runtime,
    gọi TMDB lấy thông tin rồi cập nhật vào DB.
    Trả về số phim đã được cập nhật.
    """
    limiter.check(request, "backfill", max_calls=3, window_sec=300)
    updated = watchlist_service.backfill_missing_runtime(db, current_user.id)
    return {"updated": updated, "message": f"Đã cập nhật {updated} phim."}
# app/routers/movies.py
import re
from fastapi import APIRouter, Query, Depends, Request, HTTPException, Path
from typing import Optional
from app.services import tmdb_service
from app.utils.dependencies import get_current_user
from app.utils.rate_limit import limiter, Limits
from app.models.user import User

router = APIRouter(prefix="/movies", tags=["Movies"])


@router.get("/cache/stats", tags=["Debug"])
async def get_cache_stats():
    """Xem hit rate cache TMDB — dùng để monitor hiệu quả cache."""
    return tmdb_service.cache_stats()

VALID_SORT_BY = {
    "popularity.desc", "popularity.asc",
    "vote_average.desc", "vote_average.asc",
    "release_date.desc", "release_date.asc",
    "revenue.desc", "revenue.asc",
    "vote_count.desc", "vote_count.asc",
    "original_title.asc", "original_title.desc",
}

_DANGEROUS_CHARS_RE = re.compile(r'[<>{}\\\`\^~|;=*%\x00-\x1f]')


def validate_search_query(q: str) -> str:
    q = q.strip()
    if not q:
        raise HTTPException(status_code=422, detail="Query không được để trống.")
    if len(q) > 200:
        raise HTTPException(status_code=422, detail="Query tìm kiếm quá dài (tối đa 200 ký tự).")
    if _DANGEROUS_CHARS_RE.search(q):
        raise HTTPException(status_code=422, detail="Query chứa ký tự không hợp lệ.")
    return q


# ── LISTS ──────────────────────────────────────────────────

@router.get("/genres")
async def genres(request: Request):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return await tmdb_service.get_genres()


@router.get("/trending")
async def trending(request: Request):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return await tmdb_service.get_trending_movies()


@router.get("/popular")
async def popular(request: Request, page: int = Query(1, ge=1, le=500)):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return await tmdb_service.get_popular_movies(page)


@router.get("/top-rated")
async def top_rated(request: Request, page: int = Query(1, ge=1, le=500)):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return await tmdb_service.get_top_rated_movies(page)


@router.get("/upcoming")
async def upcoming(request: Request, page: int = Query(1, ge=1, le=500)):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return await tmdb_service.get_upcoming_movies(page)


@router.get("/now-playing")
async def now_playing(request: Request, page: int = Query(1, ge=1, le=500)):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return await tmdb_service.get_now_playing_movies(page)


@router.get("/all")
async def get_all_movies(
    request: Request,
    page: int = Query(1, ge=1, le=500),
    genre_id: Optional[int] = Query(None, ge=1, le=99999),
    year: Optional[int] = Query(None, ge=1900, le=2100),
    min_rating: Optional[float] = Query(None, ge=0, le=10),
    sort_by: str = Query("popularity.desc"),
):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    if sort_by not in VALID_SORT_BY:
        raise HTTPException(
            status_code=422,
            detail=f"sort_by không hợp lệ. Các giá trị cho phép: {', '.join(sorted(VALID_SORT_BY))}",
        )
    return await tmdb_service.get_all_movies(page, genre_id, year, min_rating, sort_by)


@router.get("/search")
async def search(
    request: Request,
    q: str = Query(..., min_length=1, max_length=200),
    page: int = Query(1, ge=1, le=100),
):
    limiter.check(request, "search", **Limits.SEARCH)
    q = validate_search_query(q)
    return await tmdb_service.search_movies(q, page)


# ── PERSON ────────────────────────────────────────────────

@router.get("/person/{person_id}")
async def person_detail(
    request: Request,
    person_id: int = Path(..., ge=1, le=10_000_000),
):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    data = await tmdb_service.get_person_detail(person_id)
    if "error" in data:
        raise HTTPException(status_code=404, detail="Không tìm thấy người này.")
    return data


@router.get("/person/{person_id}/credits")
async def person_credits(
    request: Request,
    person_id: int = Path(..., ge=1, le=10_000_000),
):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return await tmdb_service.get_person_credits(person_id)


# ── SINGLE MOVIE ───────────────────────────────────────────

@router.get("/{movie_id}")
async def movie_detail(
    request: Request,
    movie_id: int = Path(..., ge=1, le=10_000_000),
):
    """
    Trả về thông tin chi tiết phim.
    Dùng get_movie_full() để fetch detail + cast + similar song song (~600ms thay vì ~2s).
    """
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return await tmdb_service.get_movie_full(movie_id)


@router.get("/{movie_id}/trailer")
async def trailer(
    request: Request,
    movie_id: int = Path(..., ge=1, le=10_000_000),
):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return await tmdb_service.get_movie_trailer(movie_id)


@router.get("/{movie_id}/cast")
async def cast(
    request: Request,
    movie_id: int = Path(..., ge=1, le=10_000_000),
    limit: int = Query(15, ge=1, le=30),
):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return await tmdb_service.get_movie_cast_with_crew(movie_id, cast_limit=limit)


@router.get("/{movie_id}/similar")
async def similar(
    request: Request,
    movie_id: int = Path(..., ge=1, le=10_000_000),
    page: int = Query(1, ge=1, le=100),
):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return await tmdb_service.get_similar_movies(movie_id, page)
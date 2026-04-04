import re
from fastapi import APIRouter, Query, Depends, Request, HTTPException, Path
from typing import Optional
from app.services import tmdb_service
from app.utils.dependencies import get_current_user
from app.utils.rate_limit import limiter, Limits
from app.models.user import User

router = APIRouter(prefix="/movies", tags=["Movies"])

# Whitelist sort_by values — chặn injection qua query param
VALID_SORT_BY = {
    "popularity.desc", "popularity.asc",
    "vote_average.desc", "vote_average.asc",
    "release_date.desc", "release_date.asc",
    "revenue.desc", "revenue.asc",
    "vote_count.desc", "vote_count.asc",
    "original_title.asc", "original_title.desc",
}

# Regex: chỉ cho phép ký tự an toàn trong query tìm kiếm
_SAFE_QUERY_RE = re.compile(
    r'^[\w\s\-\.\'\,\!\?\(\)àáảãạăắặằẳẵâấầẩẫậèéẻẽẹêếềệểễìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđÀÁẢÃẠĂẮẶẰẲẴÂẤẦẨẪẬÈÉẺẼẸÊẾỀỆỂỄÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ]+$',
    re.UNICODE
)


def validate_search_query(q: str) -> str:
    q = q.strip()
    if len(q) > 200:
        raise HTTPException(status_code=422, detail="Query tìm kiếm quá dài (tối đa 200 ký tự).")
    if not q:
        raise HTTPException(status_code=422, detail="Query không được để trống.")
    if not _SAFE_QUERY_RE.match(q):
        raise HTTPException(status_code=422, detail="Query chứa ký tự không hợp lệ.")
    return q


# ── LISTS ──────────────────────────────────────────────────

@router.get("/genres")
def genres(request: Request):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return tmdb_service.get_genres()


@router.get("/trending")
def trending(request: Request):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return tmdb_service.get_trending_movies()


@router.get("/popular")
def popular(request: Request, page: int = Query(1, ge=1, le=500)):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return tmdb_service.get_popular_movies(page)


@router.get("/top-rated")
def top_rated(request: Request, page: int = Query(1, ge=1, le=500)):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return tmdb_service.get_top_rated_movies(page)


@router.get("/upcoming")
def upcoming(request: Request, page: int = Query(1, ge=1, le=500)):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return tmdb_service.get_upcoming_movies(page)


@router.get("/all")
def get_all_movies(
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

    return tmdb_service.get_all_movies(page, genre_id, year, min_rating, sort_by)


@router.get("/search")
def search(
    request: Request,
    q: str = Query(..., min_length=1, max_length=200),
    page: int = Query(1, ge=1, le=100),
):
    limiter.check(request, "search", **Limits.SEARCH)
    q = validate_search_query(q)
    return tmdb_service.search_movies(q, page)


# ── SINGLE MOVIE ───────────────────────────────────────────

@router.get("/{movie_id}")
def movie_detail(
    request: Request,
    movie_id: int = Path(..., ge=1, le=10_000_000),
):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return tmdb_service.get_movie_detail(movie_id)


@router.get("/{movie_id}/trailer")
def trailer(
    request: Request,
    movie_id: int = Path(..., ge=1, le=10_000_000),
):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return tmdb_service.get_movie_trailer(movie_id)


@router.get("/{movie_id}/cast")
def cast(
    request: Request,
    movie_id: int = Path(..., ge=1, le=10_000_000),
    limit: int = Query(15, ge=1, le=30),
):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return tmdb_service.get_movie_cast(movie_id, limit)


@router.get("/{movie_id}/similar")
def similar(
    request: Request,
    movie_id: int = Path(..., ge=1, le=10_000_000),
    page: int = Query(1, ge=1, le=100),
):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return tmdb_service.get_similar_movies(movie_id, page)
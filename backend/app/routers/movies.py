import re
from fastapi import APIRouter, Query, Depends, Request, HTTPException, Path
from typing import Optional
from app.services import tmdb_service
from app.utils.dependencies import get_current_user
from app.utils.rate_limit import limiter, Limits
from app.models.user import User

router = APIRouter(prefix="/movies", tags=["Movies"])

# Whitelist sort_by values
VALID_SORT_BY = {
    "popularity.desc", "popularity.asc",
    "vote_average.desc", "vote_average.asc",
    "release_date.desc", "release_date.asc",
    "revenue.desc", "revenue.asc",
    "vote_count.desc", "vote_count.asc",
    "original_title.asc", "original_title.desc",
}

# Blacklist: chặn các ký tự nguy hiểm (injection, script) và ký tự điều khiển.
# Cho phép mọi thứ khác — kể cả số, Unicode, ký tự đặc biệt phổ biến trong tên phim
# như: : & + / # @ " ' - . , ! ? ( ) [ ] v.v.
# Chặn: < > { } \ ` ^ ~ | ; = * % và ký tự điều khiển (ASCII < 32).
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


# ── PERSON (DIỄN VIÊN / ĐẠO DIỄN) ────────────────────────

@router.get("/person/{person_id}")
def person_detail(
    request: Request,
    person_id: int = Path(..., ge=1, le=10_000_000),
):
    """Thông tin cá nhân: tên, tiểu sử, ngày sinh, ảnh đại diện."""
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    data = tmdb_service.get_person_detail(person_id)
    if "error" in data:
        raise HTTPException(status_code=404, detail="Không tìm thấy người này.")
    return data


@router.get("/person/{person_id}/credits")
def person_credits(
    request: Request,
    person_id: int = Path(..., ge=1, le=10_000_000),
):
    """Filmography: tất cả phim đã tham gia (vai diễn + đạo diễn/biên kịch)."""
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return tmdb_service.get_person_credits(person_id)


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
    """Trả về cast + crew (đạo diễn, biên kịch) của bộ phim."""
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    # Dùng hàm mới trả về cả cast lẫn crew
    return tmdb_service.get_movie_cast_with_crew(movie_id, cast_limit=limit)


@router.get("/{movie_id}/similar")
def similar(
    request: Request,
    movie_id: int = Path(..., ge=1, le=10_000_000),
    page: int = Query(1, ge=1, le=100),
):
    limiter.check(request, "movies_read", **Limits.READ_GENERAL)
    return tmdb_service.get_similar_movies(movie_id, page)
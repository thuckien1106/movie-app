# app/services/tmdb_service.py
"""
TMDB Service — async với httpx.AsyncClient + TTL cache.

Mọi hàm đều là `async def`, gọi bằng `await` từ router.

Cache strategy (in-memory TTLCache, thread-safe):
  - Genres          : TTL 24 giờ  — gần như không đổi
  - Trending        : TTL 10 phút — cập nhật theo tuần nhưng refresh nhanh cho UX
  - Popular / Lists : TTL 10 phút — thay đổi chậm
  - Movie detail    : TTL 1 giờ   — metadata phim rất ổn định
  - Search          : TTL 5 phút  — kết quả theo query, cache ngắn để không stale
  - Person          : TTL 6 giờ   — tiểu sử hiếm khi thay đổi

Hàm đặc biệt:
  get_movie_full()  — gọi song song detail + cast + similar (~500ms thay vì ~2s)
  cache_stats()     — trả về số hit/miss để monitor
"""

import asyncio
import logging
import threading
import httpx
from cachetools import TTLCache
from app.utils.config import settings

logger = logging.getLogger(__name__)

BASE_URL      = "https://api.themoviedb.org/3"
IMAGE_BASE    = "https://image.tmdb.org/t/p/w500"
BACKDROP_BASE = "https://image.tmdb.org/t/p/original"
PROFILE_BASE  = "https://image.tmdb.org/t/p/w185"

# httpx client dùng chung — connection pooling, timeout mặc định
_client = httpx.AsyncClient(timeout=httpx.Timeout(8.0))


# ════════════════════════════════════════════
# CACHE SETUP
# ════════════════════════════════════════════

# Mỗi nhóm dữ liệu có TTL riêng, maxsize đủ chứa các key thường gặp
_cache_genres   = TTLCache(maxsize=1,    ttl=86400)   # 24 giờ — 1 key duy nhất
_cache_lists    = TTLCache(maxsize=200,  ttl=600)     # 10 phút — trending/popular/page N
_cache_detail   = TTLCache(maxsize=500,  ttl=3600)    # 1 giờ  — movie detail theo id
_cache_search   = TTLCache(maxsize=300,  ttl=300)     # 5 phút — query+page
_cache_person   = TTLCache(maxsize=200,  ttl=21600)   # 6 giờ  — person detail/credits
_cache_lock     = threading.Lock()                    # TTLCache không thread-safe

# Counters để monitor hit rate
_stats = {"hits": 0, "misses": 0}


def _cache_get(cache: TTLCache, key: str):
    with _cache_lock:
        return cache.get(key)


def _cache_set(cache: TTLCache, key: str, value):
    with _cache_lock:
        cache[key] = value


def cache_stats() -> dict:
    """Trả về hit/miss stats — dùng ở /health endpoint để monitor."""
    with _cache_lock:
        total = _stats["hits"] + _stats["misses"]
        hit_rate = round(_stats["hits"] / total * 100, 1) if total else 0
        return {
            "hits":     _stats["hits"],
            "misses":   _stats["misses"],
            "hit_rate": f"{hit_rate}%",
            "sizes": {
                "genres":  len(_cache_genres),
                "lists":   len(_cache_lists),
                "detail":  len(_cache_detail),
                "search":  len(_cache_search),
                "person":  len(_cache_person),
            },
        }


def _hit():
    with _cache_lock:
        _stats["hits"] += 1


def _miss():
    with _cache_lock:
        _stats["misses"] += 1


async def _cached(cache: TTLCache, key: str, coro_fn):
    """
    Helper chung: kiểm tra cache trước, nếu miss thì await coro_fn() và lưu lại.

    Dùng:
        return await _cached(_cache_lists, f"trending", get_trending_raw)
    """
    cached = _cache_get(cache, key)
    if cached is not None:
        _hit()
        return cached
    _miss()
    result = await coro_fn()
    if result and "error" not in result:
        _cache_set(cache, key, result)
    return result


# ════════════════════════════════════════════
# SAFE REQUEST
# ════════════════════════════════════════════

async def safe_request(url: str, params: dict) -> dict:
    if not settings.TMDB_API_KEY:
        return {"error": "Missing TMDB API key"}
    try:
        response = await _client.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except httpx.TimeoutException:
        logger.error(f"TMDB request timeout: {url}")
        return {"error": "TMDB timeout"}
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error: {e}")
        return {"error": f"HTTP error: {str(e)}"}
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return {"error": "TMDB API failed"}


# ════════════════════════════════════════════
# FORMAT HELPERS  (sync — không I/O)
# ════════════════════════════════════════════

def format_movie(movie: dict) -> dict:
    return {
        "id":           movie.get("id"),
        "title":        movie.get("title"),
        "poster":       f"{IMAGE_BASE}{movie.get('poster_path')}" if movie.get("poster_path") else None,
        "backdrop":     f"{BACKDROP_BASE}{movie.get('backdrop_path')}" if movie.get("backdrop_path") else None,
        "rating":       movie.get("vote_average"),
        "release_date": movie.get("release_date"),
        "genre_ids":    movie.get("genre_ids", []),
        "overview":     movie.get("overview"),
    }


def format_movie_list(movies: list) -> list:
    return [format_movie(m) for m in movies]


def format_movie_detail(movie: dict) -> dict:
    return {
        "id":                movie.get("id"),
        "title":             movie.get("title"),
        "poster":            f"{IMAGE_BASE}{movie.get('poster_path')}" if movie.get("poster_path") else None,
        "backdrop":          f"{BACKDROP_BASE}{movie.get('backdrop_path')}" if movie.get("backdrop_path") else None,
        "rating":            movie.get("vote_average"),
        "release_date":      movie.get("release_date"),
        "overview":          movie.get("overview"),
        "genres":            [g["name"] for g in movie.get("genres", [])],
        "genre_ids":         [g["id"]   for g in movie.get("genres", [])],
        "runtime":           movie.get("runtime"),
        "tagline":           movie.get("tagline"),
        "status":            movie.get("status"),
        "budget":            movie.get("budget"),
        "revenue":           movie.get("revenue"),
        "vote_count":        movie.get("vote_count"),
        "original_language": movie.get("original_language"),
    }


# ════════════════════════════════════════════
# MOVIE LIST APIs
# ════════════════════════════════════════════

async def get_all_movies(page: int = 1, genre_id: int = None, year: int = None,
                         min_rating: float = None, sort_by: str = "popularity.desc") -> dict:
    cache_key = f"all:{page}:{genre_id}:{year}:{min_rating}:{sort_by}"
    cached = _cache_get(_cache_lists, cache_key)
    if cached is not None:
        _hit()
        return cached
    _miss()
    params = {
        "api_key":  settings.TMDB_API_KEY,
        "page":     page,
        "sort_by":  sort_by,
        "language": "vi-VN",
    }
    if genre_id:   params["with_genres"]          = genre_id
    if year:       params["primary_release_year"] = year
    if min_rating: params["vote_average.gte"]     = min_rating

    data = await safe_request(f"{BASE_URL}/discover/movie", params)
    if "error" in data:
        return {"results": [], "total_pages": 1, "page": page}
    result = {
        "results":     format_movie_list(data.get("results", [])),
        "total_pages": data.get("total_pages", 1),
        "page":        data.get("page", 1),
    }
    _cache_set(_cache_lists, cache_key, result)
    return result


async def get_trending_movies() -> list:
    async def _fetch():
        data = await safe_request(
            f"{BASE_URL}/trending/movie/week",
            {"api_key": settings.TMDB_API_KEY, "language": "vi-VN"},
        )
        return format_movie_list(data.get("results", [])) if "error" not in data else None

    result = _cache_get(_cache_lists, "trending")
    if result is not None:
        _hit()
        return result
    _miss()
    result = await _fetch()
    if result is not None:
        _cache_set(_cache_lists, "trending", result)
    return result or []


async def get_popular_movies(page: int = 1) -> dict:
    cache_key = f"popular:{page}"
    cached = _cache_get(_cache_lists, cache_key)
    if cached is not None:
        _hit()
        return cached
    _miss()
    data = await safe_request(
        f"{BASE_URL}/movie/popular",
        {"api_key": settings.TMDB_API_KEY, "page": page, "language": "vi-VN"},
    )
    if "error" in data:
        return {"results": [], "total_pages": 1, "page": page}
    result = {
        "results":     format_movie_list(data.get("results", [])),
        "total_pages": data.get("total_pages", 1),
        "page":        data.get("page", 1),
    }
    _cache_set(_cache_lists, cache_key, result)
    return result


async def get_top_rated_movies(page: int = 1) -> dict:
    cache_key = f"top_rated:{page}"
    cached = _cache_get(_cache_lists, cache_key)
    if cached is not None:
        _hit()
        return cached
    _miss()
    data = await safe_request(
        f"{BASE_URL}/movie/top_rated",
        {"api_key": settings.TMDB_API_KEY, "page": page, "language": "vi-VN"},
    )
    if "error" in data:
        return {"results": [], "total_pages": 1, "page": page}
    result = {
        "results":     format_movie_list(data.get("results", [])),
        "total_pages": data.get("total_pages", 1),
        "page":        data.get("page", 1),
    }
    _cache_set(_cache_lists, cache_key, result)
    return result


async def get_upcoming_movies(page: int = 1) -> dict:
    cache_key = f"upcoming:{page}"
    cached = _cache_get(_cache_lists, cache_key)
    if cached is not None:
        _hit()
        return cached
    _miss()
    data = await safe_request(
        f"{BASE_URL}/movie/upcoming",
        {"api_key": settings.TMDB_API_KEY, "page": page, "language": "vi-VN"},
    )
    if "error" in data:
        return {"results": [], "total_pages": 1, "page": page}
    result = {
        "results":     format_movie_list(data.get("results", [])),
        "total_pages": data.get("total_pages", 1),
        "page":        data.get("page", 1),
    }
    _cache_set(_cache_lists, cache_key, result)
    return result


async def get_now_playing_movies(page: int = 1) -> dict:
    cache_key = f"now_playing:{page}"
    cached = _cache_get(_cache_lists, cache_key)
    if cached is not None:
        _hit()
        return cached
    _miss()
    data = await safe_request(
        f"{BASE_URL}/movie/now_playing",
        {"api_key": settings.TMDB_API_KEY, "page": page, "language": "vi-VN"},
    )
    if "error" in data:
        return {"results": [], "total_pages": 1, "page": page}
    result = {
        "results":     format_movie_list(data.get("results", [])),
        "total_pages": data.get("total_pages", 1),
        "page":        data.get("page", 1),
    }
    _cache_set(_cache_lists, cache_key, result)
    return result


async def get_genres() -> list:
    async def _fetch():
        data = await safe_request(
            f"{BASE_URL}/genre/movie/list",
            {"api_key": settings.TMDB_API_KEY, "language": "vi-VN"},
        )
        return data.get("genres", []) if "error" not in data else None

    result = _cache_get(_cache_genres, "genres")
    if result is not None:
        _hit()
        return result
    _miss()
    result = await _fetch()
    if result:
        _cache_set(_cache_genres, "genres", result)
    return result or []


async def search_movies(query: str, page: int = 1) -> dict:
    cache_key = f"search:{query.lower().strip()}:{page}"
    cached = _cache_get(_cache_search, cache_key)
    if cached is not None:
        _hit()
        return cached
    _miss()
    data = await safe_request(
        f"{BASE_URL}/search/movie",
        {"api_key": settings.TMDB_API_KEY, "query": query, "page": page, "language": "vi-VN"},
    )
    if "error" in data:
        return {"results": [], "total_pages": 1, "page": page, "total_results": 0}
    result = {
        "results":       format_movie_list(data.get("results", [])),
        "total_pages":   data.get("total_pages", 1),
        "page":          data.get("page", 1),
        "total_results": data.get("total_results", 0),
    }
    _cache_set(_cache_search, cache_key, result)
    return result


async def discover_by_genre(genre_id, year_gte=None, year_lte=None, page=1) -> dict:
    cache_key = f"genre:{genre_id}:{year_gte}:{year_lte}:{page}"
    cached = _cache_get(_cache_lists, cache_key)
    if cached is not None:
        _hit()
        return cached
    _miss()
    params = {
        "api_key":        settings.TMDB_API_KEY,
        "with_genres":    genre_id,
        "sort_by":        "popularity.desc",
        "vote_count.gte": 100,
        "page":           page,
        "language":       "vi-VN",
    }
    if year_gte: params["primary_release_date.gte"] = year_gte
    if year_lte: params["primary_release_date.lte"] = year_lte
    data = await safe_request(f"{BASE_URL}/discover/movie", params)
    if "error" not in data:
        data["results"] = format_movie_list(data.get("results", []))
        _cache_set(_cache_lists, cache_key, data)
    return data


# ════════════════════════════════════════════
# SINGLE MOVIE APIs
# ════════════════════════════════════════════

async def get_movie_detail(movie_id: int) -> dict:
    cache_key = f"detail:{movie_id}"
    cached = _cache_get(_cache_detail, cache_key)
    if cached is not None:
        _hit()
        return cached
    _miss()
    url = f"{BASE_URL}/movie/{movie_id}"
    vi_data, en_data = await asyncio.gather(
        safe_request(url, {"api_key": settings.TMDB_API_KEY, "language": "vi-VN"}),
        safe_request(url, {"api_key": settings.TMDB_API_KEY, "language": "en-US"}),
    )
    if "error" in vi_data:
        return vi_data
    if not vi_data.get("runtime") and "error" not in en_data:
        vi_data["runtime"] = en_data.get("runtime")
    result = format_movie_detail(vi_data)
    _cache_set(_cache_detail, cache_key, result)
    return result


async def get_movie_trailer(movie_id: int) -> dict:
    cache_key = f"trailer:{movie_id}"
    cached = _cache_get(_cache_detail, cache_key)
    if cached is not None:
        _hit()
        return cached
    _miss()
    data = await safe_request(
        f"{BASE_URL}/movie/{movie_id}/videos",
        {"api_key": settings.TMDB_API_KEY},
    )
    if "error" in data:
        return data
    results = data.get("results", [])
    trailer = {"youtube_key": None}
    for lang in ["vi", "en"]:
        for video in results:
            if (video.get("type") == "Trailer"
                    and video.get("site") == "YouTube"
                    and video.get("iso_639_1") == lang):
                trailer = {"youtube_key": video.get("key")}
                break
        if trailer["youtube_key"]:
            break
    if not trailer["youtube_key"]:
        for video in results:
            if video.get("type") == "Trailer" and video.get("site") == "YouTube":
                trailer = {"youtube_key": video.get("key")}
                break
    _cache_set(_cache_detail, cache_key, trailer)
    return trailer


async def get_movie_cast(movie_id: int, limit: int = 15) -> list:
    cache_key = f"cast:{movie_id}:{limit}"
    cached = _cache_get(_cache_detail, cache_key)
    if cached is not None:
        _hit()
        return cached
    _miss()
    data = await safe_request(
        f"{BASE_URL}/movie/{movie_id}/credits",
        {"api_key": settings.TMDB_API_KEY, "language": "vi-VN"},
    )
    if "error" in data:
        return []
    result = [
        {
            "id":        p.get("id"),
            "name":      p.get("name"),
            "character": p.get("character"),
            "profile":   f"{PROFILE_BASE}{p.get('profile_path')}" if p.get("profile_path") else None,
        }
        for p in data.get("cast", [])[:limit]
    ]
    _cache_set(_cache_detail, cache_key, result)
    return result


async def get_similar_movies(movie_id: int, page: int = 1) -> list:
    cache_key = f"similar:{movie_id}:{page}"
    cached = _cache_get(_cache_detail, cache_key)
    if cached is not None:
        _hit()
        return cached
    _miss()
    data = await safe_request(
        f"{BASE_URL}/movie/{movie_id}/similar",
        {"api_key": settings.TMDB_API_KEY, "page": page, "language": "vi-VN"},
    )
    if "error" in data:
        return []
    result = format_movie_list(data.get("results", [])[:12])
    _cache_set(_cache_detail, cache_key, result)
    return result


async def get_movie_cast_with_crew(movie_id: int, cast_limit: int = 20) -> dict:
    cache_key = f"cast_crew:{movie_id}:{cast_limit}"
    cached = _cache_get(_cache_detail, cache_key)
    if cached is not None:
        _hit()
        return cached
    _miss()
    data = await safe_request(
        f"{BASE_URL}/movie/{movie_id}/credits",
        {"api_key": settings.TMDB_API_KEY, "language": "vi-VN"},
    )
    if "error" in data:
        return {"cast": [], "crew": []}

    cast = [
        {
            "id":        p.get("id"),
            "name":      p.get("name"),
            "character": p.get("character"),
            "profile":   f"{PROFILE_BASE}{p.get('profile_path')}" if p.get("profile_path") else None,
            "order":     p.get("order", 999),
        }
        for p in data.get("cast", [])[:cast_limit]
    ]

    DIRECTOR_JOBS = {"Director", "Screenplay", "Writer", "Producer"}
    crew_seen = set()
    crew = []
    for p in data.get("crew", []):
        if p.get("job") not in DIRECTOR_JOBS:
            continue
        if p.get("id") in crew_seen:
            continue
        crew_seen.add(p.get("id"))
        crew.append({
            "id":      p.get("id"),
            "name":    p.get("name"),
            "job":     p.get("job"),
            "profile": f"{PROFILE_BASE}{p.get('profile_path')}" if p.get("profile_path") else None,
        })

    result = {"cast": cast, "crew": crew}
    _cache_set(_cache_detail, cache_key, result)
    return result


# ════════════════════════════════════════════
# PARALLEL FETCH — dùng cho MovieDetail page
# ════════════════════════════════════════════

async def get_movie_full(movie_id: int, cast_limit: int = 15) -> dict:
    """
    Gọi song song 3 endpoint cùng lúc bằng asyncio.gather().
    Thay vì 3 request nối tiếp (~2s), chỉ mất bằng request chậm nhất (~600ms).

    Dùng trong router:
        return await tmdb_service.get_movie_full(movie_id)
    """
    detail, cast_crew, similar = await asyncio.gather(
        get_movie_detail(movie_id),
        get_movie_cast_with_crew(movie_id, cast_limit=cast_limit),
        get_similar_movies(movie_id),
    )

    if "error" in detail:
        return detail

    return {
        **detail,
        "cast":    cast_crew.get("cast", []),
        "crew":    cast_crew.get("crew", []),
        "similar": similar,
    }


# ════════════════════════════════════════════
# PERSON APIs
# ════════════════════════════════════════════

async def get_person_detail(person_id: int) -> dict:
    cache_key = f"person:{person_id}"
    cached = _cache_get(_cache_person, cache_key)
    if cached is not None:
        _hit()
        return cached
    _miss()
    url = f"{BASE_URL}/person/{person_id}"
    vi_data, en_data = await asyncio.gather(
        safe_request(url, {"api_key": settings.TMDB_API_KEY, "language": "vi-VN"}),
        safe_request(url, {"api_key": settings.TMDB_API_KEY, "language": "en-US"}),
    )
    if "error" in vi_data:
        return vi_data
    biography = vi_data.get("biography") or ""
    if not biography.strip() and "error" not in en_data:
        biography = en_data.get("biography", "")
    profile_path = vi_data.get("profile_path")
    result = {
        "id":                   vi_data.get("id"),
        "name":                 vi_data.get("name"),
        "biography":            biography,
        "birthday":             vi_data.get("birthday"),
        "deathday":             vi_data.get("deathday"),
        "place_of_birth":       vi_data.get("place_of_birth"),
        "profile":              f"{PROFILE_BASE}{profile_path}" if profile_path else None,
        "profile_hd":           f"https://image.tmdb.org/t/p/w500{profile_path}" if profile_path else None,
        "known_for_department": vi_data.get("known_for_department"),
        "gender":               vi_data.get("gender"),
        "popularity":           vi_data.get("popularity"),
    }
    _cache_set(_cache_person, cache_key, result)
    return result


async def get_person_credits(person_id: int) -> dict:
    cache_key = f"person_credits:{person_id}"
    cached = _cache_get(_cache_person, cache_key)
    if cached is not None:
        _hit()
        return cached
    _miss()
    data = await safe_request(
        f"{BASE_URL}/person/{person_id}/combined_credits",
        {"api_key": settings.TMDB_API_KEY, "language": "vi-VN"},
    )
    if "error" in data:
        return {"cast": [], "crew": []}

    def fmt_credit(m: dict, role: str = None, character: str = None) -> dict:
        poster_path   = m.get("poster_path")
        backdrop_path = m.get("backdrop_path")
        title = m.get("title") or m.get("name") or "Unknown"
        date  = m.get("release_date") or m.get("first_air_date") or ""
        return {
            "id":           m.get("id"),
            "title":        title,
            "media_type":   m.get("media_type", "movie"),
            "poster":       f"{IMAGE_BASE}{poster_path}" if poster_path else None,
            "backdrop":     f"{BACKDROP_BASE}{backdrop_path}" if backdrop_path else None,
            "rating":       m.get("vote_average"),
            "vote_count":   m.get("vote_count", 0),
            "release_date": date,
            "character":    character or m.get("character"),
            "job":          role or m.get("job"),
            "overview":     m.get("overview"),
            "genre_ids":    m.get("genre_ids", []),
        }

    cast = [
        fmt_credit(m, character=m.get("character"))
        for m in data.get("cast", [])
        if m.get("media_type") == "movie" and m.get("poster_path")
    ]
    cast.sort(key=lambda m: m.get("release_date") or "", reverse=True)

    IMPORTANT_JOBS = {"Director", "Screenplay", "Writer", "Producer", "Executive Producer", "Story"}
    crew_seen = set()
    crew = []
    for m in data.get("crew", []):
        if m.get("media_type") != "movie":
            continue
        if m.get("job") not in IMPORTANT_JOBS:
            continue
        key = (m.get("id"), m.get("job"))
        if key in crew_seen:
            continue
        crew_seen.add(key)
        if m.get("poster_path"):
            crew.append(fmt_credit(m, role=m.get("job")))

    crew.sort(key=lambda m: m.get("release_date") or "", reverse=True)
    result = {"cast": cast[:100], "crew": crew[:20]}
    _cache_set(_cache_person, cache_key, result)
    return result


# ════════════════════════════════════════════
# SYNC BRIDGE — dùng cho service gọi từ sync context
# (recommendation_service, mood_service, watchlist_service)
# ════════════════════════════════════════════

import asyncio as _asyncio


def _run(coro):
    """
    Chạy một coroutine từ sync context an toàn.
    Nếu event loop đang chạy (uvicorn) → dùng thread riêng để tránh deadlock.
    Nếu không có loop (test, script) → asyncio.run() bình thường.
    """
    try:
        loop = _asyncio.get_running_loop()
    except RuntimeError:
        return _asyncio.run(coro)

    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(_asyncio.run, coro)
        return future.result()


# Sync wrappers — chỉ dùng khi không thể await trực tiếp
def sync_get_trending_movies() -> list:
    return _run(get_trending_movies())

def sync_discover_by_genre(genre_id, year_gte=None, year_lte=None, page=1) -> dict:
    return _run(discover_by_genre(genre_id, year_gte, year_lte, page))

def sync_get_similar_movies(movie_id: int, page: int = 1) -> list:
    return _run(get_similar_movies(movie_id, page))

def sync_get_movie_detail(movie_id: int) -> dict:
    return _run(get_movie_detail(movie_id))

def sync_get_all_movies(page=1, genre_id=None, year=None, min_rating=None, sort_by="popularity.desc") -> dict:
    return _run(get_all_movies(page, genre_id, year, min_rating, sort_by))

def sync_search_movies(query: str, page: int = 1) -> dict:
    return _run(search_movies(query, page))

def sync_get_top_rated_movies(page: int = 1) -> dict:
    return _run(get_top_rated_movies(page))

def sync_get_upcoming_movies(page: int = 1) -> dict:
    return _run(get_upcoming_movies(page))
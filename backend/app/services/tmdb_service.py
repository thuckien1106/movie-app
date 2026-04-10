import requests
import logging
from app.utils.config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://api.themoviedb.org/3"
IMAGE_BASE = "https://image.tmdb.org/t/p/w500"
BACKDROP_BASE = "https://image.tmdb.org/t/p/original"
PROFILE_BASE = "https://image.tmdb.org/t/p/w185"


# ════════════════════════════════════════════
# SAFE REQUEST
# ════════════════════════════════════════════

def safe_request(url: str, params: dict):
    if not settings.TMDB_API_KEY:
        return {"error": "Missing TMDB API key"}
    try:
        response = requests.get(url, params=params, timeout=8)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.Timeout:
        logger.error("TMDB request timeout")
        return {"error": "TMDB timeout"}
    except requests.exceptions.HTTPError as e:
        logger.error(f"HTTP error: {e}")
        return {"error": f"HTTP error: {str(e)}"}
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return {"error": "TMDB API failed"}


# ════════════════════════════════════════════
# FORMAT HELPERS
# ════════════════════════════════════════════

def format_movie(movie: dict):
    return {
        "id": movie.get("id"),
        "title": movie.get("title"),
        "poster": f"{IMAGE_BASE}{movie.get('poster_path')}" if movie.get("poster_path") else None,
        "backdrop": f"{BACKDROP_BASE}{movie.get('backdrop_path')}" if movie.get("backdrop_path") else None,
        "rating": movie.get("vote_average"),
        "release_date": movie.get("release_date"),
        "genre_ids": movie.get("genre_ids", []),
        "overview": movie.get("overview"),
    }


def format_movie_list(movies: list):
    return [format_movie(m) for m in movies]


def format_movie_detail(movie: dict):
    return {
        "id": movie.get("id"),
        "title": movie.get("title"),
        "poster": f"{IMAGE_BASE}{movie.get('poster_path')}" if movie.get("poster_path") else None,
        "backdrop": f"{BACKDROP_BASE}{movie.get('backdrop_path')}" if movie.get("backdrop_path") else None,
        "rating": movie.get("vote_average"),
        "release_date": movie.get("release_date"),
        "overview": movie.get("overview"),
        "genres": [g["name"] for g in movie.get("genres", [])],
        "genre_ids": [g["id"] for g in movie.get("genres", [])],
        "runtime": movie.get("runtime"),          # phút — dùng cho watchlist stats
        "tagline": movie.get("tagline"),
        "status": movie.get("status"),
        "budget": movie.get("budget"),
        "revenue": movie.get("revenue"),
        "vote_count": movie.get("vote_count"),
        "original_language": movie.get("original_language"),
    }


# ════════════════════════════════════════════
# MOVIE LIST APIs
# ════════════════════════════════════════════

def get_all_movies(page: int = 1, genre_id: int = None, year: int = None,
                   min_rating: float = None, sort_by: str = "popularity.desc"):
    url = f"{BASE_URL}/discover/movie"
    params = {
        "api_key": settings.TMDB_API_KEY,
        "page": page,
        "sort_by": sort_by,
        "language": "vi-VN",
    }
    if genre_id:
        params["with_genres"] = genre_id
    if year:
        params["primary_release_year"] = year
    if min_rating:
        params["vote_average.gte"] = min_rating

    data = safe_request(url, params)
    if "error" in data:
        return {"results": [], "total_pages": 1, "page": page}
    return {
        "results": format_movie_list(data.get("results", [])),
        "total_pages": data.get("total_pages", 1),
        "page": data.get("page", 1),
    }


def get_trending_movies():
    url = f"{BASE_URL}/trending/movie/week"
    params = {"api_key": settings.TMDB_API_KEY, "language": "vi-VN"}
    data = safe_request(url, params)
    if "error" in data:
        return []
    return format_movie_list(data.get("results", []))


def get_popular_movies(page: int = 1):
    url = f"{BASE_URL}/movie/popular"
    params = {"api_key": settings.TMDB_API_KEY, "page": page, "language": "vi-VN"}
    data = safe_request(url, params)
    if "error" in data:
        return {"results": [], "total_pages": 1, "page": page}
    return {
        "results": format_movie_list(data.get("results", [])),
        "total_pages": data.get("total_pages", 1),
        "page": data.get("page", 1),
    }


def get_top_rated_movies(page: int = 1):
    url = f"{BASE_URL}/movie/top_rated"
    params = {"api_key": settings.TMDB_API_KEY, "page": page, "language": "vi-VN"}
    data = safe_request(url, params)
    if "error" in data:
        return {"results": [], "total_pages": 1, "page": page}
    return {
        "results": format_movie_list(data.get("results", [])),
        "total_pages": data.get("total_pages", 1),
        "page": data.get("page", 1),
    }


def get_upcoming_movies(page: int = 1):
    url = f"{BASE_URL}/movie/upcoming"
    params = {"api_key": settings.TMDB_API_KEY, "page": page, "language": "vi-VN"}
    data = safe_request(url, params)
    if "error" in data:
        return {"results": [], "total_pages": 1, "page": page}
    return {
        "results": format_movie_list(data.get("results", [])),
        "total_pages": data.get("total_pages", 1),
        "page": data.get("page", 1),
    }


def get_genres():
    url = f"{BASE_URL}/genre/movie/list"
    params = {"api_key": settings.TMDB_API_KEY, "language": "vi-VN"}
    data = safe_request(url, params)
    if "error" in data:
        return []
    return data.get("genres", [])


def search_movies(query: str, page: int = 1):
    url = f"{BASE_URL}/search/movie"
    params = {
        "api_key": settings.TMDB_API_KEY,
        "query": query,
        "page": page,
        "language": "vi-VN",
    }
    data = safe_request(url, params)
    if "error" in data:
        return {"results": [], "total_pages": 1, "page": page, "total_results": 0}
    return {
        "results": format_movie_list(data.get("results", [])),
        "total_pages": data.get("total_pages", 1),
        "page": data.get("page", 1),
        "total_results": data.get("total_results", 0),
    }
def discover_by_genre(genre_id, year_gte=None, year_lte=None, page=1):
    params = {
        "api_key": settings.TMDB_API_KEY,
        "with_genres": genre_id,
        "sort_by": "popularity.desc",
        "vote_count.gte": 100,
        "page": page,
        "language": "vi-VN",
    }
    if year_gte: params["primary_release_date.gte"] = year_gte
    if year_lte: params["primary_release_date.lte"] = year_lte
    data = safe_request(f"{BASE_URL}/discover/movie", params)
    data["results"] = format_movie_list(data.get("results", []))
    return data

# ════════════════════════════════════════════
# SINGLE MOVIE APIs
# ════════════════════════════════════════════

def get_movie_detail(movie_id: int):
    url = f"{BASE_URL}/movie/{movie_id}"
    params = {"api_key": settings.TMDB_API_KEY, "language": "vi-VN"}
    data = safe_request(url, params)
    if "error" in data:
        return data
    return format_movie_detail(data)


def get_movie_trailer(movie_id: int):
    url = f"{BASE_URL}/movie/{movie_id}/videos"
    params = {"api_key": settings.TMDB_API_KEY}
    data = safe_request(url, params)
    if "error" in data:
        return data
    # Ưu tiên trailer tiếng Việt → tiếng Anh
    results = data.get("results", [])
    for lang in ["vi", "en"]:
        for video in results:
            if (video.get("type") == "Trailer"
                    and video.get("site") == "YouTube"
                    and video.get("iso_639_1") == lang):
                return {"youtube_key": video.get("key")}
    # Fallback bất kỳ trailer nào
    for video in results:
        if video.get("type") == "Trailer" and video.get("site") == "YouTube":
            return {"youtube_key": video.get("key")}
    return {"youtube_key": None}


def get_movie_cast(movie_id: int, limit: int = 15):
    url = f"{BASE_URL}/movie/{movie_id}/credits"
    params = {"api_key": settings.TMDB_API_KEY, "language": "vi-VN"}
    data = safe_request(url, params)
    if "error" in data:
        return []
    cast = data.get("cast", [])[:limit]
    return [
        {
            "id": p.get("id"),
            "name": p.get("name"),
            "character": p.get("character"),
            "profile": f"{PROFILE_BASE}{p.get('profile_path')}" if p.get("profile_path") else None,
        }
        for p in cast
    ]


def get_similar_movies(movie_id: int, page: int = 1):
    url = f"{BASE_URL}/movie/{movie_id}/similar"
    params = {"api_key": settings.TMDB_API_KEY, "page": page, "language": "vi-VN"}
    data = safe_request(url, params)
    if "error" in data:
        return []
    return format_movie_list(data.get("results", [])[:12])

# ════════════════════════════════════════════
# PERSON (DIỄN VIÊN / ĐẠO DIỄN) APIs
# ════════════════════════════════════════════

def get_person_detail(person_id: int) -> dict:
    """
    Trả về thông tin cá nhân: tên, tiểu sử, ngày sinh, ảnh đại diện.
    Gọi cả endpoint /person/{id} lẫn /person/{id}/external_ids.
    """
    url    = f"{BASE_URL}/person/{person_id}"
    params = {"api_key": settings.TMDB_API_KEY, "language": "vi-VN"}
    data   = safe_request(url, params)
    if "error" in data:
        return data

    # Nếu tiểu sử trống → thử lại bằng tiếng Anh
    biography = data.get("biography") or ""
    if not biography.strip():
        params_en = {"api_key": settings.TMDB_API_KEY, "language": "en-US"}
        en_data   = safe_request(url, params_en)
        biography = en_data.get("biography", "")

    profile_path = data.get("profile_path")
    return {
        "id":            data.get("id"),
        "name":          data.get("name"),
        "biography":     biography,
        "birthday":      data.get("birthday"),
        "deathday":      data.get("deathday"),
        "place_of_birth":data.get("place_of_birth"),
        "profile":       f"{PROFILE_BASE}{profile_path}" if profile_path else None,
        "profile_hd":    f"https://image.tmdb.org/t/p/w500{profile_path}" if profile_path else None,
        "known_for_department": data.get("known_for_department"),
        "gender":        data.get("gender"),   # 1=Nữ, 2=Nam, 0=Không xác định
        "popularity":    data.get("popularity"),
    }


def get_person_credits(person_id: int) -> dict:
    """
    Trả về toàn bộ filmography (phim tham gia):
      - cast:  vai diễn (diễn viên)
      - crew:  đạo diễn / biên kịch / sản xuất...
    Đã format, sắp xếp theo năm phát hành mới nhất.
    """
    url    = f"{BASE_URL}/person/{person_id}/combined_credits"
    params = {"api_key": settings.TMDB_API_KEY, "language": "vi-VN"}
    data   = safe_request(url, params)
    if "error" in data:
        return {"cast": [], "crew": []}

    def fmt_credit(m: dict, role: str = None, character: str = None) -> dict:
        poster_path   = m.get("poster_path")
        backdrop_path = m.get("backdrop_path")
        # Ưu tiên movie, fallback TV show
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

    # Cast: chỉ lấy movie (bỏ TV nếu muốn)
    raw_cast = data.get("cast", [])
    cast = [
        fmt_credit(m, character=m.get("character"))
        for m in raw_cast
        if m.get("media_type") == "movie" and m.get("poster_path")
    ]
    cast.sort(key=lambda m: m.get("release_date") or "", reverse=True)

    # Crew: đạo diễn, biên kịch, sản xuất — chỉ lấy job quan trọng
    IMPORTANT_JOBS = {"Director", "Screenplay", "Writer", "Producer", "Executive Producer", "Story"}
    raw_crew = data.get("crew", [])
    crew_seen = set()
    crew = []
    for m in raw_crew:
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

    return {
        "cast": cast[:100],   # tối đa 100 phim
        "crew": crew[:20],
    }


def get_movie_cast_with_crew(movie_id: int, cast_limit: int = 20) -> dict:
    """
    Mở rộng get_movie_cast: trả thêm crew (đạo diễn, biên kịch).
    Dùng cho MovieDetail page.
    """
    url    = f"{BASE_URL}/movie/{movie_id}/credits"
    params = {"api_key": settings.TMDB_API_KEY, "language": "vi-VN"}
    data   = safe_request(url, params)
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

    return {"cast": cast, "crew": crew}
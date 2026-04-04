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
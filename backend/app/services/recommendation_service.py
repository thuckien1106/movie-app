from collections import Counter
from sqlalchemy.orm import Session
from app.models.watchlist import Watchlist
from app.services import tmdb_service

def get_user_taste_profile(db: Session, user_id: int) -> dict:
    """Phân tích watchlist → trả về profile sở thích."""
    items = db.query(Watchlist).filter(Watchlist.user_id == user_id).all()
    if not items:
        return None

    genre_counter = Counter()
    decades = Counter()
    watched_ids = set()

    for item in items:
        watched_ids.add(item.movie_id)
        # genre_ids đã lưu dạng "28,12,35"
        if item.genre_ids:
            for gid in item.genre_ids.split(","):
                if gid.strip():
                    genre_counter[int(gid.strip())] += 1
        # Thập kỷ yêu thích — cần thêm release_year vào model (xem bước 2)
        if hasattr(item, 'release_year') and item.release_year:
            decade = (item.release_year // 10) * 10
            decades[decade] += 1

    total = sum(genre_counter.values()) or 1
    # Tỉ trọng: genre nào xuất hiện nhiều → score cao hơn
    genre_scores = {gid: count / total for gid, count in genre_counter.items()}

    return {
        "top_genres": [gid for gid, _ in genre_counter.most_common(3)],
        "genre_scores": genre_scores,
        "top_decade": decades.most_common(1)[0][0] if decades else None,
        "watched_ids": watched_ids,
    }


def get_recommendations(db: Session, user_id: int, page: int = 1) -> list:
    profile = get_user_taste_profile(db, user_id)
    if not profile:
        # Fallback: trả trending nếu watchlist trống
        return tmdb_service.get_trending_movies().get("results", [])

    top_genres = profile["top_genres"]
    decade = profile["top_decade"]
    watched_ids = profile["watched_ids"]

    # Gọi TMDB Discover với genre ưu tiên nhất
    year_gte = f"{decade}-01-01" if decade else None
    year_lte = f"{decade + 9}-12-31" if decade else None

    results = []
    # Lấy từ 2 genre hàng đầu để đa dạng
    for genre_id in top_genres[:2]:
        data = tmdb_service.discover_by_genre(
            genre_id=genre_id,
            year_gte=year_gte,
            year_lte=year_lte,
            page=page,
        )
        results.extend(data.get("results", []))

    # Loại bỏ phim đã có trong watchlist
    seen = set()
    filtered = []
    for movie in results:
        mid = movie.get("id")
        if mid not in watched_ids and mid not in seen:
            seen.add(mid)
            # Tính điểm relevance
            movie["_score"] = _score_movie(movie, profile)
            filtered.append(movie)

    # Sắp xếp theo score giảm dần
    filtered.sort(key=lambda m: m["_score"], reverse=True)
    return filtered[:20]


def _score_movie(movie: dict, profile: dict) -> float:
    genre_scores = profile["genre_scores"]
    score = 0.0
    for gid in movie.get("genre_ids", []):
        score += genre_scores.get(gid, 0) * 0.5
    # Bonus nếu đúng thập kỷ yêu thích
    release = movie.get("release_date", "")
    if release and profile["top_decade"]:
        year = int(release[:4]) if release else 0
        decade = (year // 10) * 10
        if decade == profile["top_decade"]:
            score += 0.2
    # TMDB vote_average cũng ảnh hưởng nhẹ
    score += movie.get("vote_average", 0) / 10 * 0.3
    return score
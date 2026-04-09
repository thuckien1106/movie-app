# app/services/recommendation_service.py
"""
Gợi ý phim cá nhân hoá dựa trên watchlist của user.

Thuật toán:
  1. Phân tích watchlist → profile sở thích (genre, thập kỷ, ngôn ngữ)
  2. Phim đã xem (is_watched=True) được tính trọng số cao hơn x2
  3. Lấy phim từ TMDB Discover theo 3 genre hàng đầu
  4. Lấy thêm phim similar từ 3 phim được đánh giá cao nhất trong watchlist
  5. Score từng phim: genre_match + decade_bonus + rating_bonus + lang_bonus
  6. Loại bỏ phim đã có trong watchlist, dedup, sắp xếp, trả về 20 phim
"""

from collections import Counter
from sqlalchemy.orm import Session
from app.models.watchlist import Watchlist
from app.services import tmdb_service


# ────────────────────────────────────────────────────────────
# TASTE PROFILE
# ────────────────────────────────────────────────────────────

def get_user_taste_profile(db: Session, user_id: int) -> dict | None:
    """
    Phân tích toàn bộ watchlist → trả về dict sở thích.
    Phim đã xem (is_watched=True) có trọng số gấp đôi.
    """
    items = db.query(Watchlist).filter(Watchlist.user_id == user_id).all()
    if not items:
        return None

    genre_counter  = Counter()
    decade_counter = Counter()
    lang_counter   = Counter()
    watched_ids    = set()
    top_rated      = []   # (rating, movie_id) để lấy similar

    for item in items:
        watched_ids.add(item.movie_id)
        weight = 2 if item.is_watched else 1   # xem rồi → ưu tiên cao hơn

        # genres
        if item.genre_ids:
            for gid in item.genre_ids.split(","):
                gid = gid.strip()
                if gid:
                    genre_counter[int(gid)] += weight

        # thập kỷ từ title (không lưu year trong model — dùng added_at năm thay thế)
        # Nếu bạn có release_year trong model thì dùng nó; không thì bỏ qua
        if hasattr(item, "release_year") and item.release_year:
            decade = (item.release_year // 10) * 10
            decade_counter[decade] += weight

        # Gom top-rated để lấy similar
        # Dùng id để gọi TMDB similar sau
        top_rated.append(item.movie_id)

    total = sum(genre_counter.values()) or 1
    genre_scores = {gid: cnt / total for gid, cnt in genre_counter.items()}

    return {
        "top_genres":    [gid for gid, _ in genre_counter.most_common(5)],
        "genre_scores":  genre_scores,
        "top_decade":    decade_counter.most_common(1)[0][0] if decade_counter else None,
        "watched_ids":   watched_ids,
        # Lấy tối đa 3 phim cuối cùng được thêm vào để gợi ý similar
        "seed_movie_ids": top_rated[-3:],
    }


# ────────────────────────────────────────────────────────────
# MAIN RECOMMENDATION
# ────────────────────────────────────────────────────────────

def get_recommendations(db: Session, user_id: int, page: int = 1) -> dict:
    """
    Trả về dict:
      {
        "movies":  [...],          # list phim gợi ý
        "reason":  "...",          # lý do gợi ý (hiển thị FE)
        "profile": {...},          # tóm tắt taste profile
        "is_personalized": bool,   # False nếu watchlist trống → trending
      }
    """
    profile = get_user_taste_profile(db, user_id)

    # ── Fallback: watchlist trống → trả trending ──────────────
    if not profile:
        trending = tmdb_service.get_trending_movies()
        return {
            "movies":          trending[:20] if isinstance(trending, list) else [],
            "reason":          "Phim đang thịnh hành tuần này",
            "profile":         None,
            "is_personalized": False,
        }

    top_genres   = profile["top_genres"]
    watched_ids  = profile["watched_ids"]
    seed_ids     = profile["seed_movie_ids"]

    collected: list[dict] = []

    # ── Nguồn 1: Discover theo genre hàng đầu ─────────────────
    for genre_id in top_genres[:3]:
        data = tmdb_service.discover_by_genre(
            genre_id=genre_id,
            page=page,
        )
        collected.extend(data.get("results", []))

    # ── Nguồn 2: Similar từ các phim seed ─────────────────────
    for mid in seed_ids:
        similar = tmdb_service.get_similar_movies(mid, page=1)
        if isinstance(similar, list):
            collected.extend(similar)

    # ── Dedup + lọc watchlist ──────────────────────────────────
    seen: set = set()
    filtered: list[dict] = []
    for movie in collected:
        mid = movie.get("id")
        if mid and mid not in watched_ids and mid not in seen:
            seen.add(mid)
            movie["_score"] = _score_movie(movie, profile)
            filtered.append(movie)

    # ── Sắp xếp theo điểm ─────────────────────────────────────
    filtered.sort(key=lambda m: m["_score"], reverse=True)
    result = filtered[:20]

    # ── Xây lý do hiển thị ────────────────────────────────────
    reason = _build_reason(profile)

    # ── Tóm tắt profile cho FE ────────────────────────────────
    profile_summary = {
        "top_genre_ids": top_genres[:3],
        "total_watched": len([m for m in db.query(Watchlist)
                               .filter(Watchlist.user_id == user_id,
                                       Watchlist.is_watched == True).all()]),
        "total_saved":   len(watched_ids),
    }

    return {
        "movies":          result,
        "reason":          reason,
        "profile":         profile_summary,
        "is_personalized": True,
    }


# ────────────────────────────────────────────────────────────
# SCORING
# ────────────────────────────────────────────────────────────

def _score_movie(movie: dict, profile: dict) -> float:
    """
    Tính điểm phù hợp:
      - genre_match : trọng số genre từ watchlist (0 – 1.5)
      - decade_bonus: đúng thập kỷ yêu thích (+0.2)
      - rating_bonus: vote_average TMDB / 10 * 0.3 (0 – 0.3)
    """
    genre_scores = profile["genre_scores"]
    score = 0.0

    # Genre match (sum của tất cả genre phim khớp với sở thích)
    for gid in movie.get("genre_ids", []):
        score += genre_scores.get(gid, 0)

    # Decade bonus
    release = movie.get("release_date", "") or ""
    if release and profile.get("top_decade"):
        try:
            year   = int(release[:4])
            decade = (year // 10) * 10
            if decade == profile["top_decade"]:
                score += 0.2
        except ValueError:
            pass

    # Rating bonus (nhẹ)
    score += (movie.get("rating") or movie.get("vote_average") or 0) / 10 * 0.3

    return round(score, 4)


def _build_reason(profile: dict) -> str:
    """Tạo chuỗi lý do gợi ý thân thiện."""
    GENRE_NAMES = {
        28: "Hành động", 12: "Phiêu lưu", 16: "Hoạt hình", 35: "Hài",
        80: "Tội phạm", 99: "Tài liệu", 18: "Chính kịch", 10751: "Gia đình",
        14: "Kỳ ảo", 36: "Lịch sử", 27: "Kinh dị", 10402: "Âm nhạc",
        9648: "Bí ẩn", 10749: "Lãng mạn", 878: "Khoa học viễn tưởng",
        53: "Giật gân", 10752: "Chiến tranh", 37: "Cao bồi",
    }
    top = profile.get("top_genres", [])[:2]
    names = [GENRE_NAMES.get(gid, f"#{gid}") for gid in top]
    if names:
        return f"Dựa trên sở thích của bạn: {', '.join(names)}"
    return "Dựa trên watchlist của bạn"
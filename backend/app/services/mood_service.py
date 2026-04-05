# app/services/mood_service.py
"""
Mood-based movie discovery — phiên bản đã sửa lỗi.

Bug cũ: gọi tmdb_service.discover_by_genre() nhưng hàm đó không tồn tại.
Fix: dùng trực tiếp tmdb_service.get_all_movies() vốn đã có sẵn,
     và bỏ filter min_rating ở Python (để TMDB tự lọc qua vote_average.gte).
"""

import random
from typing import Optional
from sqlalchemy.orm import Session

from app.services import tmdb_service
from app.models.watchlist import Watchlist


# ════════════════════════════════════════════
# MOOD DEFINITIONS
# ════════════════════════════════════════════

MOODS: dict[str, dict] = {
    "vui": {
        "label": "Vui vẻ",
        "emoji": "😄",
        "description": "Cần cười thả ga, quên hết lo âu",
        "color": "#f1c40f",
        "genre_ids": [35, 10751, 16],   # Comedy, Family, Animation
        "sort_by": "popularity.desc",
        "min_rating": 6.5,
    },
    "buon": {
        "label": "Muốn khóc",
        "emoji": "😢",
        "description": "Một bộ phim chạm đến trái tim",
        "color": "#3498db",
        "genre_ids": [18, 10749],       # Drama, Romance
        "sort_by": "vote_average.desc",
        "min_rating": 7.5,
    },
    "hoi_hop": {
        "label": "Hồi hộp",
        "emoji": "😰",
        "description": "Tim đập nhanh, không dứt ra được",
        "color": "#e74c3c",
        "genre_ids": [53, 80, 28],      # Thriller, Crime, Action
        "sort_by": "vote_count.desc",
        "min_rating": 7.0,
    },
    "kinh_di": {
        "label": "Muốn sợ",
        "emoji": "👻",
        "description": "Tắt đèn, xem một mình, thử xem có dám không",
        "color": "#8e44ad",
        "genre_ids": [27, 9648],        # Horror, Mystery
        "sort_by": "vote_average.desc",
        "min_rating": 6.0,
    },
    "thu_gian": {
        "label": "Thư giãn",
        "emoji": "🛋️",
        "description": "Nhẹ nhàng, không cần suy nghĩ nhiều",
        "color": "#2ecc71",
        "genre_ids": [35, 12, 14],      # Comedy, Adventure, Fantasy
        "sort_by": "popularity.desc",
        "min_rating": 6.0,
    },
    "phieu_luu": {
        "label": "Phiêu lưu",
        "emoji": "🌍",
        "description": "Bay ra thế giới rộng lớn, khám phá điều mới",
        "color": "#e67e22",
        "genre_ids": [12, 878, 14],     # Adventure, Sci-Fi, Fantasy
        "sort_by": "vote_average.desc",
        "min_rating": 7.0,
    },
    "lang_man": {
        "label": "Lãng mạn",
        "emoji": "💕",
        "description": "Tin vào tình yêu, ngọt ngào và ấm áp",
        "color": "#e91e8c",
        "genre_ids": [10749, 35],       # Romance, Comedy
        "sort_by": "vote_count.desc",
        "min_rating": 6.5,
    },
    "suy_ngam": {
        "label": "Suy ngẫm",
        "emoji": "🤔",
        "description": "Phim đánh đố, nhiều tầng ý nghĩa",
        "color": "#34495e",
        "genre_ids": [878, 9648, 18],   # Sci-Fi, Mystery, Drama
        "sort_by": "vote_average.desc",
        "min_rating": 7.5,
    },
}


# ════════════════════════════════════════════
# PUBLIC API
# ════════════════════════════════════════════

def get_all_moods() -> list[dict]:
    return [
        {
            "id": mood_id,
            "label": cfg["label"],
            "emoji": cfg["emoji"],
            "description": cfg["description"],
            "color": cfg["color"],
        }
        for mood_id, cfg in MOODS.items()
    ]


def get_movies_by_mood(
    mood_id: str,
    page: int = 1,
    db: Optional[Session] = None,
    user_id: Optional[int] = None,
) -> dict:
    if mood_id not in MOODS:
        return {"error": f"Mood '{mood_id}' không tồn tại."}

    cfg = MOODS[mood_id]

    # --- Lấy watchlist IDs để loại trừ ---
    watched_ids: set[int] = set()
    if db and user_id:
        rows = db.query(Watchlist.movie_id).filter(
            Watchlist.user_id == user_id
        ).all()
        watched_ids = {r.movie_id for r in rows}

    collected: list[dict] = []
    seen_ids: set[int] = set()

    # --- Gọi TMDB cho từng genre chính bằng get_all_movies đã có sẵn ---
    for genre_id in cfg["genre_ids"][:2]:
        data = tmdb_service.get_all_movies(
            page=page,
            genre_id=genre_id,
            min_rating=cfg["min_rating"],
            sort_by=cfg["sort_by"],
        )
        for movie in data.get("results", []):
            mid = movie.get("id")
            if not mid or mid in seen_ids or mid in watched_ids:
                continue
            seen_ids.add(mid)
            collected.append(movie)

    # --- Trộn nhẹ để mỗi refresh có kết quả mới ---
    top  = collected[:40]
    rest = collected[40:]
    random.shuffle(top)
    final = (top + rest)[:20]

    return {
        "mood": {
            "id":          mood_id,
            "label":       cfg["label"],
            "emoji":       cfg["emoji"],
            "description": cfg["description"],
            "color":       cfg["color"],
        },
        "results":       final,
        "total_results": len(final),
    }
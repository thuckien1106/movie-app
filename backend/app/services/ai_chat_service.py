# app/services/ai_chat_service.py
"""
AI Chat service — phân tích intent bằng keyword/regex thuần Python,
không cần Gemini API. Nếu user cung cấp Gemini key → dùng Gemini.
Nếu không → fallback về local engine (không bao giờ lỗi).
"""

import json
import re
import time
import logging
import httpx
from typing import Optional
from app.utils.config import settings
from app.services import tmdb_service

logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════
# GENRE MAP
# ══════════════════════════════════════════════════════════
GENRE_MAP = {
    "hành động": 28,  "action": 28,
    "phiêu lưu": 12,  "adventure": 12,
    "hoạt hình": 16,  "animation": 16,  "anime": 16,
    "hài": 35,        "comedy": 35,     "hài hước": 35,   "vui": 35,
    "tội phạm": 80,   "crime": 80,      "gangster": 80,
    "tài liệu": 99,   "documentary": 99,
    "chính kịch": 18, "drama": 18,
    "gia đình": 10751,"family": 10751,
    "fantasy": 14,    "kỳ ảo": 14,
    "lịch sử": 36,    "history": 36,    "cổ trang": 36,
    "kinh dị": 27,    "horror": 27,     "ma": 27,         "quỷ": 27,
    "âm nhạc": 10402, "music": 10402,
    "bí ẩn": 9648,    "mystery": 9648,
    "lãng mạn": 10749,"romance": 10749, "tình cảm": 10749,"tình yêu": 10749,
    "viễn tưởng": 878,"sci-fi": 878,    "khoa học": 878,  "robot": 878,  "vũ trụ": 878,
    "tâm lý": 53,     "thriller": 53,   "giật gân": 53,
    "chiến tranh": 10752, "war": 10752,
    "miền tây": 37,   "western": 37,
    "siêu anh hùng": 28, "superhero": 28,
}

# ══════════════════════════════════════════════════════════
# MOOD → GENRE mapping
# ══════════════════════════════════════════════════════════
MOOD_MAP = {
    r"buồn|sad|cô đơn|alone":           [10749, 18],       # romance, drama
    r"vui|happy|cười|haha|chill":        [35, 16],          # comedy, animation
    r"hồi hộp|짜릿|adrenaline|kịch tính": [28, 53],          # action, thriller
    r"sợ|scary|rùng rợn|kinh|ớn":       [27],              # horror
    r"suy nghĩ|triết|deep|ý nghĩa":     [18, 99],          # drama, documentary
    r"gia đình|cả nhà|bố mẹ|trẻ em|con nít": [10751, 16],  # family, animation
    r"hẹn hò|date|romantic|yêu":        [10749],           # romance
    r"căng thẳng|stress|relax|thư giãn": [35, 10751],      # comedy, family
}

# ══════════════════════════════════════════════════════════
# YEAR PATTERNS
# ══════════════════════════════════════════════════════════
_YEAR_RE    = re.compile(r'\b(19[5-9]\d|20[0-2]\d)\b')
_DECADE_RE  = re.compile(r'\b((?:19|20)\d0)s?\b|thập niên\s*((?:19|20)\d0)')

# ══════════════════════════════════════════════════════════
# REPLY TEMPLATES
# ══════════════════════════════════════════════════════════
_REPLIES = {
    "search":    lambda q: f'🔍 Đây là kết quả tìm kiếm cho "{q}"!',
    "trending":  lambda _: "🔥 Đây là những phim đang hot nhất tuần này!",
    "top_rated": lambda _: "⭐ Những phim được đánh giá cao nhất mọi thời đại!",
    "upcoming":  lambda _: "🎬 Các phim sắp ra rạp — đừng bỏ lỡ!",
    "discover":  lambda genres: f'🎯 Tìm thấy phim {"thể loại " + ", ".join(genres) if genres else ""}phù hợp với bạn!',
    "chat":      lambda _: "Tôi chuyên tìm phim thôi nhé 😄 Hãy hỏi tôi về thể loại, tâm trạng, hay tên phim bạn muốn xem!",
}

_SUGGESTIONS = {
    "search":    ["Phim tương tự khác", "Phim đang hot", "Phim cùng thể loại"],
    "trending":  ["Phim được đánh giá cao nhất", "Phim sắp chiếu", "Phim hành động hot"],
    "top_rated": ["Phim kinh dị hay nhất", "Phim tình cảm đáng xem", "Phim sắp chiếu"],
    "upcoming":  ["Phim đang hot", "Phim hành động hay nhất", "Phim gia đình"],
    "discover":  ["Phim hành động 2024", "Phim kinh dị hay", "Phim tình cảm lãng mạn"],
    "chat":      ["Phim đang hot nhất", "Phim kinh dị hay nhất 2024", "Phim sắp chiếu"],
}


# ══════════════════════════════════════════════════════════
# LOCAL INTENT PARSER
# ══════════════════════════════════════════════════════════
def _parse_local(text: str) -> dict:
    t = text.lower().strip()

    # ── Trending ──
    if re.search(r'hot|trending|thịnh hành|đang chiếu|tuần này|tháng này|mới nhất|đang hot', t):
        return {"intent": "trending", "genres": [], "query": None,
                "year_gte": None, "min_rating": None, "sort_by": "popularity.desc"}

    # ── Upcoming ──
    if re.search(r'sắp chiếu|sắp ra|upcoming|sắp ra mắt|chờ xem|ra rạp', t):
        return {"intent": "upcoming", "genres": [], "query": None,
                "year_gte": None, "min_rating": None, "sort_by": "popularity.desc"}

    # ── Top rated ──
    if re.search(r'hay nhất|tốt nhất|đỉnh nhất|kinh điển|xuất sắc|được đánh giá cao|top|rating cao|điểm cao', t):
        intent_base = {"intent": "top_rated", "genres": [], "query": None,
                       "year_gte": None, "min_rating": None, "sort_by": "vote_average.desc"}
        # Nếu kèm thể loại → discover + sort rating
        genres_found = _extract_genres(t)
        if genres_found:
            intent_base["intent"] = "discover"
            intent_base["genres"] = genres_found
            intent_base["sort_by"] = "vote_average.desc"
            intent_base["min_rating"] = 7.0
        return intent_base

    # ── Mood ──
    for pattern, genre_ids in MOOD_MAP.items():
        if re.search(pattern, t):
            genre_names = [k for k, v in GENRE_MAP.items() if v == genre_ids[0]]
            year_gte = _extract_year(t)
            return {"intent": "discover",
                    "genres": genre_names[:2] if genre_names else [],
                    "genre_ids_override": genre_ids,
                    "query": None,
                    "year_gte": year_gte,
                    "min_rating": 6.5,
                    "sort_by": "popularity.desc"}

    # ── Genre discover ──
    genres_found = _extract_genres(t)
    if genres_found:
        year_gte = _extract_year(t)
        rating = _extract_rating(t)
        return {"intent": "discover",
                "genres": genres_found,
                "query": None,
                "year_gte": year_gte,
                "min_rating": rating,
                "sort_by": "popularity.desc"}

    # ── Explicit search ──
    search_match = re.search(
        r'(?:tìm|search|xem|tên|phim|cho tôi|gợi ý)\s+(?:phim\s+)?["\']?([^"\'?!,]{3,50})["\']?', t
    )
    if search_match:
        query = search_match.group(1).strip()
        if len(query) > 2:
            return {"intent": "search", "query": query, "genres": [],
                    "year_gte": None, "min_rating": None, "sort_by": None}

    # ── Có vẻ là tên phim (nhiều chữ hoa, ít dấu câu) ──
    words = text.split()
    if 2 <= len(words) <= 6 and not re.search(r'[?!]$', text):
        cap_count = sum(1 for w in words if w[0].isupper()) if words else 0
        if cap_count >= 1 or re.search(r'[a-zA-Z]', text):
            return {"intent": "search", "query": text.strip(), "genres": [],
                    "year_gte": None, "min_rating": None, "sort_by": None}

    # ── Chat / không nhận ra ──
    return {"intent": "chat", "genres": [], "query": None,
            "year_gte": None, "min_rating": None, "sort_by": None}


def _extract_genres(text: str) -> list[str]:
    found = []
    for name, _ in GENRE_MAP.items():
        if name in text and name not in found:
            found.append(name)
    return found[:3]


def _extract_year(text: str) -> Optional[int]:
    decade = _DECADE_RE.search(text)
    if decade:
        yr = int(decade.group(1) or decade.group(2))
        return yr
    m = _YEAR_RE.search(text)
    return int(m.group(1)) if m else None


def _extract_rating(text: str) -> Optional[float]:
    if re.search(r'hay|chất|đỉnh|xuất sắc|tốt', text):
        return 7.0
    return None


# ══════════════════════════════════════════════════════════
# GEMINI (optional, chỉ dùng khi có key)
# ══════════════════════════════════════════════════════════
GEMINI_BASE   = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
GEMINI_MODELS = ["gemini-2.0-flash-lite", "gemini-2.0-flash"]

SYSTEM_PROMPT = """Bạn là trợ lý tìm phim cho Filmverse. Phân tích câu hỏi và trả về JSON:
{
  "intent": "search"|"discover"|"trending"|"top_rated"|"upcoming"|"chat",
  "query": "tên phim nếu search",
  "genres": ["hành động", ...],
  "year_gte": 2010,
  "min_rating": 7.0,
  "sort_by": "popularity.desc"|"vote_average.desc"|"release_date.desc",
  "reply": "trả lời ngắn tiếng Việt có emoji",
  "suggestions": ["gợi ý 1", "gợi ý 2", "gợi ý 3"]
}
CHỈ trả JSON, không markdown."""


def _call_gemini(messages: list[dict], api_key: str) -> dict:
    contents = [
        {"role": "user",  "parts": [{"text": SYSTEM_PROMPT}]},
        {"role": "model", "parts": [{"text": '{"intent":"chat","reply":"OK!","suggestions":[]}'}]},
    ]
    for msg in messages:
        contents.append({"role": "user" if msg["role"] == "user" else "model",
                         "parts": [{"text": msg["content"]}]})

    payload = {"contents": contents,
               "generationConfig": {"temperature": 0.7, "maxOutputTokens": 400,
                                    "responseMimeType": "application/json"}}

    for model in GEMINI_MODELS:
        url = f"{GEMINI_BASE.format(model=model)}?key={api_key}"
        for attempt in range(2):
            try:
                resp = httpx.post(url, json=payload, timeout=15)
                if resp.status_code == 429:
                    time.sleep(2 ** attempt)
                    continue
                if resp.status_code == 404:
                    break  # model không tồn tại, thử model khác
                resp.raise_for_status()
                raw = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(raw)
            except Exception:
                pass
    return None  # Gemini thất bại → trả None để fallback local


# ══════════════════════════════════════════════════════════
# FETCH MOVIES
# ══════════════════════════════════════════════════════════
def _fetch_movies(intent: dict) -> list[dict]:
    action = intent.get("intent", "chat")

    if action == "search" and intent.get("query"):
        r = tmdb_service.search_movies(intent["query"], page=1)
        return r.get("results", [])[:8]

    if action == "trending":
        return tmdb_service.get_trending_movies()[:8]

    if action == "top_rated":
        r = tmdb_service.get_top_rated_movies(page=1)
        return r.get("results", [])[:8]

    if action == "upcoming":
        r = tmdb_service.get_upcoming_movies(page=1)
        return r.get("results", [])[:8]

    if action == "discover":
        # Dùng genre_ids_override nếu có (từ mood map)
        genre_ids = intent.get("genre_ids_override")
        if not genre_ids:
            genre_names = intent.get("genres", [])
            genre_ids = [GENRE_MAP[n] for n in genre_names if n in GENRE_MAP]

        kwargs = {"page": 1, "sort_by": intent.get("sort_by", "popularity.desc")}
        if genre_ids:
            kwargs["genre_id"] = genre_ids[0]
        if intent.get("year_gte"):
            kwargs["year"] = intent["year_gte"]
        if intent.get("min_rating"):
            kwargs["min_rating"] = intent["min_rating"]

        r = tmdb_service.get_all_movies(**kwargs)
        movies = r.get("results", [])

        # Filter thêm genres còn lại
        if len(genre_ids) > 1:
            movies = [m for m in movies
                      if any(g in m.get("genre_ids", []) for g in genre_ids[1:])]
        return movies[:8]

    return []


# ══════════════════════════════════════════════════════════
# PUBLIC ENTRY POINT
# ══════════════════════════════════════════════════════════
def chat(messages: list[dict], api_key: Optional[str] = None) -> dict:
    last_user = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")

    # 1. Thử Gemini nếu có key
    gemini_intent = None
    if api_key:
        try:
            gemini_intent = _call_gemini(messages, api_key)
        except Exception as e:
            logger.warning(f"[ai_chat] Gemini failed, using local parser: {e}")

    # 2. Fallback local parser
    intent = gemini_intent if gemini_intent else _parse_local(last_user)

    # 3. Build reply text
    if gemini_intent and gemini_intent.get("reply"):
        reply = gemini_intent["reply"]
        suggestions = gemini_intent.get("suggestions", [])
    else:
        action = intent.get("intent", "chat")
        genres = intent.get("genres", [])
        query  = intent.get("query", "")
        reply  = _REPLIES.get(action, _REPLIES["chat"])(genres or query or "")
        suggestions = _SUGGESTIONS.get(action, _SUGGESTIONS["chat"])

    # 4. Fetch phim
    movies = []
    if intent.get("intent") != "chat":
        try:
            movies = _fetch_movies(intent)
        except Exception as e:
            logger.warning(f"[ai_chat] TMDB fetch error: {e}")

    return {
        "reply":       reply,
        "movies":      movies,
        "intent":      intent.get("intent", "chat"),
        "suggestions": suggestions,
    }
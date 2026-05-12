# app/services/ai_chat_service.py
"""
AI Chat service:
  - parse_intent_only()   → 0ms, local keyword parser
  - build_reply()         → 0ms, template reply
  - build_suggestions()   → 0ms
  - fetch_movies()        → ~300-600ms TMDB I/O
  - call_gemini_only()    → ~800-1500ms optional enhance
  - chat()                → legacy all-in-one (giữ cho /chat endpoint cũ)
"""

import json, re, time, logging, httpx
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional
from app.utils.config import settings
from app.services import tmdb_service

logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════
# DATA
# ══════════════════════════════════════════════════════════
GENRE_MAP = {
    "hành động":28,"action":28,
    "phiêu lưu":12,"adventure":12,
    "hoạt hình":16,"animation":16,"anime":16,
    "hài":35,"comedy":35,"hài hước":35,"vui":35,
    "tội phạm":80,"crime":80,"gangster":80,
    "tài liệu":99,"documentary":99,
    "chính kịch":18,"drama":18,
    "gia đình":10751,"family":10751,
    "fantasy":14,"kỳ ảo":14,
    "lịch sử":36,"history":36,"cổ trang":36,
    "kinh dị":27,"horror":27,"ma":27,"quỷ":27,
    "âm nhạc":10402,"music":10402,
    "bí ẩn":9648,"mystery":9648,
    "lãng mạn":10749,"romance":10749,"tình cảm":10749,"tình yêu":10749,
    "viễn tưởng":878,"sci-fi":878,"khoa học":878,"robot":878,"vũ trụ":878,
    "tâm lý":53,"thriller":53,"giật gân":53,
    "chiến tranh":10752,"war":10752,
    "miền tây":37,"western":37,
    "siêu anh hùng":28,"superhero":28,
}

MOOD_MAP = {
    r"buồn|cô đơn|sad|alone":              [10749,18],
    r"vui|happy|cười|haha|chill|giải trí": [35,16],
    r"hồi hộp|kịch tính|adrenaline":       [28,53],
    r"sợ|scary|rùng rợn|kinh|ớn":          [27],
    r"suy nghĩ|triết|deep|ý nghĩa":        [18,99],
    r"gia đình|cả nhà|bố mẹ|trẻ em":       [10751,16],
    r"hẹn hò|date|romantic|yêu":           [10749],
    r"căng thẳng|stress|relax|thư giãn":   [35,10751],
}

_YEAR_RE   = re.compile(r'\b(19[5-9]\d|20[0-2]\d)\b')
_DECADE_RE = re.compile(r'\b((?:19|20)\d0)s?\b|thập niên\s*((?:19|20)\d0)')


# ══════════════════════════════════════════════════════════
# LOCAL PARSER (0ms)
# ══════════════════════════════════════════════════════════
def parse_intent_only(text: str) -> dict:
    t = text.lower().strip()

    # ── Trích xuất signals chung trước ────────────────────────────
    year     = _extract_year(t)
    genres   = _extract_genres(t)
    rating   = _extract_rating(t)
    is_good  = bool(re.search(r'hay|chất|đỉnh|xuất sắc|tốt|đánh giá cao|rating cao|điểm cao|hay nhất|tốt nhất|đỉnh nhất|kinh điển|top', t))
    is_hot   = bool(re.search(r'\bhot\b|trending|thịnh hành|đang hot|phổ biến|nhiều người xem', t))
    is_new   = bool(re.search(r'mới nhất|mới ra|tuần này|tháng này|gần đây|latest|recent', t))
    is_soon  = bool(re.search(r'sắp chiếu|sắp ra|upcoming|ra rạp|chờ xem|sắp ra mắt', t))

    # ── Tên phim cụ thể (có dấu ngoặc kép) ───────────────────────
    quoted = re.search(r'["\u201c\u201d\u2018\u2019]([^"\']{2,60})["\u201c\u201d\u2018\u2019]', text)
    if quoted:
        return _mk("search", query=quoted.group(1).strip())

    # ── Sắp chiếu ─────────────────────────────────────────────────
    if is_soon:
        return _mk("upcoming", genres=genres, year_gte=year)

    # ── Có năm cụ thể + hot/mới/trending → discover theo năm ─────
    if year and (is_hot or is_new):
        return _mk("discover", genres=genres, year_gte=year, year_lte=year,
                   sort_by="popularity.desc", min_rating=6.0)

    # ── Có năm + "hay/đỉnh" → discover theo năm + rating cao ─────
    if year and is_good:
        return _mk("discover", genres=genres, year_gte=year, year_lte=year,
                   sort_by="vote_average.desc", min_rating=7.0)

    # ── Có năm + thể loại → discover năm + genre ─────────────────
    if year and genres:
        return _mk("discover", genres=genres, year_gte=year, year_lte=year,
                   sort_by="popularity.desc", min_rating=rating)

    # ── Chỉ có năm (không kèm signal khác) → phim nổi bật năm đó ─
    if year:
        return _mk("discover", genres=[], year_gte=year, year_lte=year,
                   sort_by="popularity.desc", min_rating=6.5)

    # ── Hot/Trending (không có năm) ───────────────────────────────
    if is_hot or is_new:
        if genres:
            return _mk("discover", genres=genres, sort_by="popularity.desc", min_rating=6.0)
        return _mk("trending")

    # ── Hay nhất / Rating cao (không có năm) ─────────────────────
    if is_good:
        if genres:
            return _mk("discover", genres=genres, sort_by="vote_average.desc", min_rating=7.5)
        return _mk("top_rated")

    # ── Mood ──────────────────────────────────────────────────────
    for pattern, gids in MOOD_MAP.items():
        if re.search(pattern, t):
            names = [k for k, v in GENRE_MAP.items() if v == gids[0]][:2]
            return _mk("discover", genres=names, genre_ids_override=gids,
                       year_gte=year, min_rating=6.5, sort_by="popularity.desc")

    # ── Thể loại đơn thuần ────────────────────────────────────────
    if genres:
        return _mk("discover", genres=genres, year_gte=year,
                   min_rating=rating, sort_by="popularity.desc")

    # ── Tìm kiếm tên phim theo từ khoá ───────────────────────────
    kw_match = re.search(
        r'(?:tìm|search|cho tôi xem|gợi ý|giới thiệu|tìm phim|xem phim)\s+(?:phim\s+)?(.{2,60}?)(?:\s*[?!]|$)', t
    )
    if kw_match:
        q = kw_match.group(1).strip()
        if len(q) > 1:
            return _mk("search", query=q)

    # ── Có vẻ là tên phim (2-6 từ, có chữ hoa / tiếng Anh) ──────
    words = text.strip().split()
    if 1 <= len(words) <= 7 and not re.search(r'[?!]$', text):
        cap = sum(1 for w in words if w and w[0].isupper())
        has_en = bool(re.search(r'[a-zA-Z]{2,}', text))
        not_viet_question = not re.search(r'^(cho|bạn|tôi|mình|phim|có|là|xem|muốn|thích|cần|hỏi|gợi|tìm)', t)
        # 1 từ tiếng Anh viết hoa → tên phim
        if len(words) == 1 and has_en and text[0].isupper():
            return _mk("search", query=text.strip())
        if len(words) >= 2 and (cap >= 2 or has_en) and not_viet_question:
            return _mk("search", query=text.strip())

    return _mk("chat")


def _mk(intent: str, **kwargs) -> dict:
    """Tạo intent dict với default values."""
    return {
        "intent":             intent,
        "query":              kwargs.get("query"),
        "genres":             kwargs.get("genres", []),
        "genre_ids_override": kwargs.get("genre_ids_override"),
        "year_gte":           kwargs.get("year_gte"),
        "year_lte":           kwargs.get("year_lte"),
        "min_rating":         kwargs.get("min_rating"),
        "sort_by":            kwargs.get("sort_by", "popularity.desc"),
    }


def _extract_genres(t: str) -> list[str]:
    # Ưu tiên genre dài hơn trước (tránh "hài" match trước "hài hước")
    sorted_genres = sorted(GENRE_MAP.keys(), key=len, reverse=True)
    found, found_ids = [], set()
    for name in sorted_genres:
        if name in t:
            gid = GENRE_MAP[name]
            if gid not in found_ids:
                found.append(name)
                found_ids.add(gid)
        if len(found) >= 3:
            break
    return found


def _extract_year(t: str) -> Optional[int]:
    d = _DECADE_RE.search(t)
    if d:
        return int(d.group(1) or d.group(2))
    m = _YEAR_RE.search(t)
    return int(m.group(1)) if m else None


def _extract_rating(t: str) -> Optional[float]:
    if re.search(r'hay|chất|đỉnh|xuất sắc|tốt|rating cao|điểm cao', t):
        return 7.0
    return None


# ══════════════════════════════════════════════════════════
# BUILD REPLY / SUGGESTIONS (0ms)
# ══════════════════════════════════════════════════════════
def build_reply(intent: dict) -> str:
    action  = intent.get("intent","chat")
    genres  = intent.get("genres",[])
    query   = intent.get("query","")
    year    = intent.get("year_gte") or intent.get("year_lte")
    rating  = intent.get("min_rating")
    sort_by = intent.get("sort_by","")

    genre_str = ", ".join(genres) if genres else ""
    year_str  = f" năm {year}" if year else ""
    qual_str  = " hay nhất" if (rating and rating >= 7.5) else (" chất lượng" if rating else "")

    if action == "search":
        return f'🔍 Kết quả tìm kiếm cho "{query}"!'

    if action == "trending":
        return "🔥 Những phim đang hot nhất tuần này!"

    if action == "top_rated":
        return "⭐ Những phim được đánh giá cao nhất mọi thời đại!"

    if action == "upcoming":
        g = f" {genre_str}" if genre_str else ""
        return f"🎬 Phim{g} sắp ra rạp — đừng bỏ lỡ!"

    if action == "discover":
        if genre_str and year_str:
            return f'🎯 Phim {genre_str}{qual_str}{year_str}!'
        if genre_str:
            return f'🎯 Phim {genre_str}{qual_str} dành cho bạn!'
        if year_str:
            top = "hay nhất" if "vote_average" in sort_by else "nổi bật"
            return f'📅 Những phim {top}{year_str}!'
        return "🎯 Đây là những phim phù hợp với bạn!"

    return "Tôi chuyên tìm phim thôi 😄 Hỏi tôi về thể loại, tâm trạng, năm phát hành hoặc tên phim nhé!"


def build_suggestions(intent: dict) -> list[str]:
    action = intent.get("intent","chat")
    year   = intent.get("year_gte")
    genres = intent.get("genres",[])
    g      = genres[0] if genres else ""

    base = {
        "search":    [f"Phim tương tự", f"Phim {g} hay nhất" if g else "Phim đang hot", "Xem trailer"],
        "trending":  ["Phim được đánh giá cao nhất", "Phim sắp chiếu", f"Phim hot năm {year or 2024}"],
        "top_rated": [f"Phim {g} đỉnh nhất" if g else "Phim kinh dị hay nhất", "Phim tình cảm đáng xem", "Phim sắp chiếu"],
        "upcoming":  ["Phim đang chiếu", "Phim hành động hay nhất", "Phim gia đình"],
        "discover":  [
            f"Phim {g} hay nhất" if g else "Phim hành động 2024",
            f"Phim {g} năm {year}" if g and year else "Phim kinh dị hay",
            "Phim được đánh giá cao nhất",
        ],
        "chat":      ["Phim đang hot nhất 2024", "Phim kinh dị hay nhất", "Phim sắp chiếu"],
    }
    return base.get(action, base["chat"])


# ══════════════════════════════════════════════════════════
# FETCH MOVIES — parallel khi có nhiều call
# ══════════════════════════════════════════════════════════
def fetch_movies(intent: dict) -> list[dict]:
    action = intent.get("intent","chat")

    if action == "search" and intent.get("query"):
        r = tmdb_service.search_movies(intent["query"], page=1)
        return r.get("results",[])[:8]

    if action == "trending":
        return tmdb_service.get_trending_movies()[:8]

    if action == "top_rated":
        r = tmdb_service.get_top_rated_movies(page=1)
        return r.get("results",[])[:8]

    if action == "upcoming":
        r = tmdb_service.get_upcoming_movies(page=1)
        return r.get("results",[])[:8]

    if action == "discover":
        gids = intent.get("genre_ids_override")
        if not gids:
            gids = [GENRE_MAP[n] for n in intent.get("genres",[]) if n in GENRE_MAP]

        kwargs = {"page":1, "sort_by": intent.get("sort_by","popularity.desc")}
        if gids:                      kwargs["genre_id"]   = gids[0]
        if intent.get("year_gte"):    kwargs["year"]       = intent["year_gte"]
        if intent.get("min_rating"):  kwargs["min_rating"] = intent["min_rating"]

        r = tmdb_service.get_all_movies(**kwargs)
        movies = r.get("results",[])

        # Filter year_lte client-side nếu cần
        if intent.get("year_lte"):
            movies = [
                m for m in movies
                if (m.get("release_date") or "")[:4] <= str(intent["year_lte"])
            ]

        # Filter thêm genres phụ
        if len(gids) > 1:
            movies = [m for m in movies if any(g in m.get("genre_ids",[]) for g in gids[1:])]

        return movies[:8]

    return []


# ══════════════════════════════════════════════════════════
# GEMINI (optional, chỉ enhance reply text)
# ══════════════════════════════════════════════════════════
_GEMINI_MODELS = ["gemini-2.0-flash-lite", "gemini-2.0-flash"]
_GEMINI_BASE   = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
_SYSTEM        = """Trợ lý tìm phim Filmverse. Phân tích câu hỏi, trả JSON:
{"intent":"search"|"discover"|"trending"|"top_rated"|"upcoming"|"chat",
 "query":"tên phim","genres":[],"year_gte":null,"min_rating":null,
 "sort_by":"popularity.desc","reply":"trả lời ngắn tiếng Việt emoji",
 "suggestions":["gợi ý 1","gợi ý 2","gợi ý 3"]}
CHỈ JSON."""

def call_gemini_only(messages: list[dict], api_key: str) -> Optional[dict]:
    contents = [
        {"role":"user",  "parts":[{"text":_SYSTEM}]},
        {"role":"model", "parts":[{"text":'{"intent":"chat","reply":"OK!","suggestions":[]}'}]},
    ]
    for m in messages:
        contents.append({"role":"user" if m["role"]=="user" else "model",
                         "parts":[{"text":m["content"]}]})

    payload = {"contents":contents,
               "generationConfig":{"temperature":0.7,"maxOutputTokens":300,
                                   "responseMimeType":"application/json"}}

    for model in _GEMINI_MODELS:
        url = f"{_GEMINI_BASE.format(model=model)}?key={api_key}"
        for attempt in range(2):
            try:
                r = httpx.post(url, json=payload, timeout=12)
                if r.status_code == 429:
                    time.sleep(2**attempt); continue
                if r.status_code == 404: break
                r.raise_for_status()
                raw = r.json()["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(raw)
            except Exception:
                pass
    return None


# ══════════════════════════════════════════════════════════
# LEGACY all-in-one (dùng cho /chat endpoint cũ)
# ══════════════════════════════════════════════════════════
def chat(messages: list[dict], api_key: Optional[str] = None) -> dict:
    last_user = next((m["content"] for m in reversed(messages) if m["role"]=="user"), "")

    # Parse local + fetch TMDB song song với Gemini (nếu có)
    intent = parse_intent_only(last_user)

    gemini_result = None
    if api_key and intent.get("intent") != "chat":
        with ThreadPoolExecutor(max_workers=2) as ex:
            f_movies  = ex.submit(fetch_movies, intent)
            f_gemini  = ex.submit(call_gemini_only, messages, api_key)
            movies        = f_movies.result()
            gemini_result = f_gemini.result()
    else:
        movies = fetch_movies(intent) if intent.get("intent") != "chat" else []

    if gemini_result and gemini_result.get("reply"):
        return {"reply":gemini_result["reply"], "movies":movies,
                "intent":intent.get("intent","chat"),
                "suggestions":gemini_result.get("suggestions",[])}

    return {"reply":build_reply(intent), "movies":movies,
            "intent":intent.get("intent","chat"),
            "suggestions":build_suggestions(intent)}
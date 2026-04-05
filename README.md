# Mood-based Discovery — Hướng dẫn tích hợp

## Tổng quan

Tính năng cho phép user chọn tâm trạng (vui, buồn, hồi hộp...) và nhận
gợi ý phim phù hợp, có loại trừ phim đã có trong watchlist nếu đã login.

---

## BACKEND — 4 bước

### 1. Copy files mới

```
app/services/mood_service.py      ← mood_service.py
app/routers/mood.py               ← mood_router.py
```

### 2. Cập nhật dependencies.py

Thêm `get_optional_user` vào `app/utils/dependencies.py`
(xem file `dependencies_updated.py` để copy toàn bộ thay thế file cũ)

### 3. Đăng ký router trong main.py

```python
# Thêm import
from app.routers import mood as mood_router

# Thêm vào cuối phần include_router
app.include_router(mood_router.router)
```

### 4. Đảm bảo tmdb_service có hàm discover_by_genre

Hàm này đã có sẵn trong `recommendation_service.py` — nếu chưa có trong
`tmdb_service.py`, thêm:

```python
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
```

---

## FRONTEND — 3 bước

### 1. Copy files mới

```
src/api/moodApi.js                ← moodApi.js
src/components/MoodPicker.jsx     ← MoodPicker.jsx
src/pages/MoodDiscovery.jsx       ← MoodDiscovery.jsx
```

### 2. Thêm route trong App.jsx

```jsx
import MoodDiscovery from "./pages/MoodDiscovery";
// ...
<Route path="/mood" element={<MoodDiscovery />} />
```

### 3. Thêm link trong Navbar.jsx

Thêm link `/mood` vào menu điều hướng (xem Navbar_diff.jsx để biết vị trí).

---

## API Endpoints mới

| Method | Endpoint         | Auth     | Mô tả                              |
|--------|------------------|----------|------------------------------------|
| GET    | /mood/           | Không cần | Danh sách 8 mood                   |
| GET    | /mood/{mood_id}  | Tuỳ chọn | Phim theo mood, lọc watchlist nếu login |

### Ví dụ response GET /mood/vui

```json
{
  "mood": {
    "id": "vui",
    "label": "Vui vẻ",
    "emoji": "😄",
    "description": "Cần cười thả ga, quên hết lo âu",
    "color": "#f1c40f"
  },
  "results": [ ...20 phim ],
  "total_results": 20
}
```

---

## 8 Tâm trạng có sẵn

| ID          | Label      | Genre chính              |
|-------------|------------|--------------------------|
| vui         | Vui vẻ     | Comedy, Family, Animation|
| buon        | Muốn khóc  | Drama, Romance           |
| hoi_hop     | Hồi hộp    | Thriller, Crime, Action  |
| kinh_di     | Muốn sợ    | Horror, Mystery          |
| thu_gian    | Thư giãn   | Comedy, Adventure        |
| phieu_luu   | Phiêu lưu  | Adventure, Sci-Fi        |
| lang_man    | Lãng mạn   | Romance, Comedy          |
| suy_ngam    | Suy ngẫm   | Sci-Fi, Mystery, Drama   |

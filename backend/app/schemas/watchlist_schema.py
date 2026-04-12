import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

_SAFE_TEXT_RE = re.compile(r'[<>{}\[\]\\]')
_GENRE_IDS_RE = re.compile(r'^\d+(,\d+)*$')     # "28,12,35"
_URL_RE        = re.compile(r'^https?://', re.I)


# ── Watchlist ──────────────────────────────────────────────

class WatchlistCreate(BaseModel):
    movie_id:      int            = Field(..., gt=0, le=10_000_000)
    title:         str            = Field(..., min_length=1, max_length=255)
    poster:        Optional[str]  = Field(None, max_length=500)
    runtime:       Optional[int]  = Field(None, ge=0, le=1440)   # max 24h
    genre_ids:     Optional[str]  = Field(None, max_length=200)
    collection_id: Optional[int]  = Field(None, gt=0)

    @field_validator("title")
    @classmethod
    def title_safe(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Tiêu đề không được để trống.")
        if _SAFE_TEXT_RE.search(v):
            raise ValueError("Tiêu đề chứa ký tự không hợp lệ.")
        return v

    @field_validator("poster")
    @classmethod
    def poster_is_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not _URL_RE.match(v):
            raise ValueError("Poster phải là URL hợp lệ.")
        return v

    @field_validator("genre_ids")
    @classmethod
    def genre_ids_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not _GENRE_IDS_RE.match(v):
            raise ValueError("genre_ids phải có dạng '28,12,35'.")
        return v


class WatchlistNoteUpdate(BaseModel):
    note: str = Field(..., max_length=1000)

    @field_validator("note")
    @classmethod
    def note_safe(cls, v: str) -> str:
        v = v.strip()
        if _SAFE_TEXT_RE.search(v):
            raise ValueError("Ghi chú chứa ký tự không hợp lệ.")
        return v


class WatchlistMoveCollection(BaseModel):
    collection_id: Optional[int] = Field(None, gt=0)


class WatchlistResponse(BaseModel):
    id:            int
    movie_id:      int
    title:         str
    poster:        Optional[str]
    is_watched:    bool
    watched_at:    Optional[datetime]
    note:          Optional[str]
    runtime:       Optional[int]
    genre_ids:     Optional[str]
    collection_id: Optional[int]
    added_at:      datetime

    class Config:
        from_attributes = True


# ── Stats ──────────────────────────────────────────────────

class GenreStat(BaseModel):
    genre_id:   str
    genre_name: str        # Tên thể loại đã được map từ TMDB genre ID
    count:      int


class WatchlistStats(BaseModel):
    total:                   int
    watched:                 int
    unwatched:               int
    total_runtime_minutes:   int
    watched_runtime_minutes: int
    top_genres:              List[GenreStat]


# ── Collections ────────────────────────────────────────────

class CollectionCreate(BaseModel):
    name:        str           = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)

    @field_validator("name")
    @classmethod
    def name_safe(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Tên bộ sưu tập không được để trống.")
        if _SAFE_TEXT_RE.search(v):
            raise ValueError("Tên chứa ký tự không hợp lệ.")
        return v

    @field_validator("description")
    @classmethod
    def description_safe(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if _SAFE_TEXT_RE.search(v):
            raise ValueError("Mô tả chứa ký tự không hợp lệ.")
        return v


class CollectionResponse(BaseModel):
    id:          int
    name:        str
    description: Optional[str]
    movie_count: int = 0
    created_at:  datetime

    class Config:
        from_attributes = True


# ── Share ──────────────────────────────────────────────────

class ShareResponse(BaseModel):
    share_token: str
    share_url:   str
    is_active:   bool


class PublicCollectionGroup(BaseModel):
    id:          Optional[int]       # None = phim không thuộc collection nào
    name:        str                 # "Không có bộ sưu tập" nếu id là None
    description: Optional[str]
    movies:      List[WatchlistResponse]


class PublicWatchlistResponse(BaseModel):
    owner_username:      Optional[str]
    owner_avatar:        Optional[str]   # emoji avatar
    owner_avatar_url:    Optional[str]   # URL ảnh Google profile
    owner_bio:           Optional[str]
    total:               int
    watched:             int
    total_runtime_minutes: int
    top_genres:          List[GenreStat]
    collections:         List[PublicCollectionGroup]
    movies:              List[WatchlistResponse]  # flat list giữ lại cho compatibility
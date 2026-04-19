# app/schemas/review_schema.py
import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

_SAFE_TEXT_RE = re.compile(r"[<>{}\\]")


class ReviewCreate(BaseModel):
    rating:     int           = Field(..., ge=1, le=10)
    content:    Optional[str] = Field(None, max_length=2000)
    is_spoiler: bool          = False

    @field_validator("content")
    @classmethod
    def content_safe(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if _SAFE_TEXT_RE.search(v):
            raise ValueError("Nội dung chứa ký tự không hợp lệ.")
        return v or None


class ReviewUpdate(BaseModel):
    rating:     Optional[int] = Field(None, ge=1, le=10)
    content:    Optional[str] = Field(None, max_length=2000)
    is_spoiler: Optional[bool] = None

    @field_validator("content")
    @classmethod
    def content_safe(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if _SAFE_TEXT_RE.search(v):
            raise ValueError("Nội dung chứa ký tự không hợp lệ.")
        return v or None


class ReviewAuthor(BaseModel):
    id:         int
    username:   Optional[str]
    avatar:     Optional[str]
    avatar_url: Optional[str]

    model_config = {"from_attributes": True}


class ReviewResponse(BaseModel):
    id:         int
    movie_id:   int
    rating:     int
    content:    Optional[str]
    is_spoiler: bool
    likes:      int
    liked_by_me: bool = False      # client biết mình đã like chưa
    author:     ReviewAuthor
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


class MovieRatingSummary(BaseModel):
    movie_id:      int
    average:       Optional[float]   # None nếu chưa có review nào
    count:         int
    distribution:  dict[str, int]    # {"1":0, "2":3, ...,"10":12}
    my_rating:     Optional[int]     # rating của user hiện tại (nếu đã login)
    my_review_id:  Optional[int]     # id review của user (để edit/delete)
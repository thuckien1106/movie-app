# app/schemas/reminder_schema.py
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
import re

_URL_RE = re.compile(r'^https?://', re.I)


class ReminderCreate(BaseModel):
    movie_id:     int            = Field(..., gt=0, le=10_000_000)
    title:        str            = Field(..., min_length=1, max_length=255)
    poster:       Optional[str]  = Field(None, max_length=500)
    release_date: Optional[str]  = Field(None, max_length=20)  # "YYYY-MM-DD"

    @field_validator("release_date")
    @classmethod
    def validate_date(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', v):
            raise ValueError("release_date phải có dạng YYYY-MM-DD")
        return v

    @field_validator("poster")
    @classmethod
    def poster_url(cls, v: Optional[str]) -> Optional[str]:
        if v and not _URL_RE.match(v):
            raise ValueError("poster phải là URL hợp lệ")
        return v


class ReminderResponse(BaseModel):
    id:           int
    movie_id:     int
    title:        str
    poster:       Optional[str]
    release_date: Optional[str]
    notify_on:    Optional[str]
    is_sent:      bool
    created_at:   datetime

    class Config:
        from_attributes = True


class NotificationResponse(BaseModel):
    id:         int
    movie_id:   Optional[int]
    title:      str
    body:       Optional[str]
    poster:     Optional[str]
    is_read:    bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationStats(BaseModel):
    total:   int
    unread:  int
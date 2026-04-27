# app/schemas/comment_schema.py
import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

_SAFE = re.compile(r"[<>{}\[\]\\]")


class CommentCreate(BaseModel):
    content:   str           = Field(..., min_length=1, max_length=1000)
    parent_id: Optional[int] = None   # None = bình luận gốc, int = reply

    @field_validator("content")
    @classmethod
    def content_safe(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Bình luận không được để trống.")
        if _SAFE.search(v):
            raise ValueError("Bình luận chứa ký tự không hợp lệ.")
        return v


class CommentAuthor(BaseModel):
    id:         int
    username:   Optional[str]
    avatar:     Optional[str]
    avatar_url: Optional[str]

    model_config = {"from_attributes": True}


class CommentResponse(BaseModel):
    id:         int
    review_id:  int
    parent_id:  Optional[int]
    content:    str
    author:     CommentAuthor
    created_at: datetime
    updated_at: Optional[datetime]
    replies:    List["CommentResponse"] = []   # chỉ điền cho top-level comments

    model_config = {"from_attributes": True}


class CommentListResponse(BaseModel):
    comments: List[CommentResponse]
    total:    int
# app/routers/comments.py
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from typing import Optional

from app.schemas.comment_schema import CommentCreate, CommentListResponse
from app.services import comment_service
from app.utils.dependencies import get_db, get_current_user, get_optional_user
from app.utils.rate_limit import limiter
from app.models.user import User

router = APIRouter(prefix="/reviews", tags=["Comments"])

_READ  = dict(max_calls=60,  window_sec=60)
_WRITE = dict(max_calls=20,  window_sec=60)


@router.get("/{review_id}/comments", response_model=CommentListResponse)
def list_comments(
    request:   Request,
    review_id: int,
    db:        Session = Depends(get_db),
):
    """Lấy toàn bộ bình luận + replies của 1 review."""
    limiter.check(request, "comments_read", **_READ)
    return comment_service.get_comments(db, review_id)


@router.post("/{review_id}/comments")
def add_comment(
    request:      Request,
    review_id:    int,
    data:         CommentCreate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """Thêm bình luận mới hoặc reply cho review."""
    limiter.check(request, "comments_write", **_WRITE)
    return comment_service.create_comment(db, current_user.id, review_id, data)


@router.delete("/comments/{comment_id}")
def delete_comment(
    request:      Request,
    comment_id:   int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """Xoá bình luận (chỉ chủ sở hữu)."""
    limiter.check(request, "comments_write", **_WRITE)
    return comment_service.delete_comment(db, current_user.id, comment_id)
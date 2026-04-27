# app/models/comment.py
from sqlalchemy import Column, Integer, Text, Boolean, ForeignKey, DateTime, Index
from sqlalchemy.sql import func
from app.database.base import Base


class Comment(Base):
    """
    Bình luận / trả lời cho một review.
    Hỗ trợ 1 cấp reply (comment → reply to comment).
    parent_id = None  → bình luận gốc
    parent_id = id    → reply của bình luận đó
    """
    __tablename__ = "comments"

    id         = Column(Integer, primary_key=True, index=True)
    review_id  = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False)
    user_id    = Column(Integer, ForeignKey("users.id",   ondelete="CASCADE"), nullable=False)
    parent_id  = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)
    content    = Column(Text, nullable=False)
    is_hidden  = Column(Boolean, default=False, nullable=False)   # mod ẩn
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    __table_args__ = (
        Index("ix_comments_review",  "review_id", "parent_id", "created_at"),
    )
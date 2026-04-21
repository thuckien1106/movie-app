# app/models/review.py
from sqlalchemy import (
    Column, Integer, String, Text, Boolean,
    ForeignKey, DateTime, UniqueConstraint, Index,
)
from sqlalchemy.sql import func
from app.database.base import Base


class Review(Base):
    """
    Review công khai của user cho một bộ phim.
    Mỗi user chỉ được review mỗi phim 1 lần (unique constraint).
    """
    __tablename__ = "reviews"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    movie_id   = Column(Integer, nullable=False, index=True)
    rating     = Column(Integer, nullable=False)
    content    = Column(Text, nullable=True)
    is_spoiler = Column(Boolean, default=False)
    likes      = Column(Integer, default=0)

    # ── Moderation ────────────────────────────────────────
    is_flagged   = Column(Boolean, default=False, nullable=False)   # bị báo cáo
    flag_reason  = Column(String(500), nullable=True)               # lý do bị flag
    is_hidden    = Column(Boolean, default=False, nullable=False)   # mod đã ẩn

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "movie_id", name="uq_review_user_movie"),
        Index("ix_reviews_movie_created", "movie_id", "created_at"),
        Index("ix_reviews_flagged", "is_flagged", "is_hidden"),
    )


class ReviewLike(Base):
    """Theo dõi ai đã like review nào (tránh like nhiều lần)."""
    __tablename__ = "review_likes"

    id        = Column(Integer, primary_key=True, index=True)
    user_id   = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "review_id", name="uq_like_user_review"),
    )
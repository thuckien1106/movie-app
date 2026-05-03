# app/models/follow.py
from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint, Index
from sqlalchemy.sql import func
from app.database.base import Base


class Follow(Base):
    """
    Quan hệ follow giữa 2 user.
    follower_id  → người đang follow
    following_id → người được follow
    """
    __tablename__ = "follows"

    id           = Column(Integer, primary_key=True, index=True)
    follower_id  = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    following_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_follow"),
        Index("ix_follows_follower",  "follower_id"),
        Index("ix_follows_following", "following_id"),
    )
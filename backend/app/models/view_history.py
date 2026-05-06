# app/models/view_history.py
from sqlalchemy import (
    Column, Integer, String, ForeignKey,
    DateTime, UniqueConstraint, Index,
)
from sqlalchemy.sql import func
from app.database.base import Base


class ViewHistory(Base):
    """
    Lịch sử xem phim của user — mỗi lần user mở trang MovieDetail
    thì upsert vào bảng này (viewed_at cập nhật lại theo lần xem gần nhất).
    Mỗi (user_id, movie_id) chỉ có 1 record → dùng UniqueConstraint + UPDATE.
    """
    __tablename__ = "view_history"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    movie_id   = Column(Integer, nullable=False)
    title      = Column(String(255), nullable=False)
    poster     = Column(String(500), nullable=True)
    viewed_at  = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "movie_id", name="uq_view_history"),
        Index("ix_view_history_user_viewed", "user_id", "viewed_at"),
    )
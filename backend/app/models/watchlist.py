from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.sql import func
from app.database.base import Base


class Collection(Base):
    """Bộ sưu tập tuỳ chỉnh của người dùng (VD: 'Phim Ghibli', 'Xem cùng con')"""
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Watchlist(Base):
    __tablename__ = "watchlist"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    movie_id = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    poster = Column(String(500), nullable=True)
    is_watched = Column(Boolean, default=False)
    note = Column(Text, nullable=True)                      # Ghi chú cá nhân
    runtime = Column(Integer, nullable=True)                # Thời lượng phim (phút) — cho stats
    genre_ids = Column(String(200), nullable=True)          # "28,12,35" — cho stats thể loại
    collection_id = Column(Integer, ForeignKey("collections.id"), nullable=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now())


class WatchlistShare(Base):
    """Token chia sẻ watchlist qua link public"""
    __tablename__ = "watchlist_shares"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    share_token = Column(String(64), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
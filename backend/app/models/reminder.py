# app/models/reminder.py
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from app.database.base import Base


class Reminder(Base):
    """
    Lưu yêu cầu nhắc nhở phim sắp chiếu của user.

    Luồng:
      1. User bấm "Nhắc tôi" trên phim upcoming
      2. Tạo record Reminder với notify_on = release_date - 3 ngày
      3. Nền (scheduler / cron) quét hàng ngày → gửi in-app notification
         khi now() >= notify_on và is_sent = False
      4. Đánh dấu is_sent = True sau khi gửi
    """
    __tablename__ = "reminders"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    movie_id     = Column(Integer, nullable=False)
    title        = Column(String(255), nullable=False)
    poster       = Column(String(500), nullable=True)
    release_date = Column(String(20),  nullable=True)
    notify_on    = Column(String(20),  nullable=True)
    is_sent      = Column(Boolean, default=False)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())


class InAppNotification(Base):
    """
    Thông báo in-app — hiển thị trong notification bell.

    notif_type phân loại nguồn gốc:
      "reminder"  → phim sắp chiếu (từ scheduler)
      "like"      → ai đó thích review của bạn
      "comment"   → ai đó bình luận vào review của bạn
    """
    __tablename__ = "notifications"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    movie_id    = Column(Integer, nullable=True)
    review_id   = Column(Integer, nullable=True)
    title       = Column(String(255), nullable=False)
    body        = Column(Text,        nullable=True)
    poster      = Column(String(500), nullable=True)
    notif_type  = Column(String(20),  nullable=False, default="reminder")
    is_read     = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
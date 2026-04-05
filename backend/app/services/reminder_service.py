# app/services/reminder_service.py
"""
Reminder service — xử lý toàn bộ logic nhắc nhở phim sắp chiếu.

Luồng chính:
  set_reminder()       → user đặt nhắc cho 1 phim
  remove_reminder()    → huỷ nhắc
  get_reminders()      → danh sách nhắc của user
  check_and_fire()     → scheduler gọi mỗi ngày để tạo notification
  get_notifications()  → lấy thông báo in-app
  mark_read()          → đánh dấu đã đọc
"""

import logging
from datetime import date, timedelta, datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.reminder import Reminder, InAppNotification
from app.schemas.reminder_schema import ReminderCreate

logger = logging.getLogger(__name__)

# Số ngày trước release_date sẽ gửi thông báo
NOTIFY_DAYS_BEFORE = 3


# ════════════════════════════════════════════
# REMINDER CRUD
# ════════════════════════════════════════════

def set_reminder(db: Session, user_id: int, data: ReminderCreate) -> Reminder:
    """Đặt nhắc nhở. Idempotent — nếu đã tồn tại thì trả về item cũ."""
    existing = db.query(Reminder).filter(
        Reminder.user_id == user_id,
        Reminder.movie_id == data.movie_id,
    ).first()
    if existing:
        return existing

    # Tính notify_on = release_date - NOTIFY_DAYS_BEFORE
    notify_on = None
    if data.release_date:
        try:
            rd = date.fromisoformat(data.release_date)
            nd = rd - timedelta(days=NOTIFY_DAYS_BEFORE)
            notify_on = nd.isoformat()
        except ValueError:
            pass

    reminder = Reminder(
        user_id=user_id,
        movie_id=data.movie_id,
        title=data.title,
        poster=data.poster,
        release_date=data.release_date,
        notify_on=notify_on,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


def remove_reminder(db: Session, user_id: int, movie_id: int) -> bool:
    reminder = db.query(Reminder).filter(
        Reminder.user_id == user_id,
        Reminder.movie_id == movie_id,
    ).first()
    if not reminder:
        return False
    db.delete(reminder)
    db.commit()
    return True


def get_reminders(db: Session, user_id: int) -> list[Reminder]:
    return (
        db.query(Reminder)
        .filter(Reminder.user_id == user_id)
        .order_by(Reminder.release_date.asc())
        .all()
    )


def is_reminded(db: Session, user_id: int, movie_id: int) -> bool:
    return db.query(Reminder).filter(
        Reminder.user_id == user_id,
        Reminder.movie_id == movie_id,
    ).first() is not None


# ════════════════════════════════════════════
# SCHEDULER — gọi mỗi ngày (lifespan / APScheduler)
# ════════════════════════════════════════════

def check_and_fire(db: Session) -> int:
    """
    Quét tất cả reminder chưa gửi có notify_on <= hôm nay.
    Tạo InAppNotification cho từng user, đánh dấu is_sent = True.
    Trả về số lượng notification đã tạo.
    """
    today = date.today().isoformat()

    pending = db.query(Reminder).filter(
        and_(
            Reminder.is_sent == False,
            Reminder.notify_on != None,
            Reminder.notify_on <= today,
        )
    ).all()

    fired = 0
    for r in pending:
        # Kiểm tra đã có notification chưa (tránh duplicate nếu chạy 2 lần)
        already = db.query(InAppNotification).filter(
            InAppNotification.user_id == r.user_id,
            InAppNotification.movie_id == r.movie_id,
        ).first()
        if already:
            r.is_sent = True
            continue

        # Tạo nội dung thông báo
        days_left = _days_until(r.release_date)
        if days_left is not None and days_left > 0:
            body = f'"{r.title}" sẽ ra rạp sau {days_left} ngày nữa ({r.release_date}). Đừng bỏ lỡ!'
        elif days_left == 0:
            body = f'"{r.title}" ra rạp hôm nay! 🎉'
        else:
            body = f'"{r.title}" đã ra rạp rồi! Bạn đã xem chưa?'

        notif = InAppNotification(
            user_id=r.user_id,
            movie_id=r.movie_id,
            title=f"🎬 Sắp ra rạp: {r.title}",
            body=body,
            poster=r.poster,
        )
        db.add(notif)
        r.is_sent = True
        fired += 1

    db.commit()
    logger.info(f"[reminder] Fired {fired} notifications for {today}")
    return fired


def _days_until(release_date_str: str | None) -> int | None:
    if not release_date_str:
        return None
    try:
        rd = date.fromisoformat(release_date_str)
        return (rd - date.today()).days
    except ValueError:
        return None


# ════════════════════════════════════════════
# IN-APP NOTIFICATIONS
# ════════════════════════════════════════════

def get_notifications(
    db: Session,
    user_id: int,
    limit: int = 30,
    unread_only: bool = False,
) -> list[InAppNotification]:
    q = db.query(InAppNotification).filter(
        InAppNotification.user_id == user_id
    )
    if unread_only:
        q = q.filter(InAppNotification.is_read == False)
    return q.order_by(InAppNotification.created_at.desc()).limit(limit).all()


def get_notification_stats(db: Session, user_id: int) -> dict:
    total  = db.query(InAppNotification).filter(InAppNotification.user_id == user_id).count()
    unread = db.query(InAppNotification).filter(
        InAppNotification.user_id == user_id,
        InAppNotification.is_read == False,
    ).count()
    return {"total": total, "unread": unread}


def mark_read(db: Session, user_id: int, notification_id: int) -> bool:
    notif = db.query(InAppNotification).filter(
        InAppNotification.id == notification_id,
        InAppNotification.user_id == user_id,
    ).first()
    if not notif:
        return False
    notif.is_read = True
    db.commit()
    return True


def mark_all_read(db: Session, user_id: int) -> int:
    updated = db.query(InAppNotification).filter(
        InAppNotification.user_id == user_id,
        InAppNotification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return updated


def delete_notification(db: Session, user_id: int, notification_id: int) -> bool:
    notif = db.query(InAppNotification).filter(
        InAppNotification.id == notification_id,
        InAppNotification.user_id == user_id,
    ).first()
    if not notif:
        return False
    db.delete(notif)
    db.commit()
    return True
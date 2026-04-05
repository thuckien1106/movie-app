# app/routers/reminder.py
"""
Reminder & Notification endpoints.

── Reminders (đặt nhắc phim sắp chiếu) ──────────────────
GET    /reminders/                     → danh sách reminder của user
POST   /reminders/                     → đặt nhắc mới
DELETE /reminders/{movie_id}           → huỷ nhắc
GET    /reminders/check/{movie_id}     → kiểm tra đã nhắc chưa

── Notifications (thông báo in-app) ─────────────────────
GET    /reminders/notifications/              → lấy danh sách thông báo
GET    /reminders/notifications/stats         → unread count (cho bell icon)
POST   /reminders/notifications/read-all     → đánh dấu tất cả đã đọc
PATCH  /reminders/notifications/{id}/read    → đánh dấu 1 thông báo đã đọc
DELETE /reminders/notifications/{id}         → xoá 1 thông báo

── Scheduler (internal) ──────────────────────────────────
POST   /reminders/internal/fire              → trigger thủ công (dev/admin)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import Optional

from app.schemas.reminder_schema import (
    ReminderCreate, ReminderResponse,
    NotificationResponse, NotificationStats,
)
from app.services import reminder_service
from app.utils.dependencies import get_db, get_current_user
from app.utils.rate_limit import limiter, Limits
from app.models.user import User

router = APIRouter(prefix="/reminders", tags=["Reminders"])


# ════════════════════════════════════════════
# REMINDERS
# ════════════════════════════════════════════

@router.get("/", response_model=list[ReminderResponse])
def list_reminders(
    request:      Request,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    limiter.check(request, "reminder_read", **Limits.READ_GENERAL)
    return reminder_service.get_reminders(db, current_user.id)


@router.post("/", response_model=ReminderResponse)
def create_reminder(
    request:      Request,
    data:         ReminderCreate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    # 30 lần / phút — tránh spam
    limiter.check(request, "reminder_write", max_calls=30, window_sec=60)
    return reminder_service.set_reminder(db, current_user.id, data)


@router.delete("/{movie_id}")
def delete_reminder(
    request:      Request,
    movie_id:     int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    limiter.check(request, "reminder_write", max_calls=30, window_sec=60)
    if movie_id <= 0 or movie_id > 10_000_000:
        raise HTTPException(status_code=422, detail="movie_id không hợp lệ.")
    ok = reminder_service.remove_reminder(db, current_user.id, movie_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy reminder.")
    return {"message": "Đã huỷ nhắc nhở."}


@router.get("/check/{movie_id}")
def check_reminder(
    request:      Request,
    movie_id:     int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    limiter.check(request, "reminder_read", **Limits.READ_GENERAL)
    return {"reminded": reminder_service.is_reminded(db, current_user.id, movie_id)}


# ════════════════════════════════════════════
# NOTIFICATIONS
# ════════════════════════════════════════════

@router.get("/notifications/stats", response_model=NotificationStats)
def notification_stats(
    request:      Request,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """Trả về unread count — dùng cho bell icon trên Navbar."""
    limiter.check(request, "reminder_read", **Limits.READ_GENERAL)
    stats = reminder_service.get_notification_stats(db, current_user.id)
    return stats


@router.get("/notifications/", response_model=list[NotificationResponse])
def list_notifications(
    request:      Request,
    limit:        int     = Query(30, ge=1, le=100),
    unread_only:  bool    = Query(False),
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    limiter.check(request, "reminder_read", **Limits.READ_GENERAL)
    return reminder_service.get_notifications(db, current_user.id, limit, unread_only)


@router.post("/notifications/read-all")
def read_all_notifications(
    request:      Request,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    limiter.check(request, "reminder_write", max_calls=30, window_sec=60)
    count = reminder_service.mark_all_read(db, current_user.id)
    return {"message": f"Đã đánh dấu {count} thông báo là đã đọc."}


@router.patch("/notifications/{notification_id}/read")
def read_notification(
    request:         Request,
    notification_id: int,
    db:              Session = Depends(get_db),
    current_user:    User    = Depends(get_current_user),
):
    limiter.check(request, "reminder_write", max_calls=30, window_sec=60)
    ok = reminder_service.mark_read(db, current_user.id, notification_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo.")
    return {"message": "Đã đọc."}


@router.delete("/notifications/{notification_id}")
def delete_notification(
    request:         Request,
    notification_id: int,
    db:              Session = Depends(get_db),
    current_user:    User    = Depends(get_current_user),
):
    limiter.check(request, "reminder_write", max_calls=30, window_sec=60)
    ok = reminder_service.delete_notification(db, current_user.id, notification_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo.")
    return {"message": "Đã xoá thông báo."}


# ════════════════════════════════════════════
# INTERNAL — trigger scheduler thủ công
# ════════════════════════════════════════════

@router.post("/internal/fire")
def fire_reminders(
    request: Request,
    db:      Session = Depends(get_db),
):
    """
    Trigger kiểm tra và gửi thông báo thủ công.
    Dùng để test hoặc chạy từ cron job bên ngoài.
    Không cần auth — bảo vệ bằng rate limit chặt.
    """
    limiter.check(request, "internal_fire", max_calls=5, window_sec=60)
    fired = reminder_service.check_and_fire(db)
    return {"fired": fired, "message": f"Đã tạo {fired} notification."}
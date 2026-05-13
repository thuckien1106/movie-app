# app/routers/admin.py
"""
Admin & Moderator endpoints.

Phân quyền:
  /admin/stats                   → admin + moderator
  /admin/users/*                 → admin + moderator (set-role chỉ admin)
  /admin/reviews/*               → admin + moderator

Tất cả endpoint đều yêu cầu đăng nhập và role >= moderator.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.schemas.user_schema import (
    AdminUserListResponse, AdminReviewListResponse,
    AdminStatsResponse, SetRoleRequest, BanRequest,
)
from app.services import admin_service
from app.utils.dependencies import get_db, get_current_user
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/admin", tags=["Admin"])

_READ  = dict(max_calls=60,  window_sec=60)
_WRITE = dict(max_calls=30,  window_sec=60)


# ── Dependency: chỉ cho phép moderator + admin ────────────────────────────────

def require_moderator(current_user: User = Depends(get_current_user)) -> User:
    """Yêu cầu role moderator hoặc admin."""
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="Tài khoản bị khoá.")
    if current_user.role not in (UserRole.moderator, UserRole.admin):
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập.")
    return current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Yêu cầu role admin."""
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="Tài khoản bị khoá.")
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Chỉ admin mới có quyền thực hiện.")
    return current_user


# ════════════════════════════════════════════
# THỐNG KÊ
# ════════════════════════════════════════════

@router.get("/stats", response_model=AdminStatsResponse)
def get_stats(
    request: Request,
    db:      Session = Depends(get_db),
    actor:   User    = Depends(require_moderator),
):
    """Tổng quan: số user, review, flagged, banned..."""
    limiter.check(request, "admin_read", **_READ)
    return admin_service.get_stats(db)


# ════════════════════════════════════════════
# QUẢN LÝ USER
# ════════════════════════════════════════════

@router.get("/users", response_model=AdminUserListResponse)
def list_users(
    request:   Request,
    page:      int            = Query(1, ge=1, le=1000),
    page_size: int            = Query(20, ge=1, le=100),
    search:    Optional[str]  = Query(None, max_length=100),
    role:      Optional[UserRole] = Query(None),
    banned:    Optional[bool] = Query(None),
    db:        Session        = Depends(get_db),
    actor:     User           = Depends(require_moderator),
):
    """Danh sách tất cả user với filter."""
    limiter.check(request, "admin_read", **_READ)
    return admin_service.list_users(db, page, page_size, search, role, banned)


@router.patch("/users/{user_id}/role")
def set_role(
    request: Request,
    user_id: int,
    body:    SetRoleRequest,
    db:      Session = Depends(get_db),
    actor:   User    = Depends(require_admin),   # chỉ admin
):
    """Đổi role: user ↔ moderator. (Admin không thể bị đổi role bởi admin khác.)"""
    limiter.check(request, "admin_write", **_WRITE)
    return admin_service.set_role(db, actor, user_id, body.role)


@router.post("/users/{user_id}/ban")
def ban_user(
    request: Request,
    user_id: int,
    body:    BanRequest,
    db:      Session = Depends(get_db),
    actor:   User    = Depends(require_moderator),
):
    """Khoá tài khoản. Moderator chỉ ban được user thường."""
    limiter.check(request, "admin_write", **_WRITE)
    return admin_service.ban_user(db, actor, user_id, body.reason)


@router.post("/users/{user_id}/unban")
def unban_user(
    request: Request,
    user_id: int,
    db:      Session = Depends(get_db),
    actor:   User    = Depends(require_moderator),
):
    """Gỡ khoá tài khoản."""
    limiter.check(request, "admin_write", **_WRITE)
    return admin_service.unban_user(db, user_id)


# ════════════════════════════════════════════
# QUẢN LÝ REVIEW
# ════════════════════════════════════════════

@router.get("/reviews", response_model=AdminReviewListResponse)
def list_reviews(
    request:   Request,
    page:      int            = Query(1, ge=1, le=1000),
    page_size: int            = Query(20, ge=1, le=100),
    flagged:   Optional[bool] = Query(None),
    hidden:    Optional[bool] = Query(None),
    db:        Session        = Depends(get_db),
    actor:     User           = Depends(require_moderator),
):
    """
    Danh sách review với filter.
    flagged=true  → review bị báo cáo chưa xử lý
    hidden=false  → review đang hiển thị
    """
    limiter.check(request, "admin_read", **_READ)
    return admin_service.list_reviews(db, page, page_size, flagged, hidden)


@router.post("/reviews/{review_id}/hide")
def hide_review(
    request:   Request,
    review_id: int,
    db:        Session = Depends(get_db),
    actor:     User    = Depends(require_moderator),
):
    """Ẩn review vi phạm (giữ lại dữ liệu, không hiển thị công khai)."""
    limiter.check(request, "admin_write", **_WRITE)
    return admin_service.hide_review(db, review_id)


@router.post("/reviews/{review_id}/unhide")
def unhide_review(
    request:   Request,
    review_id: int,
    db:        Session = Depends(get_db),
    actor:     User    = Depends(require_moderator),
):
    """Hiện lại review đã bị ẩn."""
    limiter.check(request, "admin_write", **_WRITE)
    return admin_service.unhide_review(db, review_id)


@router.delete("/reviews/{review_id}")
def delete_review(
    request:   Request,
    review_id: int,
    db:        Session = Depends(get_db),
    actor:     User    = Depends(require_moderator),
):
    """Xoá hẳn review (không thể khôi phục)."""
    limiter.check(request, "admin_write", **_WRITE)
    return admin_service.delete_review_by_admin(db, review_id)

# ══════════════════════════════════════════════════════════
# BROADCAST NOTIFICATION
# ══════════════════════════════════════════════════════════
from pydantic import BaseModel as _BM, Field as _F
from typing import Literal as _Lit

class BroadcastRequest(_BM):
    title:       str            = _F(..., min_length=1, max_length=255)
    body:        str            = _F(..., min_length=1, max_length=2000)
    target:      _Lit["all", "verified", "unverified", "banned", "role"] = "all"
    target_role: str | None     = _F(None, pattern="^(user|moderator)$")
    emoji:       str | None     = _F(None, max_length=4)

class BroadcastResponse(_BM):
    sent:    int
    skipped: int
    message: str

@router.post("/broadcast", response_model=BroadcastResponse)
def broadcast_notification(
    req: BroadcastRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Gửi thông báo in-app hàng loạt tới nhóm user được chọn."""
    from app.models.reminder import InAppNotification as _Notif
    from sqlalchemy import and_

    q = db.query(User).filter(User.is_banned == False)

    if req.target == "verified":
        q = q.filter(User.is_verified == True)
    elif req.target == "unverified":
        q = q.filter(User.is_verified == False)
    elif req.target == "banned":
        q = db.query(User).filter(User.is_banned == True)
    elif req.target == "role" and req.target_role:
        q = q.filter(User.role == req.target_role)

    # Không gửi cho chính admin đang thực hiện
    q = q.filter(User.id != current_user.id)

    users = q.all()
    icon  = req.emoji or "📢"
    sent  = 0

    for u in users:
        db.add(_Notif(
            user_id    = u.id,
            title      = f"{icon} {req.title}",
            body       = req.body,
            notif_type = "broadcast",
            is_read    = False,
        ))
        sent += 1

    db.commit()
    return BroadcastResponse(
        sent    = sent,
        skipped = 0,
        message = f"Đã gửi tới {sent} người dùng."
    )


@router.get("/broadcast/history")
def broadcast_history(
    page:      int     = 1,
    page_size: int     = 20,
    db:        Session = Depends(get_db),
    _:         User    = Depends(require_admin),
):
    """Lịch sử các broadcast (lấy từ notification đầu tiên của mỗi batch)."""
    from app.models.reminder import InAppNotification as _Notif
    from sqlalchemy import func

    # Group theo title+body+ngày để detect cùng 1 batch
    rows = (
        db.query(
            _Notif.title,
            _Notif.body,
            func.count(_Notif.id).label("recipients"),
            func.min(_Notif.created_at).label("sent_at"),
        )
        .filter(_Notif.notif_type == "broadcast")
        .group_by(
            _Notif.title,
            _Notif.body,
            func.strftime("%Y-%m-%d %H:%M", _Notif.created_at),
        )
        .order_by(func.min(_Notif.created_at).desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "history": [
            {"title": r.title, "body": r.body,
             "recipients": r.recipients, "sent_at": r.sent_at}
            for r in rows
        ]
    }
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
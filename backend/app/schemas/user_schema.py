# app/schemas/user_schema.py
# ── Chỉ liệt kê các thay đổi / bổ sung so với file gốc ──
# Copy toàn bộ file gốc, sau đó:
#   1. Thêm import UserRole
#   2. Cập nhật UserResponse (thêm role, is_banned)
#   3. Thêm các schema admin ở cuối file

import re
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional, List
from datetime import datetime

# ← THÊM import này
from app.models.user import UserRole


_USERNAME_RE   = re.compile(
    r'^[\w\s\u00C0-\u024F\u1E00-\u1EFF'
    r'\u0300-\u036F'
    r'._\-]'
    r'+$',
    re.UNICODE,
)
_SAFE_TEXT_RE  = re.compile(r'[<>{}\[\]\\]')

COMMON_PASSWORDS = {
    "123456", "password", "12345678", "qwerty", "abc123",
    "111111", "123123", "admin", "letmein", "welcome",
    "monkey", "dragon", "master", "sunshine", "princess",
}


# ── Auth schemas ───────────────────────────────────────────

class UserCreate(BaseModel):
    email:    EmailStr
    password: str  = Field(..., min_length=6, max_length=128)
    username: Optional[str] = Field(None, min_length=2, max_length=50)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if v.lower() in COMMON_PASSWORDS:
            raise ValueError("Mật khẩu quá phổ biến, hãy chọn mật khẩu khác.")
        if v.isdigit():
            raise ValueError("Mật khẩu không được chỉ chứa số.")
        return v

    @field_validator("username")
    @classmethod
    def username_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not _USERNAME_RE.match(v):
            raise ValueError("Username chỉ được chứa chữ cái, số, dấu _ . -")
        if v.startswith(('.', '-', '_')) or v.endswith(('.', '-', '_')):
            raise ValueError("Username không được bắt đầu hoặc kết thúc bằng . - _")
        return v

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        return v.lower().strip()


class UserLogin(BaseModel):
    email:    EmailStr
    password: str = Field(..., min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        return v.lower().strip()


class UserResponse(BaseModel):
    id:         int
    email:      str
    username:   Optional[str]
    avatar:     Optional[str]
    bio:        Optional[str]
    avatar_url: Optional[str] = None
    is_google:  bool          = False
    # ← THÊM 2 field mới
    role:       UserRole      = UserRole.user
    is_banned:  bool          = False

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"
    user:          UserResponse


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=10)


class RefreshResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"


# ── Profile update ─────────────────────────────────────────

class ProfileUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=2, max_length=50)
    avatar:   Optional[str] = Field(None, max_length=10)
    bio:      Optional[str] = Field(None, max_length=200)

    @model_validator(mode="before")
    @classmethod
    def trim_fields(cls, values: dict) -> dict:
        for field in ("username", "bio", "avatar"):
            if isinstance(values.get(field), str):
                stripped = values[field].strip()
                values[field] = stripped if stripped else None
        return values

    @field_validator("username")
    @classmethod
    def username_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not _USERNAME_RE.match(v):
            raise ValueError("Tên hiển thị chứa ký tự không hợp lệ.")
        return v

    @field_validator("bio")
    @classmethod
    def bio_safe(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if _SAFE_TEXT_RE.search(v):
            raise ValueError("Bio chứa ký tự không hợp lệ.")
        return v

    @field_validator("avatar")
    @classmethod
    def avatar_is_emoji(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) > 4:
            raise ValueError("Avatar không hợp lệ.")
        return v


# ── Change password ────────────────────────────────────────

class ChangePassword(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password:     str = Field(..., min_length=6, max_length=128)

    @field_validator("new_password")
    @classmethod
    def new_password_strength(cls, v: str) -> str:
        if v.lower() in COMMON_PASSWORDS:
            raise ValueError("Mật khẩu mới quá phổ biến.")
        if v.isdigit():
            raise ValueError("Mật khẩu không được chỉ chứa số.")
        return v

    @model_validator(mode="after")
    def passwords_differ(self) -> "ChangePassword":
        if self.current_password == self.new_password:
            raise ValueError("Mật khẩu mới phải khác mật khẩu hiện tại.")
        return self


# ── Activity ───────────────────────────────────────────────

class ActivityItem(BaseModel):
    type:     str
    title:    str
    poster:   Optional[str]
    movie_id: Optional[int]
    col_name: Optional[str]
    at:       datetime


class ActivityResponse(BaseModel):
    items: List[ActivityItem]


# ── Forgot / Reset Password ────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        return v.lower().strip()


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp:   str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        return v.lower().strip()


class ResetPasswordRequest(BaseModel):
    email:        EmailStr
    otp:          str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(..., min_length=6, max_length=128)

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        return v.lower().strip()

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if v.lower() in COMMON_PASSWORDS:
            raise ValueError("Mật khẩu quá phổ biến.")
        if v.isdigit():
            raise ValueError("Mật khẩu không được chỉ chứa số.")
        return v


# ════════════════════════════════════════════
# ADMIN SCHEMAS  ← THÊM MỚI
# ════════════════════════════════════════════

class AdminUserListItem(BaseModel):
    """Dùng trong danh sách user ở trang admin."""
    id:           int
    email:        str
    username:     Optional[str]
    avatar:       Optional[str]
    avatar_url:   Optional[str]
    role:         UserRole
    is_banned:    bool
    ban_reason:   Optional[str]
    is_google:    bool
    review_count: int = 0

    class Config:
        from_attributes = True


class AdminUserListResponse(BaseModel):
    users:      List[AdminUserListItem]
    total:      int
    page:       int
    page_size:  int
    total_pages: int


class SetRoleRequest(BaseModel):
    role: UserRole


class BanRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)


class AdminReviewListItem(BaseModel):
    """Dùng trong danh sách review ở trang admin."""
    id:          int
    movie_id:    int
    movie_title: Optional[str]   # lấy từ TMDB nếu có cache
    rating:      int
    content:     Optional[str]
    is_spoiler:  bool
    is_flagged:  bool
    flag_reason: Optional[str]
    is_hidden:   bool
    likes:       int
    created_at:  datetime
    author: dict   # { id, username, avatar, avatar_url }

    class Config:
        from_attributes = True


class AdminReviewListResponse(BaseModel):
    reviews:     List[AdminReviewListItem]
    total:       int
    page:        int
    page_size:   int
    total_pages: int


class AdminStatsResponse(BaseModel):
    total_users:     int
    banned_users:    int
    total_reviews:   int
    flagged_reviews: int
    hidden_reviews:  int
    moderators:      int
    admins:          int
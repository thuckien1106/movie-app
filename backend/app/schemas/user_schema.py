import re
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional, List
from datetime import datetime


# ── Regex patterns ─────────────────────────────────────────
_USERNAME_RE = re.compile(r'^[a-zA-Z0-9_.-]+$')
_SAFE_TEXT_RE = re.compile(r'[<>{}\[\]\\]')         # block HTML/injection chars

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
    id:       int
    email:    str
    username: Optional[str]
    avatar:   Optional[str]
    bio:      Optional[str]

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         UserResponse


# ── Profile update ─────────────────────────────────────────

class ProfileUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=2, max_length=50)
    avatar:   Optional[str] = Field(None, max_length=10)
    bio:      Optional[str] = Field(None, max_length=200)

    @field_validator("username")
    @classmethod
    def username_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not _USERNAME_RE.match(v):
            raise ValueError("Username chỉ được chứa chữ cái, số, dấu _ . -")
        return v

    @field_validator("bio")
    @classmethod
    def bio_safe(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if _SAFE_TEXT_RE.search(v):
            raise ValueError("Bio chứa ký tự không hợp lệ.")
        return v

    @field_validator("avatar")
    @classmethod
    def avatar_is_emoji(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        # avatar phải là 1-2 ký tự (emoji thường là 1-2 codepoint)
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
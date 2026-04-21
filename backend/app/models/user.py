# app/models/user.py
from sqlalchemy import Column, Integer, String, Text, Boolean, Enum as SAEnum
from app.database.base import Base
import enum


class UserRole(str, enum.Enum):
    """
    Phân quyền người dùng:
      user      — người dùng thường (mặc định)
      moderator — quản lý nội dung: xoá review, ban/unban user
      admin     — toàn quyền: đổi role, mọi thao tác của moderator
    """
    user      = "user"
    moderator = "moderator"
    admin     = "admin"


class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True)
    email      = Column(String(255), unique=True, index=True, nullable=False)
    username   = Column(String(50),  unique=True, index=True, nullable=True)
    password   = Column(String(255), nullable=True)   # nullable — Google user không có password
    avatar     = Column(String(10),  nullable=True)   # emoji avatar
    bio        = Column(Text,        nullable=True)

    # ── Role-based access control ─────────────────────────
    role       = Column(
        SAEnum(UserRole, name="userrole"),
        default=UserRole.user,
        nullable=False,
        server_default="user",
    )

    # ── Khoá tài khoản ────────────────────────────────────
    is_banned  = Column(Boolean, default=False, nullable=False)
    ban_reason = Column(String(500), nullable=True)

    # ── Google OAuth ──────────────────────────────────────
    google_id  = Column(String(128), unique=True, index=True, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    is_google  = Column(Boolean,     default=False, nullable=False)
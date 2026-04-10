# app/models/user.py
from sqlalchemy import Column, Integer, String, Text, Boolean
from app.database.base import Base


class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True)
    email      = Column(String(255), unique=True, index=True, nullable=False)
    username   = Column(String(50),  unique=True, index=True, nullable=True)
    password   = Column(String(255), nullable=True)   # nullable — Google user không có password
    avatar     = Column(String(10),  nullable=True)   # emoji avatar
    bio        = Column(Text,        nullable=True)

    # ── Google OAuth ──────────────────────────────────
    google_id  = Column(String(128), unique=True, index=True, nullable=True)
    avatar_url = Column(String(500), nullable=True)   # URL ảnh Google profile
    is_google  = Column(Boolean,     default=False, nullable=False)
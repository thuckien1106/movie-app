from sqlalchemy import Column, Integer, String, Text
from app.database.base import Base


class User(Base):
    __tablename__ = "users"

    id       = Column(Integer, primary_key=True, index=True)
    email    = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50),  unique=True, index=True, nullable=True)
    password = Column(String(255), nullable=False)
    avatar   = Column(String(10),  nullable=True)   # emoji avatar, e.g. "🎬"
    bio      = Column(Text,        nullable=True)    # short bio
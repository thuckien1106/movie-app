# app/routers/ai_chat.py
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional

from app.utils.dependencies import get_db, get_current_user
from app.utils.rate_limit import limiter
from app.utils.config import settings
from app.models.user import User
from app.services import ai_chat_service

router = APIRouter(prefix="/ai", tags=["AI Chat"])

_LIMIT = dict(max_calls=20, window_sec=60)   # 20 msg/phút/user


class ChatMessage(BaseModel):
    role:    str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=1000)


class ChatRequest(BaseModel):
    messages:    list[ChatMessage] = Field(..., min_length=1, max_length=20)
    gemini_key:  Optional[str]     = Field(None, max_length=200)


class ChatResponse(BaseModel):
    reply:       str
    movies:      list[dict]
    intent:      str
    suggestions: list[str]


@router.post("/chat", response_model=ChatResponse)
def chat(
    req:     ChatRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    limiter.check(request, f"ai_chat:{current_user.id}", **_LIMIT)

    # API key: dùng key từ client nếu có, fallback về server key
    api_key = req.gemini_key or getattr(settings, "GEMINI_API_KEY", None)
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Chưa cấu hình Gemini API key. Vào Settings để nhập key.",
        )

    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    result = ai_chat_service.chat(messages, api_key)
    return result
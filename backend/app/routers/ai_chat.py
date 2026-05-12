# app/routers/ai_chat.py
import json
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional

from app.utils.dependencies import get_current_user
from app.utils.rate_limit import limiter
from app.utils.config import settings
from app.models.user import User
from app.services import ai_chat_service

router = APIRouter(prefix="/ai", tags=["AI Chat"])

_LIMIT = dict(max_calls=30, window_sec=60)


class ChatMessage(BaseModel):
    role:    str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=1000)


class ChatRequest(BaseModel):
    messages:   list[ChatMessage] = Field(..., min_length=1, max_length=20)
    gemini_key: Optional[str]     = Field(None, max_length=200)


def _sse(event: str, data: dict) -> str:
    """Format một SSE event."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/chat/stream")
def chat_stream(
    req:          ChatRequest,
    request:      Request,
    current_user: User = Depends(get_current_user),
):
    """
    SSE endpoint — stream 3 event theo thứ tự:
      1. `reply`   — text trả lời (tức thì, ~0ms)
      2. `movies`  — danh sách phim (sau khi TMDB respond)
      3. `done`    — kết thúc stream
    """
    limiter.check(request, f"ai_chat:{current_user.id}", **_LIMIT)

    api_key  = req.gemini_key or getattr(settings, "GEMINI_API_KEY", None)
    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    def generate():
        last_user = next(
            (m["content"] for m in reversed(messages) if m["role"] == "user"), ""
        )
        intent      = ai_chat_service.parse_intent_only(last_user)
        reply       = ai_chat_service.build_reply(intent)
        suggestions = ai_chat_service.build_suggestions(intent)

        # Event 1: reply ngay lập tức (~0ms)
        yield _sse("reply", {
            "reply":       reply,
            "suggestions": suggestions,
            "intent":      intent.get("intent", "chat"),
        })

        # Event 2: movies — fetch TMDB (~300-600ms)
        movies = []
        if intent.get("intent") != "chat":
            try:
                movies = ai_chat_service.fetch_movies(intent)
            except Exception:
                pass

        yield _sse("movies", {"movies": movies})
        yield _sse("done", {})

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":               "no-cache",
            "X-Accel-Buffering":           "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


# ── Giữ lại endpoint cũ để không break client cũ ──────────
@router.post("/chat")
def chat_legacy(
    req:          ChatRequest,
    request:      Request,
    current_user: User = Depends(get_current_user),
):
    limiter.check(request, f"ai_chat:{current_user.id}", **_LIMIT)
    api_key  = req.gemini_key or getattr(settings, "GEMINI_API_KEY", None)
    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    result   = ai_chat_service.chat(messages, api_key)
    return result
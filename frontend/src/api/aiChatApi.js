// src/api/aiChatApi.js
import { api } from "../context/AuthContext";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/** Legacy endpoint — fallback */
export const sendChatMessage = (messages, geminiKey = null) =>
  api.post("/ai/chat", { messages, gemini_key: geminiKey || undefined });

/**
 * Stream endpoint — SSE
 */
export function streamChat({
  messages,
  geminiKey,
  onReply,
  onMovies,
  onDone,
  onError,
}) {
  const ctrl = new AbortController();

  (async () => {
    try {
      const token = localStorage.getItem("token") || "";

      const res = await fetch(`${BASE}/ai/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages, gemini_key: geminiKey || undefined }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop();

        for (const part of parts) {
          const eventLine = part.match(/^event:\s*(.+)$/m)?.[1]?.trim();
          const dataLine = part.match(/^data:\s*(.+)$/m)?.[1]?.trim();
          if (!eventLine || !dataLine) continue;
          try {
            const data = JSON.parse(dataLine);
            if (eventLine === "reply") onReply?.(data);
            else if (eventLine === "reply_enhanced") onReply?.(data);
            else if (eventLine === "movies") onMovies?.(data.movies || []);
            else if (eventLine === "done") onDone?.();
          } catch {}
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") onError?.(err);
    }
  })();

  return () => ctrl.abort();
}

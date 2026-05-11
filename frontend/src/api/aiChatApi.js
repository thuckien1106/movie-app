// src/api/aiChatApi.js
import { api } from "../context/AuthContext";

export const sendChatMessage = (messages, geminiKey = null) =>
  api.post("/ai/chat", {
    messages,
    gemini_key: geminiKey || undefined,
  });

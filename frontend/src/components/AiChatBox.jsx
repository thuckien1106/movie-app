// src/components/AiChatBox.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { sendChatMessage } from "../api/aiChatApi";

/* ─────────────────────────────────────────
   QUICK SUGGESTIONS (shown on empty state)
───────────────────────────────────────────*/
const QUICK = [
  { icon: "🔥", text: "Phim đang hot nhất tuần này" },
  { icon: "😱", text: "Phim kinh dị hay nhất 2024" },
  { icon: "🚀", text: "Phim khoa học viễn tưởng đỉnh" },
  { icon: "😂", text: "Phim hài hước xem cùng gia đình" },
  { icon: "💕", text: "Phim tình cảm lãng mạn" },
  { icon: "🎬", text: "Phim sắp chiếu rạp tháng này" },
];

/* ─────────────────────────────────────────
   STAR RATING MINI
───────────────────────────────────────────*/
function StarRating({ rating }) {
  const pct = Math.round((rating / 10) * 100);
  const color = rating >= 7 ? "#22c55e" : rating >= 5 ? "#f59e0b" : "#ef4444";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 11,
        color,
      }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill={color}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      {rating?.toFixed(1)}
    </span>
  );
}

/* ─────────────────────────────────────────
   MOVIE CARD (compact, inside chat)
───────────────────────────────────────────*/
function MovieCard({ movie, onClick }) {
  const [imgErr, setImgErr] = useState(false);
  const year = movie.release_date?.split("-")[0];

  return (
    <div
      onClick={() => onClick(movie.id)}
      className="ai-movie-card"
      style={{
        display: "flex",
        flexDirection: "column",
        width: 110,
        flexShrink: 0,
        cursor: "pointer",
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.04)",
        transition: "transform 0.18s ease, border-color 0.18s ease",
      }}
    >
      {/* Poster */}
      <div
        style={{
          width: "100%",
          height: 155,
          background: "#111827",
          position: "relative",
          flexShrink: 0,
        }}
      >
        {movie.poster && !imgErr ? (
          <img
            src={movie.poster}
            alt={movie.title}
            onError={() => setImgErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              color: "rgba(255,255,255,0.2)",
            }}
          >
            🎬
          </div>
        )}
        {movie.rating > 0 && (
          <div
            style={{
              position: "absolute",
              top: 5,
              right: 5,
              background: "rgba(0,0,0,0.8)",
              borderRadius: 5,
              padding: "2px 5px",
            }}
          >
            <StarRating rating={movie.rating} />
          </div>
        )}
      </div>
      {/* Info */}
      <div style={{ padding: "7px 8px" }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 600,
            color: "rgba(255,255,255,0.9)",
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {movie.title}
        </p>
        {year && (
          <p
            style={{
              margin: "3px 0 0",
              fontSize: 10,
              color: "rgba(255,255,255,0.35)",
            }}
          >
            {year}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TYPING INDICATOR
───────────────────────────────────────────*/
function TypingDots() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "12px 14px",
      }}
    >
      <div style={{ display: "flex", gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--red, #e11d48)",
              animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <span
        style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}
      >
        Đang tìm phim…
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────
   MESSAGE BUBBLE
───────────────────────────────────────────*/
function Message({ msg, onMovieClick, onSuggestionClick }) {
  const isUser = msg.role === "user";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        gap: 8,
        alignItems: "flex-end",
        animation: "msgIn 0.25s cubic-bezier(0.34,1.2,0.64,1) both",
      }}
    >
      {/* Avatar */}
      {!isUser && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            flexShrink: 0,
            background: "linear-gradient(135deg, #e11d48, #7c3aed)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            marginBottom: 2,
          }}
        >
          🎬
        </div>
      )}

      <div style={{ maxWidth: "80%", minWidth: 0 }}>
        {/* Text bubble */}
        <div
          style={{
            padding: "10px 14px",
            borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            background: isUser
              ? "linear-gradient(135deg, #e11d48, #be123c)"
              : "rgba(255,255,255,0.07)",
            border: isUser ? "none" : "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.92)",
            fontSize: 13,
            lineHeight: 1.55,
            wordBreak: "break-word",
          }}
        >
          {msg.content}
        </div>

        {/* Movie cards row */}
        {msg.movies?.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              padding: "10px 0 4px",
              scrollbarWidth: "none",
            }}
          >
            {msg.movies.map((m) => (
              <MovieCard key={m.id} movie={m} onClick={onMovieClick} />
            ))}
          </div>
        )}

        {/* Suggestion chips */}
        {msg.suggestions?.length > 0 && (
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}
          >
            {msg.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick(s)}
                className="ai-chip"
                style={{
                  padding: "5px 12px",
                  borderRadius: 99,
                  fontSize: 11,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.7)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.15s, border-color 0.15s",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   SETTINGS PANEL (Gemini key)
───────────────────────────────────────────*/
function SettingsPanel({ geminiKey, onSave, onClose }) {
  const [val, setVal] = useState(geminiKey || "");
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 20,
        background: "rgba(8,11,15,0.97)",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        padding: 20,
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "rgba(255,255,255,0.9)",
          }}
        >
          Cài đặt AI
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.4)",
            cursor: "pointer",
            fontSize: 18,
          }}
        >
          ✕
        </button>
      </div>
      <label
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.5)",
          marginBottom: 8,
        }}
      >
        Gemini API Key
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#e11d48", marginLeft: 6 }}
        >
          Lấy key →
        </a>
      </label>
      <input
        type="password"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="AIza..."
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          padding: "10px 14px",
          color: "rgba(255,255,255,0.9)",
          fontSize: 13,
          outline: "none",
          fontFamily: "monospace",
          marginBottom: 12,
        }}
      />
      <p
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.3)",
          lineHeight: 1.6,
          margin: "0 0 16px",
        }}
      >
        Key được lưu trong localStorage trình duyệt của bạn, không gửi lên
        server nếu server đã có key mặc định.
      </p>
      <button
        onClick={() => {
          onSave(val.trim());
          onClose();
        }}
        style={{
          background: "linear-gradient(135deg, #e11d48, #be123c)",
          border: "none",
          borderRadius: 10,
          padding: "10px 0",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Lưu
      </button>
      {val && (
        <button
          onClick={() => {
            onSave("");
            onClose();
          }}
          style={{
            background: "none",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            padding: "8px 0",
            marginTop: 8,
            color: "rgba(255,255,255,0.4)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Xoá key
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN CHATBOX
───────────────────────────────────────────*/
export default function AiChatBox() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [geminiKey, setGeminiKey] = useState(
    () => localStorage.getItem("filmverse_gemini_key") || "",
  );
  const [hasNew, setHasNew] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const historyRef = useRef([]); // raw messages for API (no movies/suggestions)

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setHasNew(false);
    }
  }, [open]);

  const saveKey = (key) => {
    setGeminiKey(key);
    if (key) localStorage.setItem("filmverse_gemini_key", key);
    else localStorage.removeItem("filmverse_gemini_key");
  };

  const sendMessage = useCallback(
    async (text) => {
      const content = text.trim();
      if (!content || loading) return;

      setInput("");

      // Add user message
      const userMsg = { role: "user", content, movies: [], suggestions: [] };
      setMessages((prev) => [...prev, userMsg]);

      // Build history for API (without UI-only fields)
      const newHistory = [...historyRef.current, { role: "user", content }];
      historyRef.current = newHistory;

      setLoading(true);
      try {
        const { data } = await sendChatMessage(newHistory, geminiKey || null);

        const assistantMsg = {
          role: "assistant",
          content: data.reply,
          movies: data.movies || [],
          suggestions: data.suggestions || [],
          intent: data.intent,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        historyRef.current = [
          ...newHistory,
          { role: "assistant", content: data.reply },
        ];

        if (!open) setHasNew(true);
      } catch (err) {
        const errText =
          err?.response?.data?.detail || "Có lỗi xảy ra. Bạn thử lại nhé!";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `😅 ${errText}`,
            movies: [],
            suggestions: [],
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, geminiKey, open],
  );

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleMovieClick = (movieId) => {
    setOpen(false);
    navigate(`/movie/${movieId}`);
  };

  const clearChat = () => {
    setMessages([]);
    historyRef.current = [];
  };

  if (!isLoggedIn) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="ai-fab"
        title="Trợ lý tìm phim AI"
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 1000,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #e11d48 0%, #7c3aed 100%)",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 24px rgba(225,29,72,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          animation: !open ? "fabPulse 3s ease-in-out infinite 2s" : "none",
        }}
      >
        {open ? "✕" : "🎬"}
        {hasNew && !open && (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#22c55e",
              border: "2px solid var(--bg-page, #080b0f)",
              animation: "badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          />
        )}
      </button>

      {/* Chat Window */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 92,
            right: 28,
            zIndex: 999,
            width: 380,
            height: 580,
            background: "rgba(8,11,15,0.97)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20,
            boxShadow:
              "0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(225,29,72,0.1)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "chatIn 0.3s cubic-bezier(0.34,1.2,0.64,1) both",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Settings overlay */}
          {showSettings && (
            <SettingsPanel
              geminiKey={geminiKey}
              onSave={saveKey}
              onClose={() => setShowSettings(false)}
            />
          )}

          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              flexShrink: 0,
              background:
                "linear-gradient(135deg, rgba(225,29,72,0.12), rgba(124,58,237,0.08))",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #e11d48, #7c3aed)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
                boxShadow: "0 0 12px rgba(225,29,72,0.4)",
              }}
            >
              🎬
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.95)",
                }}
              >
                Filmverse AI
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                {loading ? "Đang tìm phim…" : "Trợ lý tìm phim thông minh"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {messages.length > 0 && (
                <button onClick={clearChat} title="Xoá chat" style={iconBtn}>
                  🗑️
                </button>
              )}
              <button
                onClick={() => setShowSettings(true)}
                title="Cài đặt API key"
                style={iconBtn}
              >
                ⚙️
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              scrollbarWidth: "none",
            }}
          >
            {/* Empty state */}
            {messages.length === 0 && !loading && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  paddingTop: 16,
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 10 }}>🎬</div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.7)",
                    margin: "0 0 4px",
                    textAlign: "center",
                  }}
                >
                  Tôi có thể giúp gì cho bạn?
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.3)",
                    margin: "0 0 18px",
                    textAlign: "center",
                    lineHeight: 1.5,
                  }}
                >
                  Hỏi tôi bất kỳ điều gì về phim — thể loại, tâm trạng, năm, hay
                  tên phim cụ thể
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 7,
                    width: "100%",
                  }}
                >
                  {QUICK.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q.text)}
                      className="ai-quick-btn"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "9px 12px",
                        borderRadius: 10,
                        cursor: "pointer",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.09)",
                        color: "rgba(255,255,255,0.7)",
                        fontSize: 12,
                        textAlign: "left",
                        fontFamily: "inherit",
                        transition: "background 0.15s, border-color 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 16, flexShrink: 0 }}>
                        {q.icon}
                      </span>
                      <span style={{ lineHeight: 1.35 }}>{q.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <Message
                key={i}
                msg={msg}
                onMovieClick={handleMovieClick}
                onSuggestionClick={sendMessage}
              />
            ))}

            {/* Typing indicator */}
            {loading && <TypingDots />}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: "12px 14px",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14,
                padding: "8px 8px 8px 14px",
                transition: "border-color 0.15s",
              }}
              className="ai-input-wrap"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Hỏi về phim bạn muốn xem…"
                rows={1}
                disabled={loading}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 13,
                  outline: "none",
                  resize: "none",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                  maxHeight: 80,
                  overflowY: "auto",
                  scrollbarWidth: "none",
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="ai-send-btn"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  flexShrink: 0,
                  background:
                    input.trim() && !loading
                      ? "linear-gradient(135deg, #e11d48, #be123c)"
                      : "rgba(255,255,255,0.08)",
                  border: "none",
                  cursor: input.trim() && !loading ? "pointer" : "default",
                  color:
                    input.trim() && !loading ? "#fff" : "rgba(255,255,255,0.2)",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.15s",
                }}
              >
                ↑
              </button>
            </div>
            <p
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.2)",
                margin: "6px 0 0",
                textAlign: "center",
              }}
            >
              Enter để gửi · Shift+Enter xuống dòng
            </p>
          </div>
        </div>
      )}

      <style>{chatCSS}</style>
    </>
  );
}

const iconBtn = {
  background: "none",
  border: "none",
  color: "rgba(255,255,255,0.35)",
  cursor: "pointer",
  fontSize: 16,
  padding: "4px 6px",
  borderRadius: 6,
  transition: "color 0.15s, background 0.15s",
  lineHeight: 1,
};

const chatCSS = `
  @keyframes chatIn {
    from { opacity:0; transform:translateY(20px) scale(0.95); }
    to   { opacity:1; transform:translateY(0)    scale(1);    }
  }
  @keyframes msgIn {
    from { opacity:0; transform:translateY(8px); }
    to   { opacity:1; transform:translateY(0);   }
  }
  @keyframes typingBounce {
    0%,60%,100% { transform:translateY(0); }
    30%         { transform:translateY(-5px); }
  }
  @keyframes fabPulse {
    0%,100% { box-shadow: 0 4px 24px rgba(225,29,72,0.5); }
    50%     { box-shadow: 0 4px 36px rgba(225,29,72,0.8), 0 0 0 8px rgba(225,29,72,0.08); }
  }
  @keyframes badgePop {
    from { transform:scale(0); }
    to   { transform:scale(1); }
  }
  @keyframes fadeIn {
    from { opacity:0; }
    to   { opacity:1; }
  }

  .ai-fab:hover           { transform: scale(1.08) !important; box-shadow: 0 6px 32px rgba(225,29,72,0.7) !important; }
  .ai-movie-card:hover    { transform: translateY(-3px); border-color: rgba(225,29,72,0.4) !important; }
  .ai-chip:hover          { background: rgba(255,255,255,0.12) !important; border-color: rgba(255,255,255,0.2) !important; }
  .ai-quick-btn:hover     { background: rgba(255,255,255,0.09) !important; border-color: rgba(225,29,72,0.3) !important; }
  .ai-input-wrap:focus-within { border-color: rgba(225,29,72,0.4) !important; }
  .ai-send-btn:hover:not(:disabled) { opacity: 0.85; }
  button[style*="iconBtn"]:hover    { color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.08) !important; }
  ::-webkit-scrollbar { display:none; }
`;

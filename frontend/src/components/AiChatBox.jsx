// src/components/AiChatBox.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { streamChat } from "../api/aiChatApi";

const QUICK = [
  { icon: "🔥", label: "Đang hot", text: "Phim đang hot nhất tuần này" },
  { icon: "😱", label: "Kinh dị", text: "Phim kinh dị hay nhất 2024" },
  { icon: "🚀", label: "Sci-Fi", text: "Phim khoa học viễn tưởng đỉnh" },
  { icon: "😂", label: "Hài hước", text: "Phim hài hước cười không ngừng" },
  { icon: "💕", label: "Tình cảm", text: "Phim tình cảm lãng mạn hay nhất" },
  { icon: "🎬", label: "Sắp chiếu", text: "Phim sắp ra rạp tháng này" },
];

/* ── SVG Icons ─────────────────────────────────────────── */
const IconSend = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const IconTrash = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);
const IconSettings = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);
const IconClose = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconStar = ({ color }) => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill={color}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);
const IconFilm = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
    <line x1="7" y1="2" x2="7" y2="22" />
    <line x1="17" y1="2" x2="17" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="2" y1="7" x2="7" y2="7" />
    <line x1="2" y1="17" x2="7" y2="17" />
    <line x1="17" y1="17" x2="22" y2="17" />
    <line x1="17" y1="7" x2="22" y2="7" />
  </svg>
);

/* ── Star Rating ─────────────────────────────────────── */
function StarRating({ rating }) {
  const color = rating >= 7 ? "#4ade80" : rating >= 5 ? "#fbbf24" : "#f87171";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 10,
        fontWeight: 700,
        color,
      }}
    >
      <IconStar color={color} />
      {rating?.toFixed(1)}
    </span>
  );
}

/* ── Movie Card ──────────────────────────────────────── */
function MovieCard({ movie, onClick, index }) {
  const [err, setErr] = useState(false);
  const year = movie.release_date?.split("-")[0];
  return (
    <div
      onClick={() => onClick(movie.id)}
      className="ai-mc"
      style={{
        width: 120,
        flexShrink: 0,
        cursor: "pointer",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.03)",
        transition:
          "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
        animation: `mcIn 0.35s cubic-bezier(0.34,1.2,0.64,1) ${index * 0.06}s both`,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 168,
          background: "#0d1117",
          flexShrink: 0,
        }}
      >
        {movie.poster && !err ? (
          <img
            src={movie.poster}
            alt={movie.title}
            onError={() => setErr(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.2,
            }}
          >
            <IconFilm />
          </div>
        )}
        {/* gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)",
          }}
        />
        {movie.rating > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: 6,
              left: 6,
              background: "rgba(0,0,0,0.75)",
              borderRadius: 6,
              padding: "2px 6px",
              backdropFilter: "blur(8px)",
            }}
          >
            <StarRating rating={movie.rating} />
          </div>
        )}
      </div>
      <div style={{ padding: "8px 10px 10px" }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 600,
            color: "rgba(255,255,255,0.88)",
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
              color: "rgba(255,255,255,0.28)",
              fontWeight: 500,
            }}
          >
            {year}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Typing indicator ────────────────────────────────── */
function Typing() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Avatar />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px 16px 16px 4px",
          padding: "10px 14px",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#e11d48",
              animation: `tdot 1.4s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── AI Avatar ───────────────────────────────────────── */
function Avatar() {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: "50%",
        flexShrink: 0,
        background: "linear-gradient(135deg, #e11d48 0%, #7c3aed 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 12px rgba(225,29,72,0.35)",
        marginBottom: 2,
      }}
    >
      <IconFilm />
    </div>
  );
}

/* ── Message ─────────────────────────────────────────── */
function Message({ msg, onMovieClick, onChip }) {
  const isUser = msg.role === "user";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        gap: 8,
        alignItems: "flex-end",
        animation: "msgIn 0.28s cubic-bezier(0.34,1.15,0.64,1) both",
      }}
    >
      {!isUser && <Avatar />}
      <div
        style={{
          maxWidth: msg.movies?.length > 0 ? "100%" : "82%",
          minWidth: 0,
          width: msg.movies?.length > 0 ? "100%" : "auto",
        }}
      >
        {/* Bubble */}
        <div
          style={{
            padding: "11px 15px",
            borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
            background: isUser
              ? "linear-gradient(135deg, #e11d48, #c2185b)"
              : "rgba(255,255,255,0.07)",
            border: isUser ? "none" : "1px solid rgba(255,255,255,0.09)",
            boxShadow: isUser ? "0 4px 20px rgba(225,29,72,0.25)" : "none",
            color: "rgba(255,255,255,0.93)",
            fontSize: 13,
            lineHeight: 1.58,
            wordBreak: "break-word",
            minHeight: msg._streaming && !msg.content ? 38 : "auto",
          }}
        >
          {msg.content ||
            (msg._streaming ? (
              <span style={{ opacity: 0.4, fontSize: 12 }}>Đang xử lý…</span>
            ) : (
              ""
            ))}
          {msg._streaming && msg.content && (
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: 13,
                background: "rgba(255,255,255,0.7)",
                borderRadius: 1,
                marginLeft: 2,
                verticalAlign: "middle",
                animation: "cursorBlink 0.8s step-end infinite",
              }}
            />
          )}
        </div>

        {/* Movie strip — full width, scrollable */}
        {msg.movies?.length > 0 && (
          <div style={{ width: "100%", marginTop: 10 }}>
            <div
              className="ai-movie-strip"
              onMouseDown={(e) => {
                const el = e.currentTarget;
                el.dataset.down = "1";
                el.dataset.startX = e.pageX - el.offsetLeft;
                el.dataset.scrollLeft = el.scrollLeft;
                el.style.cursor = "grabbing";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.dataset.down = "0";
                e.currentTarget.style.cursor = "grab";
              }}
              onMouseUp={(e) => {
                e.currentTarget.dataset.down = "0";
                e.currentTarget.style.cursor = "grab";
              }}
              onMouseMove={(e) => {
                if (e.currentTarget.dataset.down !== "1") return;
                e.preventDefault();
                const el = e.currentTarget;
                const x = e.pageX - el.offsetLeft;
                const walk = (x - el.dataset.startX) * 1.2;
                el.scrollLeft = el.dataset.scrollLeft - walk;
              }}
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                overflowY: "visible",
                padding: "4px 0 12px",
                cursor: "grab",
                userSelect: "none",
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(225,29,72,0.4) transparent",
              }}
            >
              {msg.movies.map((m, i) => (
                <MovieCard
                  key={m.id}
                  movie={m}
                  onClick={onMovieClick}
                  index={i}
                />
              ))}
            </div>
            {msg.movies.length > 2 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 2,
                  opacity: 0.4,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: "rgba(255,255,255,0.1)",
                  }}
                />
                <span
                  style={{
                    fontSize: 9,
                    color: "rgba(255,255,255,0.5)",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.05em",
                  }}
                >
                  kéo để xem thêm →
                </span>
              </div>
            )}
          </div>
        )}

        {/* Chips */}
        {msg.suggestions?.length > 0 && (
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}
          >
            {msg.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onChip(s)}
                className="ai-chip"
                style={{
                  padding: "5px 12px",
                  borderRadius: 99,
                  fontSize: 11,
                  fontWeight: 500,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.6)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s ease",
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

/* ── Settings Panel ──────────────────────────────────── */
function Settings({ geminiKey, onSave, onClose }) {
  const [val, setVal] = useState(geminiKey || "");
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 20,
        zIndex: 20,
        background: "rgba(6,8,14,0.98)",
        backdropFilter: "blur(20px)",
        display: "flex",
        flexDirection: "column",
        animation: "slideUp 0.2s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 20px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "rgba(255,255,255,0.9)",
            }}
          >
            Cài đặt AI
          </div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.3)",
              marginTop: 2,
            }}
          >
            Gemini API key
          </div>
        </div>
        <button onClick={onClose} className="ai-icon-btn">
          <IconClose />
        </button>
      </div>

      <div
        style={{
          flex: 1,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Info banner */}
        <div
          style={{
            background: "rgba(225,29,72,0.08)",
            border: "1px solid rgba(225,29,72,0.15)",
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.6,
            }}
          >
            💡 Không có key vẫn dùng được — chatbot tích hợp sẵn AI tìm phim.
            Thêm Gemini key để câu trả lời tự nhiên hơn.
          </div>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255,255,255,0.55)",
              }}
            >
              GEMINI API KEY
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11, color: "#e11d48", textDecoration: "none" }}
            >
              Lấy key miễn phí →
            </a>
          </div>
          <input
            type="password"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="AIzaSy..."
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "10px 14px",
              color: "rgba(255,255,255,0.9)",
              fontSize: 13,
              outline: "none",
              fontFamily: "'Courier New', monospace",
              boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            className="ai-key-input"
          />
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <button
            onClick={() => {
              onSave(val.trim());
              onClose();
            }}
            style={{
              padding: "11px 0",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              background: "linear-gradient(135deg, #e11d48, #be123c)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "inherit",
              boxShadow: "0 4px 16px rgba(225,29,72,0.3)",
            }}
          >
            Lưu cài đặt
          </button>
          {val && (
            <button
              onClick={() => {
                onSave("");
                onClose();
              }}
              style={{
                padding: "9px 0",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "none",
                color: "rgba(255,255,255,0.35)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Xoá key
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Empty State ─────────────────────────────────────── */
function EmptyState({ onSend }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "8px 0 4px",
        animation: "fadeIn 0.3s ease",
      }}
    >
      {/* Hero */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: "linear-gradient(135deg, #e11d48 0%, #7c3aed 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 32px rgba(225,29,72,0.4)",
            animation: "heroFloat 3s ease-in-out infinite",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="2" width="20" height="20" rx="2.18" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="2" y1="7" x2="7" y2="7" />
            <line x1="2" y1="17" x2="7" y2="17" />
            <line x1="17" y1="17" x2="22" y2="17" />
            <line x1="17" y1="7" x2="22" y2="7" />
          </svg>
        </div>
        {/* Orbiting dot */}
        <div
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
            boxShadow: "0 0 8px rgba(251,191,36,0.6)",
            animation: "orbitPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 8,
            }}
          >
            ✦
          </div>
        </div>
      </div>

      <h3
        style={{
          margin: "0 0 4px",
          fontSize: 15,
          fontWeight: 800,
          color: "rgba(255,255,255,0.92)",
          letterSpacing: "-0.02em",
        }}
      >
        Filmverse AI
      </h3>
      <p
        style={{
          margin: "0 0 20px",
          fontSize: 12,
          color: "rgba(255,255,255,0.35)",
          textAlign: "center",
          lineHeight: 1.6,
          maxWidth: 240,
        }}
      >
        Gợi ý phim theo tâm trạng, thể loại, năm — hoặc tên phim cụ thể
      </p>

      {/* Quick chips grid */}
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
            onClick={() => onSend(q.text)}
            className="ai-qbtn"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 12,
              cursor: "pointer",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.75)",
              fontSize: 12,
              fontWeight: 500,
              textAlign: "left",
              fontFamily: "inherit",
              transition: "all 0.18s ease",
              animation: `qbtnIn 0.35s ease ${i * 0.06}s both`,
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                flexShrink: 0,
                background: "rgba(255,255,255,0.07)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
              }}
            >
              {q.icon}
            </span>
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.4)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 1,
                }}
              >
                {q.label}
              </div>
              <div style={{ lineHeight: 1.3 }}>{q.text}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════ */
export default function AiChatBox() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [geminiKey, setGeminiKey] = useState(
    () => localStorage.getItem("filmverse_gemini_key") || "",
  );

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const historyRef = useRef([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 160);
      setHasNew(false);
    }
  }, [open]);

  const saveKey = (k) => {
    setGeminiKey(k);
    k
      ? localStorage.setItem("filmverse_gemini_key", k)
      : localStorage.removeItem("filmverse_gemini_key");
  };

  const cancelRef = useRef(null);

  const sendMessage = useCallback(
    (text) => {
      const content = text.trim();
      if (!content || loading) return;
      setInput("");

      // Huỷ stream cũ nếu đang chạy
      cancelRef.current?.();

      const newHistory = [...historyRef.current, { role: "user", content }];
      historyRef.current = newHistory;

      // Thêm user bubble + placeholder AI bubble ngay lập tức
      const aiId = Date.now();
      setMessages((prev) => [
        ...prev,
        { role: "user", content, movies: [], suggestions: [] },
        {
          role: "assistant",
          content: "",
          movies: [],
          suggestions: [],
          _id: aiId,
          _streaming: true,
        },
      ]);
      setLoading(true);

      cancelRef.current = streamChat({
        messages: newHistory,
        geminiKey: geminiKey || null,

        // Event 1: reply text (~0ms) — hiện ngay lập tức
        onReply: ({ reply, suggestions, intent }) => {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === aiId
                ? {
                    ...m,
                    content: reply,
                    suggestions: suggestions || [],
                    intent,
                  }
                : m,
            ),
          );
        },

        // Event 2: movies (~300-600ms) — gắn vào bubble
        onMovies: (movies) => {
          setMessages((prev) =>
            prev.map((m) => (m._id === aiId ? { ...m, movies } : m)),
          );
          historyRef.current = [
            ...newHistory,
            { role: "assistant", content: "" }, // placeholder, content đã set ở onReply
          ];
          if (!open) setHasNew(true);
        },

        onDone: () => {
          setLoading(false);
          // Fix history content từ message cuối
          setMessages((prev) => {
            const ai = prev.find((m) => m._id === aiId);
            if (ai) {
              historyRef.current = [
                ...newHistory,
                { role: "assistant", content: ai.content },
              ];
            }
            return prev.map((m) =>
              m._id === aiId ? { ...m, _streaming: false } : m,
            );
          });
        },

        onError: (err) => {
          const msg = err?.message || "Có lỗi xảy ra, thử lại nhé!";
          setMessages((prev) =>
            prev.map((m) =>
              m._id === aiId
                ? { ...m, content: `😅 ${msg}`, _streaming: false }
                : m,
            ),
          );
          setLoading(false);
        },
      });
    },
    [loading, geminiKey, open],
  );

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!isLoggedIn) return null;

  const canSend = input.trim() && !loading;

  return (
    <>
      {/* ── FAB ── */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="ai-fab"
        title="Trợ lý tìm phim AI"
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 1000,
          width: 54,
          height: 54,
          borderRadius: 16,
          background: open
            ? "rgba(225,29,72,0.2)"
            : "linear-gradient(135deg, #e11d48, #7c3aed)",
          border: open ? "1px solid rgba(225,29,72,0.4)" : "none",
          cursor: "pointer",
          boxShadow: open
            ? "none"
            : "0 8px 28px rgba(225,29,72,0.5), 0 2px 8px rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          color: "#fff",
          transition: "all 0.25s cubic-bezier(0.34,1.2,0.64,1)",
        }}
      >
        {open ? (
          <IconClose />
        ) : (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="2" width="20" height="20" rx="2.18" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="2" y1="7" x2="7" y2="7" />
            <line x1="2" y1="17" x2="7" y2="17" />
            <line x1="17" y1="17" x2="22" y2="17" />
            <line x1="17" y1="7" x2="22" y2="7" />
          </svg>
        )}
        {hasNew && !open && (
          <div
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#22c55e",
              border: "2px solid #080b0f",
              animation: "badgePop 0.35s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          />
        )}
      </button>

      {/* ── Chat Window ── */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 96,
            right: 28,
            zIndex: 999,
            width: 400,
            height: 600,
            display: "flex",
            flexDirection: "column",
            background: "rgba(7,9,16,0.96)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow:
              "0 32px 80px rgba(0,0,0,0.85), 0 0 0 1px rgba(225,29,72,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
            backdropFilter: "blur(24px)",
            animation: "chatIn 0.32s cubic-bezier(0.34,1.15,0.64,1) both",
          }}
        >
          {showSettings && (
            <Settings
              geminiKey={geminiKey}
              onSave={saveKey}
              onClose={() => setShowSettings(false)}
            />
          )}

          {/* ── Header ── */}
          <div
            style={{
              flexShrink: 0,
              padding: "0 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background:
                "linear-gradient(180deg, rgba(225,29,72,0.1) 0%, transparent 100%)",
            }}
          >
            {/* Top bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 0 12px",
              }}
            >
              {/* Logo */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  flexShrink: 0,
                  background: "linear-gradient(135deg, #e11d48, #7c3aed)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 16px rgba(225,29,72,0.4)",
                }}
              >
                <IconFilm />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "rgba(255,255,255,0.95)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Filmverse AI
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    marginTop: 1,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: loading ? "#fbbf24" : "#22c55e",
                      boxShadow: `0 0 6px ${loading ? "#fbbf24" : "#22c55e"}`,
                      animation: loading ? "pulse 1s ease infinite" : "none",
                    }}
                  />
                  <span
                    style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}
                  >
                    {loading ? "Đang tìm phim…" : "Sẵn sàng tư vấn"}
                  </span>
                </div>
              </div>
              {/* Actions */}
              <div style={{ display: "flex", gap: 2 }}>
                {messages.length > 0 && (
                  <button
                    onClick={() => {
                      setMessages([]);
                      historyRef.current = [];
                    }}
                    className="ai-icon-btn"
                    title="Xoá hội thoại"
                  >
                    <IconTrash />
                  </button>
                )}
                <button
                  onClick={() => setShowSettings(true)}
                  className="ai-icon-btn"
                  title="Cài đặt"
                >
                  <IconSettings />
                </button>
              </div>
            </div>

            {/* Gemini badge if key present */}
            {geminiKey && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  paddingBottom: 10,
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    background: "rgba(251,191,36,0.1)",
                    border: "1px solid rgba(251,191,36,0.2)",
                    borderRadius: 99,
                    padding: "3px 10px 3px 6px",
                  }}
                >
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "#fbbf24",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "rgba(251,191,36,0.9)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    GEMINI ENHANCED
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Messages ── */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 16px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              scrollbarWidth: "none",
            }}
          >
            {messages.length === 0 && !loading && (
              <EmptyState onSend={sendMessage} />
            )}

            {messages.map((m, i) => (
              <Message
                key={i}
                msg={m}
                onMovieClick={(id) => {
                  setOpen(false);
                  navigate(`/movie/${id}`);
                }}
                onChip={sendMessage}
              />
            ))}

            {loading && <Typing />}
            <div ref={bottomRef} />
          </div>

          {/* ── Input ── */}
          <div
            style={{
              flexShrink: 0,
              padding: "10px 14px 14px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Textarea wrapper */}
            <div
              className="ai-inp-wrap"
              style={{
                position: "relative",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 16,
                padding: "10px 48px 10px 16px",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
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
                  width: "100%",
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 13,
                  outline: "none",
                  resize: "none",
                  fontFamily: "inherit",
                  lineHeight: 1.55,
                  maxHeight: 90,
                  overflowY: "auto",
                  scrollbarWidth: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!canSend}
                className="ai-send"
                style={{
                  position: "absolute",
                  right: 8,
                  bottom: 8,
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  border: "none",
                  background: canSend
                    ? "linear-gradient(135deg, #e11d48, #be123c)"
                    : "rgba(255,255,255,0.06)",
                  color: canSend ? "#fff" : "rgba(255,255,255,0.2)",
                  cursor: canSend ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  boxShadow: canSend
                    ? "0 4px 12px rgba(225,29,72,0.4)"
                    : "none",
                }}
              >
                <IconSend />
              </button>
            </div>
            <p
              style={{
                margin: "7px 0 0",
                fontSize: 10,
                textAlign: "center",
                color: "rgba(255,255,255,0.18)",
                letterSpacing: "0.02em",
              }}
            >
              Enter gửi · Shift+Enter xuống dòng
            </p>
          </div>
        </div>
      )}

      <style>{CSS}</style>
    </>
  );
}

const CSS = `
  .ai-movie-strip::-webkit-scrollbar { height: 3px; }
  .ai-movie-strip::-webkit-scrollbar-track { background: transparent; }
  .ai-movie-strip::-webkit-scrollbar-thumb { background: rgba(225,29,72,0.4); border-radius: 99px; }
  .ai-movie-strip::-webkit-scrollbar-thumb:hover { background: rgba(225,29,72,0.7); }
  @keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes chatIn    { from{opacity:0;transform:translateY(16px) scale(0.96)} to{opacity:1;transform:none} }
  @keyframes msgIn     { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
  @keyframes mcIn      { from{opacity:0;transform:translateY(12px) scale(0.95)} to{opacity:1;transform:none} }
  @keyframes qbtnIn    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
  @keyframes tdot      { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
  @keyframes heroFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
  @keyframes orbitPop  { from{transform:scale(0) rotate(-45deg)} to{transform:scale(1) rotate(0)} }
  @keyframes badgePop  { from{transform:scale(0)} to{transform:scale(1)} }
  @keyframes slideUp   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
  @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
  @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.4} }

  .ai-fab:hover { transform: translateY(-2px) scale(1.05) !important;
    box-shadow: 0 12px 36px rgba(225,29,72,0.6), 0 2px 8px rgba(0,0,0,0.4) !important; }

  .ai-icon-btn {
    width:30px; height:30px; border-radius:8px; border:none; cursor:pointer;
    background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.4);
    display:flex; align-items:center; justify-content:center;
    transition:background 0.15s, color 0.15s;
  }
  .ai-icon-btn:hover { background:rgba(255,255,255,0.1) !important; color:rgba(255,255,255,0.8) !important; }

  .ai-mc:hover { transform:translateY(-4px) !important;
    box-shadow:0 12px 32px rgba(0,0,0,0.5) !important;
    border-color:rgba(225,29,72,0.35) !important; }

  .ai-chip:hover { background:rgba(255,255,255,0.1) !important;
    border-color:rgba(255,255,255,0.2) !important; color:rgba(255,255,255,0.85) !important; }

  .ai-qbtn:hover { background:rgba(255,255,255,0.08) !important;
    border-color:rgba(225,29,72,0.25) !important; color:rgba(255,255,255,0.9) !important;
    transform:translateY(-1px); }

  .ai-inp-wrap:focus-within {
    border-color:rgba(225,29,72,0.35) !important;
    box-shadow:0 0 0 3px rgba(225,29,72,0.08) !important;
  }
  .ai-key-input:focus { border-color:rgba(225,29,72,0.3) !important; }

  .ai-send:hover:not(:disabled) { transform:scale(1.08); }

  * { -webkit-tap-highlight-color: transparent; }
  ::-webkit-scrollbar { display:none; }
`;

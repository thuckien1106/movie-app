import { useState, useEffect, useCallback, useRef } from "react";
import { getMoviesByMood, getMoods } from "../api/moodApi";
import MovieCard from "../components/MovieCard";
import TrailerModal from "../components/TrailerModal";
import Navbar from "../components/Navbar";
import SkeletonCard from "../components/SkeletonCard";
import ScrollToTop from "../components/ScrollToTop";

/* ══════════════════════════════════════════════
   MOOD CONFIG
══════════════════════════════════════════════ */
const MOODS = [
  {
    id: "vui",
    label: "Vui vẻ",
    emoji: "😄",
    color: "#f5c518",
    glow: "rgba(245,197,24,0.35)",
    bg: "rgba(245,197,24,0.09)",
    desc: "Cần cười thả ga, quên hết muộn phiền",
    particles: ["✨", "⭐", "🎉", "💫", "🌟"],
    gradient: "135deg, rgba(245,197,24,0.18) 0%, rgba(245,197,24,0.04) 100%",
  },
  {
    id: "buon",
    label: "Muốn khóc",
    emoji: "😢",
    color: "#60a5fa",
    glow: "rgba(96,165,250,0.35)",
    bg: "rgba(96,165,250,0.09)",
    desc: "Phim chạm đến trái tim, xúc động thật sự",
    particles: ["💧", "🌧", "💙", "🫧", "🩵"],
    gradient: "135deg, rgba(96,165,250,0.18) 0%, rgba(96,165,250,0.04) 100%",
  },
  {
    id: "hoi_hop",
    label: "Hồi hộp",
    emoji: "😰",
    color: "#ef4444",
    glow: "rgba(239,68,68,0.35)",
    bg: "rgba(239,68,68,0.09)",
    desc: "Tim đập nhanh, ngồi không yên",
    particles: ["⚡", "🔥", "💥", "❗", "🫀"],
    gradient: "135deg, rgba(239,68,68,0.18) 0%, rgba(239,68,68,0.04) 100%",
  },
  {
    id: "kinh_di",
    label: "Sợ hãi",
    emoji: "👻",
    color: "#a855f7",
    glow: "rgba(168,85,247,0.35)",
    bg: "rgba(168,85,247,0.09)",
    desc: "Tắt đèn, xem một mình, dám không?",
    particles: ["🕷", "🌑", "👁", "🦇", "💀"],
    gradient: "135deg, rgba(168,85,247,0.18) 0%, rgba(168,85,247,0.04) 100%",
  },
  {
    id: "thu_gian",
    label: "Thư giãn",
    emoji: "🛋️",
    color: "#22c55e",
    glow: "rgba(34,197,94,0.35)",
    bg: "rgba(34,197,94,0.09)",
    desc: "Nhẹ nhàng, không suy nghĩ, chill thôi",
    particles: ["🍃", "🌿", "☁️", "🌊", "🫖"],
    gradient: "135deg, rgba(34,197,94,0.18) 0%, rgba(34,197,94,0.04) 100%",
  },
  {
    id: "phieu_luu",
    label: "Phiêu lưu",
    emoji: "🌍",
    color: "#f97316",
    glow: "rgba(249,115,22,0.35)",
    bg: "rgba(249,115,22,0.09)",
    desc: "Khám phá thế giới mới, vượt giới hạn",
    particles: ["🗺", "⛰", "🚀", "🌄", "🏔"],
    gradient: "135deg, rgba(249,115,22,0.18) 0%, rgba(249,115,22,0.04) 100%",
  },
  {
    id: "lang_man",
    label: "Lãng mạn",
    emoji: "💕",
    color: "#f472b6",
    glow: "rgba(244,114,182,0.35)",
    bg: "rgba(244,114,182,0.09)",
    desc: "Ngọt ngào, ấm áp, tim tan chảy",
    particles: ["💖", "🌹", "💞", "🌸", "💝"],
    gradient: "135deg, rgba(244,114,182,0.18) 0%, rgba(244,114,182,0.04) 100%",
  },
  {
    id: "suy_ngam",
    label: "Suy ngẫm",
    emoji: "🤔",
    color: "#94a3b8",
    glow: "rgba(148,163,184,0.25)",
    bg: "rgba(148,163,184,0.07)",
    desc: "Phim nhiều tầng ý nghĩa, kích thích tư duy",
    particles: ["🔮", "🧩", "🌌", "💭", "🎭"],
    gradient: "135deg, rgba(148,163,184,0.15) 0%, rgba(148,163,184,0.03) 100%",
  },
];

/* ── Floating particles ──────────────────────── */
function Particle({ char, top, left, size, duration, delay }) {
  return (
    <span
      style={{
        position: "absolute",
        fontSize: size,
        opacity: 0,
        top,
        left,
        animation: `floatUp ${duration}s ease-out ${delay}s infinite`,
        pointerEvents: "none",
        userSelect: "none",
        zIndex: 0,
      }}
    >
      {char}
    </span>
  );
}

/* ── Mood Card ───────────────────────────────── */
function MoodCard({ mood, isSelected, onClick, compact = false }) {
  const [hov, setHov] = useState(false);
  const active = isSelected || hov;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: compact ? 7 : 12,
        padding: compact ? "18px 10px 15px" : "26px 16px 22px",
        borderRadius: 20,
        border: `1.5px solid ${
          isSelected
            ? mood.color
            : hov
              ? `${mood.color}60`
              : "rgba(100,120,180,0.12)"
        }`,
        background: isSelected
          ? `linear-gradient(${mood.gradient})`
          : hov
            ? `linear-gradient(135deg, ${mood.color}10 0%, transparent 100%)`
            : "rgba(255,255,255,0.022)",
        cursor: "pointer",
        overflow: "hidden",
        transition:
          "transform 0.3s cubic-bezier(0.34,1.3,0.64,1), border-color 0.22s, background 0.25s, box-shadow 0.3s",
        transform: active
          ? compact
            ? "translateY(-4px) scale(1.04)"
            : "translateY(-8px) scale(1.04)"
          : "none",
        boxShadow: isSelected
          ? `0 20px 48px ${mood.glow}, 0 0 0 1px ${mood.color}33`
          : hov
            ? `0 12px 32px rgba(0,0,0,0.55), 0 0 0 1px ${mood.color}22`
            : "0 2px 12px rgba(0,0,0,0.3)",
        fontFamily: "var(--font-body,sans-serif)",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, transparent, ${mood.color}, transparent)`,
          opacity: isSelected ? 1 : hov ? 0.6 : 0.15,
          transition: "opacity 0.25s",
        }}
      />

      {/* Background sphere glow */}
      <div
        style={{
          position: "absolute",
          top: -40,
          left: "50%",
          transform: "translateX(-50%)",
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: mood.color,
          opacity: active ? 0.07 : 0,
          filter: "blur(30px)",
          transition: "opacity 0.4s ease",
          pointerEvents: "none",
        }}
      />

      {/* Check badge */}
      {isSelected && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: mood.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 2px 10px ${mood.glow}`,
            animation: "checkPop 0.32s cubic-bezier(0.34,1.56,0.64,1) both",
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {/* Emoji */}
      <span
        style={{
          fontSize: compact
            ? isSelected
              ? 32
              : hov
                ? 30
                : 26
            : isSelected
              ? 46
              : hov
                ? 40
                : 34,
          lineHeight: 1,
          filter: active ? `drop-shadow(0 0 14px ${mood.color}99)` : "none",
          transition: "font-size 0.28s ease, filter 0.25s ease",
          animation: isSelected
            ? "emojiWobble 2.2s ease-in-out infinite"
            : "none",
          display: "inline-block",
          position: "relative",
          zIndex: 1,
        }}
      >
        {mood.emoji}
      </span>

      {/* Label */}
      <span
        style={{
          fontSize: compact ? 11.5 : 13,
          fontWeight: 700,
          color: isSelected
            ? mood.color
            : hov
              ? "var(--text-primary,#f0f4ff)"
              : "rgba(160,175,210,0.75)",
          transition: "color 0.2s",
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          lineHeight: 1.2,
          letterSpacing: "0.01em",
        }}
      >
        {mood.label}
      </span>

      {/* Desc */}
      {!compact && (
        <span
          style={{
            fontSize: 10.5,
            color: "rgba(160,175,210,0.5)",
            lineHeight: 1.45,
            textAlign: "center",
            maxHeight: active ? 34 : 0,
            overflow: "hidden",
            opacity: active ? 1 : 0,
            transition: "max-height 0.28s ease, opacity 0.22s ease",
            position: "relative",
            zIndex: 1,
          }}
        >
          {mood.desc}
        </span>
      )}
    </button>
  );
}

/* ── Hero empty state ────────────────────────── */
function HeroEmpty({ onPickerOpen }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((k) => k + 1), 3000);
    return () => clearInterval(t);
  }, []);
  const cycling = MOODS[tick % MOODS.length];

  return (
    <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
      {/* Cycling emoji preview */}
      <div
        style={{
          position: "relative",
          display: "inline-block",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${cycling.color}22 0%, transparent 70%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1.5px solid ${cycling.color}33`,
            transition: "background 0.8s ease, border-color 0.8s ease",
            margin: "0 auto",
            boxShadow: `0 0 40px ${cycling.glow}`,
          }}
        >
          <span
            style={{
              fontSize: 54,
              lineHeight: 1,
              filter: `drop-shadow(0 0 16px ${cycling.color}88)`,
              animation: "emojiFloat 3s ease-in-out infinite",
              display: "inline-block",
              transition: "font-size 0.3s",
            }}
          >
            {cycling.emoji}
          </span>
        </div>
        {/* Orbit dots */}
        <div
          style={{
            position: "absolute",
            inset: -8,
            borderRadius: "50%",
            border: `1px dashed ${cycling.color}30`,
            transition: "border-color 0.8s",
            animation: "orbitSpin 12s linear infinite",
          }}
        />
      </div>

      <p
        style={{
          margin: "0 0 10px",
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(140,155,195,0.5)",
        }}
      >
        Mood-based discovery
      </p>
      <h1
        style={{
          fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
          fontSize: "clamp(38px,6vw,64px)",
          fontWeight: 400,
          letterSpacing: "0.04em",
          lineHeight: 1.0,
          margin: "0 0 14px",
          color: "var(--text-primary,#f0f4ff)",
        }}
      >
        Hôm nay bạn
        <br />
        muốn cảm gì?
      </h1>
      <p
        style={{
          margin: "0 0 30px",
          fontSize: 15,
          color: "rgba(160,175,210,0.6)",
          lineHeight: 1.65,
          maxWidth: 380,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        Chọn tâm trạng — chúng tôi gợi ý những bộ phim
        <br />
        hoàn hảo nhất cho bạn ngay lập tức.
      </p>

      <button
        onClick={onPickerOpen}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 32px",
          borderRadius: 999,
          background: "var(--red,#e50914)",
          border: "none",
          color: "#fff",
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: "0.05em",
          cursor: "pointer",
          fontFamily: "var(--font-body,sans-serif)",
          boxShadow: "0 6px 28px rgba(229,9,20,0.4)",
          transition: "all 0.2s cubic-bezier(0.34,1.3,0.64,1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-3px) scale(1.03)";
          e.currentTarget.style.boxShadow = "0 12px 36px rgba(229,9,20,0.55)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "0 6px 28px rgba(229,9,20,0.4)";
        }}
      >
        <span style={{ fontSize: 18 }}>🎭</span>
        <span>Chọn tâm trạng</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

/* ── Hero selected state ─────────────────────── */
function HeroSelected({ mood, onPickerOpen, onRefresh, particles }) {
  return (
    <div
      style={{
        textAlign: "center",
        maxWidth: 600,
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
      }}
    >
      {particles.map((p) => (
        <Particle key={p.id} {...p} />
      ))}

      <p
        style={{
          margin: "0 0 12px",
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: mood.color,
          opacity: 0.8,
        }}
      >
        ✦ Tâm trạng đang chọn
      </p>

      <div
        style={{
          position: "relative",
          display: "inline-block",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${mood.color}28 0%, transparent 70%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `2px solid ${mood.color}55`,
            boxShadow: `0 0 60px ${mood.glow}, 0 0 120px ${mood.color}18`,
            margin: "0 auto",
          }}
        >
          <span
            style={{
              fontSize: "clamp(56px,9vw,80px)",
              lineHeight: 1,
              filter: `drop-shadow(0 0 20px ${mood.color}aa)`,
              animation: "emojiFloat 3s ease-in-out infinite",
              display: "inline-block",
            }}
          >
            {mood.emoji}
          </span>
        </div>
        {/* Pulsing ring */}
        <div
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            border: `2px solid ${mood.color}`,
            opacity: 0.3,
            animation: "ringPulse 2.5s ease-in-out infinite",
          }}
        />
      </div>

      <h1
        style={{
          fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
          fontSize: "clamp(42px,7vw,80px)",
          fontWeight: 400,
          letterSpacing: "0.04em",
          lineHeight: 1.0,
          margin: "0 0 10px",
          color: mood.color,
          textShadow: `0 0 60px ${mood.glow}`,
          transition: "color 0.4s ease",
        }}
      >
        {mood.label}
      </h1>

      <p
        style={{
          margin: "0 0 28px",
          fontSize: "clamp(14px,1.4vw,16px)",
          color: "rgba(180,195,230,0.65)",
          lineHeight: 1.65,
          maxWidth: 420,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {mood.desc}
      </p>

      <div
        style={{
          display: "flex",
          gap: 10,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={onPickerOpen}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 26px",
            borderRadius: 999,
            background: mood.color,
            color: mood.color === "#f5c518" ? "#000" : "#fff",
            border: "none",
            fontSize: 13.5,
            fontWeight: 800,
            letterSpacing: "0.04em",
            cursor: "pointer",
            fontFamily: "var(--font-body,sans-serif)",
            boxShadow: `0 6px 24px ${mood.glow}`,
            transition: "all 0.22s cubic-bezier(0.34,1.3,0.64,1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px) scale(1.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "none";
          }}
        >
          <span>🎭</span>
          <span>Đổi tâm trạng</span>
        </button>

        <button
          onClick={onRefresh}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 22px",
            borderRadius: 999,
            border: `1.5px solid ${mood.color}55`,
            background: mood.bg,
            color: mood.color,
            fontSize: 13.5,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "var(--font-body,sans-serif)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${mood.color}20`;
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = mood.bg;
            e.currentTarget.style.transform = "none";
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
          </svg>
          <span>Gợi ý khác</span>
        </button>
      </div>
    </div>
  );
}

/* ── Mood Picker Bottom Sheet ────────────────── */
function MoodPickerSheet({ selectedMood, onSelect, onClose }) {
  const [moods] = useState(MOODS);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.78)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 740,
          background: "rgba(10,14,22,0.99)",
          borderRadius: "24px 24px 0 0",
          border: "1px solid rgba(100,120,175,0.15)",
          borderBottom: "none",
          padding: "0 24px 40px",
          maxHeight: "90vh",
          overflowY: "auto",
          scrollbarWidth: "none",
          animation: "sheetUp 0.35s cubic-bezier(0.34,1.2,0.64,1) both",
          boxShadow:
            "0 -16px 80px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(229,9,20,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: "rgba(160,175,210,0.2)",
            margin: "12px auto 22px",
          }}
        />

        {/* Sheet header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 22,
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 4px",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(140,155,195,0.45)",
              }}
            >
              Hôm nay bạn đang cảm thấy thế nào?
            </p>
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
                fontSize: 30,
                fontWeight: 400,
                letterSpacing: "0.06em",
                color: "var(--text-primary,#f0f4ff)",
              }}
            >
              Chọn tâm trạng
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(100,120,175,0.14)",
              color: "rgba(160,175,210,0.6)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div
          className="mood-picker-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))",
            gap: 10,
          }}
        >
          {moods.map((mood) => (
            <MoodCard
              key={mood.id}
              mood={mood}
              isSelected={selectedMood?.id === mood.id}
              onClick={() => onSelect(mood)}
              compact
            />
          ))}
        </div>

        {selectedMood && (
          <div
            style={{ marginTop: 24, display: "flex", justifyContent: "center" }}
          >
            <button
              onClick={onClose}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 36px",
                borderRadius: 999,
                border: "none",
                background: selectedMood.color,
                color: selectedMood.color === "#f5c518" ? "#000" : "#fff",
                fontSize: 15,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "var(--font-body,sans-serif)",
                boxShadow: `0 8px 28px ${selectedMood.glow}`,
                transition: "transform 0.18s cubic-bezier(0.34,1.3,0.64,1)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform =
                  "translateY(-2px) scale(1.03)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
            >
              <span style={{ fontSize: 20 }}>{selectedMood.emoji}</span>
              <span>Xem phim {selectedMood.label}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function MoodDiscovery() {
  const [selectedMood, setSelected] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadMore] = useState(false);
  const [trailer, setTrailer] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [particles, setParticles] = useState([]);
  const [entered, setEntered] = useState(false);
  const gridRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (selectedMood?.particles) {
      setParticles(
        Array.from({ length: 16 }, (_, i) => ({
          id: i,
          char: selectedMood.particles[i % selectedMood.particles.length],
          top: `${6 + Math.random() * 80}%`,
          left: `${Math.random() * 100}%`,
          size: 12 + Math.random() * 14,
          duration: 4 + Math.random() * 5,
          delay: Math.random() * 3,
        })),
      );
    } else {
      setParticles([]);
    }
  }, [selectedMood]);

  useEffect(() => {
    if (!selectedMood) return;
    setLoading(true);
    setMovies([]);
    setPage(1);
    getMoviesByMood(selectedMood.id, 1)
      .then((r) => {
        setMovies(r.data.results || []);
        setHasMore((r.data.results || []).length === 20);
      })
      .catch(() => setMovies([]))
      .finally(() => setLoading(false));
  }, [selectedMood, refreshKey]);

  const loadMore = useCallback(() => {
    if (loadingMore || !selectedMood) return;
    const next = page + 1;
    setLoadMore(true);
    getMoviesByMood(selectedMood.id, next)
      .then((r) => {
        const nm = r.data.results || [];
        setMovies((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          return [...prev, ...nm.filter((m) => !ids.has(m.id))];
        });
        setPage(next);
        setHasMore(nm.length === 20);
      })
      .finally(() => setLoadMore(false));
  }, [loadingMore, selectedMood, page]);

  const handleSelect = useCallback((mood) => {
    setSelected(mood);
    setShowPicker(false);
    setTimeout(
      () =>
        gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      350,
    );
  }, []);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    gridRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-page,#080b0f)",
        color: "var(--text-primary,#f0f4ff)",
        fontFamily: "var(--font-body,'DM Sans',sans-serif)",
        paddingTop: 60,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Navbar />

      {/* Ambient background glow — transitions with mood */}
      <div
        style={{
          position: "fixed",
          top: "-20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "90vw",
          height: "70vh",
          borderRadius: "50%",
          background: selectedMood
            ? `radial-gradient(ellipse at center, ${selectedMood.color}12 0%, transparent 65%)`
            : "radial-gradient(ellipse at center, rgba(229,9,20,0.06) 0%, transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
          transition: "background 1s ease",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "-10%",
          right: "-5%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: selectedMood
            ? `radial-gradient(circle, ${selectedMood.color}09 0%, transparent 70%)`
            : "none",
          pointerEvents: "none",
          zIndex: 0,
          transition: "background 1s ease",
        }}
      />

      {/* ══ HERO ══ */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding:
            "clamp(44px,8vh,80px) clamp(20px,5vw,64px) clamp(36px,6vh,60px)",
          textAlign: "center",
          borderBottom: `1px solid ${selectedMood ? `${selectedMood.color}38` : "rgba(100,120,175,0.1)"}`,
          transition: "border-color 0.7s ease",
          overflow: "hidden",
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(20px)",
          transitionProperty: "opacity, transform, border-color",
          transitionDuration: "0.55s, 0.55s, 0.7s",
          transitionTimingFunction: "ease, cubic-bezier(0.4,0,0.2,1), ease",
        }}
      >
        {selectedMood ? (
          <HeroSelected
            mood={selectedMood}
            onPickerOpen={() => setShowPicker(true)}
            onRefresh={handleRefresh}
            particles={particles}
          />
        ) : (
          <HeroEmpty onPickerOpen={() => setShowPicker(true)} />
        )}
      </div>

      {/* ══ QUICK BAR ══ */}
      <div
        style={{
          borderBottom: "1px solid rgba(100,120,175,0.1)",
          padding: "10px 0",
          overflowX: "auto",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          position: "sticky",
          top: 60,
          zIndex: 50,
          background: "rgba(8,11,15,0.96)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 7,
            padding: "2px clamp(16px,4vw,48px)",
            width: "max-content",
            minWidth: "100%",
            boxSizing: "border-box",
          }}
        >
          {MOODS.map((mood) => {
            const active = selectedMood?.id === mood.id;
            return (
              <button
                key={mood.id}
                onClick={() => handleSelect(mood)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "7px 14px",
                  borderRadius: 999,
                  border: `1.5px solid ${active ? mood.color : "rgba(100,120,175,0.14)"}`,
                  background: active
                    ? `linear-gradient(135deg, ${mood.color}18, ${mood.color}08)`
                    : "transparent",
                  color: active ? mood.color : "rgba(140,155,195,0.6)",
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  fontFamily: "var(--font-body,sans-serif)",
                  transition: "all 0.22s ease",
                  boxShadow: active ? `0 0 14px ${mood.glow}` : "none",
                  transform: active ? "translateY(-1px)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = `${mood.color}55`;
                    e.currentTarget.style.color = "rgba(200,215,255,0.8)";
                    e.currentTarget.style.background = `${mood.color}0a`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor =
                      "rgba(100,120,175,0.14)";
                    e.currentTarget.style.color = "rgba(140,155,195,0.6)";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <span style={{ fontSize: 14 }}>{mood.emoji}</span>
                <span>{mood.label}</span>
                {active && (
                  <div
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: mood.color,
                      marginLeft: 2,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ CONTENT ══ */}
      <div
        ref={gridRef}
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "36px clamp(16px,4vw,48px) 80px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* ── No mood: Big mood grid ── */}
        {!selectedMood && (
          <div style={{ animation: "fadeSlideUp 0.5s ease both" }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "rgba(130,145,185,0.4)",
                }}
              >
                Chọn một trong
              </p>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
                  fontSize: "clamp(22px,3.5vw,32px)",
                  fontWeight: 400,
                  letterSpacing: "0.07em",
                  color: "rgba(200,215,255,0.65)",
                }}
              >
                8 tâm trạng phim
              </h2>
            </div>
            <div
              className="mood-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                gap: 14,
                maxWidth: 1000,
                margin: "0 auto",
              }}
            >
              {MOODS.map((mood, i) => (
                <div
                  key={mood.id}
                  style={{
                    animation: `fadeSlideUp 0.45s ease ${i * 0.055}s both`,
                  }}
                >
                  <MoodCard
                    mood={mood}
                    isSelected={false}
                    onClick={() => handleSelect(mood)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && selectedMood && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 3,
                  height: 16,
                  borderRadius: 99,
                  background: selectedMood.color,
                  flexShrink: 0,
                }}
              />
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "rgba(160,175,210,0.6)",
                }}
              >
                Đang tìm phim cho{" "}
                <strong style={{ color: selectedMood.color }}>
                  {selectedMood.label}
                </strong>
                …
              </p>
            </div>
            <div
              className="movie-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))",
                gap: 16,
              }}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonCard key={i} delay={i * 40} />
              ))}
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {!loading && movies.length > 0 && selectedMood && (
          <>
            {/* Results header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 3,
                    height: 22,
                    borderRadius: 99,
                    background: selectedMood.color,
                    boxShadow: `0 0 10px ${selectedMood.glow}`,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
                      fontSize: "clamp(22px,3vw,30px)",
                      fontWeight: 400,
                      letterSpacing: "0.05em",
                      lineHeight: 1,
                      color: "var(--text-primary,#f0f4ff)",
                    }}
                  >
                    Phim cho tâm trạng {selectedMood.emoji}
                  </h2>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 12,
                      color: "rgba(140,155,195,0.5)",
                    }}
                  >
                    {movies.length} gợi ý ·{" "}
                    <span
                      style={{ color: selectedMood.color, fontWeight: 700 }}
                    >
                      {selectedMood.label}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: `1px solid ${selectedMood.color}44`,
                  background: selectedMood.bg,
                  color: selectedMood.color,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-body,sans-serif)",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${selectedMood.color}20`;
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = selectedMood.bg;
                  e.currentTarget.style.transform = "none";
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                </svg>
                Gợi ý khác
              </button>
            </div>

            <div
              className="movie-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))",
                gap: 16,
              }}
            >
              {movies.map((movie, i) => (
                <div
                  key={movie.id}
                  style={{
                    animation: `fadeSlideUp 0.35s ease ${Math.min(i, 8) * 0.04}s both`,
                    minWidth: 0,
                  }}
                >
                  <MovieCard movie={movie} onPlay={() => setTrailer(movie)} />
                </div>
              ))}
              {loadingMore &&
                Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={`more-${i}`} delay={i * 60} />
                ))}
            </div>

            {hasMore && !loadingMore && (
              <div
                style={{
                  marginTop: 44,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={loadMore}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "13px 38px",
                    borderRadius: 999,
                    border: `1.5px solid ${selectedMood.color}55`,
                    background: selectedMood.bg,
                    color: selectedMood.color,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "var(--font-body,sans-serif)",
                    letterSpacing: "0.03em",
                    boxShadow: `0 4px 20px ${selectedMood.glow}`,
                    transition: "all 0.22s cubic-bezier(0.34,1.3,0.64,1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = `0 10px 32px ${selectedMood.glow}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = `0 4px 20px ${selectedMood.glow}`;
                  }}
                >
                  <span>{selectedMood.emoji}</span>
                  <span>Xem thêm phim {selectedMood.label}</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Empty results ── */}
        {!loading && selectedMood && movies.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div
              style={{
                fontSize: 56,
                marginBottom: 16,
                animation: "emojiFloat 3s ease-in-out infinite",
              }}
            >
              😅
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
                fontSize: 28,
                fontWeight: 400,
                letterSpacing: "0.05em",
                marginBottom: 10,
              }}
            >
              Không tìm thấy phim
            </h2>
            <p
              style={{
                color: "rgba(140,155,195,0.55)",
                maxWidth: 360,
                margin: "0 auto 24px",
                lineHeight: 1.6,
                fontSize: 14,
              }}
            >
              Thử đổi tâm trạng hoặc nhấn gợi ý khác nhé.
            </p>
            <button
              onClick={handleRefresh}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 28px",
                borderRadius: 999,
                border: "none",
                background: "var(--red,#e50914)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--font-body,sans-serif)",
                boxShadow: "0 4px 16px rgba(229,9,20,0.35)",
              }}
            >
              Thử lại
            </button>
          </div>
        )}
      </div>

      {showPicker && (
        <MoodPickerSheet
          selectedMood={selectedMood}
          onSelect={handleSelect}
          onClose={() => setShowPicker(false)}
        />
      )}
      {trailer && (
        <TrailerModal movie={trailer} onClose={() => setTrailer(null)} />
      )}
      <ScrollToTop />

      <style>{`
        @keyframes emojiFloat   { 0%,100%{transform:translateY(0) rotate(0deg)} 33%{transform:translateY(-12px) rotate(-4deg)} 66%{transform:translateY(-7px) rotate(4deg)} }
        @keyframes emojiWobble  { 0%,100%{transform:rotate(0deg) scale(1)} 25%{transform:rotate(-8deg) scale(1.06)} 75%{transform:rotate(8deg) scale(1.06)} }
        @keyframes floatUp      { 0%{opacity:0;transform:translateY(0) scale(0.8)} 15%{opacity:0.6} 85%{opacity:0.3} 100%{opacity:0;transform:translateY(-130px) scale(1.1) rotate(22deg)} }
        @keyframes fadeSlideUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes checkPop     { from{transform:scale(0);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes sheetUp      { from{transform:translateY(70px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes ringPulse    { 0%,100%{transform:scale(1);opacity:0.3} 50%{transform:scale(1.12);opacity:0.08} }
        @keyframes orbitSpin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        ::-webkit-scrollbar { display:none; }

        @media (max-width: 480px) {
          .mood-grid         { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; max-width: 100% !important; }
          .mood-picker-grid  { grid-template-columns: repeat(4, 1fr) !important; gap: 8px !important; }
          .movie-grid        { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
        }
        @media (min-width: 481px) and (max-width: 640px) {
          .mood-grid         { grid-template-columns: repeat(4, 1fr) !important; gap: 10px !important; max-width: 100% !important; }
          .mood-picker-grid  { grid-template-columns: repeat(4, 1fr) !important; }
          .movie-grid        { grid-template-columns: repeat(3, 1fr) !important; gap: 12px !important; }
        }
        @media (min-width: 641px) and (max-width: 900px) {
          .mood-grid         { grid-template-columns: repeat(4, 1fr) !important; max-width: 100% !important; }
          .mood-picker-grid  { grid-template-columns: repeat(4, 1fr) !important; }
          .movie-grid        { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}

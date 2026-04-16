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
    glow: "rgba(245,197,24,0.3)",
    bg: "rgba(245,197,24,0.08)",
    desc: "Cần cười thả ga, quên hết muộn phiền",
    particles: ["✨", "⭐", "🎉", "💫", "🌟"],
  },
  {
    id: "buon",
    label: "Muốn khóc",
    emoji: "😢",
    color: "#60a5fa",
    glow: "rgba(96,165,250,0.3)",
    bg: "rgba(96,165,250,0.08)",
    desc: "Phim chạm đến trái tim, xúc động thật sự",
    particles: ["💧", "🌧", "💙", "🫧", "🩵"],
  },
  {
    id: "hoi_hop",
    label: "Hồi hộp",
    emoji: "😰",
    color: "#ef4444",
    glow: "rgba(239,68,68,0.3)",
    bg: "rgba(239,68,68,0.08)",
    desc: "Tim đập nhanh, ngồi không yên",
    particles: ["⚡", "🔥", "💥", "❗", "🫀"],
  },
  {
    id: "kinh_di",
    label: "Sợ hãi",
    emoji: "👻",
    color: "#a855f7",
    glow: "rgba(168,85,247,0.3)",
    bg: "rgba(168,85,247,0.08)",
    desc: "Tắt đèn, xem một mình, dám không?",
    particles: ["🕷", "🌑", "👁", "🦇", "💀"],
  },
  {
    id: "thu_gian",
    label: "Thư giãn",
    emoji: "🛋️",
    color: "#22c55e",
    glow: "rgba(34,197,94,0.3)",
    bg: "rgba(34,197,94,0.08)",
    desc: "Nhẹ nhàng, không suy nghĩ, chill thôi",
    particles: ["🍃", "🌿", "☁️", "🌊", "🫖"],
  },
  {
    id: "phieu_luu",
    label: "Phiêu lưu",
    emoji: "🌍",
    color: "#f97316",
    glow: "rgba(249,115,22,0.3)",
    bg: "rgba(249,115,22,0.08)",
    desc: "Khám phá thế giới mới, vượt giới hạn",
    particles: ["🗺", "⛰", "🚀", "🌄", "🏔"],
  },
  {
    id: "lang_man",
    label: "Lãng mạn",
    emoji: "💕",
    color: "#f472b6",
    glow: "rgba(244,114,182,0.3)",
    bg: "rgba(244,114,182,0.08)",
    desc: "Ngọt ngào, ấm áp, tim tan chảy",
    particles: ["💖", "🌹", "💞", "🌸", "💝"],
  },
  {
    id: "suy_ngam",
    label: "Suy ngẫm",
    emoji: "🤔",
    color: "#94a3b8",
    glow: "rgba(148,163,184,0.2)",
    bg: "rgba(148,163,184,0.06)",
    desc: "Phim nhiều tầng ý nghĩa, kích thích tư duy",
    particles: ["🔮", "🧩", "🌌", "💭", "🎭"],
  },
];

/* ── Mood Card ─────────────────────────────── */
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
        gap: compact ? 6 : 10,
        padding: compact ? "16px 8px 14px" : "22px 14px 18px",
        borderRadius: "var(--radius-xl, 20px)",
        border: `1.5px solid ${isSelected ? mood.color : hov ? mood.color + "55" : "rgba(100,120,180,0.12)"}`,
        background: isSelected
          ? `linear-gradient(160deg, ${mood.color}14 0%, ${mood.color}08 100%)`
          : hov
            ? `linear-gradient(160deg, ${mood.color}0d 0%, transparent 100%)`
            : "var(--bg-card)",
        cursor: "pointer",
        overflow: "hidden",
        transition:
          "transform 0.28s cubic-bezier(0.34,1.3,0.64,1), border-color 0.22s ease, background 0.22s ease, box-shadow 0.28s ease",
        transform: active ? "translateY(-6px) scale(1.03)" : "none",
        boxShadow: isSelected
          ? `0 16px 40px ${mood.glow}, 0 0 0 1px ${mood.color}44`
          : hov
            ? `0 8px 28px rgba(0,0,0,0.5)`
            : "0 4px 16px rgba(0,0,0,0.4)",
        fontFamily: "var(--font-body, sans-serif)",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* top gradient bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(to right, ${mood.color}aa, ${mood.color})`,
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
          opacity: isSelected ? 1 : hov ? 0.7 : 0.2,
          transition: "opacity 0.22s ease",
        }}
      />
      {/* ambient glow sphere */}
      <div
        style={{
          position: "absolute",
          top: -30,
          left: "50%",
          transform: "translateX(-50%)",
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: mood.color,
          opacity: active ? 0.08 : 0,
          filter: "blur(24px)",
          transition: "opacity 0.35s ease",
          pointerEvents: "none",
        }}
      />
      {/* check badge */}
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
            boxShadow: `0 2px 8px ${mood.glow}`,
            animation: "checkPop 0.3s cubic-bezier(0.34,1.56,0.64,1)",
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
      {/* emoji */}
      <span
        style={{
          fontSize: compact
            ? isSelected
              ? 30
              : hov
                ? 28
                : 26
            : isSelected
              ? 40
              : hov
                ? 36
                : 32,
          lineHeight: 1,
          filter: active ? `drop-shadow(0 0 12px ${mood.color}88)` : "none",
          transition: "font-size 0.28s ease, filter 0.25s ease",
          animation: isSelected
            ? "emojiWobble 2s ease-in-out infinite"
            : "none",
          display: "inline-block",
          position: "relative",
          zIndex: 1,
        }}
      >
        {mood.emoji}
      </span>
      {/* label */}
      <span
        style={{
          fontSize: compact ? 11 : 13,
          fontWeight: 700,
          color: isSelected
            ? mood.color
            : hov
              ? "var(--text-primary)"
              : "var(--text-secondary)",
          transition: "color 0.2s ease",
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          lineHeight: 1.2,
          letterSpacing: "0.01em",
        }}
      >
        {mood.label}
      </span>
      {/* desc */}
      {!compact && (
        <span
          style={{
            fontSize: 10,
            color: "var(--text-faint)",
            lineHeight: 1.4,
            textAlign: "center",
            maxHeight: active ? 32 : 0,
            overflow: "hidden",
            opacity: active ? 1 : 0,
            transition: "max-height 0.25s ease, opacity 0.2s ease",
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
/* ── Particle ──────────────────────────────── */
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

/* ── Mood Picker Sheet ─────────────────────── */
function MoodPickerSheet({ selectedMood, onSelect, onClose }) {
  const [moods, setMoods] = useState(MOODS);
  useEffect(() => {
    getMoods()
      .then((r) => {
        if (r.data?.length) setMoods(r.data);
      })
      .catch(() => {});
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
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(8px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          background: "var(--bg-overlay, #1a2030)",
          borderRadius: "24px 24px 0 0",
          border: "1px solid var(--border-mid)",
          borderBottom: "none",
          padding: "8px 24px 40px",
          maxHeight: "88vh",
          overflowY: "auto",
          scrollbarWidth: "none",
          animation: "sheetUp 0.38s cubic-bezier(0.34,1.2,0.64,1) both",
          boxShadow: "0 -12px 60px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: "var(--border-bright)",
            margin: "10px auto 20px",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 24,
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 4px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text-faint)",
              }}
            >
              Hôm nay bạn đang cảm thấy thế nào?
            </p>
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-2xl, 30px)",
                fontWeight: 400,
                letterSpacing: "0.05em",
                color: "var(--text-primary)",
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
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-card2)",
              border: "1px solid var(--border-mid)",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>
        <div
          className="mood-picker-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: 10,
          }}
        >
          {moods.map((mood) => (
            <MoodCard
              key={mood.id}
              mood={mood}
              isSelected={selectedMood?.id === mood.id}
              onClick={() => onSelect(mood)}
              compact={true}
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
                padding: "14px 32px",
                borderRadius: "var(--radius-full, 999px)",
                border: "none",
                background: selectedMood.color,
                color: selectedMood.color === "#f5c518" ? "#000" : "#fff",
                fontSize: 15,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "var(--font-body, sans-serif)",
                boxShadow: `0 6px 24px ${selectedMood.glow}`,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform =
                  "translateY(-2px) scale(1.02)")
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
  const gridRef = useRef(null);

  useEffect(() => {
    if (selectedMood?.particles) {
      setParticles(
        Array.from({ length: 14 }, (_, i) => ({
          id: i,
          char: selectedMood.particles[i % selectedMood.particles.length],
          top: `${8 + Math.random() * 78}%`,
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
      300,
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
        background: "var(--bg-page)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
        paddingTop: 60,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Navbar />

      {/* Ambient bg glows */}
      {selectedMood && (
        <>
          <div
            style={{
              position: "fixed",
              top: -100,
              left: "50%",
              transform: "translateX(-50%)",
              width: "80vw",
              height: "60vh",
              borderRadius: "50%",
              background: `radial-gradient(ellipse at center, ${selectedMood.color}14 0%, transparent 65%)`,
              pointerEvents: "none",
              zIndex: 0,
              transition: "background 0.8s ease",
            }}
          />
          <div
            style={{
              position: "fixed",
              bottom: -80,
              right: -80,
              width: 400,
              height: 400,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${selectedMood.color}0b 0%, transparent 70%)`,
              pointerEvents: "none",
              zIndex: 0,
              transition: "background 0.8s ease",
            }}
          />
        </>
      )}

      {/* ── HERO ── */}
      <div
        style={{
          position: "relative",
          padding:
            "clamp(40px,8vh,72px) clamp(20px,5vw,64px) clamp(32px,5vh,52px)",
          textAlign: "center",
          overflow: "hidden",
          zIndex: 1,
          borderBottom: `2px solid ${selectedMood ? selectedMood.color + "55" : "var(--border)"}`,
          transition: "border-color 0.5s ease",
        }}
      >
        {particles.map((p) => (
          <Particle key={p.id} {...p} />
        ))}

        <p
          style={{
            margin: "0 0 16px",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: selectedMood ? selectedMood.color : "var(--text-faint)",
            transition: "color 0.4s ease",
          }}
        >
          {selectedMood ? "✦ Tâm trạng đang chọn" : "✦ Khám phá theo tâm trạng"}
        </p>

        {selectedMood ? (
          <div style={{ marginBottom: 20 }}>
            <span
              style={{
                fontSize: "clamp(64px,10vw,96px)",
                lineHeight: 1,
                filter: `drop-shadow(0 0 24px ${selectedMood.glow})`,
                animation: "emojiFloat 3s ease-in-out infinite",
                display: "inline-block",
                transition: "font-size 0.4s ease",
              }}
            >
              {selectedMood.emoji}
            </span>
            <h1
              style={{
                fontFamily: "var(--font-display, 'Bebas Neue', sans-serif)",
                fontSize: "clamp(42px,7vw,80px)",
                fontWeight: 400,
                letterSpacing: "0.04em",
                lineHeight: 1.0,
                margin: "14px 0 0",
                color: selectedMood.color,
                textShadow: `0 0 40px ${selectedMood.glow}`,
                transition: "color 0.4s ease",
              }}
            >
              {selectedMood.label}
            </h1>
            <p
              style={{
                margin: "10px auto 0",
                fontSize: "clamp(14px,1.5vw,16px)",
                color: "var(--text-muted)",
                lineHeight: 1.6,
                maxWidth: 500,
              }}
            >
              {selectedMood.desc}
            </p>
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: "clamp(56px,10vw,88px)",
                lineHeight: 1,
                marginBottom: 16,
                animation: "emojiFloat 4s ease-in-out infinite",
              }}
            >
              🎭
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display, 'Bebas Neue', sans-serif)",
                fontSize: "clamp(36px,6vw,64px)",
                fontWeight: 400,
                letterSpacing: "0.04em",
                lineHeight: 1.05,
                margin: "0 0 12px",
                color: "var(--text-primary)",
              }}
            >
              Hôm nay bạn muốn xem gì?
            </h1>
            <p
              style={{
                margin: "0 auto",
                fontSize: 15,
                color: "var(--text-muted)",
                maxWidth: 440,
              }}
            >
              Chọn tâm trạng của bạn — app sẽ gợi ý những bộ phim hoàn hảo nhất.
            </p>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: 24,
            position: "relative",
            zIndex: 1,
          }}
        >
          <button
            onClick={() => setShowPicker(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 28px",
              borderRadius: "var(--radius-full, 999px)",
              border: "none",
              background: selectedMood ? selectedMood.color : "var(--red)",
              color: selectedMood?.color === "#f5c518" ? "#000" : "#fff",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.04em",
              cursor: "pointer",
              fontFamily: "var(--font-body, sans-serif)",
              boxShadow: selectedMood
                ? `0 4px 20px ${selectedMood.glow}`
                : "0 4px 16px rgba(229,9,20,0.35)",
              transition:
                "background 0.4s ease, box-shadow 0.4s ease, transform 0.18s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "translateY(-2px) scale(1.03)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
          >
            <span>{selectedMood ? selectedMood.emoji : "🎭"}</span>
            <span>{selectedMood ? "Đổi tâm trạng" : "Chọn tâm trạng"}</span>
          </button>
          {selectedMood && (
            <button
              onClick={handleRefresh}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 22px",
                borderRadius: "var(--radius-full, 999px)",
                border: `1px solid ${selectedMood.color}55`,
                background: selectedMood.bg,
                color: selectedMood.color,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-body, sans-serif)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = selectedMood.color + "20";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = selectedMood.bg;
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
          )}
        </div>
      </div>

      {/* ── Mood Quick Bar ── */}
      <div
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "12px 0",
          overflowX: "auto",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          position: "sticky",
          top: 60,
          zIndex: 50,
          background: "var(--bg-surface, rgba(14,18,24,0.95))",
          backdropFilter: "blur(14px)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
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
                  padding: "7px 15px",
                  borderRadius: "var(--radius-full, 999px)",
                  border: `1.5px solid ${active ? mood.color : "var(--border-mid)"}`,
                  background: active ? mood.bg : "transparent",
                  color: active ? mood.color : "var(--text-muted)",
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  fontFamily: "var(--font-body, sans-serif)",
                  transition: "all 0.2s ease",
                  boxShadow: active ? `0 0 12px ${mood.glow}` : "none",
                  transform: active ? "translateY(-1px)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = mood.color + "55";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = "var(--border-mid)";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }
                }}
              >
                <span style={{ fontSize: 15 }}>{mood.emoji}</span>
                <span>{mood.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div
        ref={gridRef}
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "32px clamp(16px,4vw,48px) 80px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* No mood — big card grid */}
        {!selectedMood && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--text-faint)",
                }}
              >
                Chọn một trong
              </p>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-xl, 24px)",
                  fontWeight: 400,
                  letterSpacing: "0.06em",
                  color: "var(--text-secondary)",
                }}
              >
                8 tâm trạng phim
              </h2>
            </div>
            <div
              className="mood-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 14,
                maxWidth: 960,
                margin: "0 auto",
              }}
            >
              {MOODS.map((mood, i) => (
                <div
                  key={mood.id}
                  style={{
                    animation: `fadeSlideUp 0.4s ease ${i * 0.05}s both`,
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

        {/* Loading */}
        {loading && selectedMood && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 3,
                  height: 16,
                  borderRadius: "var(--radius-full)",
                  background: selectedMood.color,
                  flexShrink: 0,
                }}
              />
              <p
                style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}
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

        {/* Results */}
        {!loading && movies.length > 0 && selectedMood && (
          <>
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
                    height: 20,
                    borderRadius: "var(--radius-full)",
                    background: selectedMood.color,
                    boxShadow: `0 0 8px ${selectedMood.glow}`,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--text-2xl, 30px)",
                      fontWeight: 400,
                      letterSpacing: "0.05em",
                      lineHeight: 1,
                    }}
                  >
                    Phim cho tâm trạng {selectedMood.emoji}
                  </h2>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 12,
                      color: "var(--text-faint)",
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
                  borderRadius: "var(--radius-full)",
                  border: `1px solid ${selectedMood.color}44`,
                  background: selectedMood.bg,
                  color: selectedMood.color,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-body, sans-serif)",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = selectedMood.color + "20")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = selectedMood.bg)
                }
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
                  marginTop: 40,
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
                    padding: "13px 36px",
                    borderRadius: "var(--radius-full)",
                    border: `1.5px solid ${selectedMood.color}55`,
                    background: selectedMood.bg,
                    color: selectedMood.color,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "var(--font-body, sans-serif)",
                    letterSpacing: "0.03em",
                    boxShadow: `0 4px 16px ${selectedMood.glow}`,
                    transition: "all 0.22s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = `0 8px 28px ${selectedMood.glow}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = `0 4px 16px ${selectedMood.glow}`;
                  }}
                >
                  <span>{selectedMood.emoji}</span>
                  <span>Xem thêm phim {selectedMood.label}</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* No results */}
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
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-2xl)",
                fontWeight: 400,
                letterSpacing: "0.05em",
                marginBottom: 10,
              }}
            >
              Không tìm thấy phim
            </h2>
            <p
              style={{
                color: "var(--text-muted)",
                maxWidth: 360,
                margin: "0 auto 24px",
                lineHeight: 1.6,
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
                borderRadius: "var(--radius-full)",
                border: "none",
                background: "var(--red)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--font-body, sans-serif)",
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
        @keyframes emojiFloat { 0%,100%{transform:translateY(0px) rotate(0deg)} 33%{transform:translateY(-10px) rotate(-3deg)} 66%{transform:translateY(-6px) rotate(3deg)} }
        @keyframes emojiWobble { 0%,100%{transform:rotate(0deg) scale(1)} 25%{transform:rotate(-8deg) scale(1.05)} 75%{transform:rotate(8deg) scale(1.05)} }
        @keyframes floatUp { 0%{opacity:0;transform:translateY(0) scale(0.8)} 15%{opacity:0.65} 85%{opacity:0.35} 100%{opacity:0;transform:translateY(-120px) scale(1.1) rotate(20deg)} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes checkPop { from{transform:scale(0);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes sheetUp { from{transform:translateY(60px);opacity:0} to{transform:translateY(0);opacity:1} }
        ::-webkit-scrollbar { display:none; }

        /* ── Mobile: 480px trở xuống ── */
        @media (max-width: 480px) {
          /* Mood grid chính: 2 cột cố định, gap nhỏ hơn */
          .mood-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
            max-width: 100% !important;
          }

          /* Picker sheet grid: 4 cột icon-only nhỏ gọn */
          .mood-picker-grid {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 8px !important;
          }

          /* Movie grid: 2 cột trên mobile nhỏ */
          .movie-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
          }
        }

        /* ── Mobile vừa: 481px – 640px ── */
        @media (min-width: 481px) and (max-width: 640px) {
          .mood-grid {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 10px !important;
            max-width: 100% !important;
          }
          .mood-picker-grid {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 8px !important;
          }
          .movie-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 12px !important;
          }
        }

        /* ── Tablet: 641px – 900px ── */
        @media (min-width: 641px) and (max-width: 900px) {
          .mood-grid {
            grid-template-columns: repeat(4, 1fr) !important;
            max-width: 100% !important;
          }
          .mood-picker-grid {
            grid-template-columns: repeat(4, 1fr) !important;
          }
          .movie-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}

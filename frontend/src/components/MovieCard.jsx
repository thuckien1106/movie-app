import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { addMovie } from "../api/movieApi";
import { useToast } from "../components/ToastContext";
import { useWatchlist } from "../context/WatchlistContext";

/* ══════════════════════════════════════════════
   GENRE COLOR MAP  — each genre has its own palette
══════════════════════════════════════════════ */
const GENRE_DATA = {
  28: {
    label: "Hành động",
    bg: "rgba(239,68,68,0.18)",
    border: "rgba(239,68,68,0.38)",
    color: "#fca5a5",
  },
  12: {
    label: "Phiêu lưu",
    bg: "rgba(249,115,22,0.18)",
    border: "rgba(249,115,22,0.38)",
    color: "#fdba74",
  },
  16: {
    label: "Hoạt hình",
    bg: "rgba(234,179,8,0.18)",
    border: "rgba(234,179,8,0.38)",
    color: "#fde047",
  },
  35: {
    label: "Hài",
    bg: "rgba(251,191,36,0.18)",
    border: "rgba(251,191,36,0.38)",
    color: "#fcd34d",
  },
  80: {
    label: "Tội phạm",
    bg: "rgba(99,102,241,0.18)",
    border: "rgba(99,102,241,0.38)",
    color: "#a5b4fc",
  },
  99: {
    label: "Tài liệu",
    bg: "rgba(14,165,233,0.18)",
    border: "rgba(14,165,233,0.38)",
    color: "#7dd3fc",
  },
  18: {
    label: "Chính kịch",
    bg: "rgba(168,85,247,0.18)",
    border: "rgba(168,85,247,0.38)",
    color: "#d8b4fe",
  },
  10751: {
    label: "Gia đình",
    bg: "rgba(34,197,94,0.18)",
    border: "rgba(34,197,94,0.38)",
    color: "#86efac",
  },
  14: {
    label: "Kỳ ảo",
    bg: "rgba(139,92,246,0.18)",
    border: "rgba(139,92,246,0.38)",
    color: "#c4b5fd",
  },
  36: {
    label: "Lịch sử",
    bg: "rgba(180,83,9,0.18)",
    border: "rgba(180,83,9,0.38)",
    color: "#fdba74",
  },
  27: {
    label: "Kinh dị",
    bg: "rgba(15,23,42,0.55)",
    border: "rgba(148,163,184,0.22)",
    color: "#94a3b8",
  },
  10402: {
    label: "Âm nhạc",
    bg: "rgba(236,72,153,0.18)",
    border: "rgba(236,72,153,0.38)",
    color: "#f9a8d4",
  },
  9648: {
    label: "Bí ẩn",
    bg: "rgba(71,85,105,0.28)",
    border: "rgba(148,163,184,0.28)",
    color: "#94a3b8",
  },
  10749: {
    label: "Lãng mạn",
    bg: "rgba(244,63,94,0.18)",
    border: "rgba(244,63,94,0.38)",
    color: "#fda4af",
  },
  878: {
    label: "Sci-Fi",
    bg: "rgba(6,182,212,0.18)",
    border: "rgba(6,182,212,0.38)",
    color: "#67e8f9",
  },
  53: {
    label: "Giật gân",
    bg: "rgba(234,179,8,0.18)",
    border: "rgba(234,179,8,0.38)",
    color: "#fde047",
  },
  10752: {
    label: "Chiến tranh",
    bg: "rgba(120,53,15,0.22)",
    border: "rgba(180,83,9,0.32)",
    color: "#d97706",
  },
  37: {
    label: "Cao bồi",
    bg: "rgba(120,53,15,0.22)",
    border: "rgba(180,83,9,0.32)",
    color: "#fbbf24",
  },
};

/* ══════════════════════════════════════════════
   RATING RING  — bigger, more polished
══════════════════════════════════════════════ */
const R = 17; // circle radius
const SW = 3; // stroke width
const C = R + SW + 1; // center = radius + stroke + padding
const CIRCUMFERENCE = 2 * Math.PI * R;

function scoreColor(n) {
  if (n >= 7.5) return { stroke: "#22c55e", glow: "rgba(34,197,94,0.5)" };
  if (n >= 6.0) return { stroke: "#eab308", glow: "rgba(234,179,8,0.5)" };
  if (n >= 4.0) return { stroke: "#f97316", glow: "rgba(249,115,22,0.45)" };
  return { stroke: "#ef4444", glow: "rgba(239,68,68,0.5)" };
}

function RatingRing({ rating, size = 42 }) {
  const num = Number(rating) || 0;
  const pct = Math.min(num / 10, 1);
  const arc = pct * CIRCUMFERENCE;
  const { stroke, glow } = scoreColor(num);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${C * 2} ${C * 2}`}
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <filter
          id={`glow-${Math.round(num * 10)}`}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Backdrop circle */}
      <circle
        cx={C}
        cy={C}
        r={R}
        fill="rgba(0,0,0,0.72)"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={SW}
      />

      {/* Score arc */}
      {num > 0 && (
        <circle
          cx={C}
          cy={C}
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth={SW}
          strokeDasharray={`${arc} ${CIRCUMFERENCE}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${C} ${C})`}
          style={{ filter: `drop-shadow(0 0 4px ${glow})` }}
        />
      )}

      {/* Score text */}
      <text
        x={C}
        y={C + 0.5}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={num > 0 ? stroke : "rgba(255,255,255,0.35)"}
        fontSize="8.5"
        fontWeight="800"
        fontFamily="'DM Sans', system-ui, sans-serif"
        letterSpacing="-0.02em"
      >
        {num > 0 ? num.toFixed(1) : "—"}
      </text>
    </svg>
  );
}

/* ══════════════════════════════════════════════
   SVG ICONS
══════════════════════════════════════════════ */
function IconPlay() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  );
}
function IconPlus({ saved }) {
  if (saved)
    return (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconArrow() {
  return (
    <svg
      width="11"
      height="11"
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
  );
}

/* ══════════════════════════════════════════════
   MOVIE CARD
══════════════════════════════════════════════ */
function MovieCard({ movie, onPlay }) {
  const [hover, setHover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const showToast = useToast();
  const navigate = useNavigate();

  // ── Trạng thái saved lấy từ context — đồng bộ toàn app ──
  const { savedIds, addToSaved } = useWatchlist();
  const saved = savedIds.has(movie.id);

  const year = movie.release_date?.slice(0, 4) ?? null;
  const genres = (movie.genre_ids ?? [])
    .slice(0, 2)
    .map((id) => GENRE_DATA[id])
    .filter(Boolean);

  /* ── handlers ── */
  const handleAdd = useCallback(
    async (e) => {
      e.stopPropagation();
      if (saving || saved) return;
      setSaving(true);
      try {
        await addMovie({
          movie_id: movie.id,
          title: movie.title,
          poster: movie.poster,
          // genre_ids có ở list API — lưu để thống kê thể loại
          genre_ids:
            Array.isArray(movie.genre_ids) && movie.genre_ids.length
              ? movie.genre_ids.map(String).join(",")
              : typeof movie.genre_ids === "string" && movie.genre_ids
                ? movie.genre_ids
                : null,
          // runtime KHÔNG có ở list API — BE sẽ tự cập nhật khi user
          // vào trang chi tiết phim và bấm "My List" lần đầu
        });
        addToSaved(movie.id); // cập nhật context ngay
        showToast(`"${movie.title}" đã thêm vào Watchlist!`, "success");
      } catch {
        showToast("Thêm thất bại, thử lại nhé.", "error");
      } finally {
        setSaving(false);
      }
    },
    [saving, saved, movie, showToast, addToSaved],
  );

  const handlePlay = useCallback(
    (e) => {
      e.stopPropagation();
      onPlay?.(movie);
    },
    [onPlay, movie],
  );
  const handleDetail = useCallback(
    () => navigate(`/movie/${movie.id}`),
    [navigate, movie.id],
  );

  /* ── poster fallback ── */
  const posterSrc =
    !imgErr && movie.poster
      ? movie.poster
      : `https://placehold.co/300x450/0e1218/1e2a3a?text=${encodeURIComponent(movie.title?.[0] ?? "?")}`;

  return (
    <div
      onClick={handleDetail}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        cursor: "pointer",
        borderRadius: "var(--radius-lg, 14px)",
        overflow: "hidden",
        aspectRatio: "2/3",
        background: "var(--bg-card)",
        zIndex: hover ? 10 : 1,
        /* lift + glow */
        transform: hover
          ? "translateY(-8px) scale(1.04)"
          : "translateY(0) scale(1)",
        boxShadow: hover
          ? "0 24px 56px rgba(0,0,0,0.9), 0 0 0 1.5px rgba(229,9,20,0.55), 0 0 28px rgba(229,9,20,0.2)"
          : "var(--shadow-card, 0 4px 20px rgba(0,0,0,0.6))",
        transition:
          "transform 0.32s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.32s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* ── POSTER ── */}
      <img
        src={posterSrc}
        alt={movie.title}
        loading="lazy"
        onError={() => setImgErr(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          transform: hover ? "scale(1.07)" : "scale(1)",
          transition: "transform 0.55s cubic-bezier(0.4,0,0.2,1)",
          willChange: "transform",
        }}
      />

      {/* ── PERMANENT BOTTOM GRADIENT ── */}
      <div style={s.bottomGrad} />

      {/* ── ALWAYS-VISIBLE INFO (title + year) ── */}
      <div style={s.bottomInfo}>
        <p style={s.infoTitle}>{movie.title}</p>
        {year && <span style={s.metaYear}>{year}</span>}
      </div>

      {/* ── RATING RING — top-left ── */}
      <div style={s.ratingWrap}>
        <RatingRing rating={movie.rating} size={40} />
      </div>

      {/* ── SAVED BADGE — top-right ── */}
      {saved && (
        <div style={s.savedBadge}>
          <svg
            width="11"
            height="11"
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

      {/* ── "NEW" BADGE — new releases ── */}
      {year === String(new Date().getFullYear()) && !saved && (
        <div style={s.newBadge}>NEW</div>
      )}

      {/* ══ HOVER OVERLAY ══ */}
      <div
        style={{
          ...s.overlay,
          opacity: hover ? 1 : 0,
          pointerEvents: hover ? "auto" : "none",
        }}
      >
        {/* Dark gradient tint */}
        <div style={s.overlayTint} />

        {/* Content — staggered slide-up */}
        <div style={s.overlayContent}>
          {/* Genre tags row */}
          {genres.length > 0 && (
            <div
              style={{
                ...s.genreRow,
                transform: hover ? "translateY(0)" : "translateY(10px)",
                opacity: hover ? 1 : 0,
                transition:
                  "transform 0.28s cubic-bezier(0.4,0,0.2,1) 0.04s, opacity 0.22s ease 0.04s",
              }}
            >
              {genres.map((g, i) => (
                <span
                  key={i}
                  style={{
                    ...s.genreTag,
                    background: g.bg,
                    border: `1px solid ${g.border}`,
                    color: g.color,
                  }}
                >
                  {g.label}
                </span>
              ))}
            </div>
          )}

          {/* Play trailer button */}
          {onPlay && (
            <button
              onClick={handlePlay}
              style={{
                ...s.btnPlay,
                transform: hover ? "translateY(0)" : "translateY(12px)",
                opacity: hover ? 1 : 0,
                transition:
                  "transform 0.28s cubic-bezier(0.4,0,0.2,1) 0.08s, opacity 0.22s ease 0.08s, background 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--red-hover, #ff1a1a)";
                e.currentTarget.style.boxShadow = "0 0 18px rgba(229,9,20,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--red)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <IconPlay />
              <span>Xem Trailer</span>
            </button>
          )}

          {/* Add to watchlist button */}
          <button
            onClick={handleAdd}
            disabled={saving || saved}
            style={{
              ...s.btnSave,
              ...(saved ? s.btnSaved : {}),
              opacity: (hover ? 1 : 0) * (saving ? 0.65 : 1),
              transform: hover ? "translateY(0)" : "translateY(14px)",
              transition:
                "transform 0.28s cubic-bezier(0.4,0,0.2,1) 0.12s, opacity 0.22s ease 0.12s, background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!saved)
                e.currentTarget.style.background = "rgba(255,255,255,0.18)";
            }}
            onMouseLeave={(e) => {
              if (!saved)
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            }}
          >
            <IconPlus saved={saved} />
            <span>{saved ? "Đã lưu" : saving ? "Đang lưu…" : "My List"}</span>
          </button>

          {/* Detail hint */}
          <div
            style={{
              ...s.detailHint,
              transform: hover ? "translateY(0)" : "translateY(8px)",
              opacity: hover ? 0.6 : 0,
              transition:
                "transform 0.28s cubic-bezier(0.4,0,0.2,1) 0.16s, opacity 0.22s ease 0.16s",
            }}
          >
            <span>Chi tiết</span>
            <IconArrow />
          </div>
        </div>
      </div>

      {/* Red edge glow on hover — separate div outside overflow:hidden context */}
      <div
        style={{
          ...s.edgeGlow,
          opacity: hover ? 1 : 0,
          transition: "opacity 0.32s ease",
        }}
      />

      <style>{cardCSS}</style>
    </div>
  );
}

/* ── Styles ─────────────────────────────────── */
const s = {
  /* bottom permanent gradient */
  bottomGrad: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 38%, transparent 62%)",
    pointerEvents: "none",
    zIndex: 1,
  },

  /* title + year always visible */
  bottomInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "0 10px 10px",
    pointerEvents: "none",
    zIndex: 2,
  },
  infoTitle: {
    margin: 0,
    fontSize: 12,
    fontWeight: 700,
    color: "#fff",
    lineHeight: 1.3,
    letterSpacing: "0.01em",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    textShadow: "0 1px 6px rgba(0,0,0,0.6)",
    marginBottom: 3,
  },
  metaYear: {
    fontSize: 10,
    fontWeight: 500,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: "0.04em",
  },

  /* rating ring */
  ratingWrap: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 3,
    pointerEvents: "none",
  },

  /* saved badge */
  savedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 3,
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "var(--green)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 10px rgba(34,197,94,0.5)",
  },

  /* "NEW" badge */
  newBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 3,
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: "0.14em",
    background: "var(--gold, #f5c518)",
    color: "#000",
    padding: "2px 6px",
    borderRadius: "4px",
    textTransform: "uppercase",
  },

  /* overlay shell */
  overlay: {
    position: "absolute",
    inset: 0,
    borderRadius: "inherit",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    zIndex: 4,
    transition: "opacity 0.22s ease",
  },
  overlayTint: {
    position: "absolute",
    inset: 0,
    borderRadius: "inherit",
    background:
      "linear-gradient(to top, rgba(4,6,12,0.96) 0%, rgba(4,6,12,0.65) 45%, rgba(4,6,12,0.15) 72%, transparent 100%)",
    backdropFilter: "blur(1px)",
  },

  /* overlay content */
  overlayContent: {
    position: "relative",
    zIndex: 1,
    padding: "10px 9px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },

  /* genre row */
  genreRow: {
    display: "flex",
    gap: 5,
    flexWrap: "wrap",
  },
  genreTag: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.07em",
    borderRadius: "var(--radius-sm, 5px)",
    padding: "2px 7px",
    whiteSpace: "nowrap",
    textTransform: "uppercase",
    backdropFilter: "blur(4px)",
  },

  /* buttons */
  btnPlay: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    padding: "8px 0",
    background: "var(--red)",
    border: "none",
    borderRadius: "var(--radius-sm, 6px)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    cursor: "pointer",
    fontFamily: "var(--font-body, sans-serif)",
  },
  btnSave: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    padding: "7px 0",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: "var(--radius-sm, 6px)",
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "var(--font-body, sans-serif)",
  },
  btnSaved: {
    background: "rgba(34,197,94,0.18)",
    borderColor: "rgba(34,197,94,0.45)",
    color: "var(--green, #22c55e)",
    cursor: "default",
  },

  /* detail hint */
  detailHint: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: "0.04em",
    fontWeight: 500,
  },

  /* red edge glow — pseudo-border effect */
  edgeGlow: {
    position: "absolute",
    inset: -1,
    borderRadius: "calc(var(--radius-lg, 14px) + 1px)",
    boxShadow:
      "inset 0 0 0 1.5px rgba(229,9,20,0.7), 0 0 30px rgba(229,9,20,0.22)",
    pointerEvents: "none",
    zIndex: 5,
  },
};

const cardCSS = `
  @keyframes cardShimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

export default MovieCard;

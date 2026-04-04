import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { addMovie } from "../api/movieApi";
import { useToast } from "../components/ToastContext";

/* ── rating ring helpers ──────────────────── */
const RING_R = 14;
const RING_C = RING_R + 3; // cx/cy = r + strokeWidth/2
const RING_LEN = 2 * Math.PI * RING_R; // circumference ≈ 87.96

function ratingColor(pct) {
  if (pct >= 70) return "var(--green)";
  if (pct >= 50) return "#f1c40f";
  return "#e74c3c";
}

function RatingRing({ rating }) {
  const num = rating ? Number(rating) : 0;
  const pct = (num / 10) * 100;
  const arc = (pct / 100) * RING_LEN;
  const col = ratingColor(pct);

  return (
    <svg
      width={RING_C * 2}
      height={RING_C * 2}
      viewBox={`0 0 ${RING_C * 2} ${RING_C * 2}`}
      style={{
        display: "block",
        filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.6))",
      }}
    >
      {/* track */}
      <circle
        cx={RING_C}
        cy={RING_C}
        r={RING_R}
        fill="rgba(0,0,0,0.7)"
        stroke="var(--border-mid)"
        strokeWidth="2.5"
      />
      {/* arc */}
      <circle
        cx={RING_C}
        cy={RING_C}
        r={RING_R}
        fill="none"
        stroke={col}
        strokeWidth="2.5"
        strokeDasharray={`${arc} ${RING_LEN}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${RING_C} ${RING_C})`}
      />
      {/* number */}
      <text
        x={RING_C}
        y={RING_C + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--text-primary)"
        fontSize="7.5"
        fontWeight="700"
        fontFamily="sans-serif"
      >
        {num > 0 ? num.toFixed(1) : "—"}
      </text>
    </svg>
  );
}

/* ══════════════════════════════════════════
   MOVIE CARD
══════════════════════════════════════════ */
function MovieCard({ movie, onPlay }) {
  const [hover, setHover] = useState(false);
  const [saved, setSaved] = useState(false); // optimistic "added" state
  const [saving, setSaving] = useState(false);
  const showToast = useToast();
  const navigate = useNavigate();

  const year = movie.release_date ? movie.release_date.slice(0, 4) : null;

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
        });
        setSaved(true);
        showToast(`"${movie.title}" đã thêm vào Watchlist!`, "success");
      } catch {
        showToast("Thêm thất bại, thử lại nhé.", "error");
      } finally {
        setSaving(false);
      }
    },
    [saving, saved, movie, showToast],
  );

  const handlePlay = useCallback(
    (e) => {
      e.stopPropagation();
      if (onPlay) onPlay(movie);
    },
    [onPlay, movie],
  );

  const handleDetail = useCallback(() => {
    navigate(`/movie/${movie.id}`);
  }, [navigate, movie.id]);

  return (
    <div
      onClick={handleDetail}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        cursor: "pointer",
        borderRadius: 10,
        overflow: "hidden",
        /* lift + scale on hover */
        transform: hover
          ? "translateY(-6px) scale(1.03)"
          : "translateY(0) scale(1)",
        transition:
          "transform 0.28s cubic-bezier(.25,.46,.45,.94), box-shadow 0.28s",
        boxShadow: hover
          ? "0 20px 50px rgba(0,0,0,0.85)"
          : "0 6px 20px rgba(0,0,0,0.55)",
        zIndex: hover ? 10 : 1,
        aspectRatio: "2/3" /* poster ratio, no fixed width */,
        background: "var(--bg-card)",
      }}
    >
      {/* ── POSTER ── */}
      <img
        src={
          movie.poster ||
          `https://placehold.co/300x450/1a1a1a/555?text=${encodeURIComponent(movie.title?.[0] ?? "?")}`
        }
        alt={movie.title}
        loading="lazy"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />

      {/* ── ALWAYS-VISIBLE BOTTOM GRADIENT + INFO ── */}
      <div style={s.bottomGrad} />
      <div style={s.bottomInfo}>
        <p style={s.infoTitle}>{movie.title}</p>
        <div style={s.infoMeta}>
          {year && <span style={s.metaYear}>{year}</span>}
        </div>
      </div>

      {/* ── RATING RING (top-left, always visible) ── */}
      <div style={s.ratingWrap}>
        <RatingRing rating={movie.rating} />
      </div>

      {/* ── "SAVED" BADGE top-right ── */}
      {saved && <div style={s.savedBadge}>✓</div>}

      {/* ── HOVER OVERLAY ── */}
      <div
        style={{
          ...s.overlay,
          opacity: hover ? 1 : 0,
          pointerEvents: hover ? "auto" : "none",
        }}
      >
        {/* blurred dark tint over middle portion */}
        <div style={s.overlayTint} />

        {/* content */}
        <div style={s.overlayContent}>
          {/* genre tags */}
          {movie.genre_ids?.length > 0 && (
            <div style={s.genreRow}>
              {movie.genre_ids.slice(0, 2).map((id) => (
                <span key={id} style={s.genreTag}>
                  {GENRE_SHORT[id] ?? id}
                </span>
              ))}
            </div>
          )}

          {/* action buttons */}
          <div style={s.btnStack}>
            {/* Trailer */}
            {onPlay && (
              <button
                onClick={handlePlay}
                style={s.btnPlay}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--red)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "var(--red)")
                }
              >
                <span style={s.btnIcon}>▶</span>
                <span>Xem Trailer</span>
              </button>
            )}

            {/* Add to Watchlist */}
            <button
              onClick={handleAdd}
              disabled={saving || saved}
              style={{
                ...s.btnSave,
                ...(saved ? s.btnSaved : {}),
                opacity: saving ? 0.65 : 1,
              }}
              onMouseEnter={(e) => {
                if (!saved)
                  e.currentTarget.style.background = "rgba(255,255,255,0.22)";
              }}
              onMouseLeave={(e) => {
                if (!saved)
                  e.currentTarget.style.background = "var(--border-mid)";
              }}
            >
              <span style={s.btnIcon}>{saved ? "✓" : saving ? "…" : "+"}</span>
              <span>
                {saved ? "Đã lưu" : saving ? "Đang lưu..." : "My List"}
              </span>
            </button>

            {/* Quick-view detail hint */}
            <div style={s.detailHint}>Nhấn để xem chi tiết →</div>
          </div>
        </div>
      </div>

      <style>{cardCSS}</style>
    </div>
  );
}

/* ── compact genre name map ─────────────── */
const GENRE_SHORT = {
  28: "Hành động",
  12: "Phiêu lưu",
  16: "Hoạt hình",
  35: "Hài",
  80: "Tội phạm",
  99: "Tài liệu",
  18: "Chính kịch",
  10751: "Gia đình",
  14: "Kỳ ảo",
  36: "Lịch sử",
  27: "Kinh dị",
  10402: "Âm nhạc",
  9648: "Bí ẩn",
  10749: "Lãng mạn",
  878: "Sci-Fi",
  53: "Giật gân",
  10752: "Chiến tranh",
  37: "Cao bồi",
};

/* ── styles ─────────────────────────────── */
const s = {
  /* always-on bottom strip */
  bottomGrad: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.3) 42%, transparent 68%)",
    pointerEvents: "none",
  },
  bottomInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "0 10px 10px",
    pointerEvents: "none",
  },
  infoTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 700,
    color: "var(--text-primary)",
    lineHeight: 1.25,
    letterSpacing: "0.01em",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  infoMeta: { display: "flex", gap: 6, alignItems: "center", marginTop: 3 },
  metaYear: { fontSize: 11, color: "var(--text-muted)" },

  /* rating ring */
  ratingWrap: {
    position: "absolute",
    top: 8,
    left: 8,
    pointerEvents: "none",
  },

  /* saved badge */
  savedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    background: "var(--green)",
    color: "var(--text-primary)",
    borderRadius: "50%",
    width: 22,
    height: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
  },

  /* hover overlay */
  overlay: {
    position: "absolute",
    inset: 0,
    borderRadius: 10,
    transition: "opacity 0.22s ease",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
  },
  overlayTint: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.1) 100%)",
    backdropFilter: "blur(1.5px)",
    borderRadius: 10,
  },
  overlayContent: {
    position: "relative",
    zIndex: 1,
    padding: "12px 10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  /* genre row */
  genreRow: { display: "flex", gap: 5, flexWrap: "wrap" },
  genreTag: {
    fontSize: 10,
    fontWeight: 600,
    background: "rgba(255,255,255,0.13)",
    border: "1px solid var(--border-bright)",
    borderRadius: 4,
    padding: "2px 6px",
    color: "var(--text-secondary)",
    whiteSpace: "nowrap",
  },

  /* button stack */
  btnStack: { display: "flex", flexDirection: "column", gap: 6 },

  btnPlay: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    background: "var(--red)",
    border: "none",
    color: "var(--text-primary)",
    borderRadius: 7,
    padding: "8px 0",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    transition: "background 0.15s",
    letterSpacing: "0.02em",
  },
  btnSave: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    background: "var(--border-mid)",
    border: "1px solid var(--border-bright)",
    color: "var(--text-primary)",
    borderRadius: 7,
    padding: "7px 0",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
    transition: "background 0.15s",
  },
  btnSaved: {
    background: "rgba(46,204,113,0.2)",
    borderColor: "rgba(46,204,113,0.5)",
    color: "var(--green)",
    cursor: "default",
  },
  btnIcon: { fontSize: 13, lineHeight: 1, flexShrink: 0 },

  detailHint: {
    textAlign: "center",
    fontSize: 10,
    color: "var(--text-faint)",
    letterSpacing: "0.03em",
    marginTop: 2,
  },
};

const cardCSS = `
  @keyframes loading {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

export default MovieCard;

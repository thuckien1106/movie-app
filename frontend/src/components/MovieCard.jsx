import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { addMovie } from "../api/movieApi";
import { useToast } from "../components/ToastContext";
import { useWatchlist } from "../context/WatchlistContext";

/* ── GENRE MAP ── */
const GENRE_DATA = {
  28: {
    label: "Hành động",
    bg: "rgba(239,68,68,0.2)",
    border: "rgba(239,68,68,0.4)",
    color: "#fca5a5",
  },
  12: {
    label: "Phiêu lưu",
    bg: "rgba(249,115,22,0.2)",
    border: "rgba(249,115,22,0.4)",
    color: "#fdba74",
  },
  16: {
    label: "Hoạt hình",
    bg: "rgba(234,179,8,0.2)",
    border: "rgba(234,179,8,0.4)",
    color: "#fde047",
  },
  35: {
    label: "Hài",
    bg: "rgba(251,191,36,0.2)",
    border: "rgba(251,191,36,0.4)",
    color: "#fcd34d",
  },
  80: {
    label: "Tội phạm",
    bg: "rgba(99,102,241,0.2)",
    border: "rgba(99,102,241,0.4)",
    color: "#a5b4fc",
  },
  99: {
    label: "Tài liệu",
    bg: "rgba(14,165,233,0.2)",
    border: "rgba(14,165,233,0.4)",
    color: "#7dd3fc",
  },
  18: {
    label: "Chính kịch",
    bg: "rgba(168,85,247,0.2)",
    border: "rgba(168,85,247,0.4)",
    color: "#d8b4fe",
  },
  10751: {
    label: "Gia đình",
    bg: "rgba(34,197,94,0.2)",
    border: "rgba(34,197,94,0.4)",
    color: "#86efac",
  },
  14: {
    label: "Kỳ ảo",
    bg: "rgba(139,92,246,0.2)",
    border: "rgba(139,92,246,0.4)",
    color: "#c4b5fd",
  },
  36: {
    label: "Lịch sử",
    bg: "rgba(180,83,9,0.2)",
    border: "rgba(180,83,9,0.4)",
    color: "#fdba74",
  },
  27: {
    label: "Kinh dị",
    bg: "rgba(15,23,42,0.6)",
    border: "rgba(148,163,184,0.25)",
    color: "#94a3b8",
  },
  10402: {
    label: "Âm nhạc",
    bg: "rgba(236,72,153,0.2)",
    border: "rgba(236,72,153,0.4)",
    color: "#f9a8d4",
  },
  9648: {
    label: "Bí ẩn",
    bg: "rgba(71,85,105,0.3)",
    border: "rgba(148,163,184,0.3)",
    color: "#94a3b8",
  },
  10749: {
    label: "Lãng mạn",
    bg: "rgba(244,63,94,0.2)",
    border: "rgba(244,63,94,0.4)",
    color: "#fda4af",
  },
  878: {
    label: "Sci-Fi",
    bg: "rgba(6,182,212,0.2)",
    border: "rgba(6,182,212,0.4)",
    color: "#67e8f9",
  },
  53: {
    label: "Giật gân",
    bg: "rgba(234,179,8,0.2)",
    border: "rgba(234,179,8,0.4)",
    color: "#fde047",
  },
  10752: {
    label: "Chiến tranh",
    bg: "rgba(120,53,15,0.25)",
    border: "rgba(180,83,9,0.35)",
    color: "#d97706",
  },
  37: {
    label: "Cao bồi",
    bg: "rgba(120,53,15,0.25)",
    border: "rgba(180,83,9,0.35)",
    color: "#fbbf24",
  },
};

/* ── RATING RING ── */
const R = 18,
  SW = 3,
  C = R + SW + 1;
const CIRCUMFERENCE = 2 * Math.PI * R;

function scoreColor(n) {
  if (n >= 7.5)
    return { stroke: "#22c55e", text: "#4ade80", glow: "rgba(34,197,94,0.5)" };
  if (n >= 6.0)
    return { stroke: "#eab308", text: "#fde047", glow: "rgba(234,179,8,0.5)" };
  if (n >= 4.0)
    return {
      stroke: "#f97316",
      text: "#fb923c",
      glow: "rgba(249,115,22,0.45)",
    };
  return { stroke: "#ef4444", text: "#f87171", glow: "rgba(239,68,68,0.5)" };
}

function RatingRing({ rating, size = 44 }) {
  const num = Number(rating) || 0;
  const pct = Math.min(num / 10, 1);
  const arc = pct * CIRCUMFERENCE;
  const { stroke, text, glow } = scoreColor(num);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${C * 2} ${C * 2}`}
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <filter
          id={`ring-glow-${Math.round(num * 10)}`}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* bg track */}
      <circle
        cx={C}
        cy={C}
        r={R}
        fill="rgba(0,0,0,0.7)"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={SW}
      />
      {/* progress arc */}
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
          style={{ filter: `drop-shadow(0 0 3px ${glow})` }}
        />
      )}
      {/* score text */}
      <text
        x={C}
        y={C + 0.5}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={num > 0 ? text : "rgba(255,255,255,0.3)"}
        fontSize="9"
        fontWeight="800"
        fontFamily="'DM Sans', system-ui, sans-serif"
        letterSpacing="-0.02em"
      >
        {num > 0 ? num.toFixed(1) : "—"}
      </text>
    </svg>
  );
}

/* ── ICONS ── */
function IconPlay() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg
      width="12"
      height="12"
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
}
function IconPlus() {
  return (
    <svg
      width="12"
      height="12"
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
      width="12"
      height="12"
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

/* ════════════════════════════════════════════
   MOVIE CARD
════════════════════════════════════════════ */
function MovieCard({ movie, onPlay }) {
  const [hover, setHover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const showToast = useToast();
  const navigate = useNavigate();
  const { savedIds, addToSaved } = useWatchlist();
  const saved = savedIds.has(movie.id);

  const year = movie.release_date?.slice(0, 4) ?? null;
  const isNew = year === String(new Date().getFullYear());
  const genres = (movie.genre_ids ?? [])
    .slice(0, 2)
    .map((id) => GENRE_DATA[id])
    .filter(Boolean);

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
          genre_ids:
            Array.isArray(movie.genre_ids) && movie.genre_ids.length
              ? movie.genre_ids.map(String).join(",")
              : typeof movie.genre_ids === "string" && movie.genre_ids
                ? movie.genre_ids
                : null,
        });
        addToSaved(movie.id);
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
        borderRadius: 14,
        overflow: "hidden",
        aspectRatio: "2/3",
        background: "var(--bg-card)",
        zIndex: hover ? 10 : 1,
        transform: hover
          ? "translateY(-6px) scale(1.03)"
          : "translateY(0) scale(1)",
        boxShadow: hover
          ? "0 28px 60px rgba(0,0,0,0.85), 0 0 0 1px rgba(229,9,20,0.5), 0 0 24px rgba(229,9,20,0.15)"
          : "0 4px 20px rgba(0,0,0,0.55)",
        transition:
          "transform 0.3s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* POSTER */}
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
          transform: hover ? "scale(1.06)" : "scale(1)",
          transition: "transform 0.5s cubic-bezier(0.4,0,0.2,1)",
          willChange: "transform",
        }}
      />

      {/* PERMANENT GRADIENT — bottom info always readable */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 35%, transparent 58%)",
          zIndex: 1,
        }}
      />

      {/* TITLE + YEAR — always visible */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "0 10px 10px",
          pointerEvents: "none",
          zIndex: 2,
          opacity: hover ? 0 : 1,
          transition: "opacity 0.2s ease",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 700,
            color: "#fff",
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textShadow: "0 1px 6px rgba(0,0,0,0.6)",
            marginBottom: 3,
          }}
        >
          {movie.title}
        </p>
        {year && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: "rgba(255,255,255,0.42)",
              letterSpacing: "0.04em",
            }}
          >
            {year}
          </span>
        )}
      </div>

      {/* RATING RING — top left */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 3,
          pointerEvents: "none",
        }}
      >
        <RatingRing rating={movie.rating} size={44} />
      </div>

      {/* TOP RIGHT BADGE */}
      {saved ? (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 3,
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "var(--green, #22c55e)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 12px rgba(34,197,94,0.5)",
          }}
        >
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
      ) : isNew ? (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 3,
            fontSize: 8,
            fontWeight: 800,
            letterSpacing: "0.12em",
            background: "var(--gold, #f5c518)",
            color: "#000",
            padding: "2px 7px",
            borderRadius: 5,
            textTransform: "uppercase",
          }}
        >
          NEW
        </div>
      ) : null}

      {/* ═══ HOVER OVERLAY ═══ */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          zIndex: 4,
          opacity: hover ? 1 : 0,
          pointerEvents: hover ? "auto" : "none",
          transition: "opacity 0.2s ease",
        }}
      >
        {/* Cinematic gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            background:
              "linear-gradient(to top, rgba(2,4,10,0.97) 0%, rgba(2,4,10,0.75) 40%, rgba(2,4,10,0.2) 68%, transparent 100%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: "10px 10px 11px",
            display: "flex",
            flexDirection: "column",
            gap: 7,
          }}
        >
          {/* Title in overlay */}
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.3,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              transform: hover ? "translateY(0)" : "translateY(8px)",
              opacity: hover ? 1 : 0,
              transition: "transform 0.25s ease, opacity 0.2s ease",
            }}
          >
            {movie.title}
          </p>

          {/* Genre tags */}
          {genres.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 4,
                flexWrap: "wrap",
                transform: hover ? "translateY(0)" : "translateY(10px)",
                opacity: hover ? 1 : 0,
                transition:
                  "transform 0.27s cubic-bezier(0.4,0,0.2,1) 0.04s, opacity 0.22s ease 0.04s",
              }}
            >
              {genres.map((g, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    padding: "2px 7px",
                    borderRadius: 5,
                    background: g.bg,
                    border: `1px solid ${g.border}`,
                    color: g.color,
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {g.label}
                </span>
              ))}
              {year && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.38)",
                    alignSelf: "center",
                    marginLeft: 2,
                  }}
                >
                  {year}
                </span>
              )}
            </div>
          )}

          {/* Play Trailer button */}
          {onPlay && (
            <button
              onClick={handlePlay}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                width: "100%",
                padding: "8px 0",
                background: "var(--red, #e50914)",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                cursor: "pointer",
                fontFamily: "var(--font-body, sans-serif)",
                transform: hover ? "translateY(0)" : "translateY(12px)",
                opacity: hover ? 1 : 0,
                transition:
                  "transform 0.27s cubic-bezier(0.4,0,0.2,1) 0.08s, opacity 0.22s ease 0.08s, background 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#ff1a1a";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(229,9,20,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--red, #e50914)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <IconPlay />
              <span>Xem Trailer</span>
            </button>
          )}

          {/* Add to watchlist */}
          <button
            onClick={handleAdd}
            disabled={saving || saved}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              width: "100%",
              padding: "7px 0",
              background: saved
                ? "rgba(34,197,94,0.18)"
                : "rgba(255,255,255,0.08)",
              border: `1px solid ${saved ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.16)"}`,
              borderRadius: 8,
              cursor: saved ? "default" : "pointer",
              color: saved ? "var(--green, #22c55e)" : "rgba(255,255,255,0.85)",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "var(--font-body, sans-serif)",
              transform: hover ? "translateY(0)" : "translateY(14px)",
              opacity: hover ? (saving ? 0.65 : 1) : 0,
              transition:
                "transform 0.27s cubic-bezier(0.4,0,0.2,1) 0.12s, opacity 0.22s ease 0.12s, background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!saved)
                e.currentTarget.style.background = "rgba(255,255,255,0.14)";
            }}
            onMouseLeave={(e) => {
              if (!saved)
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            }}
          >
            {saved ? <IconCheck /> : <IconPlus />}
            <span>{saved ? "Đã lưu" : saving ? "Đang lưu…" : "My List"}</span>
          </button>

          {/* Detail hint */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              fontSize: 10,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.04em",
              fontWeight: 500,
              transform: hover ? "translateY(0)" : "translateY(8px)",
              opacity: hover ? 0.7 : 0,
              transition:
                "transform 0.27s ease 0.15s, opacity 0.22s ease 0.15s",
            }}
          >
            <span>Xem chi tiết</span>
            <IconArrow />
          </div>
        </div>
      </div>

      {/* Red border glow on hover */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 14,
          boxShadow: hover ? "inset 0 0 0 1.5px rgba(229,9,20,0.65)" : "none",
          pointerEvents: "none",
          zIndex: 5,
          transition: "box-shadow 0.3s ease",
        }}
      />

      <style>{cardCSS}</style>
    </div>
  );
}

const cardCSS = `@keyframes cardShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`;

export default MovieCard;

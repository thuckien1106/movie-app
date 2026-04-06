import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getTrendingMovies, addMovie } from "../api/movieApi";
import { useToast } from "./ToastContext";

/* ─── constants ──────────────────────────────── */
const HERO_ROTATE_MS = 8000;

const GENRE_MAP = {
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

/* ─── Score ring SVG ─────────────────────────── */
function ScoreRing({ score }) {
  const n = Number(score) || 0;
  const pct = n / 10;
  const R = 18,
    SW = 3;
  const C = R + SW;
  const len = 2 * Math.PI * R;
  const arc = pct * len;
  const col = n >= 7 ? "#22c55e" : n >= 5 ? "#eab308" : "#ef4444";
  return (
    <svg
      width={C * 2}
      height={C * 2}
      viewBox={`0 0 ${C * 2} ${C * 2}`}
      style={{
        display: "block",
        filter: "drop-shadow(0 1px 6px rgba(0,0,0,0.7))",
      }}
    >
      <circle
        cx={C}
        cy={C}
        r={R}
        fill="rgba(0,0,0,0.55)"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={SW}
      />
      <circle
        cx={C}
        cy={C}
        r={R}
        fill="none"
        stroke={col}
        strokeWidth={SW}
        strokeDasharray={`${arc} ${len}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${C} ${C})`}
      />
      <text
        x={C}
        y={C + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize="9"
        fontWeight="700"
        fontFamily="sans-serif"
      >
        {n > 0 ? n.toFixed(1) : "—"}
      </text>
    </svg>
  );
}

/* ─── Play icon SVG ──────────────────────────── */
function PlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  );
}

/* ─── Info icon SVG ──────────────────────────── */
function InfoIcon({ size = 17 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

/* ─── Plus icon SVG ──────────────────────────── */
function PlusIcon({ size = 17, saved }) {
  if (saved)
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/* ══════════════════════════════════════════════
   HERO SKELETON
══════════════════════════════════════════════ */
export function HeroSkeleton() {
  return (
    <div
      style={{
        height: "min(72vh, 680px)",
        minHeight: 420,
        background: "var(--hero-bg, #05080c)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* shimmer layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 50%, transparent 60%)",
          backgroundSize: "200% 100%",
          animation: "heroShimmer 2s ease-in-out infinite",
        }}
      />
      {/* fake content silhouettes */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: "clamp(24px,5vw,72px)",
          maxWidth: 480,
        }}
      >
        <div
          style={{
            height: 12,
            width: 100,
            borderRadius: 6,
            background: "rgba(255,255,255,0.06)",
            marginBottom: 20,
          }}
        />
        <div
          style={{
            height: 52,
            width: "90%",
            borderRadius: 8,
            background: "rgba(255,255,255,0.07)",
            marginBottom: 10,
          }}
        />
        <div
          style={{
            height: 52,
            width: "60%",
            borderRadius: 8,
            background: "rgba(255,255,255,0.05)",
            marginBottom: 20,
          }}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <div
            style={{
              height: 46,
              width: 140,
              borderRadius: 10,
              background: "rgba(229,9,20,0.18)",
            }}
          />
          <div
            style={{
              height: 46,
              width: 120,
              borderRadius: 10,
              background: "rgba(255,255,255,0.05)",
            }}
          />
        </div>
      </div>
      <style>{`@keyframes heroShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════
   HERO BANNER  (main export)
══════════════════════════════════════════════ */
export default function HeroBanner({ onPlayTrailer }) {
  const [slides, setSlides] = useState([]);
  const [idx, setIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState(null);
  const [transitioning, setTrans] = useState(false);
  const [saved, setSaved] = useState({});
  const [loadingAdd, setLoadingAdd] = useState({});
  const [parallaxY, setParallaxY] = useState(0);
  const [hoverArrow, setHoverArrow] = useState(null); // "prev"|"next"

  const timerRef = useRef(null);
  const heroRef = useRef(null);
  const navigate = useNavigate();
  const showToast = useToast();

  /* ── load trending ── */
  useEffect(() => {
    getTrendingMovies()
      .then((r) => {
        const list = (Array.isArray(r.data) ? r.data : (r.data?.results ?? []))
          .filter((m) => m.backdrop)
          .slice(0, 6);
        setSlides(list);
      })
      .catch(() => {});
  }, []);

  /* ── parallax on scroll ── */
  useEffect(() => {
    const onScroll = () => {
      if (!heroRef.current) return;
      const scrollY = window.scrollY;
      const heroH = heroRef.current.offsetHeight;
      if (scrollY < heroH) setParallaxY(scrollY * 0.38);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── auto-rotate ── */
  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    if (slides.length < 2) return;
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, HERO_ROTATE_MS);
  }, [slides.length]);

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [startTimer]);

  /* ── slide transition ── */
  const goTo = useCallback(
    (next) => {
      if (transitioning || next === idx || slides.length < 2) return;
      setPrevIdx(idx);
      setTrans(true);
      setIdx(next);
      setTimeout(() => {
        setPrevIdx(null);
        setTrans(false);
      }, 700);
      startTimer();
    },
    [transitioning, idx, slides.length, startTimer],
  );

  const handlePrev = () => goTo((idx - 1 + slides.length) % slides.length);
  const handleNext = () => goTo((idx + 1) % slides.length);

  /* ── add to watchlist ── */
  const handleAdd = async (e, movie) => {
    e.stopPropagation();
    if (loadingAdd[movie.id] || saved[movie.id]) return;
    setLoadingAdd((p) => ({ ...p, [movie.id]: true }));
    try {
      await addMovie({
        movie_id: movie.id,
        title: movie.title,
        poster: movie.poster,
      });
      setSaved((p) => ({ ...p, [movie.id]: true }));
      showToast(`"${movie.title}" đã thêm vào Watchlist!`, "success");
    } catch {
      showToast("Thêm thất bại, thử lại nhé.", "error");
    } finally {
      setLoadingAdd((p) => ({ ...p, [movie.id]: false }));
    }
  };

  if (slides.length === 0) return <HeroSkeleton />;

  const film = slides[idx];
  const year = film.release_date?.slice(0, 4) ?? "";
  const score = film.rating ? Number(film.rating) : null;
  const genres =
    film.genre_ids
      ?.slice(0, 3)
      .map((id) => GENRE_MAP[id])
      .filter(Boolean) ?? [];

  return (
    <div ref={heroRef} style={h.root}>
      {/* ══ BACKDROP LAYERS ══ */}
      <div style={h.backdropWrap}>
        {slides.map((m, i) => {
          const isCurrent = i === idx;
          const isPrev = i === prevIdx;
          return (
            <div
              key={m.id}
              style={{
                ...h.backdropSlide,
                opacity: isCurrent ? 1 : isPrev ? 0 : 0,
                zIndex: isCurrent ? 2 : isPrev ? 1 : 0,
                transform: `translateY(${isCurrent ? parallaxY * 0.5 : 0}px) scale(${isCurrent ? 1.04 : 1.0})`,
                transition: isCurrent
                  ? "opacity 0.7s cubic-bezier(0.4,0,0.2,1), transform 0.7s cubic-bezier(0.4,0,0.2,1)"
                  : isPrev
                    ? "opacity 0.7s cubic-bezier(0.4,0,0.2,1)"
                    : "none",
              }}
            >
              <img
                src={m.backdrop}
                alt=""
                style={h.backdropImg}
                loading={i === 0 ? "eager" : "lazy"}
              />
            </div>
          );
        })}

        {/* ── Gradient layers ── */}
        {/* Left: deep ink wash for text legibility */}
        <div style={h.gradLeft} />
        {/* Bottom: bleed into page bg */}
        <div style={h.gradBottom} />
        {/* Top: subtle vignette for navbar */}
        <div style={h.gradTop} />
        {/* Right edge: soft fade */}
        <div style={h.gradRight} />
        {/* Cinematic letterbox tint — very subtle */}
        <div style={h.vignette} />
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <div
        style={{
          ...h.content,
          transform: `translateY(${-parallaxY * 0.15}px)`,
          transition: "transform 0.05s linear",
        }}
      >
        {/* Live badge */}
        <div style={h.liveBadge}>
          <span style={h.liveDot} />
          <span>ĐANG HOT</span>
        </div>

        {/* Title — Bebas Neue display font */}
        <h1 style={h.title}>{film.title}</h1>

        {/* Meta row */}
        <div style={h.metaRow}>
          {score && (
            <div style={h.scoreWrap}>
              <ScoreRing score={score} />
            </div>
          )}
          {year && <span style={h.metaChip}>{year}</span>}
          {film.runtime && (
            <span style={h.metaChip}>
              {Math.floor(film.runtime / 60)}g {film.runtime % 60}p
            </span>
          )}
          {genres.map((g) => (
            <span key={g} style={h.genreChip}>
              {g}
            </span>
          ))}
        </div>

        {/* Overview */}
        {film.overview && <p style={h.overview}>{film.overview}</p>}

        {/* Action buttons */}
        <div style={h.btnRow}>
          {/* Play Trailer */}
          <button
            style={h.btnPlay}
            onClick={() => onPlayTrailer(film)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--red-hover)";
              e.currentTarget.style.boxShadow = "var(--red-glow)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--red)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <PlayIcon size={18} />
            <span>Xem Trailer</span>
          </button>

          {/* Detail */}
          <button
            style={h.btnInfo}
            onClick={() => navigate(`/movie/${film.id}`)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.16)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <InfoIcon size={17} />
            <span>Chi tiết</span>
          </button>

          {/* Add to list */}
          <button
            style={{
              ...h.btnAdd,
              ...(saved[film.id] ? h.btnAddSaved : {}),
              opacity: loadingAdd[film.id] ? 0.6 : 1,
            }}
            onClick={(e) => handleAdd(e, film)}
            disabled={!!saved[film.id]}
            onMouseEnter={(e) => {
              if (!saved[film.id]) {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.45)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!saved[film.id]) {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)";
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
          >
            <PlusIcon size={17} saved={!!saved[film.id]} />
            <span>
              {saved[film.id]
                ? "Đã lưu"
                : loadingAdd[film.id]
                  ? "Đang lưu…"
                  : "My List"}
            </span>
          </button>
        </div>
      </div>

      {/* ══ PREV / NEXT ARROWS ══ */}
      {slides.length > 1 && (
        <>
          <button
            style={{
              ...h.arrow,
              left: "clamp(12px, 2.5vw, 28px)",
              ...(hoverArrow === "prev" ? h.arrowHover : {}),
            }}
            onClick={handlePrev}
            onMouseEnter={() => setHoverArrow("prev")}
            onMouseLeave={() => setHoverArrow(null)}
            aria-label="Previous"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            style={{
              ...h.arrow,
              right: "clamp(12px, 2.5vw, 28px)",
              ...(hoverArrow === "next" ? h.arrowHover : {}),
            }}
            onClick={handleNext}
            onMouseEnter={() => setHoverArrow("next")}
            onMouseLeave={() => setHoverArrow(null)}
            aria-label="Next"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {/* ══ SLIDE COUNTER (top-right) ══ */}
      {slides.length > 1 && (
        <div style={h.slideCounter}>
          <span style={h.slideCountCurrent}>
            {String(idx + 1).padStart(2, "0")}
          </span>
          <span style={h.slideCountSep}>/</span>
          <span style={h.slideCountTotal}>
            {String(slides.length).padStart(2, "0")}
          </span>
        </div>
      )}

      {/* ══ THUMBNAIL STRIP ══ */}
      <div style={h.thumbStrip}>
        {slides.map((m, i) => {
          const isActive = i === idx;
          return (
            <button
              key={m.id}
              onClick={() => goTo(i)}
              style={{
                ...h.thumb,
                ...(isActive ? h.thumbActive : {}),
              }}
            >
              <img
                src={m.poster || m.backdrop}
                alt={m.title}
                style={h.thumbImg}
              />
              {/* active shimmer overlay */}
              {isActive && <div style={h.thumbActiveOverlay} />}
            </button>
          );
        })}
      </div>

      {/* ══ PROGRESS BAR ══ */}
      <div style={h.progressTrack}>
        <div key={`${idx}-progress`} style={h.progressFill} />
      </div>

      {/* ══ DOT INDICATORS (mobile fallback) ══ */}
      {slides.length > 1 && (
        <div style={h.dots}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{ ...h.dot, ...(i === idx ? h.dotActive : {}) }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      <style>{heroCSS}</style>
    </div>
  );
}

/* ── CSS keyframes ───────────────────────────── */
const heroCSS = `
  @keyframes livePulse {
    0%, 100% { opacity: 1;   transform: scale(1);    box-shadow: 0 0 0 0 rgba(229,9,20,0.6); }
    50%       { opacity: 0.7; transform: scale(0.85); box-shadow: 0 0 0 4px rgba(229,9,20,0); }
  }
  @keyframes heroShimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @keyframes progressFill {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }
  @keyframes contentReveal {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

/* ── Styles ──────────────────────────────────── */
const h = {
  /* ── Shell ── */
  root: {
    position: "relative",
    width: "100%",
    height: "min(72vh, 700px)",
    minHeight: 420,
    overflow: "hidden",
    background: "var(--hero-bg, #05080c)",
    contain: "layout style",
  },

  /* ── Backdrop ── */
  backdropWrap: {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
  },
  backdropSlide: {
    position: "absolute",
    inset: 0,
    willChange: "opacity, transform",
    transformOrigin: "center 40%",
  },
  backdropImg: {
    width: "100%",
    height: "110%", // extra height for parallax room
    objectFit: "cover",
    objectPosition: "center 25%",
  },

  /* ── Gradient overlays ── */
  gradLeft: {
    position: "absolute",
    inset: 0,
    zIndex: 3,
    background:
      "linear-gradient(105deg, rgba(5,8,12,0.97) 0%, rgba(5,8,12,0.82) 28%, rgba(5,8,12,0.45) 52%, rgba(5,8,12,0.1) 70%, transparent 100%)",
  },
  gradBottom: {
    position: "absolute",
    inset: 0,
    zIndex: 4,
    background:
      "linear-gradient(to top, var(--bg-page, #080b0f) 0%, rgba(8,11,15,0.75) 22%, rgba(8,11,15,0.25) 42%, transparent 62%)",
  },
  gradTop: {
    position: "absolute",
    inset: 0,
    zIndex: 3,
    background:
      "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 12%, transparent 28%)",
  },
  gradRight: {
    position: "absolute",
    inset: 0,
    zIndex: 3,
    background:
      "linear-gradient(to left, rgba(5,8,12,0.45) 0%, transparent 35%)",
  },
  vignette: {
    position: "absolute",
    inset: 0,
    zIndex: 3,
    background:
      "radial-gradient(ellipse 120% 100% at 70% 50%, transparent 40%, rgba(0,0,0,0.3) 100%)",
  },

  /* ── Content panel ── */
  content: {
    position: "absolute",
    bottom: "clamp(60px, 10vh, 110px)",
    left: "clamp(24px, 5vw, 72px)",
    maxWidth: "min(540px, 52vw)",
    zIndex: 10,
    animation: "contentReveal 0.6s cubic-bezier(0.4,0,0.2,1) both",
  },

  /* Live badge */
  liveBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.18em",
    color: "var(--red-text)",
    marginBottom: 16,
    textTransform: "uppercase",
    background: "rgba(229,9,20,0.12)",
    border: "1px solid rgba(229,9,20,0.28)",
    padding: "4px 12px 4px 8px",
    borderRadius: "999px",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "var(--red)",
    boxShadow: "0 0 8px var(--red)",
    animation: "livePulse 2s ease-in-out infinite",
    flexShrink: 0,
  },

  /* Title */
  title: {
    fontFamily: "var(--font-display, 'Bebas Neue', sans-serif)",
    fontSize: "clamp(38px, 5.5vw, 74px)",
    fontWeight: 400, // Bebas Neue is inherently bold
    lineHeight: 1.0,
    letterSpacing: "0.02em",
    color: "var(--text-primary)",
    margin: "0 0 16px",
    textShadow: "0 2px 24px rgba(0,0,0,0.6)",
  },

  /* Meta row */
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  scoreWrap: { flexShrink: 0 },
  metaChip: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.04em",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: "var(--radius-sm, 6px)",
    padding: "3px 10px",
    color: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(4px)",
  },
  genreChip: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    background: "rgba(229,9,20,0.14)",
    border: "1px solid rgba(229,9,20,0.32)",
    borderRadius: "var(--radius-sm, 6px)",
    padding: "3px 10px",
    color: "#ff8080",
    textTransform: "uppercase",
  },

  /* Overview */
  overview: {
    fontSize: "clamp(13px,1.1vw,15px)",
    lineHeight: 1.7,
    color: "rgba(200,210,240,0.75)",
    margin: "0 0 24px",
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    textShadow: "0 1px 8px rgba(0,0,0,0.5)",
    maxWidth: 500,
  },

  /* Buttons */
  btnRow: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
  btnPlay: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "var(--red)",
    border: "none",
    color: "#fff",
    padding: "12px 26px",
    borderRadius: "var(--radius-md, 10px)",
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: "0.05em",
    cursor: "pointer",
    transition:
      "background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease !important",
  },
  btnInfo: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.22)",
    color: "rgba(255,255,255,0.9)",
    padding: "11px 22px",
    borderRadius: "var(--radius-md, 10px)",
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "0.03em",
    cursor: "pointer",
    backdropFilter: "blur(8px)",
    transition:
      "background 0.18s ease, border-color 0.18s ease, transform 0.18s ease !important",
  },
  btnAdd: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.22)",
    color: "rgba(255,255,255,0.75)",
    padding: "11px 20px",
    borderRadius: "var(--radius-md, 10px)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition:
      "border-color 0.18s ease, transform 0.18s ease, color 0.18s ease !important",
  },
  btnAddSaved: {
    color: "var(--green)",
    borderColor: "rgba(34,197,94,0.4)",
    cursor: "default",
  },

  /* ── Arrows ── */
  arrow: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(0,0,0,0.38)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.85)",
    borderRadius: "50%",
    width: 46,
    height: 46,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 20,
    backdropFilter: "blur(8px)",
    transition:
      "background 0.18s ease, border-color 0.18s ease, transform 0.18s ease !important",
  },
  arrowHover: {
    background: "rgba(229,9,20,0.3)",
    borderColor: "rgba(229,9,20,0.5)",
    transform: "translateY(-50%) scale(1.08)",
  },

  /* ── Slide counter ── */
  slideCounter: {
    position: "absolute",
    top: "clamp(72px, 11vh, 96px)",
    right: "clamp(16px, 3.5vw, 48px)",
    zIndex: 20,
    display: "flex",
    alignItems: "baseline",
    gap: 4,
    fontFamily: "var(--font-display, 'Bebas Neue', sans-serif)",
    letterSpacing: "0.05em",
  },
  slideCountCurrent: {
    fontSize: 32,
    lineHeight: 1,
    color: "var(--text-primary)",
  },
  slideCountSep: {
    fontSize: 16,
    color: "rgba(255,255,255,0.25)",
    margin: "0 2px",
  },
  slideCountTotal: {
    fontSize: 18,
    color: "rgba(255,255,255,0.35)",
  },

  /* ── Thumbnail strip ── */
  thumbStrip: {
    position: "absolute",
    bottom: "clamp(36px, 7vh, 60px)",
    right: "clamp(16px, 3.5vw, 48px)",
    display: "flex",
    gap: 8,
    zIndex: 20,
    // hide on small screens
    "@media (max-width: 640px)": { display: "none" },
  },
  thumb: {
    position: "relative",
    width: 52,
    height: 76,
    borderRadius: "var(--radius-md, 10px)",
    overflow: "hidden",
    cursor: "pointer",
    border: "1.5px solid rgba(255,255,255,0.1)",
    padding: 0,
    background: "transparent",
    opacity: 0.45,
    transform: "scale(1)",
    transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1) !important",
    flexShrink: 0,
  },
  thumbActive: {
    border: "1.5px solid var(--red)",
    opacity: 1,
    transform: "scale(1.1)",
    boxShadow: "0 4px 16px rgba(229,9,20,0.4)",
  },
  thumbImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  thumbActiveOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to top, rgba(229,9,20,0.3) 0%, transparent 60%)",
    pointerEvents: "none",
  },

  /* ── Progress bar ── */
  progressTrack: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    background: "rgba(255,255,255,0.06)",
    zIndex: 20,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(to right, var(--red), #ff4444)",
    transformOrigin: "left center",
    animation: `progressFill ${HERO_ROTATE_MS}ms linear forwards`,
  },

  /* ── Dot indicators (mobile) ── */
  dots: {
    position: "absolute",
    bottom: 14,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: 5,
    zIndex: 20,
    // on desktop, hidden when thumbstrip is visible
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.25)",
    border: "none",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
    transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1) !important",
  },
  dotActive: {
    width: 22,
    borderRadius: "var(--radius-full, 999px)",
    background: "var(--red)",
  },
};

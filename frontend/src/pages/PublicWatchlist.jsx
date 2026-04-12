import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { getPublicWatchlist } from "../api/movieApi";

/* ── Genre name map ─────────────────────────────── */
const GENRE_NAMES = {
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

/* ── Runtime formatter ──────────────────────────── */
function fmtRuntime(mins) {
  if (!mins || mins < 1) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}p`;
  return m === 0 ? `${h}g` : `${h}g ${m}p`;
}

/* ── Animated counter ───────────────────────────── */
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

/* ════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════ */
export default function PublicWatchlist() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCollection, setActiveCollection] = useState(null); // null = all
  const [hoveredMovie, setHoveredMovie] = useState(null);
  const headerRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    getPublicWatchlist(token)
      .then((res) => {
        setData(res.data);
        if (res.data?.collections?.length > 0) {
          setActiveCollection(null); // start with "all"
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (loading) return <LoadingScreen />;
  if (error || !data) return <NotFound />;

  const pct =
    data.total > 0 ? Math.round((data.watched / data.total) * 100) : 0;
  const runtime = fmtRuntime(data.total_runtime_minutes);

  // Decide which movies to show
  const displayMovies =
    activeCollection === null
      ? data.movies
      : (data.collections?.find((c) => (c.id ?? "none") === activeCollection)
          ?.movies ?? []);

  const hasCollections =
    data.collections?.length > 1 ||
    (data.collections?.length === 1 && data.collections[0].id !== null);

  return (
    <div style={s.page}>
      <style>{css}</style>

      {/* ── Sticky top bar ── */}
      <div style={{ ...s.topBar, ...(scrolled ? s.topBarScrolled : {}) }}>
        <Link to="/" style={s.logo}>
          <span style={s.logoIcon}>▶</span> Films
        </Link>
        <span style={s.publicPill}>🔓 Công khai</span>
      </div>

      {/* ── Hero section ── */}
      <section style={s.hero} ref={headerRef}>
        {/* Backdrop blur balls */}
        <div style={s.heroBg1} />
        <div style={s.heroBg2} />

        <div style={s.heroInner}>
          {/* Avatar */}
          <div style={s.avatarWrap}>
            {data.owner_avatar_url ? (
              <img src={data.owner_avatar_url} alt="" style={s.avatarImg} />
            ) : (
              <div style={s.avatarEmoji}>{data.owner_avatar || "🎬"}</div>
            )}
            <div style={s.avatarGlow} />
          </div>

          {/* Name + bio */}
          <h1 style={s.ownerName}>
            {data.owner_username || "Người dùng ẩn danh"}
          </h1>
          {data.owner_bio && <p style={s.ownerBio}>{data.owner_bio}</p>}

          {/* Stat pills */}
          <div style={s.heroStats}>
            <StatPill value={data.total} label="phim" icon="🎬" delay={0} />
            <StatPill
              value={data.watched}
              label="đã xem"
              icon="✓"
              delay={120}
              green
            />
            <StatPill
              value={`${pct}%`}
              label="hoàn thành"
              icon="📊"
              delay={240}
              raw
            />
            {runtime && (
              <StatPill
                value={runtime}
                label="tổng thời lượng"
                icon="⏱"
                delay={360}
                raw
              />
            )}
          </div>

          {/* Progress bar */}
          <div style={s.progressWrap}>
            <div style={s.progressTrack}>
              <div className="progress-fill" style={{ "--pct": `${pct}%` }} />
            </div>
            <span style={s.progressLabel}>{pct}% đã xem</span>
          </div>

          {/* Top genres */}
          {data.top_genres?.length > 0 && (
            <div style={s.genreRow}>
              {data.top_genres.map((g) => (
                <span key={g.genre_id} style={s.genrePill}>
                  {GENRE_NAMES[parseInt(g.genre_id)] || g.genre_name}
                  <span style={s.genreCount}>{g.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Collection tabs ── */}
      {hasCollections && (
        <div style={s.tabsWrap}>
          <div style={s.tabs}>
            <button
              style={{
                ...s.tab,
                ...(activeCollection === null ? s.tabActive : {}),
              }}
              onClick={() => setActiveCollection(null)}
            >
              Tất cả
              <span style={s.tabCount}>{data.total}</span>
            </button>
            {data.collections.map((col) => {
              const key = col.id ?? "none";
              const isActive = activeCollection === key;
              return (
                <button
                  key={key}
                  style={{ ...s.tab, ...(isActive ? s.tabActive : {}) }}
                  onClick={() => setActiveCollection(key)}
                >
                  {col.name}
                  <span style={s.tabCount}>{col.movies.length}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Movie grid ── */}
      <main style={s.main}>
        {displayMovies.length === 0 ? (
          <div style={s.empty}>
            <span style={{ fontSize: 40 }}>🎞</span>
            <p style={s.emptyText}>Chưa có phim nào trong mục này</p>
          </div>
        ) : (
          <div style={s.grid}>
            {displayMovies.map((movie, i) => (
              <MovieCard
                key={movie.id ?? movie.movie_id}
                movie={movie}
                index={i}
                hovered={hoveredMovie === (movie.id ?? movie.movie_id)}
                onHover={setHoveredMovie}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={s.footer}>
        <p style={s.footerText}>
          Tạo watchlist của bạn tại{" "}
          <Link to="/" style={s.footerLink}>
            Films
          </Link>
        </p>
      </footer>
    </div>
  );
}

/* ── StatPill ───────────────────────────────────── */
function StatPill({
  value,
  label,
  icon,
  delay = 0,
  green = false,
  raw = false,
}) {
  const numericVal = typeof value === "number" ? value : null;
  const counted = useCountUp(raw ? 0 : numericVal, 800);
  const display = raw ? value : numericVal !== null ? counted : value;

  return (
    <div
      className="stat-pill"
      style={{
        ...s.statPill,
        animationDelay: `${delay}ms`,
        ...(green ? s.statPillGreen : {}),
      }}
    >
      <span style={s.statIcon}>{icon}</span>
      <span style={s.statValue}>{display}</span>
      <span style={s.statLabel}>{label}</span>
    </div>
  );
}

/* ── MovieCard ──────────────────────────────────── */
function MovieCard({ movie, index, hovered, onHover }) {
  const id = movie.id ?? movie.movie_id;
  return (
    <Link
      to={`/movie/${movie.movie_id}`}
      style={{ textDecoration: "none" }}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
    >
      <div
        className="movie-card"
        style={{
          ...s.card,
          animationDelay: `${Math.min(index * 40, 600)}ms`,
        }}
      >
        {/* Poster */}
        <div style={s.posterWrap}>
          <img
            src={
              movie.poster
                ? movie.poster.startsWith("http")
                  ? movie.poster
                  : `https://image.tmdb.org/t/p/w300${movie.poster}`
                : "https://via.placeholder.com/200x300/111/444?text=?"
            }
            alt={movie.title}
            style={s.poster}
            loading="lazy"
          />

          {/* Watched badge */}
          {movie.is_watched && (
            <div style={s.watchedBadge}>
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
            </div>
          )}

          {/* Hover overlay */}
          <div className="card-overlay" style={s.overlay}>
            <span style={s.overlayText}>Xem chi tiết</span>
          </div>
        </div>

        {/* Info */}
        <div style={s.cardInfo}>
          <p style={s.cardTitle}>{movie.title}</p>
          {movie.note && (
            <p style={s.cardNote}>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ marginRight: 3, flexShrink: 0 }}
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {movie.note}
            </p>
          )}
          {movie.runtime && (
            <p style={s.cardRuntime}>{fmtRuntime(movie.runtime)}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ── Loading ────────────────────────────────────── */
function LoadingScreen() {
  return (
    <div style={s.loadingPage}>
      <style>{css}</style>
      <div className="loading-dots">
        <span />
        <span />
        <span />
      </div>
      <p
        style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 16 }}
      >
        Đang tải...
      </p>
    </div>
  );
}

/* ── Not Found ──────────────────────────────────── */
function NotFound() {
  return (
    <div style={s.loadingPage}>
      <style>{css}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🚫</div>
        <h2
          style={{
            color: "#fff",
            fontSize: 20,
            fontWeight: 600,
            margin: "0 0 8px",
          }}
        >
          Không tìm thấy danh sách
        </h2>
        <p
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 14,
            margin: "0 0 24px",
          }}
        >
          Link có thể đã hết hạn hoặc người dùng đã tắt chia sẻ.
        </p>
        <Link
          to="/"
          style={{
            color: "#e50914",
            fontSize: 14,
            textDecoration: "none",
            border: "1px solid rgba(229,9,20,0.4)",
            borderRadius: 8,
            padding: "8px 20px",
            display: "inline-block",
          }}
        >
          ← Về trang chủ
        </Link>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   STYLES
════════════════════════════════════════════════════ */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

  * { box-sizing: border-box; }

  .progress-fill {
    height: 100%;
    width: var(--pct, 0%);
    background: linear-gradient(90deg, #e50914 0%, #ff6b35 60%, #ffd700 100%);
    border-radius: 4px;
    animation: progressGrow 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  @keyframes progressGrow {
    from { width: 0%; }
    to   { width: var(--pct, 0%); }
  }

  .stat-pill {
    animation: fadeUp 0.5s ease forwards;
    opacity: 0;
    transform: translateY(10px);
  }
  @keyframes fadeUp {
    to { opacity: 1; transform: translateY(0); }
  }

  .movie-card {
    animation: cardIn 0.4s ease forwards;
    opacity: 0;
    transform: translateY(16px);
  }
  @keyframes cardIn {
    to { opacity: 1; transform: translateY(0); }
  }
  .movie-card:hover { transform: translateY(-4px) scale(1.02); transition: transform 0.2s ease; }

  .card-overlay {
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .movie-card:hover .card-overlay { opacity: 1; }

  .loading-dots { display: flex; gap: 8px; }
  .loading-dots span {
    width: 8px; height: 8px; border-radius: 50%;
    background: rgba(229,9,20,0.7);
    animation: dotPulse 1.2s ease-in-out infinite;
  }
  .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
  .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes dotPulse {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40%           { transform: scale(1.2); opacity: 1; }
  }

  /* Tab hover */
  button:hover { opacity: 0.85; }
`;

const s = {
  page: {
    background: "#080808",
    minHeight: "100vh",
    color: "#fff",
    fontFamily: "'DM Sans', sans-serif",
    overflowX: "hidden",
  },
  loadingPage: {
    background: "#080808",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Sans', sans-serif",
  },

  /* Top bar */
  topBar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 28px",
    transition: "background 0.3s, backdrop-filter 0.3s",
  },
  topBarScrolled: {
    background: "rgba(8,8,8,0.9)",
    backdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  logo: {
    color: "#e50914",
    fontSize: 18,
    fontWeight: 700,
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: 6,
    letterSpacing: "0.02em",
    fontFamily: "'DM Serif Display', serif",
  },
  logoIcon: { fontSize: 14 },
  publicPill: {
    fontSize: 11,
    fontWeight: 500,
    padding: "4px 12px",
    borderRadius: 20,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: "0.03em",
  },

  /* Hero */
  hero: {
    position: "relative",
    paddingTop: 100,
    paddingBottom: 64,
    textAlign: "center",
    overflow: "hidden",
  },
  heroBg1: {
    position: "absolute",
    top: -100,
    left: "20%",
    width: 500,
    height: 500,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(229,9,20,0.12) 0%, transparent 70%)",
    pointerEvents: "none",
    filter: "blur(60px)",
  },
  heroBg2: {
    position: "absolute",
    top: 0,
    right: "10%",
    width: 400,
    height: 400,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(255,107,53,0.08) 0%, transparent 70%)",
    pointerEvents: "none",
    filter: "blur(80px)",
  },
  heroInner: {
    position: "relative",
    maxWidth: 700,
    margin: "0 auto",
    padding: "0 24px",
  },

  /* Avatar */
  avatarWrap: {
    position: "relative",
    display: "inline-block",
    marginBottom: 20,
  },
  avatarImg: {
    width: 88,
    height: 88,
    borderRadius: "50%",
    objectFit: "cover",
    border: "3px solid rgba(229,9,20,0.5)",
    display: "block",
  },
  avatarEmoji: {
    width: 88,
    height: 88,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)",
    border: "3px solid rgba(229,9,20,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 38,
    lineHeight: 1,
  },
  avatarGlow: {
    position: "absolute",
    inset: -8,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(229,9,20,0.2) 0%, transparent 70%)",
    pointerEvents: "none",
  },

  /* Owner info */
  ownerName: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: "clamp(26px, 5vw, 40px)",
    fontWeight: 400,
    margin: "0 0 10px",
    letterSpacing: "-0.01em",
    lineHeight: 1.1,
  },
  ownerBio: {
    fontSize: 14,
    color: "rgba(255,255,255,0.45)",
    margin: "0 0 28px",
    lineHeight: 1.6,
    maxWidth: 440,
    marginLeft: "auto",
    marginRight: "auto",
  },

  /* Stats */
  heroStats: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  statPill: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    borderRadius: 100,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.09)",
    cursor: "default",
  },
  statPillGreen: {
    background: "rgba(34,197,94,0.08)",
    border: "1px solid rgba(34,197,94,0.2)",
  },
  statIcon: { fontSize: 14 },
  statValue: { fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 400 },

  /* Progress */
  progressWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    maxWidth: 500,
    margin: "0 auto 20px",
  },
  progressTrack: {
    flex: 1,
    height: 5,
    background: "rgba(255,255,255,0.07)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },

  /* Genres */
  genreRow: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  genrePill: {
    fontSize: 11,
    padding: "4px 10px",
    borderRadius: 20,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.5)",
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
  genreCount: {
    fontSize: 10,
    background: "rgba(229,9,20,0.25)",
    color: "#ff6b6b",
    borderRadius: 10,
    padding: "0px 5px",
    fontWeight: 600,
  },

  /* Collection Tabs */
  tabsWrap: {
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    padding: "0 24px",
    overflowX: "auto",
    scrollbarWidth: "none",
  },
  tabs: {
    display: "flex",
    gap: 4,
    maxWidth: 1100,
    margin: "0 auto",
    padding: "0 0 0 0",
  },
  tab: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    fontWeight: 500,
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: 7,
    borderBottom: "2px solid transparent",
    whiteSpace: "nowrap",
    transition: "color 0.15s, border-color 0.15s",
    fontFamily: "'DM Sans', sans-serif",
  },
  tabActive: {
    color: "#fff",
    borderBottom: "2px solid #e50914",
  },
  tabCount: {
    fontSize: 11,
    background: "rgba(255,255,255,0.08)",
    padding: "1px 7px",
    borderRadius: 10,
  },

  /* Main */
  main: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "36px 24px 60px",
  },

  /* Movie Grid */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
    gap: 18,
  },

  /* Card */
  card: {
    borderRadius: 10,
    overflow: "hidden",
    background: "#111",
    border: "1px solid rgba(255,255,255,0.06)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    cursor: "pointer",
  },
  posterWrap: {
    position: "relative",
    aspectRatio: "2/3",
    overflow: "hidden",
    background: "#1a1a1a",
  },
  poster: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    transition: "transform 0.3s ease",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingBottom: 12,
  },
  overlayText: {
    fontSize: 11,
    fontWeight: 600,
    color: "rgba(255,255,255,0.85)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  watchedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "#22c55e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    zIndex: 2,
    boxShadow: "0 2px 8px rgba(34,197,94,0.5)",
  },
  cardInfo: {
    padding: "10px 12px 12px",
  },
  cardTitle: {
    margin: "0 0 4px",
    fontSize: 12,
    fontWeight: 600,
    color: "#fff",
    lineHeight: 1.35,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  cardNote: {
    margin: "4px 0 0",
    fontSize: 10,
    color: "rgba(255,255,255,0.3)",
    fontStyle: "italic",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "flex",
    alignItems: "center",
  },
  cardRuntime: {
    margin: "3px 0 0",
    fontSize: 10,
    color: "rgba(255,255,255,0.2)",
  },

  /* Empty */
  empty: {
    textAlign: "center",
    padding: "80px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.3)",
    margin: 0,
  },

  /* Footer */
  footer: {
    borderTop: "1px solid rgba(255,255,255,0.05)",
    padding: "24px",
    textAlign: "center",
  },
  footerText: {
    margin: 0,
    fontSize: 12,
    color: "rgba(255,255,255,0.2)",
  },
  footerLink: {
    color: "#e50914",
    textDecoration: "none",
    fontWeight: 500,
  },
};

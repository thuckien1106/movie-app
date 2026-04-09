// src/pages/RecommendationsPage.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastContext";
import { getRecommendations } from "../api/recommendationApi";
import MovieCard from "../components/MovieCard";
import SkeletonCard from "../components/SkeletonCard";
import Navbar from "../components/Navbar";
import TrailerModal from "../components/TrailerModal";

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

const GENRE_COLORS = [
  {
    bg: "rgba(229,9,20,0.15)",
    border: "rgba(229,9,20,0.35)",
    color: "#ff6b6b",
  },
  {
    bg: "rgba(59,130,246,0.15)",
    border: "rgba(59,130,246,0.35)",
    color: "#7dd3fc",
  },
  {
    bg: "rgba(34,197,94,0.15)",
    border: "rgba(34,197,94,0.35)",
    color: "#86efac",
  },
  {
    bg: "rgba(234,179,8,0.15)",
    border: "rgba(234,179,8,0.35)",
    color: "#fde047",
  },
  {
    bg: "rgba(168,85,247,0.15)",
    border: "rgba(168,85,247,0.35)",
    color: "#d8b4fe",
  },
];

/* ── Skeleton loader ────────────────────────────── */
function SkeletonBanner() {
  return (
    <div style={s.heroBanner}>
      <div style={{ ...s.skeletonBlock, height: "100%", borderRadius: 0 }} />
    </div>
  );
}

/* ── Profile chips strip ────────────────────────── */
function ProfileStrip({ profile }) {
  if (!profile) return null;
  const { top_genre_ids = [], total_saved = 0, total_watched = 0 } = profile;

  return (
    <div style={s.profileStrip}>
      <div style={s.profileStats}>
        <div style={s.statPill}>
          <span style={s.statNum}>{total_saved}</span>
          <span style={s.statLabel}>Đã lưu</span>
        </div>
        <div style={s.statDivider} />
        <div style={s.statPill}>
          <span style={s.statNum}>{total_watched}</span>
          <span style={s.statLabel}>Đã xem</span>
        </div>
        <div style={s.statDivider} />
        <div style={s.statPill}>
          <span style={s.statNum}>
            {Math.round((total_watched / (total_saved || 1)) * 100)}%
          </span>
          <span style={s.statLabel}>Hoàn thành</span>
        </div>
      </div>

      {top_genre_ids.length > 0 && (
        <div style={s.genreChips}>
          <span style={s.genreChipsLabel}>Sở thích:</span>
          {top_genre_ids.slice(0, 3).map((gid, i) => {
            const c = GENRE_COLORS[i % GENRE_COLORS.length];
            return (
              <span
                key={gid}
                style={{
                  ...s.genreChip,
                  background: c.bg,
                  borderColor: c.border,
                  color: c.color,
                }}
              >
                {GENRE_NAMES[gid] ?? `#${gid}`}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Empty state ────────────────────────────────── */
function EmptyState({ navigate }) {
  return (
    <div style={s.emptyWrap}>
      <div style={s.emptyIcon}>🎬</div>
      <h2 style={s.emptyTitle}>Watchlist của bạn đang trống</h2>
      <p style={s.emptyDesc}>
        Thêm một vài bộ phim vào watchlist để chúng tôi có thể gợi ý những bộ
        phim phù hợp với sở thích của bạn.
      </p>
      <button onClick={() => navigate("/")} style={s.emptyBtn}>
        Khám phá phim ngay →
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════ */
export default function RecommendationsPage() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();

  const [movies, setMovies] = useState([]);
  const [reason, setReason] = useState("");
  const [profile, setProfile] = useState(null);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [entered, setEntered] = useState(false);

  // redirect nếu chưa login
  useEffect(() => {
    if (!isLoggedIn) navigate("/login");
  }, [isLoggedIn]);

  // page-enter animation
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Tải lần đầu
  useEffect(() => {
    loadPage(1, true);
  }, []);

  const loadPage = useCallback(
    async (pageNum, reset = false) => {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await getRecommendations(pageNum);
        const data = res.data;

        if (reset) {
          setMovies(data.movies || []);
          setReason(data.reason || "");
          setProfile(data.profile || null);
          setIsPersonalized(data.is_personalized ?? false);
        } else {
          setMovies((prev) => {
            // Dedup phía FE
            const existIds = new Set(prev.map((m) => m.id));
            const newMovies = (data.movies || []).filter(
              (m) => !existIds.has(m.id),
            );
            return [...prev, ...newMovies];
          });
        }

        // Nếu trả về ít hơn 20 thì không còn trang nữa
        setHasMore((data.movies || []).length >= 20);
      } catch (err) {
        showToast("Không thể tải gợi ý phim.", "error");
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [showToast],
  );

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    const next = page + 1;
    setPage(next);
    loadPage(next, false);
  };

  const handleRefresh = () => {
    setPage(1);
    setHasMore(true);
    loadPage(1, true);
  };

  if (!isLoggedIn) return null;

  return (
    <div style={s.page}>
      <Navbar />

      {/* ════ HERO BANNER ════ */}
      {loading ? (
        <SkeletonBanner />
      ) : (
        <div
          style={{
            ...s.heroBanner,
            opacity: entered ? 1 : 0,
            transform: entered ? "none" : "translateY(12px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          {/* Background layers */}
          <div style={s.heroBg} />
          <div style={s.heroGlow1} />
          <div style={s.heroGlow2} />
          <div style={s.heroGrid} />

          <div style={s.heroContent}>
            {/* Badge */}
            <div style={s.heroBadge}>
              {isPersonalized ? "✦ Cá nhân hoá cho bạn" : "✦ Phim đang hot"}
            </div>

            <h1 style={s.heroTitle}>Gợi ý dành riêng</h1>

            {reason && <p style={s.heroReason}>{reason}</p>}

            <div style={s.heroActions}>
              <button
                onClick={handleRefresh}
                style={s.refreshBtn}
                disabled={loading}
              >
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
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                Làm mới gợi ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ PROFILE STRIP ════ */}
      {!loading && isPersonalized && profile && (
        <ProfileStrip profile={profile} />
      )}

      {/* ════ CONTENT ════ */}
      <div style={s.content}>
        {loading ? (
          /* Skeleton grid */
          <div style={s.grid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : movies.length === 0 ? (
          <EmptyState navigate={navigate} />
        ) : (
          <>
            {/* Section label */}
            <div style={s.sectionHeader}>
              <div style={s.sectionAccent} />
              <span style={s.sectionTitle}>
                {isPersonalized
                  ? `${movies.length} phim được chọn cho bạn`
                  : `${movies.length} phim đang hot`}
              </span>
            </div>

            {/* Grid */}
            <div style={s.grid}>
              {movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onPlay={(m) => setSelectedMovie(m)}
                />
              ))}
              {loadingMore &&
                Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={`more-${i}`} />
                ))}
            </div>

            {/* Load more */}
            {hasMore && !loadingMore && (
              <div style={s.loadMoreRow}>
                <button onClick={handleLoadMore} style={s.loadMoreBtn}>
                  Xem thêm gợi ý
                </button>
              </div>
            )}
            {!hasMore && movies.length > 0 && (
              <p style={s.endLabel}>— Hết danh sách gợi ý —</p>
            )}
          </>
        )}
      </div>

      {/* Trailer modal */}
      {selectedMovie && (
        <TrailerModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}

      <style>{css}</style>
    </div>
  );
}

/* ── Styles ──────────────────────────────────────── */
const s = {
  page: {
    background: "var(--bg-page)",
    minHeight: "100vh",
    color: "var(--text-primary)",
    paddingTop: 60,
    paddingBottom: 60,
  },

  /* ── Hero banner ── */
  heroBanner: {
    position: "relative",
    height: 220,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
  },
  heroBg: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(135deg, rgba(229,9,20,0.1) 0%, var(--bg-surface,#0e1218) 55%, rgba(59,130,246,0.05) 100%)",
  },
  heroGlow1: {
    position: "absolute",
    top: -80,
    left: -60,
    width: 400,
    height: 400,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(229,9,20,0.12) 0%, transparent 65%)",
    pointerEvents: "none",
  },
  heroGlow2: {
    position: "absolute",
    bottom: -80,
    right: -40,
    width: 350,
    height: 350,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 65%)",
    pointerEvents: "none",
  },
  heroGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)",
    backgroundSize: "60px 60px",
    pointerEvents: "none",
  },
  heroContent: {
    position: "relative",
    zIndex: 2,
    padding: "0 clamp(20px,5vw,60px)",
  },
  heroBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--gold-text, #f5c518)",
    background: "rgba(245,197,24,0.1)",
    border: "1px solid rgba(245,197,24,0.2)",
    borderRadius: 999,
    padding: "3px 10px",
    marginBottom: 12,
  },
  heroTitle: {
    margin: "0 0 8px",
    fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
    fontSize: "clamp(32px,5vw,52px)",
    fontWeight: 400,
    letterSpacing: "0.04em",
    lineHeight: 1,
  },
  heroReason: {
    margin: "0 0 18px",
    fontSize: 14,
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },
  heroActions: { display: "flex", gap: 10 },
  refreshBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 8,
    padding: "8px 16px",
    color: "var(--text-secondary)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s",
  },

  /* ── Profile strip ── */
  profileStrip: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
    padding: "14px clamp(20px,5vw,60px)",
    borderBottom: "1px solid var(--border)",
    background: "rgba(255,255,255,0.02)",
  },
  profileStats: { display: "flex", alignItems: "center", gap: 12 },
  statPill: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 1,
  },
  statNum: {
    fontSize: 18,
    fontWeight: 700,
    color: "var(--text-primary)",
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 10,
    color: "var(--text-faint)",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  statDivider: { width: 1, height: 28, background: "var(--border)" },
  genreChips: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  genreChipsLabel: {
    fontSize: 11,
    color: "var(--text-faint)",
    fontWeight: 600,
    letterSpacing: "0.06em",
  },
  genreChip: {
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: 999,
    border: "1px solid",
    letterSpacing: "0.02em",
  },

  /* ── Content ── */
  content: { padding: "24px clamp(16px,4vw,52px) 0" },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  sectionAccent: {
    width: 3,
    height: 18,
    borderRadius: 999,
    background: "var(--red)",
    boxShadow: "0 0 8px rgba(229,9,20,0.4)",
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-secondary)",
    letterSpacing: "0.02em",
  },

  /* ── Grid ── */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))",
    gap: 18,
    marginBottom: 32,
  },

  /* ── Load more ── */
  loadMoreRow: {
    display: "flex",
    justifyContent: "center",
    padding: "8px 0 32px",
  },
  loadMoreBtn: {
    padding: "10px 32px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid var(--border-mid)",
    borderRadius: 8,
    color: "var(--text-secondary)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s",
  },
  endLabel: {
    textAlign: "center",
    padding: "0 0 40px",
    fontSize: 12,
    color: "rgba(255,255,255,0.2)",
    letterSpacing: "0.08em",
  },

  /* ── Empty state ── */
  emptyWrap: { textAlign: "center", padding: "80px 20px" },
  emptyIcon: { fontSize: 56, marginBottom: 20 },
  emptyTitle: { margin: "0 0 10px", fontSize: 20, fontWeight: 700 },
  emptyDesc: {
    margin: "0 0 28px",
    fontSize: 14,
    color: "var(--text-secondary)",
    lineHeight: 1.7,
    maxWidth: 400,
    marginLeft: "auto",
    marginRight: "auto",
  },
  emptyBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "11px 28px",
    background: "#e50914",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },

  /* ── Skeleton ── */
  skeletonBlock: {
    background:
      "linear-gradient(90deg,var(--bg-card) 25%,var(--bg-card2,#1a2030) 50%,var(--bg-card) 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.6s infinite",
    borderRadius: 10,
  },
};

const css = `
  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  button:hover { opacity: 0.85; }
`;

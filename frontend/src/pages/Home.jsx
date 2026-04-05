import { useEffect, useState, useRef, useCallback } from "react";
import {
  getAllMovies,
  getPopularMovies,
  getTopRatedMovies,
  getUpcomingMovies,
  searchMovies,
  getGenres,
  getTrendingMovies,
  addMovie,
} from "../api/movieApi";
import MovieCard from "../components/MovieCard";
import TrailerModal from "../components/TrailerModal";
import ScrollToTop from "../components/ScrollToTop";
import SkeletonCard from "../components/SkeletonCard";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastContext";
import Navbar from "../components/Navbar";
import RemindButton from "../components/RemindButton";
/* ─── debounce ──────────────────────────────── */
function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

/* ─── constants ─────────────────────────────── */
const TABS = [
  { key: "all", label: "Tất cả", icon: "🎬", supportsFilter: true },
  { key: "popular", label: "Phổ biến", icon: "🔥", supportsFilter: false },
  { key: "top-rated", label: "Top Rated", icon: "⭐", supportsFilter: false },
  { key: "upcoming", label: "Sắp chiếu", icon: "🗓", supportsFilter: false },
  { key: "trending", label: "Trending", icon: "📈", supportsFilter: false },
];
const SORT_OPTIONS = [
  { value: "popularity.desc", label: "Phổ biến nhất" },
  { value: "vote_average.desc", label: "Điểm cao nhất" },
  { value: "release_date.desc", label: "Mới nhất" },
  { value: "release_date.asc", label: "Cũ nhất" },
  { value: "revenue.desc", label: "Doanh thu cao nhất" },
  { value: "vote_count.desc", label: "Nhiều lượt vote nhất" },
];
const RATING_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "9", label: "9+ ⭐" },
  { value: "8", label: "8+ ⭐" },
  { value: "7", label: "7+ ⭐" },
  { value: "6", label: "6+ ⭐" },
  { value: "5", label: "5+ ⭐" },
];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  { value: "", label: "Tất cả năm" },
  ...Array.from({ length: 30 }, (_, i) => {
    const y = CURRENT_YEAR - i;
    return { value: String(y), label: String(y) };
  }),
];
const DEFAULT_FILTERS = {
  year: "",
  min_rating: "",
  sort_by: "popularity.desc",
};

function activeFilterCount(f) {
  return (
    (f.year ? 1 : 0) +
    (f.min_rating ? 1 : 0) +
    (f.sort_by !== "popularity.desc" ? 1 : 0)
  );
}

/* ══════════════════════════════════════════════
   HERO BANNER
══════════════════════════════════════════════ */
const HERO_ROTATE_MS = 8000; // auto-advance every 8 s

function HeroBanner({ onPlayTrailer }) {
  const [slides, setSlides] = useState([]);
  const [idx, setIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [saved, setSaved] = useState({}); // { movieId: true }
  const [loadingAdd, setLoadingAdd] = useState({});
  const timerRef = useRef(null);
  const navigate = useNavigate();
  const showToast = useToast();

  /* load trending once */
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

  /* auto-rotate */
  const goTo = useCallback(
    (next) => {
      if (animating || slides.length < 2) return;
      setAnimating(true);
      setTimeout(() => {
        setIdx(next);
        setAnimating(false);
      }, 350);
    },
    [animating, slides.length],
  );

  useEffect(() => {
    if (slides.length < 2) return;
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, HERO_ROTATE_MS);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  const bump = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, HERO_ROTATE_MS);
  };

  const handlePrev = () => {
    goTo((idx - 1 + slides.length) % slides.length);
    bump();
  };
  const handleNext = () => {
    goTo((idx + 1) % slides.length);
    bump();
  };
  const handleDot = (i) => {
    if (i !== idx) {
      goTo(i);
      bump();
    }
  };

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
  const score = film.rating ? Number(film.rating).toFixed(1) : null;

  return (
    <div style={h.root}>
      {/* ── BACKDROP ── */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {slides.map((m, i) => (
          <div
            key={m.id}
            style={{
              ...h.backdropSlide,
              opacity: i === idx ? (animating ? 0 : 1) : 0,
              transition: animating
                ? "opacity 0.35s ease"
                : "opacity 0.55s ease",
            }}
          >
            <img src={m.backdrop} alt="" style={h.backdropImg} />
          </div>
        ))}
        {/* gradient overlays */}
        <div style={h.gradLeft} />
        <div style={h.gradBottom} />
        <div style={h.gradTop} />
      </div>

      {/* ── CONTENT ── */}
      <div style={h.content}>
        {/* trending badge */}
        <div style={h.badge}>
          <span style={h.badgeDot} />
          ĐANG HOT
        </div>

        {/* title */}
        <h2 style={h.title}>{film.title}</h2>

        {/* meta row */}
        <div style={h.metaRow}>
          {year && <span style={h.metaChip}>{year}</span>}
          {score && (
            <span
              style={{
                ...h.metaChip,
                color:
                  score >= 7 ? "#2ecc71" : score >= 5 ? "#f1c40f" : "#e74c3c",
              }}
            >
              ⭐ {score}
            </span>
          )}
          {film.genre_ids?.slice(0, 2).map((id) => (
            <span key={id} style={h.genreChip}>
              {GENRE_MAP[id] ?? "Phim"}
            </span>
          ))}
        </div>

        {/* overview */}
        {film.overview && <p style={h.overview}>{film.overview}</p>}

        {/* action buttons */}
        <div style={h.btnRow}>
          <button
            onClick={() => onPlayTrailer(film)}
            style={h.btnPlay}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#c0070f")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#e50914")}
          >
            ▶ Xem Trailer
          </button>

          <button
            onClick={() => navigate(`/movie/${film.id}`)}
            style={h.btnInfo}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
            }
          >
            ℹ Chi tiết
          </button>

          <button
            onClick={(e) => handleAdd(e, film)}
            disabled={!!saved[film.id]}
            style={{
              ...h.btnAdd,
              ...(saved[film.id] ? h.btnAddSaved : {}),
              opacity: loadingAdd[film.id] ? 0.65 : 1,
            }}
            onMouseEnter={(e) => {
              if (!saved[film.id])
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
            }}
            onMouseLeave={(e) => {
              if (!saved[film.id])
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
            }}
          >
            {saved[film.id]
              ? "✓ Đã lưu"
              : loadingAdd[film.id]
                ? "..."
                : "+ My List"}
          </button>
        </div>
      </div>

      {/* ── PREV / NEXT arrows ── */}
      {slides.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            style={{ ...h.arrow, left: 16 }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(0,0,0,0.35)")
            }
          >
            ‹
          </button>
          <button
            onClick={handleNext}
            style={{ ...h.arrow, right: 16 }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(0,0,0,0.35)")
            }
          >
            ›
          </button>
        </>
      )}

      {/* ── DOT INDICATORS ── */}
      {slides.length > 1 && (
        <div style={h.dots}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => handleDot(i)}
              style={{
                ...h.dot,
                ...(i === idx ? h.dotActive : {}),
              }}
            />
          ))}
        </div>
      )}

      {/* ── THUMBNAIL STRIP (bottom-right) ── */}
      <div style={h.thumbStrip}>
        {slides.map((m, i) => (
          <div
            key={m.id}
            onClick={() => handleDot(i)}
            style={{
              ...h.thumb,
              ...(i === idx ? h.thumbActive : {}),
            }}
          >
            <img
              src={m.poster || m.backdrop}
              alt={m.title}
              style={h.thumbImg}
            />
          </div>
        ))}
      </div>

      {/* ── PROGRESS BAR ── */}
      <div style={h.progressBar}>
        <div key={idx} style={h.progressFill} />
      </div>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div
      style={{
        height: 520,
        background: "#141414",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, #1c1c1c 25%, #242424 50%, #1c1c1c 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.6s infinite",
        }}
      />
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

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

/* hero styles */
const h = {
  root: {
    position: "relative",
    width: "100%",
    height: 520,
    overflow: "hidden",
    background: "#0a0a0a",
  },
  backdropSlide: { position: "absolute", inset: 0 },
  backdropImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center 20%",
  },
  gradLeft: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to right, rgba(10,10,10,0.96) 0%, rgba(10,10,10,0.7) 40%, rgba(10,10,10,0.1) 70%, transparent 100%)",
  },
  gradBottom: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to top, #0f0f0f 0%, transparent 45%)",
  },
  gradTop: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 25%)",
  },
  content: {
    position: "absolute",
    bottom: 60,
    left: 48,
    maxWidth: 520,
    zIndex: 5,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "var(--red)",
    marginBottom: 14,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#e50914",
    boxShadow: "0 0 6px #e50914",
    animation: "pulse 1.8s ease-in-out infinite",
  },
  title: {
    fontSize: "clamp(28px, 4vw, 52px)",
    fontWeight: 800,
    margin: "0 0 12px",
    lineHeight: 1.1,
    color: "var(--text-primary)",
    textShadow: "0 2px 16px rgba(0,0,0,0.5)",
    letterSpacing: "-0.01em",
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  metaChip: {
    fontSize: 13,
    fontWeight: 600,
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 6,
    padding: "3px 10px",
    color: "var(--text-primary)",
  },
  genreChip: {
    fontSize: 12,
    fontWeight: 500,
    background: "var(--red-dim)",
    border: "1px solid rgba(229,9,20,0.35)",
    borderRadius: 6,
    padding: "3px 10px",
    color: "#ff8080",
  },
  overview: {
    fontSize: 14,
    lineHeight: 1.7,
    color: "var(--text-secondary)",
    margin: "0 0 22px",
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  btnRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  btnPlay: {
    background: "#e50914",
    border: "none",
    color: "var(--text-primary)",
    padding: "12px 24px",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.2s",
    letterSpacing: "0.02em",
  },
  btnInfo: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.22)",
    color: "var(--text-primary)",
    padding: "12px 22px",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s",
    backdropFilter: "blur(4px)",
  },
  btnAdd: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.25)",
    color: "var(--text-primary)",
    padding: "12px 22px",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "border-color 0.2s",
  },
  btnAddSaved: {
    color: "#2ecc71",
    borderColor: "rgba(46,204,113,0.45)",
    cursor: "default",
  },
  arrow: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "var(--text-primary)",
    borderRadius: "50%",
    width: 44,
    height: 44,
    fontSize: 26,
    lineHeight: "44px",
    textAlign: "center",
    cursor: "pointer",
    zIndex: 10,
    transition: "background 0.2s",
    backdropFilter: "blur(4px)",
    padding: 0,
  },
  dots: {
    position: "absolute",
    bottom: 18,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: 6,
    zIndex: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.3)",
    border: "none",
    cursor: "pointer",
    padding: 0,
    transition: "all 0.2s",
  },
  dotActive: {
    width: 20,
    borderRadius: 3,
    background: "#e50914",
  },
  thumbStrip: {
    position: "absolute",
    bottom: 40,
    right: 48,
    display: "flex",
    gap: 8,
    zIndex: 10,
  },
  thumb: {
    width: 52,
    height: 76,
    borderRadius: 6,
    overflow: "hidden",
    cursor: "pointer",
    border: "2px solid rgba(255,255,255,0.15)",
    transition: "all 0.2s",
    flexShrink: 0,
    opacity: 0.55,
  },
  thumbActive: {
    border: "2px solid #e50914",
    opacity: 1,
    transform: "scale(1.06)",
  },
  thumbImg: { width: "100%", height: "100%", objectFit: "cover" },
  progressBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    background: "rgba(255,255,255,0.08)",
    zIndex: 10,
  },
  progressFill: {
    height: "100%",
    background: "#e50914",
    animation: `heroProgress ${HERO_ROTATE_MS}ms linear forwards`,
  },
};

/* ══════════════════════════════════════════════
   HOME PAGE
══════════════════════════════════════════════ */
export default function Home() {
  const { isLoggedIn, user, logout } = useAuth();

  const [movies, setMovies] = useState([]);
  const [mode, setMode] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [genres, setGenres] = useState([]);
  const [activeGenre, setActiveGenre] = useState(null);
  const heroRef = useRef(null); // for Navbar IntersectionObserver
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [pendingFilters, setPendingFilters] = useState(DEFAULT_FILTERS);
  const hasMore = useRef(true);
  const filterPanelRef = useRef(null);

  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    getGenres()
      .then((r) => setGenres(r.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (
        showFilter &&
        filterPanelRef.current &&
        !filterPanelRef.current.contains(e.target)
      )
        setShowFilter(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showFilter]);

  const loadMovies = async (reset = false) => {
    try {
      const isReset = reset || page === 1;
      const currPage = isReset ? 1 : page;
      isReset ? setLoading(true) : setIsFetchingMore(true);
      let res;
      if (mode === "search" && debouncedQuery)
        res = await searchMovies(debouncedQuery, currPage);
      else if (mode === "popular") res = await getPopularMovies(currPage);
      else if (mode === "top-rated") res = await getTopRatedMovies(currPage);
      else if (mode === "upcoming") res = await getUpcomingMovies(currPage);
      else {
        const apiF = {};
        if (filters.year) apiF.year = Number(filters.year);
        if (filters.min_rating) apiF.min_rating = Number(filters.min_rating);
        if (filters.sort_by) apiF.sort_by = filters.sort_by;
        res = await getAllMovies(currPage, activeGenre?.id ?? null, apiF);
      }
      const results = Array.isArray(res.data)
        ? res.data
        : res.data?.results || [];
      const totalPages = res.data?.total_pages ?? 1;
      hasMore.current = currPage < totalPages;
      setMovies((prev) => (isReset ? results : [...prev, ...results]));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setMovies([]);
    hasMore.current = true;
    loadMovies(true);
  }, [mode, activeGenre, debouncedQuery, filters]);
  useEffect(() => {
    if (page === 1) return;
    loadMovies();
  }, [page]);
  useEffect(() => {
    const onScroll = () => {
      if (isFetchingMore || !hasMore.current || mode === "search") return;
      const { scrollTop, scrollHeight, clientHeight } =
        document.documentElement;
      if (scrollTop + clientHeight >= scrollHeight - 300) setPage((p) => p + 1);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isFetchingMore, mode]);

  const handleTabChange = (key) => {
    setActiveGenre(null);
    setQuery("");
    setMode(key);
    if (!TABS.find((t) => t.key === key)?.supportsFilter) setShowFilter(false);
  };
  const handleGenreClick = (genre) => {
    setMode("all");
    setQuery("");
    setActiveGenre(activeGenre?.id === genre.id ? null : genre);
  };
  const handleSearch = (val) => {
    setQuery(val);
    if (val.trim()) {
      setMode("search");
      setActiveGenre(null);
    } else setMode("all");
  };
  const applyFilters = () => {
    setFilters(pendingFilters);
    setShowFilter(false);
  };
  const resetFilters = () => {
    setPendingFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setShowFilter(false);
  };

  const activeTab = TABS.find((t) => t.key === mode) || TABS[0];
  const canFilter = activeTab.supportsFilter && mode !== "search";
  const showGenres = canFilter && !query;
  const isSearching = mode === "search" && debouncedQuery;
  const filterCount = activeFilterCount(filters);

  /* hide hero when user is actively searching / filtering by genre */
  const showHero = mode !== "search" && !activeGenre && !query;

  return (
    <div
      style={{
        background: "var(--bg-page)",
        minHeight: "100vh",
        color: "var(--text-primary)",
        paddingTop: 56 /* height of fixed navbar */,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* ══ NAVBAR (shared component — handles sticky/transparent & mobile) ══ */}
      <Navbar
        heroRef={showHero ? heroRef : null}
        activeTab={mode === "search" ? "all" : mode}
        onTabChange={handleTabChange}
      />

      {/* ══ HERO BANNER ══ */}
      {showHero && (
        <div ref={heroRef}>
          <HeroBanner onPlayTrailer={(m) => setSelectedMovie(m)} />
        </div>
      )}

      {/* ══ SECTION LABEL (below hero) ══ */}
      {showHero && (
        <div style={s.sectionLabel}>
          <span style={s.sectionLine} />
          <span style={s.sectionText}>
            {mode === "all"
              ? "Khám phá phim"
              : mode === "popular"
                ? "🔥 Đang thịnh hành"
                : mode === "top-rated"
                  ? "⭐ Được yêu thích"
                  : mode === "upcoming"
                    ? "🗓 Sắp ra mắt"
                    : mode === "trending"
                      ? "📈 Đang hot"
                      : "Phim"}
          </span>
          <span style={s.sectionLine} />
        </div>
      )}

      {/* ══ SEARCH + FILTER BAR ══ */}
      <div style={s.searchRow}>
        <div style={s.searchBox}>
          <span style={s.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm phim..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && query.trim() && setMode("search")
            }
            style={s.searchInput}
          />
          {query && (
            <button onClick={() => handleSearch("")} style={s.clearBtn}>
              ✕
            </button>
          )}
        </div>

        {canFilter && (
          <div style={{ position: "relative" }} ref={filterPanelRef}>
            <button
              onClick={() => {
                setPendingFilters(filters);
                setShowFilter((p) => !p);
              }}
              style={{
                ...s.filterBtn,
                ...(showFilter || filterCount > 0 ? s.filterBtnActive : {}),
              }}
            >
              <span style={{ fontSize: 15 }}>⚙</span>
              <span>Lọc</span>
              {filterCount > 0 && (
                <span style={s.filterCountBadge}>{filterCount}</span>
              )}
            </button>

            {showFilter && (
              <div style={s.filterPanel}>
                <div style={s.filterPanelHeader}>
                  <span style={s.filterPanelTitle}>Bộ lọc nâng cao</span>
                  <button
                    onClick={() => setShowFilter(false)}
                    style={s.filterCloseBtn}
                  >
                    ✕
                  </button>
                </div>
                <FilterSection label="Sắp xếp theo">
                  <div style={s.pillGroup}>
                    {SORT_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        onClick={() =>
                          setPendingFilters((f) => ({ ...f, sort_by: o.value }))
                        }
                        style={{
                          ...s.pill,
                          ...(pendingFilters.sort_by === o.value
                            ? s.pillActive
                            : {}),
                        }}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </FilterSection>
                <FilterSection label="Điểm tối thiểu">
                  <div style={s.pillGroup}>
                    {RATING_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        onClick={() =>
                          setPendingFilters((f) => ({
                            ...f,
                            min_rating: o.value,
                          }))
                        }
                        style={{
                          ...s.pill,
                          ...(pendingFilters.min_rating === o.value
                            ? s.pillActive
                            : {}),
                        }}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </FilterSection>
                <FilterSection label="Năm phát hành">
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <select
                      value={pendingFilters.year}
                      onChange={(e) =>
                        setPendingFilters((f) => ({
                          ...f,
                          year: e.target.value,
                        }))
                      }
                      style={s.select}
                    >
                      {YEAR_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {pendingFilters.year && (
                      <button
                        onClick={() =>
                          setPendingFilters((f) => ({ ...f, year: "" }))
                        }
                        style={s.clearSmall}
                      >
                        Xoá
                      </button>
                    )}
                  </div>
                </FilterSection>
                <div style={s.filterActions}>
                  <button onClick={resetFilters} style={s.btnReset}>
                    Đặt lại
                  </button>
                  <button onClick={applyFilters} style={s.btnApply}>
                    Áp dụng
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ ACTIVE FILTER CHIPS ══ */}
      {canFilter && filterCount > 0 && (
        <div style={s.activeSummary}>
          {filters.sort_by !== "popularity.desc" && (
            <FilterChip
              label={`Sắp xếp: ${SORT_OPTIONS.find((o) => o.value === filters.sort_by)?.label}`}
              onRemove={() =>
                setFilters((f) => ({ ...f, sort_by: "popularity.desc" }))
              }
            />
          )}
          {filters.min_rating && (
            <FilterChip
              label={`Rating: ${filters.min_rating}+`}
              onRemove={() => setFilters((f) => ({ ...f, min_rating: "" }))}
            />
          )}
          {filters.year && (
            <FilterChip
              label={`Năm: ${filters.year}`}
              onRemove={() => setFilters((f) => ({ ...f, year: "" }))}
            />
          )}
          <button onClick={resetFilters} style={s.clearAllBtn}>
            Xoá tất cả
          </button>
        </div>
      )}

      {/* ══ GENRE PILLS ══ */}
      {showGenres && genres.length > 0 && (
        <div style={s.genreBar}>
          {genres.map((g) => {
            const active = activeGenre?.id === g.id;
            return (
              <button
                key={g.id}
                onClick={() => handleGenreClick(g)}
                style={{ ...s.genrePill, ...(active ? s.genrePillActive : {}) }}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      )}

      {/* ══ CONTEXT LABEL ══ */}
      {(activeGenre || isSearching) && (
        <div style={s.contextLabel}>
          {activeGenre ? (
            <>
              Thể loại:{" "}
              <span style={{ color: "var(--red)", fontWeight: 600 }}>
                {activeGenre.name}
              </span>
              <span onClick={() => setActiveGenre(null)} style={s.clearFilter}>
                {" "}
                · Xoá lọc
              </span>
            </>
          ) : (
            <>
              Kết quả cho:{" "}
              <span style={{ color: "var(--red)", fontWeight: 600 }}>
                "{debouncedQuery}"
              </span>
            </>
          )}
        </div>
      )}

      {/* ══ MOVIE GRID ══ */}
      <div style={s.grid}>
        {loading && movies.length === 0
          ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
          : movies.map((m) =>
              mode === "upcoming" ? (
                <div key={m.id} style={{ position: "relative" }}>
                  <MovieCard
                    movie={m}
                    onPlay={(movie) => setSelectedMovie(movie)}
                  />

                  <div
                    style={{
                      position: "absolute",
                      top: 44,
                      right: 8,
                    }}
                  >
                    <RemindButton movie={m} variant="icon" />
                  </div>
                </div>
              ) : (
                <MovieCard
                  key={m.id}
                  movie={m}
                  onPlay={(movie) => setSelectedMovie(movie)}
                />
              ),
            )}
      </div>

      {movies.length === 0 && !loading && (
        <div style={s.emptyState}>
          <p style={{ fontSize: 40, margin: "0 0 12px" }}>🎬</p>
          <p style={{ color: "var(--text-faint)", fontSize: 16 }}>
            Không tìm thấy phim nào
          </p>
          {filterCount > 0 && (
            <button
              onClick={resetFilters}
              style={{ ...s.btnApply, marginTop: 16 }}
            >
              Xoá bộ lọc
            </button>
          )}
        </div>
      )}

      {isFetchingMore && <div style={s.fetchMore}>Đang tải thêm...</div>}

      {!hasMore.current &&
        movies.length > 0 &&
        !isFetchingMore &&
        mode !== "search" && <div style={s.endLabel}>— Hết danh sách —</div>}

      {selectedMovie && (
        <TrailerModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}

      <ScrollToTop />
      <style>{globalCSS}</style>
    </div>
  );
}

/* ── Sub-components ──────────────────────── */
function FilterSection({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p
        style={{
          margin: "0 0 8px",
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--text-faint)",
        }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}
function FilterChip({ label, onRemove }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: "var(--red-dim)",
        border: "1px solid rgba(229,9,20,0.3)",
        color: "var(--red-text)",
        borderRadius: 20,
        padding: "4px 10px 4px 12px",
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {label}
      <button
        onClick={onRemove}
        style={{
          background: "none",
          border: "none",
          color: "var(--red-text)",
          cursor: "pointer",
          fontSize: 13,
          padding: 0,
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </span>
  );
}

/* ── Styles ─────────────────────────────── */
const s = {
  navbar: {
    position: "sticky",
    top: 0,
    zIndex: 1000,
    backdropFilter: "blur(12px)",
    background: "var(--navbar-bg)",
    padding: "10px 20px",
    borderBottom: "1px solid var(--border)",
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 12,
  },
  /* when floating over hero: fully transparent, no border */
  navbarOverHero: {
    position: "absolute",
    background: "transparent",
    borderBottom: "none",
    backdropFilter: "none",
    width: "100%",
  },
  navLeft: { display: "flex", alignItems: "center" },
  logo: {
    color: "var(--red)",
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
    letterSpacing: 1,
  },
  tabBar: { display: "flex", gap: 2, alignItems: "center" },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    padding: "7px 13px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    transition: "all 0.15s",
    whiteSpace: "nowrap",
    position: "relative",
  },
  tabActive: {
    background: "var(--red-dim)",
    color: "var(--red-text)",
    fontWeight: 600,
  },
  tabIcon: { fontSize: 14 },
  newBadge: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.05em",
    background: "#e50914",
    color: "var(--text-primary)",
    padding: "1px 5px",
    borderRadius: 4,
    marginLeft: 2,
    lineHeight: 1.6,
  },
  navRight: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
  },
  loginBtn: {
    background: "#e50914",
    color: "var(--text-primary)",
    padding: "7px 16px",
    borderRadius: 8,
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 600,
  },
  avatarBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 8,
    padding: "6px 12px",
    color: "var(--text-primary)",
    cursor: "pointer",
    fontSize: 14,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "#e50914",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  userMenu: {
    position: "absolute",
    right: 0,
    top: "calc(100% + 8px)",
    background: "var(--bg-overlay)",
    border: "1px solid var(--border-mid)",
    borderRadius: 10,
    minWidth: 180,
    overflow: "hidden",
    zIndex: 100,
    boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
  },
  menuItem: {
    display: "block",
    padding: "12px 16px",
    color: "rgba(255,255,255,0.75)",
    textDecoration: "none",
    fontSize: 14,
    background: "transparent",
    transition: "background 0.15s",
  },
  /* section divider */
  sectionLabel: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "20px 20px 6px",
  },
  sectionLine: { flex: 1, height: 1, background: "rgba(255,255,255,0.07)" },
  sectionText: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-faint)",
    whiteSpace: "nowrap",
    letterSpacing: "0.05em",
  },
  /* search */
  searchRow: {
    padding: "10px 20px 8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  searchBox: {
    flex: 1,
    maxWidth: 520,
    display: "flex",
    alignItems: "center",
    background: "var(--bg-input)",
    borderRadius: 30,
    overflow: "hidden",
    border: "1px solid var(--border)",
  },
  searchIcon: { padding: "0 12px", fontSize: 16, color: "var(--text-faint)" },
  searchInput: {
    flex: 1,
    padding: "11px 0",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "var(--text-primary)",
    fontSize: 14,
  },
  clearBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-faint)",
    padding: "0 14px",
    cursor: "pointer",
    fontSize: 16,
  },
  filterBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid var(--border-mid)",
    color: "var(--text-secondary)",
    borderRadius: 24,
    padding: "9px 16px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    transition: "all 0.15s",
    whiteSpace: "nowrap",
    position: "relative",
  },
  filterBtnActive: {
    background: "var(--red-dim)",
    borderColor: "var(--red-border)",
    color: "var(--red-text)",
  },
  filterCountBadge: {
    background: "#e50914",
    color: "var(--text-primary)",
    borderRadius: "50%",
    width: 18,
    height: 18,
    fontSize: 10,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  },
  filterPanel: {
    position: "absolute",
    right: 0,
    top: "calc(100% + 8px)",
    width: 320,
    background: "var(--bg-card)",
    border: "1px solid var(--border-mid)",
    borderRadius: 14,
    padding: 20,
    zIndex: 200,
    boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
  },
  filterPanelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  filterPanelTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  filterCloseBtn: {
    background: "none",
    border: "none",
    color: "var(--text-faint)",
    cursor: "pointer",
    fontSize: 18,
    padding: 0,
    lineHeight: 1,
  },
  pillGroup: { display: "flex", flexWrap: "wrap", gap: 6 },
  pill: {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid var(--border-mid)",
    color: "var(--text-muted)",
    borderRadius: 20,
    padding: "5px 12px",
    fontSize: 12,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  pillActive: {
    background: "var(--red-dim)",
    borderColor: "var(--red-border)",
    color: "var(--red-text)",
    fontWeight: 600,
  },
  select: {
    flex: 1,
    background: "var(--bg-input2)",
    border: "1px solid var(--border-mid)",
    borderRadius: 8,
    color: "var(--text-secondary)",
    padding: "8px 12px",
    fontSize: 13,
    cursor: "pointer",
    outline: "none",
  },
  clearSmall: {
    background: "transparent",
    border: "1px solid var(--border-mid)",
    color: "var(--text-faint)",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 12,
    cursor: "pointer",
  },
  filterActions: {
    display: "flex",
    gap: 8,
    marginTop: 4,
    paddingTop: 16,
    borderTop: "1px solid var(--border)",
  },
  btnReset: {
    flex: 1,
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "var(--text-secondary)",
    borderRadius: 8,
    padding: "9px 0",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  btnApply: {
    flex: 1,
    background: "#e50914",
    border: "none",
    color: "var(--text-primary)",
    borderRadius: 8,
    padding: "9px 0",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  activeSummary: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    padding: "0 20px 10px",
  },
  clearAllBtn: {
    background: "none",
    border: "none",
    color: "var(--text-faint)",
    fontSize: 12,
    cursor: "pointer",
    textDecoration: "underline",
    padding: 0,
  },
  genreBar: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    padding: "4px 20px 6px",
    scrollbarWidth: "none",
  },
  genrePill: {
    flexShrink: 0,
    background: "rgba(255,255,255,0.07)",
    color: "var(--text-muted)",
    border: "1px solid var(--border-mid)",
    borderRadius: 20,
    padding: "5px 14px",
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  },
  genrePillActive: {
    background: "var(--red-dim)",
    color: "var(--red-text)",
    borderColor: "var(--red-border)",
    fontWeight: 600,
  },
  contextLabel: {
    padding: "4px 20px 10px",
    fontSize: 13,
    color: "var(--text-faint)",
  },
  clearFilter: {
    cursor: "pointer",
    marginLeft: 8,
    color: "var(--text-faint)",
    textDecoration: "underline",
  },
  grid: {
    padding: "4px 20px 40px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: 18,
  },
  emptyState: { textAlign: "center", padding: "60px 20px" },
  fetchMore: {
    textAlign: "center",
    padding: 20,
    color: "var(--text-faint)",
    fontSize: 13,
  },
  endLabel: {
    textAlign: "center",
    padding: "10px 20px 40px",
    fontSize: 12,
    color: "rgba(255,255,255,0.2)",
    letterSpacing: "0.08em",
  },
  remindOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 5,

    /* glass effect nhẹ */
    backdropFilter: "blur(6px)",

    /* tránh click xuyên xuống card */
    pointerEvents: "auto",
  },
};

const globalCSS = `
  ::-webkit-scrollbar { display: none; }
  select option { background: #1a1a1a; }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(0.85); }
  }
  @keyframes heroProgress {
    from { width: 0%; }
    to   { width: 100%; }
  }
`;

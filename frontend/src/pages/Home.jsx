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
import HeroBanner, { HeroSkeleton } from "../components/HeroBanner";
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
/* ══════════════════════════════════════════════
   HOME PAGE
══════════════════════════════════════════════ */
export default function Home() {
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();

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
        paddingTop: 60 /* height of fixed navbar */,
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
        {/* Search input */}
        <SearchBar
          query={query}
          onSearch={handleSearch}
          onSelectSuggestion={(movie) => {
            handleSearch("");
            navigate(`/movie/${movie.id}`);
          }}
        />

        {/* Filter toggle button */}
        {canFilter && (
          <div style={{ position: "relative" }} ref={filterPanelRef}>
            <button
              onClick={() => {
                setPendingFilters(filters);
                setShowFilter((p) => !p);
              }}
              style={{
                ...s.filterBtn,
                ...(showFilter ? s.filterBtnOpen : {}),
                ...(filterCount > 0 && !showFilter ? s.filterBtnActive : {}),
              }}
            >
              <FilterSVG size={13} />
              <span>Lọc</span>
              {filterCount > 0 && (
                <span style={s.filterCountBadge}>{filterCount}</span>
              )}
            </button>

            {showFilter && (
              <FilterPanel
                pendingFilters={pendingFilters}
                setPendingFilters={setPendingFilters}
                onApply={applyFilters}
                onReset={resetFilters}
                onClose={() => setShowFilter(false)}
              />
            )}
          </div>
        )}
      </div>

      {/* ══ ACTIVE FILTER CHIPS ══ */}
      {canFilter && filterCount > 0 && (
        <div style={s.activeSummary}>
          <span style={s.activeFiltersLabel}>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(229,9,20,0.7)"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Đang lọc:
          </span>
          {filters.sort_by !== "popularity.desc" && (
            <FilterChip
              label={`↑ ${SORT_OPTIONS.find((o) => o.value === filters.sort_by)?.label}`}
              onRemove={() =>
                setFilters((f) => ({ ...f, sort_by: "popularity.desc" }))
              }
            />
          )}
          {filters.min_rating && (
            <FilterChip
              label={`★ ${filters.min_rating}+`}
              onRemove={() => setFilters((f) => ({ ...f, min_rating: "" }))}
            />
          )}
          {filters.year && (
            <FilterChip
              label={`📅 ${filters.year}`}
              onRemove={() => setFilters((f) => ({ ...f, year: "" }))}
            />
          )}
          <button
            onClick={resetFilters}
            style={s.clearAllBtn}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "rgba(255,110,110,0.8)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(140,155,195,0.4)")
            }
          >
            Xoá tất cả
          </button>
        </div>
      )}

      {/* ══ GENRE PILLS ══ */}
      {showGenres && genres.length > 0 && (
        <div style={s.genreBarWrap}>
          <div style={s.genreBar}>
            <button
              onClick={() => handleGenreClick({ id: null })}
              style={{
                ...s.genrePill,
                ...(activeGenre === null ? s.genrePillAll : {}),
              }}
            >
              Tất cả
            </button>
            {genres.map((g) => {
              const active = activeGenre?.id === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => handleGenreClick(g)}
                  style={{
                    ...s.genrePill,
                    ...(active ? s.genrePillActive : {}),
                  }}
                >
                  {active && (
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "var(--red,#e50914)",
                        flexShrink: 0,
                        display: "inline-block",
                      }}
                    />
                  )}
                  {g.name}
                </button>
              );
            })}
          </div>
          {/* Fade edges */}
          <div style={s.genreFadeLeft} />
          <div style={s.genreFadeRight} />
        </div>
      )}

      {/* ══ CONTEXT LABEL ══ */}
      {(activeGenre || isSearching) && (
        <div style={s.contextLabel}>
          {activeGenre ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={s.contextDot} />
              Thể loại:{" "}
              <strong style={{ color: "var(--red,#e50914)", fontWeight: 700 }}>
                {activeGenre.name}
              </strong>
              <button
                onClick={() => setActiveGenre(null)}
                style={s.clearContextBtn}
              >
                <CloseSVG size={10} /> Xoá lọc
              </button>
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={s.contextDot} />
              Kết quả cho:{" "}
              <strong style={{ color: "var(--red,#e50914)", fontWeight: 700 }}>
                "{debouncedQuery}"
              </strong>
              {movies.length > 0 && (
                <span style={{ color: "rgba(140,155,195,0.45)", fontSize: 11 }}>
                  — {movies.length} phim
                </span>
              )}
            </span>
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
    <div style={{ marginBottom: 20 }}>
      <p
        style={{
          margin: "0 0 10px",
          fontSize: 10,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "rgba(140,155,195,0.5)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 16,
            height: 1.5,
            background: "rgba(229,9,20,0.5)",
            display: "inline-block",
            borderRadius: 99,
          }}
        />
        {label}
      </p>
      {children}
    </div>
  );
}

function FilterChip({ label, onRemove }) {
  const [hov, setHov] = useState(false);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: hov ? "rgba(229,9,20,0.18)" : "rgba(229,9,20,0.1)",
        border: "1px solid rgba(229,9,20,0.32)",
        color: "rgba(255,110,110,0.9)",
        borderRadius: 999,
        padding: "4px 8px 4px 12px",
        fontSize: 11.5,
        fontWeight: 700,
        transition: "background 0.15s",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {label}
      <button
        onClick={onRemove}
        style={{
          background: "rgba(229,9,20,0.2)",
          border: "none",
          color: "rgba(255,110,110,0.8)",
          cursor: "pointer",
          width: 16,
          height: 16,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9,
          fontWeight: 800,
          padding: 0,
          lineHeight: 1,
          transition: "background 0.15s",
        }}
      >
        ✕
      </button>
    </span>
  );
}

/* ── SpinnerSVG ── */
function SpinnerSVG({ size = 15 }) {
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
      <path
        d="M12 2a10 10 0 0 1 10 10"
        style={{
          animation: "spin360 0.7s linear infinite",
          transformOrigin: "center",
        }}
      />
    </svg>
  );
}

/* ── SearchIcon SVG ── */
function SearchSVG({ size = 15, color = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
/* ── Filter SVG ── */
function FilterSVG({ size = 14 }) {
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
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}
/* ── Close SVG ── */
function CloseSVG({ size = 12 }) {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/* ── SearchBar component (có autocomplete) ── */
function useDebounceLocal(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

function SearchBar({ query, onSearch, onSelectSuggestion }) {
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const abortRef = useRef(null);

  const debouncedQ = useDebounceLocal(query, 220);

  /* Fetch suggestions khi query thay đổi */
  useEffect(() => {
    const q = debouncedQ.trim();
    if (!q || q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    // Huỷ request cũ nếu đang chờ
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    import("../api/movieApi")
      .then(({ searchMovies }) => searchMovies(q, 1))
      .then((res) => {
        if (ctrl.signal.aborted) return;
        const results = Array.isArray(res.data)
          ? res.data
          : res.data?.results || [];
        setSuggestions(results.slice(0, 5));
        setOpen(results.length > 0);
        setActiveIdx(-1);
      })
      .catch(() => {})
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [debouncedQ]);

  /* Click ngoài → đóng dropdown */
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (movie) => {
    setOpen(false);
    setSuggestions([]);
    setActiveIdx(-1);
    onSelectSuggestion?.(movie);
  };

  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  const showDropdown = open && focused && suggestions.length > 0;

  return (
    <div ref={wrapRef} style={{ flex: 1, maxWidth: 560, position: "relative" }}>
      {/* Input wrapper */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: focused
            ? "rgba(255,255,255,0.048)"
            : "rgba(255,255,255,0.03)",
          borderRadius: showDropdown ? "14px 14px 0 0" : 14,
          border: `1.5px solid ${focused ? "rgba(229,9,20,0.45)" : "rgba(100,120,175,0.14)"}`,
          borderBottom: showDropdown
            ? "1.5px solid rgba(229,9,20,0.15)"
            : undefined,
          boxShadow: focused
            ? "0 0 0 3.5px rgba(229,9,20,0.09), 0 4px 24px rgba(0,0,0,0.3)"
            : "0 2px 12px rgba(0,0,0,0.2)",
          transition: "all 0.18s cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
          cursor: "text",
        }}
        onClick={() => inputRef.current?.focus()}
      >
        <span
          style={{
            padding: "0 14px 0 16px",
            display: "flex",
            alignItems: "center",
            color: loading
              ? "rgba(245,197,24,0.7)"
              : focused
                ? "rgba(255,110,110,0.7)"
                : "rgba(140,155,195,0.4)",
            flexShrink: 0,
            transition: "color 0.22s ease",
          }}
        >
          {loading ? (
            <SpinnerSVG size={15} />
          ) : (
            <SearchSVG size={15} color="currentColor" />
          )}
        </span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Tìm kiếm phim, diễn viên..."
          value={query}
          onChange={(e) => {
            onSearch(e.target.value);
          }}
          onFocus={() => {
            setFocused(true);
            if (suggestions.length > 0) setOpen(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          style={{
            flex: 1,
            padding: "12px 0",
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--text-primary,#f0f4ff)",
            fontSize: 14,
            fontFamily: "var(--font-body,'DM Sans',sans-serif)",
          }}
        />
        {query && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onSearch("");
              setSuggestions([]);
              setOpen(false);
              inputRef.current?.focus();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              border: "none",
              color: "rgba(160,175,210,0.6)",
              cursor: "pointer",
              marginRight: 12,
              flexShrink: 0,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.14)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.08)")
            }
          >
            <CloseSVG size={9} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 500,
            background: "rgba(8,11,18,0.98)",
            border: "1.5px solid rgba(229,9,20,0.3)",
            borderTop: "none",
            borderRadius: "0 0 14px 14px",
            overflow: "hidden",
            boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            backdropFilter: "blur(20px)",
            animation: "acDropIn 0.16s cubic-bezier(0.34,1.2,0.64,1) both",
          }}
        >
          {suggestions.map((movie, idx) => {
            const isActive = idx === activeIdx;
            const year = movie.release_date
              ? movie.release_date.slice(0, 4)
              : null;
            const rating = movie.rating ?? movie.vote_average;
            return (
              <div
                key={movie.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(movie);
                }}
                onMouseEnter={() => setActiveIdx(idx)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "9px 14px",
                  background: isActive ? "rgba(229,9,20,0.1)" : "transparent",
                  cursor: "pointer",
                  borderBottom:
                    idx < suggestions.length - 1
                      ? "1px solid rgba(255,255,255,0.04)"
                      : "none",
                  transition: "background 0.1s",
                }}
              >
                {/* Poster thumbnail */}
                <div
                  style={{
                    width: 32,
                    height: 46,
                    borderRadius: 6,
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  {movie.poster ? (
                    <img
                      src={movie.poster}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
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
                        fontSize: 16,
                      }}
                    >
                      🎬
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: isActive
                        ? "var(--text-primary,#f0f4ff)"
                        : "rgba(220,230,255,0.85)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {movie.title}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 2,
                    }}
                  >
                    {year && (
                      <span
                        style={{ fontSize: 11, color: "rgba(140,155,195,0.5)" }}
                      >
                        {year}
                      </span>
                    )}
                    {rating > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#f5c518",
                          fontWeight: 600,
                        }}
                      >
                        ★ {Number(rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow hint */}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={
                    isActive
                      ? "rgba(255,110,110,0.7)"
                      : "rgba(100,120,175,0.25)"
                  }
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0, transition: "stroke 0.1s" }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            );
          })}

          {/* Footer hint */}
          <div
            style={{
              padding: "7px 14px",
              borderTop: "1px solid rgba(255,255,255,0.04)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 10.5,
                color: "rgba(100,120,175,0.45)",
                letterSpacing: "0.04em",
              }}
            >
              ↑↓ điều hướng · Enter chọn · Esc đóng
            </span>
            <span style={{ fontSize: 10.5, color: "rgba(100,120,175,0.35)" }}>
              Nhấn Enter để xem tất cả kết quả
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── FilterPanel component ───────────────── */
function FilterPanel({
  pendingFilters,
  setPendingFilters,
  onApply,
  onReset,
  onClose,
}) {
  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: "calc(100% + 10px)",
        width: 340,
        background: "rgba(10,14,22,0.98)",
        border: "1px solid rgba(100,120,175,0.18)",
        borderRadius: 18,
        padding: "20px 20px 16px",
        zIndex: 200,
        boxShadow:
          "0 24px 60px rgba(0,0,0,0.75), 0 0 0 0.5px rgba(229,9,20,0.1)",
        backdropFilter: "blur(20px)",
        animation: "filterPanelIn 0.22s cubic-bezier(0.34,1.2,0.64,1) both",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 3,
              height: 16,
              borderRadius: 99,
              background: "var(--red,#e50914)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary,#f0f4ff)",
              letterSpacing: "-0.01em",
            }}
          >
            Bộ lọc nâng cao
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(100,120,175,0.14)",
            color: "rgba(160,175,210,0.55)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CloseSVG size={11} />
        </button>
      </div>

      {/* Sort by */}
      <FilterSection label="Sắp xếp theo">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SORT_OPTIONS.map((o) => {
            const active = pendingFilters.sort_by === o.value;
            return (
              <button
                key={o.value}
                onClick={() =>
                  setPendingFilters((f) => ({ ...f, sort_by: o.value }))
                }
                style={{
                  padding: "5px 13px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  fontFamily: "var(--font-body,sans-serif)",
                  transition: "all 0.16s ease",
                  background: active
                    ? "rgba(229,9,20,0.15)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${active ? "rgba(229,9,20,0.4)" : "rgba(100,120,175,0.13)"}`,
                  color: active
                    ? "rgba(255,110,110,0.95)"
                    : "rgba(160,175,210,0.65)",
                  boxShadow: active ? "0 0 10px rgba(229,9,20,0.12)" : "none",
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Rating */}
      <FilterSection label="Điểm tối thiểu">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {RATING_OPTIONS.map((o) => {
            const active = pendingFilters.min_rating === o.value;
            return (
              <button
                key={o.value}
                onClick={() =>
                  setPendingFilters((f) => ({ ...f, min_rating: o.value }))
                }
                style={{
                  padding: "5px 13px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  fontFamily: "var(--font-body,sans-serif)",
                  transition: "all 0.16s ease",
                  background: active
                    ? "rgba(245,197,24,0.14)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${active ? "rgba(245,197,24,0.4)" : "rgba(100,120,175,0.13)"}`,
                  color: active ? "#fde047" : "rgba(160,175,210,0.65)",
                  boxShadow: active ? "0 0 10px rgba(245,197,24,0.1)" : "none",
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Year */}
      <FilterSection label="Năm phát hành">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <select
              value={pendingFilters.year}
              onChange={(e) =>
                setPendingFilters((f) => ({ ...f, year: e.target.value }))
              }
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(100,120,175,0.14)",
                borderRadius: 10,
                color: pendingFilters.year
                  ? "var(--text-primary,#f0f4ff)"
                  : "rgba(140,155,195,0.5)",
                padding: "9px 14px",
                fontSize: 13,
                cursor: "pointer",
                outline: "none",
                fontFamily: "var(--font-body,sans-serif)",
                appearance: "none",
                WebkitAppearance: "none",
              }}
            >
              {YEAR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "rgba(140,155,195,0.45)",
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </div>
          {pendingFilters.year && (
            <button
              onClick={() => setPendingFilters((f) => ({ ...f, year: "" }))}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(100,120,175,0.13)",
                color: "rgba(160,175,210,0.6)",
                borderRadius: 8,
                padding: "9px 12px",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "var(--font-body,sans-serif)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              Xoá
            </button>
          )}
        </div>
      </FilterSection>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 4,
          paddingTop: 16,
          borderTop: "1px solid rgba(100,120,175,0.1)",
        }}
      >
        <button
          onClick={onReset}
          style={{
            flex: 1,
            background: "transparent",
            border: "1px solid rgba(100,120,175,0.16)",
            color: "rgba(160,175,210,0.6)",
            borderRadius: 10,
            padding: "10px 0",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-body,sans-serif)",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.borderColor = "rgba(160,175,210,0.28)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(100,120,175,0.16)";
          }}
        >
          Đặt lại
        </button>
        <button
          onClick={onApply}
          style={{
            flex: 2,
            background: "var(--red,#e50914)",
            border: "none",
            color: "#fff",
            borderRadius: 10,
            padding: "10px 0",
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "var(--font-body,sans-serif)",
            boxShadow: "0 4px 16px rgba(229,9,20,0.35)",
            transition: "all 0.18s cubic-bezier(0.34,1.2,0.64,1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--red-hover,#c9070f)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(229,9,20,0.5)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--red,#e50914)";
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(229,9,20,0.35)";
            e.currentTarget.style.transform = "none";
          }}
        >
          Áp dụng bộ lọc
        </button>
      </div>
    </div>
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

  /* ── search row ── */
  searchRow: {
    padding: "14px clamp(16px,3vw,32px) 10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  /* filter button */
  filterBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "rgba(255,255,255,0.04)",
    border: "1.5px solid rgba(100,120,175,0.14)",
    color: "rgba(160,175,210,0.65)",
    borderRadius: 14,
    padding: "10px 16px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    transition: "all 0.18s ease",
    whiteSpace: "nowrap",
    position: "relative",
    flexShrink: 0,
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  },
  filterBtnActive: {
    background: "rgba(229,9,20,0.1)",
    borderColor: "rgba(229,9,20,0.35)",
    color: "rgba(255,110,110,0.85)",
  },
  filterBtnOpen: {
    background: "rgba(229,9,20,0.12)",
    borderColor: "rgba(229,9,20,0.4)",
    color: "rgba(255,110,110,0.9)",
    boxShadow: "0 0 14px rgba(229,9,20,0.12)",
  },
  filterCountBadge: {
    background: "var(--red,#e50914)",
    color: "#fff",
    borderRadius: "50%",
    width: 17,
    height: 17,
    fontSize: 9.5,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  },

  /* active filter chips */
  activeSummary: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
    alignItems: "center",
    padding: "0 clamp(16px,3vw,32px) 10px",
  },
  activeFiltersLabel: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "rgba(140,155,195,0.45)",
  },
  clearAllBtn: {
    background: "none",
    border: "none",
    color: "rgba(140,155,195,0.4)",
    fontSize: 11.5,
    cursor: "pointer",
    padding: "2px 4px",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
    transition: "color 0.15s",
    fontWeight: 600,
  },

  /* ── genre bar ── */
  genreBarWrap: {
    position: "relative",
    padding: "0 0 8px",
  },
  genreBar: {
    display: "flex",
    gap: 7,
    overflowX: "auto",
    padding: "6px clamp(16px,3vw,32px)",
    scrollbarWidth: "none",
    WebkitOverflowScrolling: "touch",
    alignItems: "center",
  },
  genreFadeLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 8,
    width: 32,
    background:
      "linear-gradient(to right, var(--bg-page,#080b0f), transparent)",
    pointerEvents: "none",
    zIndex: 1,
  },
  genreFadeRight: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 8,
    width: 32,
    background: "linear-gradient(to left, var(--bg-page,#080b0f), transparent)",
    pointerEvents: "none",
    zIndex: 1,
  },
  genrePill: {
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    background: "rgba(255,255,255,0.035)",
    color: "rgba(160,175,210,0.65)",
    border: "1px solid rgba(100,120,175,0.12)",
    borderRadius: 999,
    padding: "6px 14px",
    fontSize: 12.5,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.18s ease",
    whiteSpace: "nowrap",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  },
  genrePillAll: {
    background: "rgba(255,255,255,0.06)",
    borderColor: "rgba(100,120,175,0.22)",
    color: "rgba(200,215,255,0.8)",
    fontWeight: 700,
  },
  genrePillActive: {
    background: "rgba(229,9,20,0.13)",
    borderColor: "rgba(229,9,20,0.38)",
    color: "rgba(255,110,110,0.95)",
    fontWeight: 700,
    boxShadow: "0 0 12px rgba(229,9,20,0.12)",
  },

  /* context label */
  contextLabel: {
    padding: "4px clamp(16px,3vw,32px) 10px",
    fontSize: 12.5,
    color: "rgba(140,155,195,0.55)",
    display: "flex",
    alignItems: "center",
  },
  contextDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--red,#e50914)",
    display: "inline-block",
    flexShrink: 0,
  },
  clearContextBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: "none",
    border: "none",
    color: "rgba(140,155,195,0.45)",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 6px",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
    borderRadius: 6,
    transition: "color 0.15s",
  },
  clearFilter: {
    cursor: "pointer",
    marginLeft: 8,
    color: "var(--text-faint)",
    textDecoration: "underline",
  },

  /* grid */
  grid: {
    padding: "4px clamp(16px,3vw,32px) 40px",
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
    pointerEvents: "auto",
  },
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
  select option { background: #111620; color: #f0f4ff; }
  [data-theme="light"] select option { background: #fff; color: #0a0c14; }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(0.85); }
  }
  @keyframes filterPanelIn {
    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes acDropIn {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin360 {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .genre-bar::-webkit-scrollbar { display: none; }
`;

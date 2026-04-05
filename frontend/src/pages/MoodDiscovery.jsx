import { useState, useEffect, useCallback, useRef } from "react";
import { getMoviesByMood } from "../api/moodApi";
import MovieCard from "../components/MovieCard";
import TrailerModal from "../components/TrailerModal";
import MoodPicker from "../components/MoodPicker";
import Navbar from "../components/Navbar";
import SkeletonCard from "../components/SkeletonCard";
import ScrollToTop from "../components/ScrollToTop";

const MOODS_STATIC = [
  { id: "vui", label: "Vui vẻ", emoji: "😄", color: "#f1c40f" },
  { id: "buon", label: "Khóc", emoji: "😢", color: "#3498db" },
  { id: "hoi_hop", label: "Hồi hộp", emoji: "😰", color: "#e74c3c" },
  { id: "kinh_di", label: "Sợ hãi", emoji: "👻", color: "#8e44ad" },
  { id: "thu_gian", label: "Thư giãn", emoji: "🛋️", color: "#2ecc71" },
  { id: "phieu_luu", label: "Phiêu lưu", emoji: "🌍", color: "#e67e22" },
  { id: "lang_man", label: "Lãng mạn", emoji: "💕", color: "#e91e8c" },
  { id: "suy_ngam", label: "Suy ngẫm", emoji: "🤔", color: "#34495e" },
];

export default function MoodDiscovery() {
  const [selectedMood, setSelectedMood] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [trailer, setTrailer] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // force re-fetch

  const gridRef = useRef(null);

  /* ── fetch phim khi mood hoặc refreshKey thay đổi ── */
  useEffect(() => {
    if (!selectedMood) return;

    setLoading(true);
    setMovies([]);
    setPage(1);

    getMoviesByMood(selectedMood.id, 1)
      .then((res) => {
        setMovies(res.data.results || []);
        setHasMore((res.data.results || []).length === 20);
      })
      .catch(() => setMovies([]))
      .finally(() => setLoading(false));
  }, [selectedMood, refreshKey]);

  /* ── load more ── */
  const loadMore = useCallback(() => {
    if (loadingMore || !selectedMood) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    getMoviesByMood(selectedMood.id, nextPage)
      .then((res) => {
        const newMovies = res.data.results || [];
        setMovies((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          return [...prev, ...newMovies.filter((m) => !ids.has(m.id))];
        });
        setPage(nextPage);
        setHasMore(newMovies.length === 20);
      })
      .finally(() => setLoadingMore(false));
  }, [loadingMore, selectedMood, page]);

  /* ── handlers ── */
  const handleSelectMood = useCallback((mood) => {
    setSelectedMood(mood);
    setShowPicker(false);
  }, []);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    // scroll to top of grid
    gridRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /* ── render ── */
  return (
    <div style={s.page}>
      <Navbar />

      {/* ── HERO HEADER ── */}
      <div
        style={{
          ...s.hero,
          ...(selectedMood
            ? { borderBottom: `3px solid ${selectedMood.color}` }
            : {}),
        }}
      >
        {/* bg blur nếu đã chọn mood */}
        {selectedMood && (
          <div
            style={{
              ...s.heroBg,
              background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${selectedMood.color}22 0%, transparent 70%)`,
            }}
          />
        )}

        <div style={s.heroContent}>
          <p style={s.heroEyebrow}>🎬 Khám phá theo tâm trạng</p>
          <h1 style={s.heroTitle}>
            {selectedMood
              ? `${selectedMood.emoji} ${selectedMood.label}`
              : "Hôm nay bạn muốn xem gì?"}
          </h1>
          {selectedMood && <p style={s.heroDesc}>{selectedMood.description}</p>}

          <div style={s.heroActions}>
            <button
              style={{
                ...s.changeBtn,
                ...(selectedMood
                  ? {
                      borderColor: selectedMood.color,
                      color: selectedMood.color,
                    }
                  : {
                      background: "var(--red, #e74c3c)",
                      border: "none",
                      color: "#fff",
                    }),
              }}
              onClick={() => setShowPicker(true)}
            >
              {selectedMood ? "Đổi tâm trạng" : "Chọn tâm trạng →"}
            </button>

            {selectedMood && (
              <button
                style={s.refreshBtn}
                onClick={handleRefresh}
                title="Gợi ý khác"
              >
                🔀 Gợi ý khác
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── MOOD QUICK-SELECT BAR ── */}
      <div style={s.moodBar}>
        <div style={s.moodBarInner}>
          {MOODS_STATIC.map((m) => (
            <button
              key={m.id}
              style={{
                ...s.moodChip,
                ...(selectedMood?.id === m.id
                  ? {
                      borderColor: m.color,
                      color: m.color,
                      background: `${m.color}18`,
                    }
                  : {}),
              }}
              onClick={() => handleSelectMood(m)}
            >
              <span>{m.emoji}</span>
              <span style={s.chipLabel}>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT AREA ── */}
      <div style={s.content} ref={gridRef}>
        {/* chưa chọn mood */}
        {!selectedMood && (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>🎭</div>
            <p style={s.emptyTitle}>Chọn một tâm trạng để bắt đầu</p>
            <p style={s.emptyDesc}>
              App sẽ gợi ý những bộ phim phù hợp nhất với cảm xúc của bạn lúc
              này.
            </p>
            <button style={s.emptyBtn} onClick={() => setShowPicker(true)}>
              Chọn tâm trạng ngay
            </button>
          </div>
        )}

        {/* loading skeleton */}
        {loading && (
          <div style={s.grid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* kết quả */}
        {!loading && movies.length > 0 && (
          <>
            <div style={s.resultHeader}>
              <p style={s.resultCount}>
                {movies.length} phim gợi ý cho tâm trạng{" "}
                <span style={{ color: selectedMood?.color }}>
                  {selectedMood?.label}
                </span>
              </p>
            </div>

            <div style={s.grid}>
              {movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onPlay={() => setTrailer(movie)}
                />
              ))}

              {/* skeleton khi load more */}
              {loadingMore &&
                Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={`more-${i}`} />
                ))}
            </div>

            {/* load more button */}
            {hasMore && !loadingMore && (
              <div style={s.loadMoreRow}>
                <button style={s.loadMoreBtn} onClick={loadMore}>
                  Xem thêm phim {selectedMood?.emoji}
                </button>
              </div>
            )}
          </>
        )}

        {/* không có kết quả */}
        {!loading && selectedMood && movies.length === 0 && (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>😅</div>
            <p style={s.emptyTitle}>Không tìm thấy phim phù hợp</p>
            <p style={s.emptyDesc}>
              Thử đổi tâm trạng hoặc nhấn gợi ý khác nhé.
            </p>
            <button style={s.emptyBtn} onClick={handleRefresh}>
              Thử lại
            </button>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {showPicker && (
        <MoodPicker
          selectedMood={selectedMood}
          onSelect={handleSelectMood}
          onClose={() => setShowPicker(false)}
        />
      )}

      {trailer && (
        <TrailerModal movie={trailer} onClose={() => setTrailer(null)} />
      )}

      <ScrollToTop />
    </div>
  );
}

/* ── styles ─────────────────────────────── */
const s = {
  page: {
    minHeight: "100vh",
    background: "var(--bg-primary, #0f0f0f)",
    color: "var(--text-primary, #fff)",
  },
  hero: {
    position: "relative",
    padding: "80px 24px 36px",
    textAlign: "center",
    overflow: "hidden",
    transition: "border-color 0.4s",
  },
  heroBg: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    transition: "background 0.4s",
  },
  heroContent: { position: "relative", zIndex: 1 },
  heroEyebrow: {
    margin: "0 0 8px",
    fontSize: 13,
    color: "var(--text-muted, #888)",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  heroTitle: {
    margin: "0 0 10px",
    fontSize: "clamp(28px, 5vw, 44px)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
    transition: "all 0.3s",
  },
  heroDesc: {
    margin: "0 0 20px",
    fontSize: 16,
    color: "var(--text-secondary, #aaa)",
  },
  heroActions: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  changeBtn: {
    padding: "10px 22px",
    borderRadius: 10,
    border: "1.5px solid",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s",
    background: "transparent",
  },
  refreshBtn: {
    padding: "10px 18px",
    borderRadius: 10,
    border: "1.5px solid var(--border-mid, #333)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    background: "var(--bg-card, #1a1a1a)",
    color: "var(--text-secondary, #aaa)",
    transition: "all 0.2s",
  },

  /* mood bar */
  moodBar: {
    borderTop: "1px solid var(--border-mid, #222)",
    borderBottom: "1px solid var(--border-mid, #222)",
    padding: "12px 16px",
    overflowX: "auto",
    scrollbarWidth: "none",
  },
  moodBarInner: {
    display: "flex",
    gap: 8,
    width: "max-content",
    margin: "0 auto",
  },
  moodChip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 14px",
    borderRadius: 999,
    border: "1.5px solid var(--border-mid, #2a2a2a)",
    background: "var(--bg-card, #1a1a1a)",
    color: "var(--text-secondary, #aaa)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.18s",
  },
  chipLabel: { fontSize: 13 },

  /* content */
  content: {
    maxWidth: 1400,
    margin: "0 auto",
    padding: "28px 16px 60px",
  },
  resultHeader: {
    marginBottom: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultCount: {
    margin: 0,
    fontSize: 14,
    color: "var(--text-muted, #888)",
  },

  /* grid */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))",
    gap: 16,
  },

  /* load more */
  loadMoreRow: {
    marginTop: 32,
    display: "flex",
    justifyContent: "center",
  },
  loadMoreBtn: {
    padding: "12px 32px",
    borderRadius: 10,
    border: "1.5px solid var(--border-mid, #333)",
    background: "transparent",
    color: "var(--text-secondary, #ccc)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },

  /* empty state */
  emptyState: {
    textAlign: "center",
    padding: "80px 24px",
  },
  emptyIcon: { fontSize: 56, marginBottom: 16, lineHeight: 1 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "var(--text-primary, #fff)",
    margin: "0 0 8px",
  },
  emptyDesc: {
    fontSize: 14,
    color: "var(--text-muted, #888)",
    margin: "0 0 24px",
    maxWidth: 400,
    marginLeft: "auto",
    marginRight: "auto",
  },
  emptyBtn: {
    padding: "12px 28px",
    borderRadius: 10,
    border: "none",
    background: "var(--red, #e74c3c)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
};

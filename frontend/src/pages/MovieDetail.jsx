import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getMovieDetail,
  getTrailer,
  getCast,
  getSimilarMovies,
  addMovie,
} from "../api/movieApi";
import { useToast } from "../components/ToastContext";
import Navbar from "../components/Navbar";
import RemindButton from "../components/RemindButton";
import { checkReminder } from "../api/reminderApi";
function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();

  const [movie, setMovie] = useState(null);
  const [youtubeKey, setYoutubeKey] = useState(null);
  const [cast, setCast] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToList, setAddingToList] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);

  const castRef = useRef(null);
  const similarRef = useRef(null);
  const [isReminded, setIsReminded] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    setShowTrailer(false);
    setCast([]);
    setSimilar([]);

    Promise.all([
      getMovieDetail(id),
      getTrailer(id),
      getCast(id),
      getSimilarMovies(id),
    ])
      .then(([detailRes, trailerRes, castRes, similarRes]) => {
        const movieData = detailRes.data;

        setMovie(movieData);
        setYoutubeKey(trailerRes.data?.youtube_key || null);
        setCast(castRes.data || []);
        setSimilar(
          Array.isArray(similarRes.data)
            ? similarRes.data
            : similarRes.data?.results || [],
        );

        // ✅ check reminder ngay tại đây
        if (isUpcoming(movieData.release_date)) {
          checkReminder(movieData.id)
            .then((res) => setIsReminded(res.data.reminded))
            .catch(() => {});
        }
      })
      .catch((err) => {
        console.error(err);
        showToast("Không tải được thông tin phim.", "error");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToList = async () => {
    if (addingToList || !movie) return;
    setAddingToList(true);
    try {
      await addMovie({
        movie_id: movie.id,
        title: movie.title,
        poster: movie.poster,
      });
      showToast("Đã thêm vào Watchlist!", "success");
    } catch {
      showToast("Thêm thất bại, thử lại nhé.", "error");
    } finally {
      setAddingToList(false);
    }
  };

  const scroll = (ref, dir) => {
    if (ref.current)
      ref.current.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div style={s.loadingWrap}>
        <Navbar />
        <div style={s.spinner} />
        <p style={{ color: "var(--text-faint)", marginTop: 16, fontSize: 14 }}>
          Đang tải...
        </p>
        <style>{keyframes}</style>
      </div>
    );
  }

  if (!movie) return null;

  const rating = movie.rating ? Number(movie.rating).toFixed(1) : "N/A";
  const year = movie.release_date ? movie.release_date.slice(0, 4) : "";
  const ratingPercent = movie.rating ? (movie.rating / 10) * 100 : 0;
  const ratingColor =
    ratingPercent >= 70
      ? "var(--green)"
      : ratingPercent >= 50
        ? "#f1c40f"
        : "var(--red)";

  return (
    <div
      style={{
        background: "var(--hero-page-bg)",
        minHeight: "100vh",
        color: "var(--text-primary)",
        paddingTop: 56,
      }}
    >
      {/* ── SHARED NAVBAR ── */}
      <Navbar />

      {/* ── BACKDROP HERO ── */}
      <div style={{ position: "relative", width: "100%", height: "520px" }}>
        {movie.backdrop && (
          <img
            src={movie.backdrop}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, rgba(10,10,10,0.95) 30%, rgba(10,10,10,0.3) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, #0a0a0a 0%, transparent 50%)",
          }}
        />

        <button
          onClick={() => navigate(-1)}
          style={s.backBtn}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--border-mid)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "rgba(0,0,0,0.4)")
          }
        >
          ← Quay lại
        </button>

        <div style={s.heroContent}>
          {movie.tagline && <p style={s.tagline}>"{movie.tagline}"</p>}
          <h1 style={s.title}>{movie.title}</h1>

          <div style={s.metaRow}>
            {year && <span style={s.metaChip}>{year}</span>}
            {movie.runtime > 0 && (
              <span style={s.metaChip}>
                {Math.floor(movie.runtime / 60)}g {movie.runtime % 60}p
              </span>
            )}
            {movie.original_language && (
              <span style={{ ...s.metaChip, textTransform: "uppercase" }}>
                {movie.original_language}
              </span>
            )}
            <div style={s.ratingWrap}>
              <svg width="42" height="42" viewBox="0 0 42 42">
                <circle
                  cx="21"
                  cy="21"
                  r="17"
                  fill="none"
                  stroke="var(--border-mid)"
                  strokeWidth="3"
                />
                <circle
                  cx="21"
                  cy="21"
                  r="17"
                  fill="none"
                  stroke={ratingColor}
                  strokeWidth="3"
                  strokeDasharray={`${(ratingPercent / 100) * 106.8} 106.8`}
                  strokeLinecap="round"
                  transform="rotate(-90 21 21)"
                />
                <text
                  x="21"
                  y="25"
                  textAnchor="middle"
                  fill="var(--text-primary)"
                  fontSize="10"
                  fontWeight="600"
                >
                  {rating}
                </text>
              </svg>
              {movie.vote_count > 0 && (
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-faint)",
                    marginLeft: 6,
                  }}
                >
                  {movie.vote_count.toLocaleString()} lượt
                </span>
              )}
            </div>
          </div>

          {movie.genres?.length > 0 && (
            <div style={s.genreRow}>
              {movie.genres.map((g) => (
                <span key={g} style={s.genreTag}>
                  {g}
                </span>
              ))}
            </div>
          )}

          {movie.overview && <p style={s.overview}>{movie.overview}</p>}

          <div style={s.btnRow}>
            {youtubeKey && (
              <button
                onClick={() => setShowTrailer(true)}
                style={s.btnPrimary}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--red)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "var(--red)")
                }
              >
                ▶ Xem Trailer
              </button>
            )}
            <button
              onClick={handleAddToList}
              disabled={addingToList}
              style={{ ...s.btnSecondary, opacity: addingToList ? 0.6 : 1 }}
              onMouseEnter={(e) =>
                !addingToList &&
                (e.currentTarget.style.background = "rgba(255,255,255,0.18)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--border-mid)")
              }
            >
              {addingToList ? "Đang thêm..." : "+ My List"}
            </button>
            {/* ✅ REMIND BUTTON */}
            {isUpcoming(movie?.release_date) && (
              <RemindButton
                movie={movie}
                variant="pill"
                initialSet={isReminded}
                onToggle={setIsReminded}
              />
            )}
          </div>
        </div>

        {movie.poster && (
          <div style={s.posterWrap}>
            <img src={movie.poster} alt={movie.title} style={s.poster} />
          </div>
        )}
      </div>

      {/* ── INFO GRID ── */}
      <div style={s.infoGrid}>
        <InfoCard label="Năm phát hành" value={year || "—"} />
        <InfoCard label="Điểm đánh giá" value={`${rating} / 10`} />
        <InfoCard label="Thể loại" value={movie.genres?.join(", ") || "—"} />
        {movie.runtime > 0 && (
          <InfoCard
            label="Thời lượng"
            value={`${Math.floor(movie.runtime / 60)}g ${movie.runtime % 60}p`}
          />
        )}
        {movie.status && <InfoCard label="Trạng thái" value={movie.status} />}
        {movie.budget > 0 && (
          <InfoCard
            label="Kinh phí"
            value={`$${(movie.budget / 1_000_000).toFixed(0)}M`}
          />
        )}
        {movie.revenue > 0 && (
          <InfoCard
            label="Doanh thu"
            value={`$${(movie.revenue / 1_000_000).toFixed(0)}M`}
          />
        )}
      </div>

      {/* ── TRAILER ── */}
      {youtubeKey && showTrailer && (
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Trailer</h2>
          <div style={s.iframeWrap}>
            <iframe
              style={s.iframe}
              src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1&rel=0`}
              title={`Trailer: ${movie.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* ── CAST ── */}
      {cast.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>Diễn viên</h2>
            <div style={s.scrollBtns}>
              <button style={s.scrollBtn} onClick={() => scroll(castRef, -1)}>
                ‹
              </button>
              <button style={s.scrollBtn} onClick={() => scroll(castRef, 1)}>
                ›
              </button>
            </div>
          </div>
          <div ref={castRef} style={s.scrollRow}>
            {cast.map((person) => (
              <CastCard key={person.id} person={person} />
            ))}
          </div>
        </div>
      )}

      {/* ── SIMILAR MOVIES ── */}
      {similar.length > 0 && (
        <div style={{ ...s.section, paddingBottom: 60 }}>
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>Phim tương tự</h2>
            <div style={s.scrollBtns}>
              <button
                style={s.scrollBtn}
                onClick={() => scroll(similarRef, -1)}
              >
                ‹
              </button>
              <button style={s.scrollBtn} onClick={() => scroll(similarRef, 1)}>
                ›
              </button>
            </div>
          </div>
          <div ref={similarRef} style={s.scrollRow}>
            {similar.map((m) => (
              <SimilarCard
                key={m.id}
                movie={m}
                onNavigate={() => navigate(`/movie/${m.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      <style>{keyframes}</style>
    </div>
  );
}

/* ── CAST CARD ── */
function CastCard({ person }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div style={s.castCard}>
      <div style={s.castImgWrap}>
        {person.profile && !imgError ? (
          <img
            src={person.profile}
            alt={person.name}
            style={s.castImg}
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={s.castImgPlaceholder}>
            {person.name?.[0]?.toUpperCase() || "?"}
          </div>
        )}
      </div>
      <p style={s.castName}>{person.name}</p>
      {person.character && <p style={s.castChar}>{person.character}</p>}
    </div>
  );
}

/* ── SIMILAR CARD ── */
function SimilarCard({ movie, onNavigate }) {
  const [hover, setHover] = useState(false);
  const rating = movie.rating ? Number(movie.rating).toFixed(1) : "N/A";
  const year = movie.release_date ? movie.release_date.slice(0, 4) : "";

  return (
    <div
      onClick={onNavigate}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...s.similarCard,
        transform: hover ? "scale(1.04)" : "scale(1)",
        boxShadow: hover
          ? "0 12px 40px rgba(0,0,0,0.7)"
          : "0 4px 16px rgba(0,0,0,0.4)",
      }}
    >
      {movie.poster ? (
        <img
          src={movie.poster}
          alt={movie.title}
          style={s.similarImg}
          loading="lazy"
        />
      ) : (
        <div style={s.similarImgPlaceholder}>🎬</div>
      )}
      <div style={s.similarOverlay}>
        <p style={s.similarTitle}>{movie.title}</p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            ⭐ {rating}
          </span>
          {year && (
            <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
              {year}
            </span>
          )}
        </div>
      </div>
      {hover && <div style={s.similarHoverBadge}>Xem chi tiết →</div>}
    </div>
  );
}

/* ── INFO CARD ── */
function InfoCard({ label, value }) {
  return (
    <div style={s.infoCard}>
      <span style={s.infoLabel}>{label}</span>
      <span style={s.infoValue}>{value}</span>
    </div>
  );
}
function isUpcoming(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) > new Date();
}
/* ── STYLES ── */
const s = {
  loadingWrap: {
    background: "var(--hero-page-bg)",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    width: 40,
    height: 40,
    border: "3px solid rgba(255,255,255,0.1)",
    borderTop: "3px solid #e50914",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  backBtn: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 10,
    background: "rgba(0,0,0,0.4)",
    border: "1px solid var(--border-mid)",
    color: "var(--text-primary)",
    padding: "8px 16px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    backdropFilter: "blur(6px)",
    transition: "background 0.2s",
  },
  heroContent: {
    position: "absolute",
    bottom: 60,
    left: 40,
    maxWidth: 560,
    zIndex: 5,
  },
  tagline: {
    fontSize: 14,
    fontStyle: "italic",
    color: "var(--text-muted)",
    margin: "0 0 10px",
  },
  title: {
    fontSize: "clamp(26px, 4vw, 44px)",
    fontWeight: 700,
    margin: "0 0 14px",
    lineHeight: 1.15,
    textShadow: "0 2px 12px rgba(0,0,0,0.6)",
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  metaChip: {
    background: "var(--border-mid)",
    border: "1px solid var(--border-bright)",
    borderRadius: 6,
    padding: "3px 10px",
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  ratingWrap: { display: "flex", alignItems: "center" },
  genreRow: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  genreTag: {
    background: "var(--red-dim)",
    border: "1px solid rgba(229,9,20,0.4)",
    color: "var(--red-text)",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 500,
  },
  overview: {
    fontSize: 15,
    lineHeight: 1.7,
    color: "var(--text-secondary)",
    margin: "0 0 24px",
    maxWidth: 520,
    display: "-webkit-box",
    WebkitLineClamp: 4,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  btnRow: { display: "flex", gap: 12, flexWrap: "wrap" },
  btnPrimary: {
    background: "var(--red)",
    border: "none",
    color: "var(--text-primary)",
    padding: "12px 24px",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  btnSecondary: {
    background: "var(--border-mid)",
    border: "1px solid var(--border-bright)",
    color: "var(--text-primary)",
    padding: "12px 24px",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s",
    backdropFilter: "blur(4px)",
  },
  posterWrap: { position: "absolute", right: 60, bottom: 40, zIndex: 5 },
  poster: {
    width: 160,
    borderRadius: 12,
    boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 14,
    padding: "32px 40px 0",
  },
  infoCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "14px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  infoLabel: {
    fontSize: 11,
    color: "var(--text-faint)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  infoValue: { fontSize: 15, fontWeight: 500, color: "var(--text-primary)" },

  section: { padding: "40px 40px 0" },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 600,
    margin: 0,
    color: "var(--text-primary)",
  },
  scrollBtns: { display: "flex", gap: 6 },
  scrollBtn: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: "var(--border)",
    border: "1px solid var(--border-mid)",
    color: "var(--text-primary)",
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.15s",
    lineHeight: 1,
  },
  scrollRow: {
    display: "flex",
    gap: 14,
    overflowX: "auto",
    scrollbarWidth: "none",
    paddingBottom: 8,
  },

  iframeWrap: {
    position: "relative",
    paddingTop: "56.25%",
    borderRadius: 12,
    overflow: "hidden",
    background: "#000",
    maxWidth: 860,
  },
  iframe: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    border: "none",
  },

  castCard: {
    flexShrink: 0,
    width: 110,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  castImgWrap: {
    width: 90,
    height: 90,
    borderRadius: "50%",
    overflow: "hidden",
    flexShrink: 0,
    border: "2px solid rgba(255,255,255,0.08)",
  },
  castImg: { width: "100%", height: "100%", objectFit: "cover" },
  castImgPlaceholder: {
    width: "100%",
    height: "100%",
    background: "var(--bg-input2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    color: "var(--text-faint)",
  },
  castName: {
    margin: 0,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-primary)",
    textAlign: "center",
    lineHeight: 1.3,
  },
  castChar: {
    margin: 0,
    fontSize: 11,
    color: "rgba(255,255,255,0.38)",
    textAlign: "center",
    lineHeight: 1.3,
    fontStyle: "italic",
  },

  similarCard: {
    flexShrink: 0,
    width: 150,
    borderRadius: 10,
    overflow: "hidden",
    cursor: "pointer",
    position: "relative",
    transition: "transform 0.25s, box-shadow 0.25s",
    background: "var(--bg-card)",
  },
  similarImg: {
    width: "100%",
    aspectRatio: "2/3",
    objectFit: "cover",
    display: "block",
  },
  similarImgPlaceholder: {
    width: "100%",
    aspectRatio: "2/3",
    background: "var(--bg-input2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 32,
  },
  similarOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    background:
      "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%)",
    padding: "24px 10px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  similarTitle: {
    margin: 0,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-primary)",
    lineHeight: 1.3,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  similarHoverBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    background: "rgba(229,9,20,0.9)",
    color: "var(--text-primary)",
    fontSize: 10,
    fontWeight: 600,
    padding: "3px 7px",
    borderRadius: 6,
    backdropFilter: "blur(4px)",
  },
};

const keyframes = `
  @keyframes spin { to { transform: rotate(360deg); } }
  ::-webkit-scrollbar { display: none; }
`;

export default MovieDetail;

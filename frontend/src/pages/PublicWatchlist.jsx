import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getPublicWatchlist } from "../api/movieApi";

export default function PublicWatchlist() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicWatchlist(token)
      .then((res) => setData(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingScreen />;
  if (error || !data) return <NotFound />;

  const watched = data.watched;
  const total = data.total;
  const pct = total > 0 ? Math.round((watched / total) * 100) : 0;

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <Link to="/" style={s.logo}>
            Films
          </Link>
          <span style={s.publicBadge}>🔓 Danh sách công khai</span>
        </div>

        <h1 style={s.title}>
          {data.owner_username
            ? `Watchlist của ${data.owner_username}`
            : "Watchlist được chia sẻ"}
        </h1>

        {/* Stats row */}
        <div style={s.statsRow}>
          <Chip icon="🎬" label={`${total} phim`} />
          <Chip icon="✅" label={`${watched} đã xem`} />
          <Chip icon="📈" label={`${pct}% hoàn thành`} />
        </div>

        {/* Progress */}
        <div style={s.progressBg}>
          <div style={{ ...s.progressFill, width: `${pct}%` }} />
        </div>

        {/* Movie grid */}
        <div style={s.grid}>
          {data.movies.map((movie) => (
            <Link
              key={movie.id}
              to={`/movie/${movie.movie_id}`}
              style={{ textDecoration: "none" }}
            >
              <div style={s.card}>
                <div style={{ position: "relative" }}>
                  <img
                    src={
                      movie.poster ||
                      "https://via.placeholder.com/160x235?text=?"
                    }
                    alt={movie.title}
                    style={s.poster}
                  />
                  {movie.is_watched && <div style={s.watchedBadge}>✓</div>}
                </div>
                <div style={s.cardInfo}>
                  <p style={s.cardTitle}>{movie.title}</p>
                  {movie.note && <p style={s.cardNote}>💬 {movie.note}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <p style={s.footer}>
          Tạo watchlist của bạn tại{" "}
          <Link to="/" style={{ color: "#e50914" }}>
            Films
          </Link>
        </p>
      </div>
    </div>
  );
}

function Chip({ icon, label }) {
  return (
    <span
      style={{
        background: "rgba(255,255,255,0.07)",
        borderRadius: 20,
        padding: "4px 12px",
        fontSize: 13,
      }}
    >
      {icon} {label}
    </span>
  );
}

function LoadingScreen() {
  return (
    <div
      style={{
        background: "#0a0a0a",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <p style={{ color: "rgba(255,255,255,0.4)" }}>Đang tải...</p>
    </div>
  );
}

function NotFound() {
  return (
    <div
      style={{
        background: "#0a0a0a",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
      }}
    >
      <p style={{ fontSize: 40 }}>🚫</p>
      <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
        Không tìm thấy danh sách
      </p>
      <p
        style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: 14,
          marginBottom: 20,
        }}
      >
        Link có thể đã hết hạn hoặc người dùng đã tắt chia sẻ.
      </p>
      <Link to="/" style={{ color: "#e50914", fontSize: 14 }}>
        ← Về trang chủ
      </Link>
    </div>
  );
}

const s = {
  page: {
    background: "#0a0a0a",
    minHeight: "100vh",
    color: "white",
    padding: "24px 20px",
  },
  container: { maxWidth: 900, margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    color: "#e50914",
    fontSize: 22,
    fontWeight: 700,
    textDecoration: "none",
    letterSpacing: 1,
  },
  publicBadge: {
    fontSize: 12,
    background: "rgba(255,255,255,0.07)",
    padding: "4px 12px",
    borderRadius: 20,
    color: "rgba(255,255,255,0.5)",
  },
  title: {
    fontSize: "clamp(20px, 4vw, 30px)",
    fontWeight: 700,
    margin: "0 0 16px",
  },
  statsRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  progressBg: {
    height: 6,
    background: "rgba(255,255,255,0.08)",
    borderRadius: 3,
    marginBottom: 32,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #e50914, #ff6b6b)",
    borderRadius: 3,
    transition: "width 0.6s ease",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: 16,
  },
  card: {
    borderRadius: 10,
    overflow: "hidden",
    background: "#181818",
    border: "1px solid rgba(255,255,255,0.06)",
    transition: "transform 0.2s",
  },
  poster: {
    width: "100%",
    aspectRatio: "2/3",
    objectFit: "cover",
    display: "block",
  },
  cardInfo: { padding: "10px" },
  cardTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    color: "white",
    lineHeight: 1.3,
  },
  cardNote: {
    margin: "4px 0 0",
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    fontStyle: "italic",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  watchedBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    background: "#2ecc71",
    color: "white",
    borderRadius: "50%",
    width: 22,
    height: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
  },
  footer: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 13,
    color: "rgba(255,255,255,0.25)",
  },
};

// src/pages/PublicProfilePage.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getPublicProfile } from "../api/publicProfileApi";
import Navbar from "../components/Navbar";

const GENRE_COLORS = ["#e50914", "#f5c518", "#60a5fa", "#4ade80", "#c084fc"];

function fmtPct(watched, total) {
  if (!total) return "0%";
  return Math.round((watched / total) * 100) + "%";
}

/* ── Avatar — ưu tiên avatar_url (Google), fallback emoji, fallback chữ cái ── */
function Avatar({ profile, size = 96 }) {
  const [imgErr, setImgErr] = useState(false);

  // Google user có avatar_url
  if (profile.avatar_url && !imgErr) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.username}
        onError={() => setImgErr(true)}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
        }}
      />
    );
  }

  // User thường có emoji avatar
  if (profile.avatar) {
    return (
      <span style={{ fontSize: size * 0.5, lineHeight: 1, userSelect: "none" }}>
        {profile.avatar}
      </span>
    );
  }

  // Fallback chữ cái đầu
  return (
    <span
      style={{
        fontSize: size * 0.38,
        fontWeight: 800,
        color: "#fff",
        fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
        letterSpacing: "0.05em",
      }}
    >
      {(profile.username || "?")[0].toUpperCase()}
    </span>
  );
}

/* ── Stat card ── */
function StatCard({ value, label, color, icon }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 90,
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${color}22`,
        borderTop: `2px solid ${color}`,
        borderRadius: "0 0 12px 12px",
        padding: "18px 16px 16px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at top, ${color}10 0%, transparent 60%)`,
          pointerEvents: "none",
        }}
      />
      <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color,
          lineHeight: 1,
          fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
          letterSpacing: "0.04em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "rgba(140,155,195,0.45)",
          marginTop: 5,
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ── Movie poster card — đồng đều kích thước ── */
function MovieCard({ movie }) {
  const [imgErr, setImgErr] = useState(false);
  const [hov, setHov] = useState(false);

  return (
    <Link
      to={`/movie/${movie.movie_id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          position: "relative",
          width: "100%",
          paddingBottom: "150%" /* aspect-ratio 2:3 — đồng đều mọi card */,
          borderRadius: 10,
          overflow: "hidden",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(100,120,175,0.12)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          transform: hov ? "translateY(-4px) scale(1.02)" : "none",
          boxShadow: hov
            ? "0 16px 40px rgba(0,0,0,0.7)"
            : "0 4px 16px rgba(0,0,0,0.4)",
          cursor: "pointer",
        }}
      >
        {/* Poster */}
        <div style={{ position: "absolute", inset: 0 }}>
          {movie.poster && !imgErr ? (
            <img
              src={movie.poster}
              alt={movie.title}
              onError={() => setImgErr(true)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
              loading="lazy"
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                background: "rgba(255,255,255,0.03)",
              }}
            >
              🎬
            </div>
          )}
        </div>

        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "55%",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)",
          }}
        />

        {/* Title */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "8px 8px 7px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 10.5,
              fontWeight: 600,
              lineHeight: 1.3,
              color: "#f0f4ff",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              opacity: hov ? 1 : 0.85,
              transition: "opacity 0.2s",
            }}
          >
            {movie.title}
          </p>
        </div>

        {/* Watched badge */}
        {movie.is_watched && (
          <div
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "rgba(34,197,94,0.92)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 800,
              color: "#fff",
              boxShadow: "0 2px 8px rgba(34,197,94,0.5)",
            }}
          >
            ✓
          </div>
        )}
      </div>
    </Link>
  );
}

/* ════════════════════════════════════════════
   MAIN
════════════════════════════════════════════ */
export default function PublicProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setEntered(false);
    getPublicProfile(username)
      .then((r) => {
        setProfile(r.data);
        setTimeout(() => setEntered(true), 60);
      })
      .catch((err) => {
        if (err?.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [username]);

  /* ── Loading skeleton ── */
  if (loading)
    return (
      <div style={s.page}>
        <Navbar />
        <div style={{ ...s.center, gap: 16 }}>
          <div style={s.spinner} />
          <span style={{ color: "rgba(140,155,195,0.4)", fontSize: 13 }}>
            Đang tải...
          </span>
        </div>
        <style>{css}</style>
      </div>
    );

  /* ── 404 ── */
  if (notFound || !profile)
    return (
      <div style={s.page}>
        <Navbar />
        <div style={s.center}>
          <div
            style={{ fontSize: 64, marginBottom: 20, filter: "grayscale(0.3)" }}
          >
            🎬
          </div>
          <h2
            style={{
              color: "var(--text-primary,#f0f4ff)",
              margin: "0 0 10px",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            Không tìm thấy người dùng
          </h2>
          <p
            style={{
              color: "rgba(140,155,195,0.45)",
              fontSize: 14,
              margin: "0 0 28px",
            }}
          >
            <strong style={{ color: "rgba(229,9,20,0.7)" }}>@{username}</strong>{" "}
            không tồn tại hoặc đã bị xoá.
          </p>
          <button onClick={() => navigate(-1)} style={s.backBtn}>
            ← Quay lại
          </button>
        </div>
        <style>{css}</style>
      </div>
    );

  const { stats, recent_movies } = profile;
  const completePct = fmtPct(stats.watched, stats.total);

  return (
    <div style={s.page}>
      <Navbar />

      {/* ════ HERO ════ */}
      <div style={s.hero}>
        {/* Backgrounds */}
        <div style={s.heroBg} />
        <div
          style={{
            ...s.heroGlow,
            opacity: entered ? 1 : 0,
            transition: "opacity 1s ease 0.3s",
          }}
        />
        {/* Subtle grid */}
        <div style={s.heroGrid} />

        <div
          style={{
            ...s.heroInner,
            opacity: entered ? 1 : 0,
            transform: entered ? "translateY(0)" : "translateY(20px)",
            transition:
              "opacity 0.5s ease, transform 0.55s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* Avatar ring */}
          <div style={s.avatarRing}>
            <div style={s.avatarCircle}>
              <Avatar profile={profile} size={90} />
            </div>
          </div>

          {/* Info */}
          <div style={s.heroInfo}>
            <div style={s.badge}>✦ Thành viên Filmverse</div>
            <h1 style={s.heroName}>{profile.username}</h1>
            {profile.bio && (
              <p style={s.heroBio}>
                <span style={{ opacity: 0.4 }}>"</span>
                {profile.bio}
                <span style={{ opacity: 0.4 }}>"</span>
              </p>
            )}
          </div>

          {/* Stats inline (desktop) */}
          <div style={s.heroStats}>
            {[
              { v: stats.total, label: "Đã lưu", color: "#60a5fa", icon: "🎬" },
              {
                v: stats.watched,
                label: "Đã xem",
                color: "#4ade80",
                icon: "✓",
              },
              {
                v: completePct,
                label: "Hoàn thành",
                color: "#f5c518",
                icon: "%",
              },
            ].map(({ v, label, color, icon }) => (
              <StatCard
                key={label}
                value={v}
                label={label}
                color={color}
                icon={icon}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ════ BODY ════ */}
      <div
        style={{
          ...s.body,
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.5s ease 0.15s, transform 0.5s ease 0.15s",
        }}
      >
        <div style={s.grid}>
          {/* ── Thể loại yêu thích ── */}
          {stats.top_genres?.length > 0 && (
            <section style={s.card}>
              <h2 style={s.sectionTitle}>
                <span style={s.sectionDot} />
                Thể loại yêu thích
              </h2>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                {stats.top_genres.map((g, i) => {
                  const pct = Math.round(
                    (g.count / (stats.top_genres[0]?.count || 1)) * 100,
                  );
                  const color = GENRE_COLORS[i] || "#60a5fa";
                  return (
                    <div key={g.genre_id}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 7,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: color,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "rgba(210,220,245,0.85)",
                            }}
                          >
                            {g.genre_name}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            color: "rgba(130,145,185,0.45)",
                            fontWeight: 500,
                          }}
                        >
                          {g.count} phim
                        </span>
                      </div>
                      <div
                        style={{
                          height: 5,
                          background: "rgba(255,255,255,0.05)",
                          borderRadius: 99,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 99,
                            background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                            width: entered ? `${pct}%` : "0%",
                            transition: `width 1.1s cubic-bezier(0.4,0,0.2,1) ${0.3 + i * 0.08}s`,
                            boxShadow: `0 0 10px ${color}55`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Phim gần nhất ── */}
          {recent_movies?.length > 0 && (
            <section style={s.card}>
              <h2 style={s.sectionTitle}>
                <span style={s.sectionDot} />
                Xem gần đây
              </h2>
              {/* Grid đồng đều — mỗi card tự giữ aspect-ratio 2:3 */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                }}
              >
                {recent_movies.map((m, i) => (
                  <div
                    key={m.movie_id}
                    style={{
                      opacity: entered ? 1 : 0,
                      transform: entered ? "translateY(0)" : "translateY(10px)",
                      transition: `opacity 0.4s ease ${0.2 + i * 0.06}s, transform 0.4s ease ${0.2 + i * 0.06}s`,
                    }}
                  >
                    <MovieCard movie={m} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Watchlist link ── */}
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <p
            style={{
              fontSize: 12,
              color: "rgba(130,145,185,0.35)",
              marginBottom: 8,
            }}
          >
            Muốn xem toàn bộ watchlist?
          </p>
        </div>
      </div>

      <style>{css}</style>
    </div>
  );
}

/* ── Styles ── */
const s = {
  page: {
    background: "var(--bg-page,#080b0f)",
    minHeight: "100vh",
    color: "var(--text-primary,#f0f4ff)",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
    paddingTop: 60,
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: 12,
    padding: 24,
  },

  /* Hero */
  hero: {
    position: "relative",
    overflow: "hidden",
    padding: "clamp(32px,5vh,64px) clamp(20px,6vw,72px)",
    borderBottom: "1px solid rgba(100,120,175,0.1)",
    minHeight: 200,
  },
  heroBg: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(140deg,rgba(229,9,20,0.09) 0%,rgba(6,9,16,0.97) 45%,rgba(30,50,120,0.06) 100%)",
  },
  heroGlow: {
    position: "absolute",
    top: -120,
    left: -80,
    width: 560,
    height: 560,
    borderRadius: "50%",
    pointerEvents: "none",
    background: "radial-gradient(circle,rgba(229,9,20,0.1) 0%,transparent 60%)",
  },
  heroGrid: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)",
    backgroundSize: "60px 60px",
  },
  heroInner: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    gap: "clamp(16px,3vw,40px)",
    flexWrap: "wrap",
  },
  avatarRing: {
    width: 108,
    height: 108,
    flexShrink: 0,
    borderRadius: "50%",
    padding: 3,
    background:
      "linear-gradient(135deg,rgba(229,9,20,0.8) 0%,rgba(80,100,240,0.4) 100%)",
    boxShadow: "0 0 0 1px rgba(229,9,20,0.2), 0 12px 40px rgba(229,9,20,0.25)",
  },
  avatarCircle: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background: "rgba(10,14,24,0.98)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroInfo: { flex: 1, minWidth: 180 },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.16em",
    color: "rgba(245,197,24,0.75)",
    textTransform: "uppercase",
    background: "rgba(245,197,24,0.06)",
    border: "1px solid rgba(245,197,24,0.15)",
    borderRadius: 99,
    padding: "3px 10px",
    marginBottom: 10,
  },
  heroName: {
    margin: "0 0 7px",
    fontSize: "clamp(24px,4vw,46px)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "var(--text-primary,#f0f4ff)",
    lineHeight: 1.05,
  },
  heroBio: {
    margin: 0,
    fontSize: 13.5,
    lineHeight: 1.65,
    color: "rgba(175,190,225,0.6)",
    fontStyle: "italic",
    maxWidth: 400,
  },
  heroStats: {
    display: "flex",
    gap: 8,
    marginLeft: "auto",
    flexWrap: "wrap",
    alignSelf: "flex-end",
  },

  /* Body */
  body: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "36px clamp(20px,5vw,64px) 80px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 24,
    alignItems: "start",
  },
  card: {
    background: "rgba(255,255,255,0.016)",
    border: "1px solid rgba(100,120,175,0.1)",
    borderRadius: 18,
    padding: "24px 26px",
  },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "0 0 20px",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "rgba(140,155,195,0.5)",
  },
  sectionDot: {
    display: "inline-block",
    width: 3,
    height: 16,
    borderRadius: 2,
    background: "var(--red,#e50914)",
    flexShrink: 0,
  },

  backBtn: {
    padding: "11px 26px",
    borderRadius: 10,
    border: "1px solid rgba(100,120,175,0.2)",
    background: "rgba(255,255,255,0.03)",
    color: "rgba(160,175,210,0.7)",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s",
  },
  spinner: {
    width: 30,
    height: 30,
    border: "2px solid rgba(255,255,255,0.06)",
    borderTop: "2px solid var(--red,#e50914)",
    borderRadius: "50%",
    animation: "spin 0.75s linear infinite",
  },
};

const css = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (max-width: 640px) {
    .hero-stats { display: none !important; }
  }
`;

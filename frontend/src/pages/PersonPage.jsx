// src/pages/PersonPage.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getPersonDetail, getPersonCredits } from "../api/personApi";
import { addMovie } from "../api/movieApi";
import { useToast } from "../components/ToastContext";
import Navbar from "../components/Navbar";

/* ── helpers ──────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
  }
}
function calcAge(birthday, deathday) {
  if (!birthday) return null;
  const end = deathday ? new Date(deathday) : new Date();
  const age = Math.floor(
    (end - new Date(birthday)) / (365.25 * 24 * 3600 * 1000),
  );
  return age > 0 ? age : null;
}
function scoreColor(n) {
  if (n >= 7.5) return "#22c55e";
  if (n >= 6.0) return "#eab308";
  if (n >= 4.0) return "#f97316";
  return "#ef4444";
}
function genderLabel(g) {
  if (g === 1) return "Nữ";
  if (g === 2) return "Nam";
  return null;
}

/* ── Icons ────────────────────────────────────────── */
const IconBack = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const IconPlus = ({ saved }) =>
  saved ? (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ) : (
    <svg
      width="13"
      height="13"
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

/* ── Film credit card ─────────────────────────────── */
function CreditCard({ movie }) {
  const [hov, setHov] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const showToast = useToast();
  const navigate = useNavigate();

  const n = Number(movie.rating) || 0;
  const year = (movie.release_date || "").slice(0, 4);
  const col = scoreColor(n);

  const handleAdd = async (e) => {
    e.stopPropagation();
    if (saving || saved) return;
    setSaving(true);
    try {
      await addMovie({
        movie_id: movie.id,
        title: movie.title,
        poster: movie.poster,
      });
      setSaved(true);
      showToast(`"${movie.title}" đã thêm vào Watchlist!`, "success");
    } catch {
      showToast("Thêm thất bại.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={() => navigate(`/movie/${movie.id}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...s.creditCard,
        transform: hov ? "translateY(-6px) scale(1.03)" : "none",
        boxShadow: hov
          ? "0 20px 48px rgba(0,0,0,0.85), 0 0 0 1.5px rgba(229,9,20,0.4)"
          : "0 4px 20px rgba(0,0,0,0.5)",
      }}
    >
      {/* Poster */}
      <div style={s.creditPosterWrap}>
        {movie.poster && !imgErr ? (
          <img
            src={movie.poster}
            alt={movie.title}
            style={{
              ...s.creditPoster,
              transform: hov ? "scale(1.07)" : "scale(1)",
            }}
            onError={() => setImgErr(true)}
            loading="lazy"
          />
        ) : (
          <div style={s.creditPosterFallback}>🎬</div>
        )}
        <div style={s.creditGrad} />

        {/* Rating badge */}
        {n > 0 && (
          <div style={{ ...s.ratingBadge, color: col, borderColor: col }}>
            ★ {n.toFixed(1)}
          </div>
        )}

        {/* Hover: Add to watchlist button */}
        <button
          onClick={handleAdd}
          disabled={saving || saved}
          style={{
            ...s.addBtn,
            ...(saved ? s.addBtnSaved : {}),
            opacity: hov ? 1 : 0,
            transform: hov ? "translateY(0)" : "translateY(6px)",
          }}
        >
          <IconPlus saved={saved} />
          <span>{saved ? "Đã lưu" : saving ? "…" : "My List"}</span>
        </button>
      </div>

      {/* Info */}
      <div style={s.creditInfo}>
        <p style={s.creditTitle}>{movie.title}</p>
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {year && <span style={s.creditYear}>{year}</span>}
          {movie.character && (
            <span style={s.creditRole}>vai {movie.character}</span>
          )}
          {movie.job && !movie.character && (
            <span style={{ ...s.creditRole, color: "#f5c518" }}>
              {movie.job}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Bio text with expand/collapse ───────────────── */
function BioText({ text }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 400;
  if (!text) return <p style={s.bioEmpty}>Chưa có tiểu sử.</p>;
  const short = text.length > LIMIT;
  return (
    <div>
      <p style={s.bioText}>
        {short && !expanded ? text.slice(0, LIMIT) + "…" : text}
      </p>
      {short && (
        <button onClick={() => setExpanded((p) => !p)} style={s.bioToggle}>
          {expanded ? "Thu gọn ▲" : "Xem thêm ▼"}
        </button>
      )}
    </div>
  );
}

/* ── Filmography tab switcher ─────────────────────── */
function FilmTabs({ active, onChange, castCount, crewCount }) {
  return (
    <div style={s.filmTabs}>
      {[
        { key: "cast", label: "Vai diễn", count: castCount },
        { key: "crew", label: "Đạo diễn / Biên kịch", count: crewCount },
      ]
        .filter((t) => t.count > 0)
        .map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            style={{
              ...s.filmTab,
              ...(active === key ? s.filmTabActive : {}),
            }}
          >
            {label}
            <span
              style={{
                ...s.filmTabCount,
                background:
                  active === key ? "rgba(229,9,20,0.25)" : "var(--bg-card2)",
                color:
                  active === key
                    ? "var(--red-text,#ff6b6b)"
                    : "var(--text-faint)",
              }}
            >
              {count}
            </span>
          </button>
        ))}
    </div>
  );
}

/* ── Skeleton ─────────────────────────────────────── */
function Skeleton() {
  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      <Navbar />
      <div
        style={{
          height: 280,
          background: "var(--bg-surface)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={s.shimmer} />
      </div>
      <div
        style={{
          padding: "32px clamp(20px,5vw,64px)",
          display: "flex",
          gap: 32,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: 160,
            height: 240,
            borderRadius: 12,
            background: "var(--bg-card)",
          }}
        />
        <div style={{ flex: 1, minWidth: 200 }}>
          {[260, 180, 200].map((w, i) => (
            <div
              key={i}
              style={{
                height: 18,
                width: w,
                borderRadius: 6,
                background: "var(--bg-card)",
                marginBottom: 14,
              }}
            />
          ))}
        </div>
      </div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════ */
export default function PersonPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [person, setPerson] = useState(null);
  const [credits, setCredits] = useState({ cast: [], crew: [] });
  const [loading, setLoading] = useState(true);
  const [filmTab, setFilmTab] = useState("cast");
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    setEntered(false);
    Promise.all([getPersonDetail(id), getPersonCredits(id)])
      .then(([pd, pc]) => {
        setPerson(pd.data);
        const c = pc.data;
        setCredits(c);
        // Nếu không có vai diễn nhưng có crew thì mặc định tab crew
        if (!c.cast?.length && c.crew?.length) setFilmTab("crew");
      })
      .catch(() => navigate(-1))
      .finally(() => {
        setLoading(false);
        setTimeout(() => setEntered(true), 60);
      });
  }, [id]);

  if (loading) return <Skeleton />;
  if (!person) return null;

  const age = calcAge(person.birthday, person.deathday);
  const films = filmTab === "cast" ? credits.cast : credits.crew;
  const dept = person.known_for_department;

  return (
    <div style={s.page}>
      <Navbar />

      {/* ════ HERO — backdrop từ phim nổi tiếng nhất ════ */}
      <div style={s.hero}>
        {/* Background: dùng backdrop của phim đầu tiên trong filmography */}
        {(credits.cast[0]?.backdrop || credits.crew[0]?.backdrop) && (
          <img
            src={credits.cast[0]?.backdrop || credits.crew[0]?.backdrop}
            alt=""
            style={s.heroBg}
          />
        )}
        <div style={s.heroGradLeft} />
        <div style={s.heroGradBottom} />

        {/* Back button */}
        <button
          style={s.backBtn}
          onClick={() => navigate(-1)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(229,9,20,0.2)";
            e.currentTarget.style.borderColor = "var(--red-border)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              "var(--bg-glass,rgba(14,18,24,0.75))";
            e.currentTarget.style.borderColor = "var(--border-mid)";
          }}
        >
          <IconBack /> <span>Quay lại</span>
        </button>
      </div>

      {/* ════ PROFILE CARD ════ */}
      <div
        style={{
          ...s.profileSection,
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(20px)",
          transition:
            "opacity 0.5s ease, transform 0.5s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Avatar */}
        <div style={s.avatarWrap}>
          {person.profile_hd ? (
            <img src={person.profile_hd} alt={person.name} style={s.avatar} />
          ) : (
            <div style={s.avatarFallback}>
              <span style={{ fontSize: 52, color: "var(--text-faint)" }}>
                {person.name?.[0]?.toUpperCase() || "?"}
              </span>
            </div>
          )}
          {/* Department badge */}
          {dept && (
            <div style={s.deptBadge}>
              {dept === "Acting"
                ? "🎭 Diễn viên"
                : dept === "Directing"
                  ? "🎬 Đạo diễn"
                  : dept}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={s.profileInfo}>
          <h1 style={s.personName}>{person.name}</h1>

          {/* Meta pills */}
          <div style={s.metaRow}>
            {genderLabel(person.gender) && (
              <span style={s.metaChip}>{genderLabel(person.gender)}</span>
            )}
            {person.birthday && (
              <span style={s.metaChip}>
                Sinh {fmtDate(person.birthday)}
                {age && !person.deathday ? ` (${age} tuổi)` : ""}
              </span>
            )}
            {person.deathday && (
              <span
                style={{
                  ...s.metaChip,
                  borderColor: "rgba(148,163,184,0.3)",
                  color: "var(--text-faint)",
                }}
              >
                Mất {fmtDate(person.deathday)}
                {age ? ` (${age} tuổi)` : ""}
              </span>
            )}
            {person.place_of_birth && (
              <span style={s.metaChip}>📍 {person.place_of_birth}</span>
            )}
          </div>

          {/* Stats */}
          <div style={s.statRow}>
            {credits.cast.length > 0 && (
              <div style={s.statItem}>
                <span style={s.statNum}>{credits.cast.length}</span>
                <span style={s.statLabel}>Phim tham gia</span>
              </div>
            )}
            {credits.crew.length > 0 && (
              <div style={s.statItem}>
                <span style={s.statNum}>{credits.crew.length}</span>
                <span style={s.statLabel}>Phim thực hiện</span>
              </div>
            )}
            {person.popularity > 0 && (
              <div style={s.statItem}>
                <span style={s.statNum}>{Math.round(person.popularity)}</span>
                <span style={s.statLabel}>Độ phổ biến</span>
              </div>
            )}
          </div>

          {/* Biography */}
          <div style={s.bioSection}>
            <div style={s.sectionHead}>
              <div style={s.sectionAccent} />
              <span style={s.sectionTitle}>Tiểu sử</span>
            </div>
            <BioText text={person.biography} />
          </div>
        </div>
      </div>

      {/* ════ FILMOGRAPHY ════ */}
      {(credits.cast.length > 0 || credits.crew.length > 0) && (
        <div
          style={{
            ...s.filmSection,
            opacity: entered ? 1 : 0,
            transition: "opacity 0.5s ease 0.15s",
          }}
        >
          <div style={s.sectionHead}>
            <div style={s.sectionAccent} />
            <span style={s.sectionTitle}>Filmography</span>
          </div>

          <FilmTabs
            active={filmTab}
            onChange={setFilmTab}
            castCount={credits.cast.length}
            crewCount={credits.crew.length}
          />

          <div style={s.filmGrid}>
            {films.map((m) => (
              <CreditCard key={`${m.id}-${m.job || m.character}`} movie={m} />
            ))}
          </div>
        </div>
      )}

      <style>{css}</style>
    </div>
  );
}

/* ── Styles ───────────────────────────────────────── */
const s = {
  page: {
    background: "var(--bg-page)",
    minHeight: "100vh",
    color: "var(--text-primary)",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
    paddingBottom: 80,
  },

  /* ── Hero ── */
  hero: {
    position: "relative",
    height: 260,
    overflow: "hidden",
    marginTop: -60,
    paddingTop: 60,
  },
  heroBg: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "130%",
    objectFit: "cover",
    objectPosition: "center 30%",
    filter: "blur(2px) brightness(0.35)",
  },
  heroGradLeft: {
    position: "absolute",
    inset: 0,
    zIndex: 1,
    background:
      "linear-gradient(to right, rgba(8,11,15,0.95) 0%, rgba(8,11,15,0.6) 50%, transparent 100%)",
  },
  heroGradBottom: {
    position: "absolute",
    inset: 0,
    zIndex: 1,
    background: "linear-gradient(to top, var(--bg-page) 0%, transparent 50%)",
  },
  backBtn: {
    position: "absolute",
    top: "clamp(72px,12vh,90px)",
    left: "clamp(16px,3.5vw,48px)",
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "var(--bg-glass,rgba(14,18,24,0.75))",
    border: "1px solid var(--border-mid)",
    color: "var(--text-secondary)",
    padding: "7px 14px 7px 10px",
    borderRadius: 999,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    backdropFilter: "blur(12px)",
    fontFamily: "var(--font-body,sans-serif)",
    transition: "all 0.18s ease",
  },

  /* ── Profile section ── */
  profileSection: {
    display: "flex",
    gap: "clamp(24px,4vw,48px)",
    padding: "0 clamp(20px,5vw,64px) 0",
    marginTop: -80,
    position: "relative",
    zIndex: 5,
    flexWrap: "wrap",
    alignItems: "flex-start",
  },

  /* Avatar */
  avatarWrap: {
    flexShrink: 0,
    position: "relative",
  },
  avatar: {
    width: "clamp(130px,14vw,180px)",
    aspectRatio: "2/3",
    objectFit: "cover",
    borderRadius: 14,
    display: "block",
    boxShadow: "0 24px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08)",
  },
  avatarFallback: {
    width: "clamp(130px,14vw,180px)",
    aspectRatio: "2/3",
    borderRadius: 14,
    background: "var(--bg-card2)",
    border: "1px solid var(--border-mid)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  deptBadge: {
    position: "absolute",
    bottom: -10,
    left: "50%",
    transform: "translateX(-50%)",
    background: "var(--bg-overlay,#1a2030)",
    border: "1px solid var(--border-mid)",
    borderRadius: 999,
    padding: "4px 12px",
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text-secondary)",
    whiteSpace: "nowrap",
    boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
  },

  /* Info */
  profileInfo: {
    flex: 1,
    minWidth: 240,
    paddingTop: 32,
  },
  personName: {
    margin: "0 0 14px",
    fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
    fontSize: "clamp(30px,4vw,54px)",
    fontWeight: 400,
    letterSpacing: "0.03em",
    lineHeight: 1,
  },
  metaRow: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  metaChip: {
    fontSize: 12,
    fontWeight: 500,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 999,
    padding: "4px 12px",
    color: "var(--text-secondary)",
  },
  statRow: { display: "flex", gap: 24, marginBottom: 28, flexWrap: "wrap" },
  statItem: { display: "flex", flexDirection: "column", gap: 2 },
  statNum: {
    fontSize: 22,
    fontWeight: 800,
    color: "var(--text-primary)",
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 10,
    color: "var(--text-faint)",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },

  /* Bio */
  bioSection: { maxWidth: 680 },
  bioText: {
    margin: 0,
    fontSize: 14,
    color: "var(--text-secondary)",
    lineHeight: 1.8,
  },
  bioEmpty: {
    margin: 0,
    fontSize: 14,
    color: "var(--text-faint)",
    fontStyle: "italic",
  },
  bioToggle: {
    marginTop: 10,
    background: "none",
    border: "none",
    color: "var(--red-text,#ff6b6b)",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
    padding: 0,
    fontWeight: 600,
  },

  /* ── Section head ── */
  sectionHead: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  sectionAccent: {
    width: 4,
    height: 22,
    borderRadius: 999,
    background: "var(--red)",
    boxShadow: "0 0 10px rgba(229,9,20,0.4)",
    flexShrink: 0,
  },
  sectionTitle: {
    fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
    fontSize: "clamp(22px,2.5vw,30px)",
    fontWeight: 400,
    letterSpacing: "0.06em",
  },

  /* ── Filmography section ── */
  filmSection: {
    padding: "48px clamp(20px,5vw,64px) 0",
  },
  filmTabs: { display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" },
  filmTab: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "transparent",
    border: "1px solid var(--border-mid)",
    borderRadius: 999,
    padding: "8px 18px",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "inherit",
    transition: "all 0.15s",
  },
  filmTabActive: {
    background: "var(--red-dim,rgba(229,9,20,0.12))",
    borderColor: "var(--red-border,rgba(229,9,20,0.4))",
    color: "var(--red-text,#ff6b6b)",
    fontWeight: 700,
  },
  filmTabCount: {
    fontSize: 11,
    fontWeight: 700,
    padding: "1px 7px",
    borderRadius: 999,
    transition: "all 0.15s",
  },

  /* ── Film grid ── */
  filmGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))",
    gap: 16,
  },

  /* ── Credit card ── */
  creditCard: {
    borderRadius: 12,
    overflow: "hidden",
    background: "var(--bg-surface,#0e1218)",
    border: "1px solid var(--border)",
    cursor: "pointer",
    transition:
      "transform 0.3s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.3s ease",
  },
  creditPosterWrap: {
    position: "relative",
    aspectRatio: "2/3",
    overflow: "hidden",
    background: "var(--bg-card2)",
  },
  creditPoster: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    transition: "transform 0.5s ease",
  },
  creditPosterFallback: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 32,
    background: "var(--bg-card2)",
  },
  creditGrad: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 50%)",
    pointerEvents: "none",
  },
  ratingBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    background: "rgba(0,0,0,0.7)",
    border: "1.5px solid",
    borderRadius: 999,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 800,
    backdropFilter: "blur(4px)",
  },
  addBtn: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 7,
    padding: "6px 0",
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "opacity 0.2s ease, transform 0.2s ease, background 0.15s",
    backdropFilter: "blur(4px)",
  },
  addBtnSaved: {
    background: "rgba(34,197,94,0.2)",
    borderColor: "rgba(34,197,94,0.4)",
    color: "#22c55e",
  },
  creditInfo: { padding: "10px 10px 12px" },
  creditTitle: {
    margin: "0 0 5px",
    fontSize: 12,
    fontWeight: 700,
    color: "var(--text-primary)",
    lineHeight: 1.3,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  creditYear: { fontSize: 11, color: "var(--text-faint)" },
  creditRole: {
    fontSize: 10,
    fontStyle: "italic",
    color: "var(--text-faint)",
    display: "-webkit-box",
    WebkitLineClamp: 1,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },

  /* Shimmer */
  shimmer: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(105deg,transparent 38%,rgba(255,255,255,0.04) 50%,transparent 62%)",
    backgroundSize: "250% 100%",
    animation: "shimmer 1.9s ease-in-out infinite",
  },
};

const css = `
  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  ::-webkit-scrollbar { display: none; }
`;

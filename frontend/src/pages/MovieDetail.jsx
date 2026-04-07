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

/* ── helpers ──────────────────────────────────── */
function isUpcoming(d) {
  return d ? new Date(d) > new Date() : false;
}
function fmt(min) {
  if (!min) return null;
  const h = Math.floor(min / 60),
    m = min % 60;
  return h > 0 ? `${h}g ${m}p` : `${m}p`;
}
function fmtMoney(n) {
  if (!n || n < 1000) return null;
  return n >= 1_000_000_000
    ? `$${(n / 1_000_000_000).toFixed(2)}B`
    : `$${(n / 1_000_000).toFixed(1)}M`;
}

/* ── score helpers ────────────────────────────── */
function scoreColor(n) {
  if (n >= 7.5)
    return { stroke: "#22c55e", text: "#22c55e", glow: "rgba(34,197,94,0.4)" };
  if (n >= 6.0)
    return { stroke: "#eab308", text: "#eab308", glow: "rgba(234,179,8,0.4)" };
  if (n >= 4.0)
    return { stroke: "#f97316", text: "#f97316", glow: "rgba(249,115,22,0.4)" };
  return { stroke: "#ef4444", text: "#ef4444", glow: "rgba(239,68,68,0.4)" };
}

/* ── SVG icons ────────────────────────────────── */
const IconPlay = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5.14v14l11-7-11-7z" />
  </svg>
);
const IconPlus = () => (
  <svg
    width="16"
    height="16"
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
const IconBack = () => (
  <svg
    width="16"
    height="16"
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
const IconChevLeft = () => (
  <svg
    width="16"
    height="16"
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
const IconChevRight = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/* ── Big rating ring ─────────────────────────── */
function BigRating({ rating, votes }) {
  const n = Number(rating) || 0;
  const R = 32,
    SW = 4,
    C = R + SW + 2;
  const len = 2 * Math.PI * R;
  const arc = (n / 10) * len;
  const { stroke, glow } = scoreColor(n);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <svg
        width={C * 2}
        height={C * 2}
        viewBox={`0 0 ${C * 2} ${C * 2}`}
        style={{ overflow: "visible", filter: `drop-shadow(0 0 8px ${glow})` }}
      >
        <circle
          cx={C}
          cy={C}
          r={R}
          fill="rgba(0,0,0,0.55)"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={SW}
        />
        <circle
          cx={C}
          cy={C}
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth={SW}
          strokeDasharray={`${arc} ${len}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${C} ${C})`}
        />
        <text
          x={C}
          y={C - 3}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={stroke}
          fontSize="13"
          fontWeight="800"
          fontFamily="'DM Sans',sans-serif"
          letterSpacing="-0.02em"
        >
          {n > 0 ? n.toFixed(1) : "—"}
        </text>
        <text
          x={C}
          y={C + 11}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.4)"
          fontSize="7"
          fontWeight="500"
          fontFamily="sans-serif"
        >
          /10
        </text>
      </svg>
      {votes > 0 && (
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: "var(--text-faint)",
              letterSpacing: "0.04em",
            }}
          >
            ĐÁNH GIÁ
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
          >
            {votes.toLocaleString("vi-VN")}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Section title component ────────────────── */
function SectionTitle({ children, scrollRef, onScroll }) {
  return (
    <div style={s.sectionHeader}>
      <div style={s.sectionTitleWrap}>
        <div style={s.sectionAccent} />
        <h2 style={s.sectionTitle}>{children}</h2>
      </div>
      {onScroll && (
        <div style={s.scrollBtns}>
          <button
            style={s.scrollBtn}
            onClick={() => onScroll(-1)}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--red-dim)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--bg-card2)")
            }
          >
            <IconChevLeft />
          </button>
          <button
            style={s.scrollBtn}
            onClick={() => onScroll(1)}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--red-dim)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--bg-card2)")
            }
          >
            <IconChevRight />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Cast portrait card ──────────────────────── */
function CastCard({ person }) {
  const [err, setErr] = useState(false);
  const [hov, setHov] = useState(false);
  return (
    <div
      style={{
        ...s.castCard,
        transform: hov ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hov ? "0 12px 32px rgba(0,0,0,0.7)" : "var(--shadow-card)",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={s.castImgWrap}>
        {person.profile && !err ? (
          <img
            src={person.profile}
            alt={person.name}
            style={s.castImg}
            onError={() => setErr(true)}
            loading="lazy"
          />
        ) : (
          <div style={s.castImgFallback}>
            <span
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "var(--text-faint)",
                fontFamily: "var(--font-display)",
              }}
            >
              {person.name?.[0]?.toUpperCase() || "?"}
            </span>
          </div>
        )}
        {/* overlay on hover */}
        <div style={{ ...s.castImgOverlay, opacity: hov ? 1 : 0 }} />
      </div>
      <div style={s.castInfo}>
        <p style={s.castName}>{person.name}</p>
        {person.character && <p style={s.castChar}>{person.character}</p>}
      </div>
    </div>
  );
}

/* ── Similar movie mini-card ─────────────────── */
function SimilarCard({ movie, onClick }) {
  const [hov, setHov] = useState(false);
  const [err, setErr] = useState(false);
  const n = Number(movie.rating) || 0;
  const { text } = scoreColor(n);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...s.simCard,
        transform: hov ? "translateY(-6px) scale(1.03)" : "none",
        boxShadow: hov
          ? "0 18px 44px rgba(0,0,0,0.85), 0 0 0 1.5px rgba(229,9,20,0.45)"
          : "var(--shadow-card)",
      }}
    >
      {movie.poster && !err ? (
        <img
          src={movie.poster}
          alt={movie.title}
          style={s.simImg}
          loading="lazy"
          onError={() => setErr(true)}
        />
      ) : (
        <div style={s.simImgFallback}>🎬</div>
      )}
      {/* poster gradient + info */}
      <div style={s.simGrad} />
      <div style={s.simInfo}>
        <p style={s.simTitle}>{movie.title}</p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {n > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: text }}>
              ★ {n.toFixed(1)}
            </span>
          )}
          {movie.release_date && (
            <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
              {movie.release_date.slice(0, 4)}
            </span>
          )}
        </div>
      </div>
      {/* hover badge */}
      <div
        style={{
          ...s.simBadge,
          opacity: hov ? 1 : 0,
          transform: hov ? "translateY(0)" : "translateY(4px)",
        }}
      >
        Xem chi tiết →
      </div>
    </div>
  );
}

/* ── Info stat card ──────────────────────────── */
function StatCard({ icon, label, value }) {
  return (
    <div style={s.statCard}>
      <span style={s.statIcon}>{icon}</span>
      <div>
        <p style={s.statLabel}>{label}</p>
        <p style={s.statValue}>{value}</p>
      </div>
    </div>
  );
}

/* ── Loading skeleton ────────────────────────── */
function LoadingSkeleton() {
  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      <Navbar />
      <div
        style={{
          height: "min(70vh,660px)",
          background: "var(--bg-surface)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={s.shimmerEl} />
      </div>
      <div style={{ padding: "40px clamp(20px,5vw,64px)" }}>
        <div
          style={{
            height: 32,
            width: 280,
            borderRadius: 8,
            background: "var(--bg-card)",
            marginBottom: 16,
          }}
        />
        <div
          style={{
            height: 16,
            width: "70%",
            borderRadius: 6,
            background: "var(--bg-card)",
            marginBottom: 10,
          }}
        />
        <div
          style={{
            height: 16,
            width: "55%",
            borderRadius: 6,
            background: "var(--bg-card)",
          }}
        />
      </div>
      <style>{css}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const castRef = useRef(null);
  const simRef = useRef(null);
  const backdropRef = useRef(null);

  const [movie, setMovie] = useState(null);
  const [youtubeKey, setYoutubeKey] = useState(null);
  const [cast, setCast] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToList, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isReminded, setIsReminded] = useState(false);
  const [parallaxY, setParallaxY] = useState(0);
  const [entered, setEntered] = useState(false);

  /* ── parallax backdrop ── */
  useEffect(() => {
    const onScroll = () => {
      if (backdropRef.current) {
        const h = backdropRef.current.offsetHeight;
        if (window.scrollY < h) setParallaxY(window.scrollY * 0.35);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── data fetch ── */
  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    setShowTrailer(false);
    setCast([]);
    setSimilar([]);
    setAdded(false);
    setEntered(false);
    Promise.all([
      getMovieDetail(id),
      getTrailer(id),
      getCast(id),
      getSimilarMovies(id),
    ])
      .then(([d, t, c, sim]) => {
        const m = d.data;
        setMovie(m);
        setYoutubeKey(t.data?.youtube_key || null);
        setCast(c.data || []);
        setSimilar(
          Array.isArray(sim.data) ? sim.data : sim.data?.results || [],
        );
        if (isUpcoming(m.release_date)) {
          checkReminder(m.id)
            .then((r) => setIsReminded(r.data.reminded))
            .catch(() => {});
        }
        setTimeout(() => setEntered(true), 80);
      })
      .catch(() => showToast("Không tải được thông tin phim.", "error"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAdd = async () => {
    if (addingToList || added || !movie) return;
    setAdding(true);
    try {
      await addMovie({
        movie_id: movie.id,
        title: movie.title,
        poster: movie.poster,
      });
      setAdded(true);
      showToast("Đã thêm vào Watchlist!", "success");
    } catch {
      showToast("Thêm thất bại.", "error");
    } finally {
      setAdding(false);
    }
  };

  const scrollList = (ref, dir) =>
    ref.current?.scrollBy({ left: dir * 340, behavior: "smooth" });

  if (loading) return <LoadingSkeleton />;
  if (!movie) return null;

  const year = movie.release_date?.slice(0, 4) ?? "";
  const n = Number(movie.rating) || 0;
  const { stroke: ratingStroke } = scoreColor(n);

  /* stat cards data */
  const stats = [
    movie.runtime > 0 && {
      icon: "⏱",
      label: "Thời lượng",
      value: fmt(movie.runtime),
    },
    year && { icon: "📅", label: "Năm", value: year },
    movie.status && { icon: "◎", label: "Trạng thái", value: movie.status },
    movie.original_language && {
      icon: "🌐",
      label: "Ngôn ngữ",
      value: movie.original_language.toUpperCase(),
    },
    fmtMoney(movie.budget) && {
      icon: "💰",
      label: "Kinh phí",
      value: fmtMoney(movie.budget),
    },
    fmtMoney(movie.revenue) && {
      icon: "📈",
      label: "Doanh thu",
      value: fmtMoney(movie.revenue),
    },
  ].filter(Boolean);

  return (
    <div style={s.page}>
      <Navbar />

      {/* ════════════════════════════════
          HERO — fullscreen backdrop
      ════════════════════════════════ */}
      <div ref={backdropRef} style={s.hero}>
        {/* Backdrop image with parallax */}
        {movie.backdrop && (
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <img
              src={movie.backdrop}
              alt=""
              style={{
                ...s.backdropImg,
                transform: `translateY(${parallaxY}px) scale(1.08)`,
              }}
            />
          </div>
        )}

        {/* Multi-layer gradients */}
        <div style={s.gradLeft} />
        <div style={s.gradBottom} />
        <div style={s.gradTop} />
        <div style={s.gradVignette} />

        {/* Back button */}
        <button
          style={s.backBtn}
          onClick={() => navigate(-1)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(229,9,20,0.2)";
            e.currentTarget.style.borderColor = "var(--red-border)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-glass)";
            e.currentTarget.style.borderColor = "var(--border-mid)";
          }}
        >
          <IconBack /> <span>Quay lại</span>
        </button>

        {/* ── Main content ── */}
        <div
          style={{
            ...s.heroContent,
            opacity: entered ? 1 : 0,
            transform: entered ? "translateY(0)" : "translateY(20px)",
            transition:
              "opacity 0.55s ease, transform 0.55s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* Tagline */}
          {movie.tagline && <p style={s.tagline}>"{movie.tagline}"</p>}

          {/* Title */}
          <h1 style={s.title}>{movie.title}</h1>

          {/* Meta chips */}
          <div style={s.metaRow}>
            {year && <span style={s.metaChip}>{year}</span>}
            {fmt(movie.runtime) && (
              <span style={s.metaChip}>{fmt(movie.runtime)}</span>
            )}
            {movie.original_language && (
              <span style={{ ...s.metaChip, textTransform: "uppercase" }}>
                {movie.original_language}
              </span>
            )}
            <BigRating rating={movie.rating} votes={movie.vote_count} />
          </div>

          {/* Genre pills */}
          {movie.genres?.length > 0 && (
            <div style={s.genreRow}>
              {movie.genres.map((g) => (
                <span key={g} style={s.genrePill}>
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Overview */}
          {movie.overview && <p style={s.overview}>{movie.overview}</p>}

          {/* Action buttons */}
          <div style={s.btnRow}>
            {youtubeKey && (
              <button
                style={{
                  ...s.btnPrimary,
                  ...(showTrailer ? s.btnPrimaryActive : {}),
                }}
                onClick={() => setShowTrailer((p) => !p)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--red-hover)";
                  e.currentTarget.style.boxShadow = "var(--red-glow)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = showTrailer
                    ? "var(--red-hover)"
                    : "var(--red)";
                  e.currentTarget.style.boxShadow = showTrailer
                    ? "var(--red-glow)"
                    : "0 4px 20px rgba(229,9,20,0.35)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <IconPlay />
                <span>{showTrailer ? "Ẩn Trailer" : "Xem Trailer"}</span>
              </button>
            )}

            <button
              style={{
                ...s.btnSecondary,
                ...(added ? s.btnAdded : {}),
                opacity: addingToList ? 0.65 : 1,
              }}
              onClick={handleAdd}
              disabled={addingToList || added}
              onMouseEnter={(e) => {
                if (!added) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
                }
              }}
              onMouseLeave={(e) => {
                if (!added) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                }
              }}
            >
              <IconPlus />
              <span>
                {added ? "Đã lưu" : addingToList ? "Đang thêm…" : "My List"}
              </span>
            </button>

            {isUpcoming(movie.release_date) && (
              <RemindButton
                movie={movie}
                variant="pill"
                initialSet={isReminded}
                onToggle={setIsReminded}
              />
            )}
          </div>
        </div>

        {/* ── Floating poster ── */}
        {movie.poster && (
          <div
            style={{
              ...s.posterWrap,
              opacity: entered ? 1 : 0,
              transform: entered ? "translateY(0)" : "translateY(30px)",
              transition:
                "opacity 0.6s ease 0.15s, transform 0.6s cubic-bezier(0.34,1.2,0.64,1) 0.15s",
            }}
          >
            <img src={movie.poster} alt={movie.title} style={s.poster} />
            {/* rating badge on poster */}
            <div
              style={{
                ...s.posterRatingBadge,
                color: ratingStroke,
                borderColor: ratingStroke,
              }}
            >
              ★ {n > 0 ? n.toFixed(1) : "—"}
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════
          BODY CONTENT
      ════════════════════════════════ */}
      <div style={s.body}>
        {/* ── Trailer embed ── */}
        {youtubeKey && showTrailer && (
          <div
            style={{ ...s.section, animation: "fadeSlideUp 0.4s ease both" }}
          >
            <SectionTitle>Trailer</SectionTitle>
            <div style={s.trailerWrap}>
              <iframe
                style={s.trailerFrame}
                src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1&rel=0&modestbranding=1`}
                title={`Trailer: ${movie.title}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* ── Stats row ── */}
        {stats.length > 0 && (
          <div style={s.section}>
            <SectionTitle>Thông tin phim</SectionTitle>
            <div style={s.statsGrid}>
              {stats.map((st, i) => (
                <StatCard
                  key={i}
                  icon={st.icon}
                  label={st.label}
                  value={st.value}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Cast ── */}
        {cast.length > 0 && (
          <div style={s.section}>
            <SectionTitle onScroll={(dir) => scrollList(castRef, dir)}>
              Diễn viên
            </SectionTitle>
            <div ref={castRef} style={s.scrollRow}>
              {cast.slice(0, 20).map((p) => (
                <CastCard key={p.id} person={p} />
              ))}
            </div>
          </div>
        )}

        {/* ── Similar movies ── */}
        {similar.length > 0 && (
          <div style={{ ...s.section, paddingBottom: 80 }}>
            <SectionTitle onScroll={(dir) => scrollList(simRef, dir)}>
              Phim tương tự
            </SectionTitle>
            <div ref={simRef} style={s.scrollRow}>
              {similar.map((m) => (
                <SimilarCard
                  key={m.id}
                  movie={m}
                  onClick={() => navigate(`/movie/${m.id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{css}</style>
    </div>
  );
}

/* ── CSS ─────────────────────────────────────── */
const css = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmerLoad {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  ::-webkit-scrollbar { display: none; }
`;

/* ── Styles ──────────────────────────────────── */
const s = {
  page: {
    background: "var(--bg-page)",
    minHeight: "100vh",
    color: "var(--text-primary)",
    /* NO paddingTop — hero slides under the transparent navbar */
    fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
  },

  /* ── Hero ── */
  hero: {
    position: "relative",
    width: "100%",
    /* full viewport height minus nothing — navbar floats on top */
    height: "min(72vh, 700px)",
    minHeight: 500,
    overflow: "hidden",
    background: "var(--bg-page)",
    /* pull up behind fixed navbar so backdrop starts at y=0 */
    marginTop: -60,
    paddingTop: 60,
  },
  backdropImg: {
    width: "100%",
    height: "115%",
    objectFit: "cover",
    objectPosition: "center 20%",
    position: "absolute",
    top: 0,
    willChange: "transform",
  },
  gradLeft: {
    position: "absolute",
    inset: 0,
    zIndex: 2,
    background:
      "linear-gradient(105deg, rgba(8,11,15,0.97) 0%, rgba(8,11,15,0.82) 30%, rgba(8,11,15,0.48) 55%, rgba(8,11,15,0.12) 72%, transparent 100%)",
  },
  gradBottom: {
    position: "absolute",
    inset: 0,
    zIndex: 3,
    background:
      "linear-gradient(to top, var(--bg-page) 0%, rgba(8,11,15,0.72) 28%, transparent 55%)",
  },
  gradTop: {
    position: "absolute",
    inset: 0,
    zIndex: 2,
    background:
      "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 22%)",
  },
  gradVignette: {
    position: "absolute",
    inset: 0,
    zIndex: 2,
    background:
      "radial-gradient(ellipse 130% 100% at 72% 50%, transparent 38%, rgba(0,0,0,0.28) 100%)",
  },

  /* Back button */
  backBtn: {
    position: "absolute",
    top: "clamp(76px, 12vh, 96px)",
    left: "clamp(16px, 3.5vw, 48px)",
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "var(--bg-glass, rgba(14,18,24,0.75))",
    border: "1px solid var(--border-mid)",
    color: "var(--text-secondary)",
    padding: "7px 14px 7px 10px",
    borderRadius: "var(--radius-full, 999px)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    backdropFilter: "blur(12px)",
    fontFamily: "var(--font-body, sans-serif)",
    transition: "background 0.18s ease, border-color 0.18s ease !important",
  },

  /* Hero content */
  heroContent: {
    position: "absolute",
    bottom: "clamp(48px, 9vh, 80px)",
    left: "clamp(24px, 5vw, 72px)",
    maxWidth: "min(560px, 50vw)",
    zIndex: 10,
    willChange: "opacity, transform",
  },
  tagline: {
    fontSize: 14,
    fontStyle: "italic",
    color: "var(--text-muted)",
    margin: "0 0 10px",
    letterSpacing: "0.01em",
  },
  title: {
    fontFamily: "var(--font-display, 'Bebas Neue', sans-serif)",
    fontSize: "clamp(34px, 5vw, 66px)",
    fontWeight: 400,
    lineHeight: 1.0,
    letterSpacing: "0.02em",
    margin: "0 0 16px",
    textShadow: "0 2px 20px rgba(0,0,0,0.6)",
    color: "var(--text-primary)",
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  metaChip: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.04em",
    background: "rgba(255,255,255,0.09)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "var(--radius-sm, 6px)",
    padding: "4px 11px",
    color: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(6px)",
  },
  genreRow: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  genrePill: {
    background: "rgba(229,9,20,0.14)",
    border: "1px solid rgba(229,9,20,0.35)",
    color: "var(--red-text, #ff6b6b)",
    borderRadius: "var(--radius-full, 999px)",
    padding: "4px 13px",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.03em",
  },
  overview: {
    fontSize: "clamp(13px,1.1vw,15px)",
    lineHeight: 1.75,
    color: "rgba(200,210,240,0.78)",
    margin: "0 0 24px",
    display: "-webkit-box",
    WebkitLineClamp: 4,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    textShadow: "0 1px 8px rgba(0,0,0,0.5)",
  },
  btnRow: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "var(--red)",
    border: "none",
    color: "#fff",
    padding: "12px 24px",
    borderRadius: "var(--radius-md, 10px)",
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: "0.05em",
    cursor: "pointer",
    fontFamily: "var(--font-body, sans-serif)",
    boxShadow: "0 4px 20px rgba(229,9,20,0.35)",
    transition:
      "background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease !important",
  },
  btnPrimaryActive: {
    background: "var(--red-hover, #ff1a1a)",
    boxShadow: "var(--red-glow)",
  },
  btnSecondary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "rgba(255,255,255,0.88)",
    padding: "11px 22px",
    borderRadius: "var(--radius-md, 10px)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "var(--font-body, sans-serif)",
    backdropFilter: "blur(8px)",
    transition: "background 0.18s ease, border-color 0.18s ease !important",
  },
  btnAdded: {
    color: "var(--green, #22c55e)",
    borderColor: "rgba(34,197,94,0.4)",
    cursor: "default",
  },

  /* Floating poster */
  posterWrap: {
    position: "absolute",
    right: "clamp(20px, 5vw, 72px)",
    bottom: "clamp(28px, 6vh, 56px)",
    zIndex: 10,
    willChange: "opacity, transform",
  },
  poster: {
    width: "clamp(120px, 12vw, 180px)",
    borderRadius: "var(--radius-lg, 14px)",
    boxShadow: "0 24px 64px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.08)",
    display: "block",
  },
  posterRatingBadge: {
    position: "absolute",
    top: -12,
    right: -12,
    background: "var(--bg-overlay, #1a2030)",
    border: "1.5px solid",
    borderRadius: "var(--radius-full, 999px)",
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 800,
    backdropFilter: "blur(8px)",
    boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
    whiteSpace: "nowrap",
  },

  /* ── Body ── */
  body: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "0 clamp(20px,5vw,64px)",
  },
  section: { paddingTop: 48 },

  /* Section header */
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitleWrap: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  sectionAccent: {
    width: 4,
    height: 22,
    borderRadius: "var(--radius-full, 999px)",
    background: "var(--red)",
    boxShadow: "0 0 10px rgba(229,9,20,0.45)",
    flexShrink: 0,
  },
  sectionTitle: {
    fontFamily: "var(--font-display, 'Bebas Neue', sans-serif)",
    fontSize: "var(--text-2xl, 30px)",
    fontWeight: 400,
    letterSpacing: "0.06em",
    margin: 0,
    color: "var(--text-primary)",
  },
  scrollBtns: { display: "flex", gap: 6 },
  scrollBtn: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "var(--bg-card2)",
    border: "1px solid var(--border-mid)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.15s ease !important",
  },
  scrollRow: {
    display: "flex",
    gap: 12,
    overflowX: "auto",
    scrollbarWidth: "none",
    paddingBottom: 8,
    paddingTop: 2,
  },

  /* ── Trailer ── */
  trailerWrap: {
    position: "relative",
    paddingTop: "56.25%",
    borderRadius: "var(--radius-lg, 14px)",
    overflow: "hidden",
    background: "#000",
    boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
    border: "1px solid var(--border)",
    maxWidth: 900,
  },
  trailerFrame: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    border: "none",
  },

  /* ── Stats grid ── */
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: 12,
  },
  statCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "var(--bg-surface, #0e1218)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg, 14px)",
    padding: "14px 18px",
    transition: "border-color 0.18s ease !important",
  },
  statIcon: { fontSize: 20, flexShrink: 0, lineHeight: 1 },
  statLabel: {
    margin: 0,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-faint)",
  },
  statValue: {
    margin: 0,
    fontSize: 15,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginTop: 2,
  },

  /* ── Cast card ── */
  castCard: {
    flexShrink: 0,
    width: 110,
    borderRadius: "var(--radius-lg, 14px)",
    overflow: "hidden",
    background: "var(--bg-surface, #0e1218)",
    border: "1px solid var(--border)",
    cursor: "default",
    transition:
      "transform 0.25s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.25s ease !important",
  },
  castImgWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: "2/3",
    overflow: "hidden",
    background: "var(--bg-card)",
    flexShrink: 0,
  },
  castImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    transition: "transform 0.4s ease !important",
  },
  castImgFallback: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg-card2)",
  },
  castImgOverlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)",
    transition: "opacity 0.22s ease !important",
  },
  castInfo: { padding: "10px 10px 12px" },
  castName: {
    margin: 0,
    fontSize: 12,
    fontWeight: 700,
    color: "var(--text-primary)",
    lineHeight: 1.3,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  castChar: {
    margin: "4px 0 0",
    fontSize: 10,
    fontWeight: 400,
    color: "var(--text-faint)",
    fontStyle: "italic",
    lineHeight: 1.3,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },

  /* ── Similar card ── */
  simCard: {
    flexShrink: 0,
    width: 140,
    borderRadius: "var(--radius-lg, 14px)",
    overflow: "hidden",
    cursor: "pointer",
    position: "relative",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    transition:
      "transform 0.3s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.3s ease !important",
  },
  simImg: {
    width: "100%",
    aspectRatio: "2/3",
    objectFit: "cover",
    display: "block",
  },
  simImgFallback: {
    width: "100%",
    aspectRatio: "2/3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg-card2)",
    fontSize: 28,
  },
  simGrad: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 40%, transparent 62%)",
    pointerEvents: "none",
  },
  simInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "0 9px 10px",
  },
  simTitle: {
    margin: "0 0 4px",
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text-primary)",
    lineHeight: 1.3,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  simBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    background: "rgba(229,9,20,0.88)",
    color: "#fff",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.05em",
    padding: "3px 7px",
    borderRadius: "var(--radius-sm, 6px)",
    backdropFilter: "blur(4px)",
    transition: "opacity 0.18s ease, transform 0.18s ease !important",
  },

  /* Shimmer skeleton el */
  shimmerEl: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.035) 50%, transparent 62%)",
    backgroundSize: "250% 100%",
    animation: "shimmerLoad 1.9s ease-in-out infinite",
  },
};

export default MovieDetail;

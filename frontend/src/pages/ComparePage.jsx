// src/pages/ComparePage.jsx
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getMovieDetail, searchMovies } from "../api/movieApi";
import Navbar from "../components/Navbar";

/* ── helpers ──────────────────────────────────── */
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
function scoreColor(n) {
  if (n >= 7.5) return { stroke: "#22c55e", glow: "rgba(34,197,94,0.5)" };
  if (n >= 6.0) return { stroke: "#eab308", glow: "rgba(234,179,8,0.5)" };
  if (n >= 4.0) return { stroke: "#f97316", glow: "rgba(249,115,22,0.5)" };
  return { stroke: "#ef4444", glow: "rgba(239,68,68,0.5)" };
}
function useDebounce(v, d) {
  const [dv, setDv] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setDv(v), d);
    return () => clearTimeout(t);
  }, [v, d]);
  return dv;
}

/* ── Rating ring ──────────────────────────────── */
function RatingRing({ rating, size = 52, strokeW = 5 }) {
  const n = Number(rating) || 0;
  const R = size / 2 - strokeW;
  const len = 2 * Math.PI * R;
  const arc = (n / 10) * len;
  const C = size / 2;
  const { stroke, glow } = scoreColor(n);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ filter: `drop-shadow(0 0 8px ${glow})`, flexShrink: 0 }}
    >
      <circle
        cx={C}
        cy={C}
        r={R}
        fill="rgba(0,0,0,0.4)"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={strokeW}
      />
      <circle
        cx={C}
        cy={C}
        r={R}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeW}
        strokeDasharray={`${arc} ${len}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${C} ${C})`}
      />
      <text
        x={C}
        y={C - 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={stroke}
        fontSize={size * 0.24}
        fontWeight="800"
        fontFamily="'DM Sans',sans-serif"
      >
        {n > 0 ? n.toFixed(1) : "—"}
      </text>
      <text
        x={C}
        y={C + size * 0.16}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="rgba(255,255,255,0.3)"
        fontSize={size * 0.13}
        fontFamily="sans-serif"
      >
        /10
      </text>
    </svg>
  );
}

/* ── Movie picker panel ───────────────────────── */
function MoviePicker({ label, movie, onPick }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const dq = useDebounce(q, 350);

  useEffect(() => {
    if (!dq.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    searchMovies(dq, 1)
      .then((r) => setResults((r.data?.results || r.data || []).slice(0, 8)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dq]);

  if (movie) {
    return (
      <Link to={`/movie/${movie.id}`} style={{ textDecoration: "none" }}>
        <div style={pc.picked} title="Bấm để xem chi tiết">
          <div style={pc.pickedOverlay} />
          {movie.backdrop_path && (
            <img
              src={`https://image.tmdb.org/t/p/w500${movie.backdrop_path}`}
              alt=""
              style={pc.pickedBg}
            />
          )}
          <div style={pc.pickedInner}>
            {movie.poster && (
              <img
                src={`https://image.tmdb.org/t/p/w185${movie.poster}`}
                alt={movie.title}
                style={pc.pickedPoster}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={pc.pickedTitle}>{movie.title}</p>
              <p style={pc.pickedYear}>{movie.release_date?.slice(0, 4)}</p>
              <RatingRing rating={movie.rating} size={44} strokeW={4} />
            </div>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              onPick(null);
            }}
            style={pc.changeBtn}
          >
            Đổi phim
          </button>
        </div>
      </Link>
    );
  }

  return (
    <div style={pc.empty}>
      <p style={pc.emptyLabel}>{label}</p>
      <div style={pc.searchWrap}>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Tìm tên phim..."
          style={pc.input}
        />
        {loading && <div style={pc.spinner} />}
      </div>
      {open && results.length > 0 && (
        <div style={pc.dropdown}>
          {results.map((m) => (
            <button
              key={m.id}
              style={pc.dropItem}
              onClick={() => {
                onPick(m);
                setQ("");
                setOpen(false);
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.07)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {m.poster_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                  alt=""
                  style={pc.dropThumb}
                />
              )}
              <div>
                <p style={pc.dropTitle}>{m.title || m.original_title}</p>
                <p style={pc.dropYear}>{m.release_date?.slice(0, 4)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {!q && <p style={pc.emptyHint}>🎬 Gõ tên phim để tìm kiếm</p>}
    </div>
  );
}
const pc = {
  picked: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    border: "1px solid rgba(100,120,175,0.2)",
    cursor: "pointer",
    minHeight: 140,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    background: "rgba(10,14,22,0.8)",
  },
  pickedBg: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    opacity: 0.18,
  },
  pickedOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to top, rgba(8,10,18,0.95) 0%, rgba(8,10,18,0.3) 100%)",
  },
  pickedInner: {
    position: "relative",
    display: "flex",
    gap: 14,
    alignItems: "flex-end",
    padding: "14px 16px",
  },
  pickedPoster: {
    width: 54,
    borderRadius: 8,
    flexShrink: 0,
    boxShadow: "0 6px 20px rgba(0,0,0,0.6)",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  pickedTitle: {
    margin: "0 0 3px",
    fontSize: 15,
    fontWeight: 700,
    color: "#f0f4ff",
    lineHeight: 1.3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  pickedYear: {
    margin: "0 0 8px",
    fontSize: 11,
    color: "rgba(140,155,195,0.5)",
  },
  changeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
    padding: "5px 12px",
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 700,
    background: "rgba(0,0,0,0.6)",
    border: "1px solid rgba(100,120,175,0.25)",
    color: "rgba(200,215,255,0.7)",
    cursor: "pointer",
    backdropFilter: "blur(8px)",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  },
  empty: {
    border: "1.5px dashed rgba(100,120,175,0.2)",
    borderRadius: 16,
    minHeight: 140,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 20,
    position: "relative",
    background: "rgba(255,255,255,0.015)",
  },
  emptyLabel: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "rgba(130,145,185,0.35)",
    margin: 0,
  },
  searchWrap: { width: "100%", position: "relative" },
  input: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(100,120,175,0.18)",
    color: "#f0f4ff",
    fontSize: 13,
    outline: "none",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
    boxSizing: "border-box",
  },
  spinner: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    width: 14,
    height: 14,
    border: "2px solid rgba(255,255,255,0.1)",
    borderTop: "2px solid var(--red,#e50914)",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
  dropdown: {
    width: "100%",
    background: "rgba(10,14,22,0.99)",
    border: "1px solid rgba(100,120,175,0.2)",
    borderRadius: 12,
    overflow: "hidden",
    maxHeight: 280,
    overflowY: "auto",
    boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    zIndex: 100,
  },
  dropItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 12px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
    transition: "background 0.1s",
    borderBottom: "1px solid rgba(100,120,175,0.07)",
  },
  dropThumb: {
    width: 36,
    height: 52,
    objectFit: "cover",
    borderRadius: 5,
    flexShrink: 0,
  },
  dropTitle: {
    margin: "0 0 2px",
    fontSize: 13,
    fontWeight: 600,
    color: "#f0f4ff",
  },
  dropYear: { margin: 0, fontSize: 11, color: "rgba(130,145,185,0.45)" },
  emptyHint: { fontSize: 12, color: "rgba(130,145,185,0.25)", margin: 0 },
};

/* ── Compare row ──────────────────────────────── */
function Row({ label, v1, v2, winner, isRating }) {
  const hasWinner = winner !== null && winner !== undefined;
  const w1 = hasWinner && winner === "left";
  const w2 = hasWinner && winner === "right";
  const tie = hasWinner && winner === "tie";

  return (
    <div style={cr.row}>
      {/* Left value */}
      <div
        style={{ ...cr.cell, ...(w1 ? cr.cellWin : {}), textAlign: "right" }}
      >
        {isRating && v1 ? (
          <RatingRing rating={v1} size={56} strokeW={5} />
        ) : (
          <span
            style={{
              ...cr.val,
              color: w1
                ? "#22c55e"
                : tie
                  ? "#eab308"
                  : "rgba(200,215,255,0.85)",
            }}
          >
            {v1 ?? "—"}
          </span>
        )}
        {w1 && <span style={cr.crown}>👑</span>}
      </div>

      {/* Label */}
      <div style={cr.label}>
        <span>{label}</span>
        {tie && <span style={cr.tieBadge}>TIE</span>}
      </div>

      {/* Right value */}
      <div style={{ ...cr.cell, ...(w2 ? cr.cellWin : {}), textAlign: "left" }}>
        {w2 && <span style={cr.crown}>👑</span>}
        {isRating && v2 ? (
          <RatingRing rating={v2} size={56} strokeW={5} />
        ) : (
          <span
            style={{
              ...cr.val,
              color: w2
                ? "#22c55e"
                : tie
                  ? "#eab308"
                  : "rgba(200,215,255,0.85)",
            }}
          >
            {v2 ?? "—"}
          </span>
        )}
      </div>
    </div>
  );
}
const cr = {
  row: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 0,
    borderBottom: "1px solid rgba(100,120,175,0.08)",
    padding: "10px 0",
  },
  cell: {
    padding: "8px 16px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
  },
  cellWin: { background: "rgba(34,197,94,0.04)", borderRadius: 8 },
  val: {
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  },
  label: {
    minWidth: 120,
    textAlign: "center",
    padding: "0 10px",
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "rgba(130,145,185,0.4)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  tieBadge: {
    fontSize: 9,
    padding: "2px 6px",
    borderRadius: 999,
    background: "rgba(234,179,8,0.12)",
    color: "#eab308",
    fontWeight: 800,
    letterSpacing: "0.05em",
  },
  crown: { fontSize: 16, lineHeight: 1 },
};

/* ── Genre pill ───────────────────────────────── */
function GenrePill({ name, highlight }) {
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: highlight
          ? "rgba(229,9,20,0.15)"
          : "rgba(255,255,255,0.05)",
        border: `1px solid ${highlight ? "rgba(229,9,20,0.3)" : "rgba(100,120,175,0.15)"}`,
        color: highlight ? "rgba(229,9,20,0.9)" : "rgba(140,155,195,0.6)",
        whiteSpace: "nowrap",
      }}
    >
      {name}
    </span>
  );
}

/* ── MAIN ─────────────────────────────────────── */
export default function ComparePage() {
  const { id1, id2 } = useParams();
  const navigate = useNavigate();

  const [movieA, setMovieA] = useState(null);
  const [movieB, setMovieB] = useState(null);
  const [loading, setLoading] = useState({ a: false, b: false });

  // Tải phim từ URL params khi mount
  useEffect(() => {
    if (id1) {
      setLoading((l) => ({ ...l, a: true }));
      getMovieDetail(id1)
        .then((r) => setMovieA(r.data))
        .catch(() => {})
        .finally(() => setLoading((l) => ({ ...l, a: false })));
    }
    if (id2) {
      setLoading((l) => ({ ...l, b: true }));
      getMovieDetail(id2)
        .then((r) => setMovieB(r.data))
        .catch(() => {})
        .finally(() => setLoading((l) => ({ ...l, b: false })));
    }
  }, [id1, id2]);

  // Sync URL khi chọn phim
  const handlePickA = useCallback(
    (m) => {
      setMovieA(m ? m : null);
      if (m) {
        getMovieDetail(m.id)
          .then((r) => setMovieA(r.data))
          .catch(() => {});
        navigate(`/compare/${m.id}/${movieB?.id ?? ""}`, { replace: true });
      } else {
        navigate(`/compare//${movieB?.id ?? ""}`, { replace: true });
      }
    },
    [movieB, navigate],
  );

  const handlePickB = useCallback(
    (m) => {
      setMovieB(m ? m : null);
      if (m) {
        getMovieDetail(m.id)
          .then((r) => setMovieB(r.data))
          .catch(() => {});
        navigate(`/compare/${movieA?.id ?? ""}/${m.id}`, { replace: true });
      } else {
        navigate(`/compare/${movieA?.id ?? ""}/`, { replace: true });
      }
    },
    [movieA, navigate],
  );

  // Tính winner cho từng metric
  const winner = (a, b) => {
    if (!a || !b) return null;
    if (a > b) return "left";
    if (b > a) return "right";
    return "tie";
  };

  // Genre intersection
  const genresA = movieA?.genres?.map((g) => g.name) ?? [];
  const genresB = movieB?.genres?.map((g) => g.name) ?? [];
  const sharedGenres = genresA.filter((g) => genresB.includes(g));

  const bothReady = movieA && movieB;

  return (
    <div style={s.page}>
      <Navbar />

      <div style={s.container}>
        {/* ── Header ── */}
        <div style={s.header}>
          <h1 style={s.title}>⚔️ So sánh phim</h1>
          <p style={s.subtitle}>Chọn 2 phim để xem song song các chỉ số</p>
        </div>

        {/* ── Picker row ── */}
        <div style={s.pickerRow}>
          <div style={s.pickerWrap}>
            <MoviePicker label="PHIM A" movie={movieA} onPick={handlePickA} />
          </div>

          <div style={s.vs}>
            <span style={s.vsText}>VS</span>
          </div>

          <div style={s.pickerWrap}>
            <MoviePicker label="PHIM B" movie={movieB} onPick={handlePickB} />
          </div>
        </div>

        {/* ── Compare table ── */}
        {bothReady && (
          <div style={{ ...s.table, animation: "fadeUp 0.35s ease both" }}>
            {/* Column headers with poster */}
            <div style={s.colHeaders}>
              <Link to={`/movie/${movieA.id}`} style={s.colHeader}>
                {movieA.poster && (
                  <img
                    src={`https://image.tmdb.org/t/p/w185${movieA.poster}`}
                    alt=""
                    style={s.colPoster}
                  />
                )}
                <div style={s.colInfo}>
                  <p style={s.colTitle}>{movieA.title}</p>
                  <p style={s.colYear}>{movieA.release_date?.slice(0, 4)}</p>
                </div>
              </Link>

              <div style={s.colDivider}>
                <div style={s.colDividerLine} />
                <span style={s.colDividerText}>⚔</span>
                <div style={s.colDividerLine} />
              </div>

              <Link
                to={`/movie/${movieB.id}`}
                style={{
                  ...s.colHeader,
                  textAlign: "right",
                  flexDirection: "row-reverse",
                }}
              >
                {movieB.poster && (
                  <img
                    src={`https://image.tmdb.org/t/p/w185${movieB.poster}`}
                    alt=""
                    style={s.colPoster}
                  />
                )}
                <div style={{ ...s.colInfo, alignItems: "flex-end" }}>
                  <p style={s.colTitle}>{movieB.title}</p>
                  <p style={s.colYear}>{movieB.release_date?.slice(0, 4)}</p>
                </div>
              </Link>
            </div>

            {/* ─ Section: Đánh giá ─ */}
            <div style={s.sectionHead}>📊 Đánh giá</div>
            <Row
              label="Điểm TMDb"
              v1={movieA.rating}
              v2={movieB.rating}
              winner={winner(movieA.rating, movieB.rating)}
              isRating
            />
            <Row
              label="Lượt đánh giá"
              v1={movieA.vote_count?.toLocaleString("vi-VN")}
              v2={movieB.vote_count?.toLocaleString("vi-VN")}
              winner={winner(movieA.vote_count, movieB.vote_count)}
            />
            <Row
              label="Điểm phổ biến"
              v1={movieA.popularity?.toFixed(1)}
              v2={movieB.popularity?.toFixed(1)}
              winner={winner(movieA.popularity, movieB.popularity)}
            />

            {/* ─ Section: Thông tin ─ */}
            <div style={s.sectionHead}>🎬 Thông tin</div>
            <Row
              label="Thời lượng"
              v1={fmt(movieA.runtime)}
              v2={fmt(movieB.runtime)}
              winner={winner(movieA.runtime, movieB.runtime)}
            />
            <Row
              label="Năm phát hành"
              v1={movieA.release_date?.slice(0, 4)}
              v2={movieB.release_date?.slice(0, 4)}
              winner={null}
            />
            <Row
              label="Ngôn ngữ gốc"
              v1={movieA.original_language?.toUpperCase()}
              v2={movieB.original_language?.toUpperCase()}
              winner={null}
            />
            <Row
              label="Trạng thái"
              v1={movieA.status}
              v2={movieB.status}
              winner={null}
            />

            {/* ─ Section: Tài chính ─ */}
            {(fmtMoney(movieA.budget) ||
              fmtMoney(movieB.budget) ||
              fmtMoney(movieA.revenue) ||
              fmtMoney(movieB.revenue)) && (
              <>
                <div style={s.sectionHead}>💰 Tài chính</div>
                {(fmtMoney(movieA.budget) || fmtMoney(movieB.budget)) && (
                  <Row
                    label="Kinh phí"
                    v1={fmtMoney(movieA.budget) ?? "—"}
                    v2={fmtMoney(movieB.budget) ?? "—"}
                    winner={winner(movieA.budget, movieB.budget)}
                  />
                )}
                {(fmtMoney(movieA.revenue) || fmtMoney(movieB.revenue)) && (
                  <Row
                    label="Doanh thu"
                    v1={fmtMoney(movieA.revenue) ?? "—"}
                    v2={fmtMoney(movieB.revenue) ?? "—"}
                    winner={winner(movieA.revenue, movieB.revenue)}
                  />
                )}
              </>
            )}

            {/* ─ Section: Thể loại ─ */}
            {(genresA.length > 0 || genresB.length > 0) && (
              <>
                <div style={s.sectionHead}>🏷 Thể loại</div>
                <div style={s.genreRow}>
                  <div style={s.genreList}>
                    {genresA.map((g) => (
                      <GenrePill
                        key={g}
                        name={g}
                        highlight={sharedGenres.includes(g)}
                      />
                    ))}
                  </div>
                  <div style={s.genreLabel}>
                    {sharedGenres.length > 0 ? (
                      <span style={s.sharedBadge}>
                        {sharedGenres.length} chung
                      </span>
                    ) : (
                      <span
                        style={{ fontSize: 10, color: "rgba(130,145,185,0.3)" }}
                      >
                        Khác nhau
                      </span>
                    )}
                  </div>
                  <div style={{ ...s.genreList, justifyContent: "flex-end" }}>
                    {genresB.map((g) => (
                      <GenrePill
                        key={g}
                        name={g}
                        highlight={sharedGenres.includes(g)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ─ Tổng kết ─ */}
            <CompareVerdict movieA={movieA} movieB={movieB} />
          </div>
        )}

        {/* Placeholder khi chưa chọn đủ 2 phim */}
        {!bothReady && (
          <div style={s.placeholder}>
            <p style={{ fontSize: 48, margin: "0 0 16px" }}>🎭</p>
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "rgba(140,155,195,0.4)",
                margin: "0 0 6px",
              }}
            >
              {!movieA && !movieB
                ? "Chọn 2 phim để bắt đầu so sánh"
                : "Chọn thêm 1 phim nữa"}
            </p>
            <p
              style={{
                fontSize: 12,
                color: "rgba(130,145,185,0.25)",
                margin: 0,
              }}
            >
              Gõ tên phim vào ô tìm kiếm bên trên
            </p>
          </div>
        )}
      </div>

      <style>{css}</style>
    </div>
  );
}

/* ── Verdict tổng kết ─────────────────────────── */
function CompareVerdict({ movieA, movieB }) {
  // Đếm số "wins" cho mỗi phim dựa trên rating, popularity, revenue
  const metrics = [
    [movieA.rating, movieB.rating],
    [movieA.popularity, movieB.popularity],
    [movieA.vote_count, movieB.vote_count],
    [movieA.revenue, movieB.revenue],
  ];
  let winsA = 0,
    winsB = 0;
  metrics.forEach(([a, b]) => {
    if (!a || !b) return;
    if (a > b) winsA++;
    else if (b > a) winsB++;
  });

  const isDraw = winsA === winsB;
  const winner = isDraw ? null : winsA > winsB ? movieA : movieB;

  return (
    <div style={vd.wrap}>
      {isDraw ? (
        <>
          <p style={vd.trophyTie}>🤝</p>
          <p style={vd.titleTie}>Hai phim ngang tài ngang sức!</p>
          <p style={vd.sub}>
            Không có phim nào vượt trội rõ ràng — lựa chọn tuỳ sở thích bạn.
          </p>
        </>
      ) : (
        <>
          <p style={vd.trophy}>🏆</p>
          <p style={vd.title}>
            <span style={vd.winnerName}>{winner.title}</span> thắng!
          </p>
          <p style={vd.sub}>
            Vượt trội về {winsA > winsB ? winsA : winsB}/
            {metrics.filter(([a, b]) => a && b).length} tiêu chí đo lường.
          </p>
          <Link to={`/movie/${winner.id}`} style={vd.btn}>
            Xem chi tiết →
          </Link>
        </>
      )}
    </div>
  );
}
const vd = {
  wrap: {
    marginTop: 32,
    padding: "28px 24px",
    borderRadius: 16,
    textAlign: "center",
    background:
      "linear-gradient(135deg, rgba(229,9,20,0.07) 0%, rgba(100,120,175,0.05) 100%)",
    border: "1px solid rgba(229,9,20,0.15)",
  },
  trophy: { fontSize: 40, margin: "0 0 12px", lineHeight: 1 },
  trophyTie: { fontSize: 40, margin: "0 0 12px", lineHeight: 1 },
  title: {
    margin: "0 0 8px",
    fontSize: 18,
    fontWeight: 700,
    color: "rgba(200,215,255,0.9)",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  },
  titleTie: {
    margin: "0 0 8px",
    fontSize: 18,
    fontWeight: 700,
    color: "rgba(200,215,255,0.9)",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  },
  winnerName: { color: "#22c55e" },
  sub: { margin: "0 0 16px", fontSize: 12, color: "rgba(130,145,185,0.5)" },
  btn: {
    display: "inline-block",
    padding: "9px 22px",
    borderRadius: 10,
    background: "var(--red,#e50914)",
    color: "#fff",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  },
};

/* ── Styles ───────────────────────────────────── */
const s = {
  page: {
    background: "var(--bg-page,#0a0c14)",
    minHeight: "100vh",
    color: "var(--text-primary,#f0f4ff)",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  },
  container: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "80px clamp(16px,4vw,40px) 80px",
  },
  header: { textAlign: "center", marginBottom: 36 },
  title: {
    fontSize: "clamp(26px,5vw,42px)",
    fontWeight: 800,
    margin: "0 0 8px",
    fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
    letterSpacing: "0.05em",
    color: "#f0f4ff",
  },
  subtitle: { fontSize: 13, color: "rgba(130,145,185,0.4)", margin: 0 },
  pickerRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: 16,
    marginBottom: 40,
    alignItems: "center",
  },
  pickerWrap: { position: "relative" },
  vs: { display: "flex", alignItems: "center", justifyContent: "center" },
  vsText: {
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: "0.08em",
    color: "rgba(229,9,20,0.6)",
    fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
    lineHeight: 1,
  },
  table: {
    background: "rgba(255,255,255,0.016)",
    border: "1px solid rgba(100,120,175,0.12)",
    borderRadius: 20,
    overflow: "hidden",
    padding: "0 0 24px",
  },
  colHeaders: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    background: "rgba(255,255,255,0.025)",
    borderBottom: "1px solid rgba(100,120,175,0.1)",
    padding: "20px 16px",
  },
  colHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    textDecoration: "none",
    cursor: "pointer",
  },
  colPoster: {
    width: 52,
    borderRadius: 8,
    flexShrink: 0,
    boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  colInfo: { display: "flex", flexDirection: "column", gap: 2 },
  colTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    color: "#f0f4ff",
    lineHeight: 1.3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  colYear: { margin: 0, fontSize: 11, color: "rgba(130,145,185,0.4)" },
  colDivider: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: "0 16px",
  },
  colDividerLine: { width: 1, flex: 1, background: "rgba(100,120,175,0.15)" },
  colDividerText: { fontSize: 16, opacity: 0.3 },
  sectionHead: {
    padding: "14px 20px 6px",
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "rgba(130,145,185,0.35)",
    borderTop: "1px solid rgba(100,120,175,0.08)",
    marginTop: 8,
  },
  genreRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 0,
    borderBottom: "1px solid rgba(100,120,175,0.08)",
    padding: "10px 0",
  },
  genreList: { display: "flex", flexWrap: "wrap", gap: 5, padding: "6px 16px" },
  genreLabel: {
    minWidth: 120,
    textAlign: "center",
    padding: "0 10px",
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "rgba(130,145,185,0.4)",
  },
  sharedBadge: {
    fontSize: 10,
    padding: "3px 8px",
    borderRadius: 999,
    background: "rgba(229,9,20,0.1)",
    color: "rgba(229,9,20,0.7)",
    fontWeight: 700,
    letterSpacing: "0.04em",
  },
  placeholder: {
    textAlign: "center",
    padding: "60px 20px",
    border: "1px dashed rgba(100,120,175,0.12)",
    borderRadius: 20,
    background: "rgba(255,255,255,0.01)",
  },
};

const css = `
  @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin   { to { transform: rotate(360deg); } }
  ::-webkit-scrollbar { display:none; }
  @media (max-width: 600px) {
    /* Stack pickers on mobile */
    div[style*="gridTemplateColumns: 1fr auto 1fr"] {
      grid-template-columns: 1fr !important;
    }
  }
`;

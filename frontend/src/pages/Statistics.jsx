// src/pages/Statistics.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getDetailedStats } from "../api/movieApi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastContext";
import Navbar from "../components/Navbar";
import ScrollToTop from "../components/ScrollToTop";

/* ── helpers ──────────────────────────────────────────── */
function fmtRuntime(mins) {
  if (!mins || mins < 1) return "0p";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}p`;
  if (m === 0) return `${h}g`;
  return `${h}g ${m}p`;
}

function fmtMonthLabel(year, month) {
  const d = new Date(year, month - 1);
  return d.toLocaleDateString("vi-VN", { month: "short" });
}

function fmtMonthFull(yearMonth) {
  if (!yearMonth) return "";
  const [y, m] = yearMonth.split("-");
  const d = new Date(Number(y), Number(m) - 1);
  return d.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
}

const GENRE_COLORS = [
  "#e50914",
  "#f5c518",
  "#3b82f6",
  "#22c55e",
  "#a855f7",
  "#f97316",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#14b8a6",
];

/* ── animated counter ─────────────────────────────────── */
function useCountUp(target, duration = 800, trigger = true) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!trigger || !target) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, trigger]);
  return val;
}

/* ── stat card ────────────────────────────────────────── */
function StatCard({
  icon,
  label,
  value,
  sub,
  color = "var(--red)",
  animate = true,
}) {
  const num = useCountUp(typeof value === "number" ? value : 0, 900, animate);
  return (
    <div style={s.statCard}>
      <div style={{ ...s.statIcon, background: color + "18", color }}>
        {icon}
      </div>
      <div style={s.statNum}>
        {typeof value === "number" ? num.toLocaleString("vi-VN") : value}
      </div>
      <div style={s.statLabel}>{label}</div>
      {sub && <div style={s.statSub}>{sub}</div>}
    </div>
  );
}

/* ── monthly bar chart ────────────────────────────────── */
function MonthlyChart({ data }) {
  const [hovered, setHovered] = useState(null);
  const maxVal = Math.max(...data.map((d) => Math.max(d.added, d.watched)), 1);

  return (
    <div style={s.chartWrap}>
      <div style={s.chartLegend}>
        <span style={s.legendDot("#3b82f6")} />{" "}
        <span style={s.legendText}>Thêm mới</span>
        <span style={{ ...s.legendDot("#22c55e"), marginLeft: 16 }} />{" "}
        <span style={s.legendText}>Đã xem</span>
      </div>
      <div style={s.chartBars}>
        {data.map((d, i) => (
          <div
            key={i}
            style={s.barCol}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {hovered === i && (
              <div style={s.tooltip}>
                <div style={s.tooltipMonth}>
                  {fmtMonthLabel(d.year, d.month)} {d.year}
                </div>
                <div style={{ color: "#3b82f6" }}>+{d.added} thêm</div>
                <div style={{ color: "#22c55e" }}>✓ {d.watched} xem</div>
              </div>
            )}
            <div style={s.barPair}>
              <div
                style={{
                  ...s.bar,
                  height: `${(d.added / maxVal) * 100}%`,
                  background: "#3b82f6",
                  opacity: hovered === i ? 1 : 0.75,
                }}
              />
              <div
                style={{
                  ...s.bar,
                  height: `${(d.watched / maxVal) * 100}%`,
                  background: "#22c55e",
                  opacity: hovered === i ? 1 : 0.75,
                }}
              />
            </div>
            <div style={s.barLabel}>{fmtMonthLabel(d.year, d.month)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── genre bar list ───────────────────────────────────── */
function GenreList({ genres }) {
  const max = genres[0]?.count || 1;
  return (
    <div style={s.genreList}>
      {genres.slice(0, 10).map((g, i) => (
        <div key={g.genre_id} style={s.genreRow} className="stats-genre-row">
          <div style={s.genreName}>
            <span
              style={{
                ...s.genreRank,
                color: GENRE_COLORS[i % GENRE_COLORS.length],
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            {g.genre_name}
          </div>
          <div style={s.genreBarWrap}>
            <div
              style={{
                ...s.genreBar,
                width: `${(g.count / max) * 100}%`,
                background: GENRE_COLORS[i % GENRE_COLORS.length],
              }}
            />
          </div>
          <div style={s.genreCount}>{g.count}</div>
        </div>
      ))}
    </div>
  );
}

/* ── watched ratio ring ───────────────────────────────── */
function RatioRing({ watched, total }) {
  const pct = total > 0 ? watched / total : 0;
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  const gap = circ - dash;
  const unwatched = total - watched;

  return (
    <div style={s.ringWrap} className="stats-ring-wrap">
      <svg width="140" height="140" viewBox="0 0 140 140">
        {/* track */}
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="var(--border-mid)"
          strokeWidth="14"
        />
        {/* progress */}
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="#22c55e"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          strokeDashoffset={circ / 4}
          style={{ transition: "stroke-dasharray 1s cubic-bezier(.4,0,.2,1)" }}
        />
        <text
          x="70"
          y="64"
          textAnchor="middle"
          style={{
            fill: "var(--text-primary)",
            fontSize: 22,
            fontWeight: 700,
            fontFamily: "var(--font-body)",
          }}
        >
          {total > 0 ? Math.round(pct * 100) : 0}%
        </text>
        <text
          x="70"
          y="82"
          textAnchor="middle"
          style={{
            fill: "var(--text-muted)",
            fontSize: 11,
            fontFamily: "var(--font-body)",
          }}
        >
          đã xem
        </text>
      </svg>
      <div style={s.ringStats}>
        <div style={s.ringStatRow}>
          <span style={{ ...s.ringDot, background: "#22c55e" }} />
          <span style={s.ringStatLabel}>Đã xem</span>
          <span style={s.ringStatVal}>{watched}</span>
        </div>
        <div style={s.ringStatRow}>
          <span style={{ ...s.ringDot, background: "var(--border-bright)" }} />
          <span style={s.ringStatLabel}>Chưa xem</span>
          <span style={s.ringStatVal}>{unwatched}</span>
        </div>
        <div style={s.ringStatRow}>
          <span style={{ ...s.ringDot, background: "var(--red)" }} />
          <span style={s.ringStatLabel}>Tổng</span>
          <span style={s.ringStatVal}>{total}</span>
        </div>
      </div>
    </div>
  );
}

/* ── skeleton ─────────────────────────────────────────── */
function Skeleton({ style }) {
  return <div style={{ ...s.skeleton, ...style }} />;
}

/* ════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════ */
export default function Statistics() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    getDetailedStats()
      .then((res) => {
        setStats(res.data);
        setTimeout(() => setAnimated(true), 100);
      })
      .catch(() => showToast("Không tải được thống kê.", "error"))
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  /* ── empty state ───────────────────────── */
  if (!loading && stats && stats.total === 0) {
    return (
      <div style={s.page}>
        <Navbar />
        <div style={s.emptyWrap}>
          <div style={s.emptyIcon}>🎬</div>
          <h2 style={s.emptyTitle}>Chưa có dữ liệu</h2>
          <p style={s.emptySub}>
            Thêm phim vào watchlist để xem thống kê cá nhân của bạn.
          </p>
          <Link to="/" style={s.emptyBtn}>
            Khám phá phim
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <Navbar />
      <ScrollToTop />
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @media (max-width: 700px) {
          .stats-main-grid { grid-template-columns: 1fr !important; }
          .stats-ring-wrap { flex-direction: column; align-items: flex-start !important; }
        }
        @media (max-width: 500px) {
          .stats-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .stats-genre-row { grid-template-columns: 90px 1fr 28px !important; }
        }
      `}</style>

      <div style={s.content}>
        {/* ── Header ──────────────────────── */}
        <div style={s.header}>
          <div>
            <h1 style={s.title}>📊 Thống kê của tôi</h1>
            <p style={s.sub}>Tổng quan hoạt động xem phim</p>
          </div>
          <Link to="/watchlist" style={s.backBtn}>
            ← Watchlist
          </Link>
        </div>

        {/* ── Top stat cards ──────────────── */}
        <div style={s.statGrid} className="stats-stat-grid">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} style={{ height: 110, borderRadius: 14 }} />
            ))
          ) : (
            <>
              <StatCard
                icon="🎬"
                label="Tổng phim"
                value={stats.total}
                animate={animated}
              />
              <StatCard
                icon="✅"
                label="Đã xem"
                value={stats.watched}
                color="#22c55e"
                animate={animated}
              />
              <StatCard
                icon="🕐"
                label="Tổng thời gian"
                value={fmtRuntime(stats.total_runtime_minutes)}
                color="#3b82f6"
                animate={false}
              />
              <StatCard
                icon="⏱"
                label="Thời gian đã xem"
                value={fmtRuntime(stats.watched_runtime_minutes)}
                color="#a855f7"
                animate={false}
              />
              <StatCard
                icon="🔥"
                label="Streak hiện tại"
                value={stats.current_streak}
                sub={`Kỷ lục: ${stats.best_streak} tháng`}
                color="#f97316"
                animate={animated}
              />
              <StatCard
                icon="⏰"
                label="Thời gian TB/phim"
                value={fmtRuntime(stats.avg_runtime_minutes)}
                color="#f5c518"
                animate={false}
              />
            </>
          )}
        </div>

        {/* ── Main content grid ───────────── */}
        <div style={s.mainGrid} className="stats-main-grid">
          {/* Monthly activity chart */}
          <div style={{ ...s.panel, gridColumn: "1 / -1" }}>
            <div style={s.panelHeader}>
              <h2 style={s.panelTitle}>📅 Hoạt động theo tháng</h2>
              <span style={s.panelSub}>12 tháng gần nhất</span>
            </div>
            {loading ? (
              <Skeleton style={{ height: 180 }} />
            ) : (
              <MonthlyChart data={stats.monthly_activity} />
            )}
          </div>

          {/* Genre breakdown */}
          <div style={s.panel}>
            <div style={s.panelHeader}>
              <h2 style={s.panelTitle}>🎭 Thể loại yêu thích</h2>
              {!loading && (
                <span style={s.panelSub}>
                  {stats.all_genres.length} thể loại
                </span>
              )}
            </div>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} style={{ height: 28, marginBottom: 10 }} />
              ))
            ) : stats.all_genres.length === 0 ? (
              <p style={s.noData}>Chưa có dữ liệu thể loại</p>
            ) : (
              <GenreList genres={stats.all_genres} />
            )}
          </div>

          {/* Watched ratio + highlights */}
          <div style={s.panel}>
            <div style={s.panelHeader}>
              <h2 style={s.panelTitle}>📈 Tỷ lệ xem phim</h2>
            </div>
            {loading ? (
              <Skeleton style={{ height: 200 }} />
            ) : (
              <>
                <RatioRing watched={stats.watched} total={stats.total} />

                {stats.most_active_month && (
                  <div style={s.highlight}>
                    <span style={s.highlightIcon}>🏆</span>
                    <div>
                      <div style={s.highlightLabel}>Tháng xem nhiều nhất</div>
                      <div style={s.highlightVal}>
                        {fmtMonthFull(stats.most_active_month)}
                      </div>
                    </div>
                  </div>
                )}

                {stats.best_streak > 0 && (
                  <div style={{ ...s.highlight, marginTop: 10 }}>
                    <span style={s.highlightIcon}>🔥</span>
                    <div>
                      <div style={s.highlightLabel}>Streak kỷ lục</div>
                      <div style={s.highlightVal}>
                        {stats.best_streak} tháng liên tiếp
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── styles ──────────────────────────────────────────── */
const s = {
  page: {
    minHeight: "100vh",
    background: "var(--bg-page)",
    fontFamily: "var(--font-body)",
    color: "var(--text-primary)",
  },
  content: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "88px 20px 60px",
  },

  /* header */
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
    flexWrap: "wrap",
    gap: 12,
  },
  title: {
    fontSize: "var(--text-2xl)",
    fontWeight: 700,
    margin: 0,
    letterSpacing: "var(--tracking-tight)",
  },
  sub: {
    fontSize: "var(--text-sm)",
    color: "var(--text-muted)",
    marginTop: 4,
  },
  backBtn: {
    fontSize: 13,
    color: "var(--text-muted)",
    textDecoration: "none",
    padding: "8px 14px",
    border: "1px solid var(--border-mid)",
    borderRadius: "var(--radius-md)",
    transition: "var(--ease-fast)",
  },

  /* stat cards */
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: 14,
    marginBottom: 28,
  },
  statCard: {
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: "18px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    marginBottom: 4,
  },
  statNum: {
    fontSize: "var(--text-xl)",
    fontWeight: 700,
    lineHeight: 1.1,
    letterSpacing: "var(--tracking-tight)",
  },
  statLabel: {
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
  },
  statSub: {
    fontSize: "var(--text-xs)",
    color: "var(--text-muted)",
  },

  /* panels */
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  panel: {
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: "22px 22px 20px",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  panelTitle: {
    fontSize: "var(--text-md)",
    fontWeight: 600,
    margin: 0,
  },
  panelSub: {
    fontSize: "var(--text-xs)",
    color: "var(--text-muted)",
  },

  /* monthly chart */
  chartWrap: { width: "100%" },
  chartLegend: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
    fontSize: 13,
    color: "var(--text-muted)",
  },
  legendDot: (color) => ({
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: color,
  }),
  legendText: { fontSize: 12, color: "var(--text-muted)" },
  chartBars: {
    display: "flex",
    alignItems: "flex-end",
    gap: 6,
    height: 140,
    position: "relative",
  },
  barCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    height: "100%",
    position: "relative",
    cursor: "default",
  },
  tooltip: {
    position: "absolute",
    top: -72,
    left: "50%",
    transform: "translateX(-50%)",
    background: "var(--bg-overlay)",
    border: "1px solid var(--border-bright)",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 12,
    lineHeight: 1.6,
    whiteSpace: "nowrap",
    zIndex: 10,
    pointerEvents: "none",
    boxShadow: "var(--shadow-menu)",
  },
  tooltipMonth: {
    fontWeight: 600,
    marginBottom: 2,
    color: "var(--text-primary)",
  },
  barPair: {
    flex: 1,
    display: "flex",
    gap: 2,
    alignItems: "flex-end",
    width: "100%",
    paddingBottom: 4,
  },
  bar: {
    flex: 1,
    borderRadius: "3px 3px 0 0",
    minHeight: 2,
    transition: "height 0.6s cubic-bezier(.4,0,.2,1), opacity 0.15s",
  },
  barLabel: {
    fontSize: 10,
    color: "var(--text-muted)",
    marginTop: 4,
    textAlign: "center",
  },

  /* genre list */
  genreList: { display: "flex", flexDirection: "column", gap: 10 },
  genreRow: {
    display: "grid",
    gridTemplateColumns: "120px 1fr 32px",
    alignItems: "center",
    gap: 10,
  },
  genreName: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "var(--text-secondary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  genreRank: {
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    minWidth: 22,
  },
  genreBarWrap: {
    height: 7,
    background: "var(--border)",
    borderRadius: 4,
    overflow: "hidden",
  },
  genreBar: {
    height: "100%",
    borderRadius: 4,
    transition: "width 0.8s cubic-bezier(.4,0,.2,1)",
  },
  genreCount: {
    fontSize: 12,
    color: "var(--text-muted)",
    textAlign: "right",
  },

  /* ratio ring */
  ringWrap: {
    display: "flex",
    alignItems: "center",
    gap: 24,
    marginBottom: 16,
  },
  ringStats: { flex: 1, display: "flex", flexDirection: "column", gap: 10 },
  ringStatRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
  },
  ringDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  ringStatLabel: { flex: 1, color: "var(--text-secondary)" },
  ringStatVal: { fontWeight: 600, color: "var(--text-primary)" },

  /* highlight row */
  highlight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "var(--bg-card2)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "10px 14px",
  },
  highlightIcon: { fontSize: 20 },
  highlightLabel: { fontSize: 11, color: "var(--text-muted)" },
  highlightVal: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginTop: 2,
  },

  /* empty */
  emptyWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: 14,
    textAlign: "center",
    padding: 40,
  },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: "var(--text-xl)", fontWeight: 700, margin: 0 },
  emptySub: {
    fontSize: "var(--text-base)",
    color: "var(--text-muted)",
    maxWidth: 360,
    lineHeight: 1.6,
  },
  emptyBtn: {
    marginTop: 8,
    padding: "12px 28px",
    background: "var(--red)",
    color: "#fff",
    borderRadius: "var(--radius-md)",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 15,
  },

  /* skeleton */
  skeleton: {
    background: "var(--border)",
    borderRadius: 10,
    animation: "pulse 1.4s ease-in-out infinite",
  },

  noData: {
    color: "var(--text-muted)",
    fontSize: 13,
    textAlign: "center",
    padding: "20px 0",
  },
};

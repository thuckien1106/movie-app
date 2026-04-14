import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDetailedStats } from "../api/movieApi";
import Navbar from "../components/Navbar";

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
const MONTH_LABELS = [
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "T8",
  "T9",
  "T10",
  "T11",
  "T12",
];

function fmtRuntime(mins) {
  if (!mins || mins < 1) return "0 phút";
  const h = Math.floor(mins / 60),
    m = mins % 60;
  if (h === 0) return `${m} phút`;
  if (m === 0) return `${h} giờ`;
  return `${h}g ${m}p`;
}

function useCountUp(target, duration = 1000, started = true) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!started || !target) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, started]);
  return val;
}

/* ══════════════════════════════════════════════
   SKELETON
══════════════════════════════════════════════ */
function Bone({ w = "100%", h = 16, r = 8, style = {} }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: "var(--bg-card2)",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
        ...style,
      }}
    >
      <div style={sk.shine} />
    </div>
  );
}
const sk = {
  shine: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.055) 50%,transparent 100%)",
    animation: "skShine 1.6s ease-in-out infinite",
    transform: "translateX(-100%)",
  },
};

function StatsSkeleton() {
  return (
    <div style={s.page}>
      <Navbar />
      <style>{`@keyframes skShine{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      <div style={s.container}>
        <div style={{ marginBottom: 32 }}>
          <Bone w={160} h={12} r={6} style={{ marginBottom: 10 }} />
          <Bone w={280} h={40} r={10} />
        </div>
        <div style={s.heroGrid}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Bone key={i} h={100} r={14} />
          ))}
        </div>
        <div style={{ marginTop: 40 }}>
          <Bone w={200} h={24} r={8} style={{ marginBottom: 20 }} />
          <Bone h={220} r={14} />
        </div>
        <div style={{ marginTop: 40 }}>
          <Bone w={180} h={24} r={8} style={{ marginBottom: 20 }} />
          <Bone h={180} r={14} />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   CHART COMPONENTS (pure SVG, no libs)
══════════════════════════════════════════════ */

/* ── Genre horizontal bar chart ─────────────── */
function GenreChart({ genres }) {
  const [revealed, setRevealed] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setRevealed(true);
      },
      { threshold: 0.2 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  if (!genres?.length) return <EmptyChart label="Chưa có dữ liệu thể loại" />;

  const top = genres.slice(0, 10);
  const max = top[0]?.count || 1;

  const COLORS = [
    "#e50914",
    "#ff6b35",
    "#f5c518",
    "#22c55e",
    "#3b82f6",
    "#a855f7",
    "#f472b6",
    "#06b6d4",
    "#84cc16",
    "#fb923c",
  ];

  const ROW_H = 36;
  const LABEL_W = 110;
  const BAR_AREA = 560 - LABEL_W - 60; // available width for bar
  const SVG_H = top.length * ROW_H + 16;

  return (
    <div ref={ref} style={s.chartCard}>
      <ChartTitle
        icon="🎭"
        title="Thể loại hay xem nhất"
        sub={`${genres.length} thể loại · dựa trên watchlist`}
      />
      <div style={{ overflowX: "auto" }}>
        <svg
          width="100%"
          viewBox={`0 0 560 ${SVG_H}`}
          style={{ display: "block", minWidth: 320 }}
        >
          {top.map((g, i) => {
            const y = i * ROW_H + 8;
            const barW = revealed ? Math.max(4, (g.count / max) * BAR_AREA) : 0;
            const color = COLORS[i % COLORS.length];
            return (
              <g key={g.genre_id}>
                {/* Label */}
                <text
                  x={LABEL_W - 8}
                  y={y + ROW_H / 2}
                  textAnchor="end"
                  dominantBaseline="central"
                  fill="var(--text-secondary,rgba(255,255,255,0.7))"
                  fontSize="12"
                  fontFamily="var(--font-body,sans-serif)"
                >
                  {g.genre_name.length > 14
                    ? g.genre_name.slice(0, 13) + "…"
                    : g.genre_name}
                </text>
                {/* Track */}
                <rect
                  x={LABEL_W}
                  y={y + 10}
                  width={BAR_AREA}
                  height={ROW_H - 20}
                  rx="4"
                  fill="rgba(255,255,255,0.04)"
                />
                {/* Bar */}
                <rect
                  x={LABEL_W}
                  y={y + 10}
                  width={barW}
                  height={ROW_H - 20}
                  rx="4"
                  fill={color}
                  opacity="0.85"
                  style={{
                    transition: "width 0.7s cubic-bezier(0.16,1,0.3,1)",
                  }}
                />
                {/* Count */}
                <text
                  x={LABEL_W + barW + 6}
                  y={y + ROW_H / 2}
                  dominantBaseline="central"
                  fill={color}
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="var(--font-body,sans-serif)"
                  style={{ transition: "x 0.7s cubic-bezier(0.16,1,0.3,1)" }}
                >
                  {g.count}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ── Monthly activity bar chart ─────────────── */
function MonthlyChart({ data }) {
  const [revealed, setRevealed] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setRevealed(true);
      },
      { threshold: 0.15 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  if (!data?.length) return <EmptyChart label="Chưa có dữ liệu theo tháng" />;

  const maxVal = Math.max(...data.map((d) => Math.max(d.added, d.watched)), 1);
  const W = 560,
    H = 200;
  const PADDING = { top: 16, bottom: 36, left: 8, right: 8 };
  const n = data.length;
  const slotW = (W - PADDING.left - PADDING.right) / n;
  const barW = Math.max(6, slotW * 0.32);
  const chartH = H - PADDING.top - PADDING.bottom;

  return (
    <div ref={ref} style={s.chartCard}>
      <ChartTitle
        icon="📅"
        title="Hoạt động theo tháng"
        sub="12 tháng gần nhất"
      />
      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
        <span style={s.legendItem}>
          <span
            style={{ ...s.legendDot, background: "rgba(59,130,246,0.7)" }}
          />
          Thêm vào
        </span>
        <span style={s.legendItem}>
          <span
            style={{ ...s.legendDot, background: "rgba(34,197,94,0.85)" }}
          />
          Đã xem
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: "block", minWidth: 320 }}
        >
          {data.map((d, i) => {
            const cx = PADDING.left + (i + 0.5) * slotW;
            const addedH = revealed ? (d.added / maxVal) * chartH : 0;
            const watchH = revealed ? (d.watched / maxVal) * chartH : 0;
            const baseY = PADDING.top + chartH;
            const hasData = d.added > 0 || d.watched > 0;

            return (
              <g key={`${d.year}-${d.month}`}>
                {/* Added bar */}
                <rect
                  x={cx - barW - 1}
                  y={baseY - addedH}
                  width={barW}
                  height={addedH}
                  rx="3"
                  fill="rgba(59,130,246,0.7)"
                  style={{
                    transition: `height 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 30}ms, y 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 30}ms`,
                  }}
                />
                {/* Watched bar */}
                <rect
                  x={cx + 1}
                  y={baseY - watchH}
                  width={barW}
                  height={watchH}
                  rx="3"
                  fill="rgba(34,197,94,0.85)"
                  style={{
                    transition: `height 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 30 + 60}ms, y 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 30 + 60}ms`,
                  }}
                />
                {/* Month label */}
                <text
                  x={cx}
                  y={baseY + 14}
                  textAnchor="middle"
                  fontSize="10"
                  fill={
                    hasData ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.2)"
                  }
                  fontFamily="var(--font-body,sans-serif)"
                >
                  {MONTH_LABELS[d.month - 1]}
                </text>
                {/* Year label — chỉ show tháng 1 */}
                {d.month === 1 && (
                  <text
                    x={cx}
                    y={baseY + 26}
                    textAnchor="middle"
                    fontSize="8"
                    fill="rgba(255,255,255,0.25)"
                    fontFamily="var(--font-body,sans-serif)"
                  >
                    {d.year}
                  </text>
                )}
                {/* Value label khi có data */}
                {d.watched > 0 && revealed && (
                  <text
                    x={cx + 1 + barW / 2}
                    y={baseY - watchH - 4}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="700"
                    fill="rgba(34,197,94,0.9)"
                    fontFamily="var(--font-body,sans-serif)"
                  >
                    {d.watched}
                  </text>
                )}
              </g>
            );
          })}
          {/* Baseline */}
          <line
            x1={PADDING.left}
            y1={PADDING.top + chartH}
            x2={W - PADDING.right}
            y2={PADDING.top + chartH}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        </svg>
      </div>
    </div>
  );
}

/* ── Donut chart cho watched vs unwatched ───── */
function DonutChart({ watched, total }) {
  const [revealed, setRevealed] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setRevealed(true);
      },
      { threshold: 0.3 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const pct = total > 0 ? watched / total : 0;
  const R = 54,
    SW = 12,
    C = 70;
  const circ = 2 * Math.PI * R;
  const arc = revealed ? pct * circ : 0;

  return (
    <div
      ref={ref}
      style={{ ...s.chartCard, display: "flex", alignItems: "center", gap: 28 }}
    >
      <svg
        width={C * 2}
        height={C * 2}
        viewBox={`0 0 ${C * 2} ${C * 2}`}
        style={{ flexShrink: 0 }}
      >
        {/* Track */}
        <circle
          cx={C}
          cy={C}
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={SW}
        />
        {/* Arc */}
        <circle
          cx={C}
          cy={C}
          r={R}
          fill="none"
          stroke="url(#donutGrad)"
          strokeWidth={SW}
          strokeDasharray={`${arc} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${C} ${C})`}
          style={{
            transition: "stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)",
          }}
        />
        <defs>
          <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>
        <text
          x={C}
          y={C - 6}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#22c55e"
          fontSize="17"
          fontWeight="800"
          fontFamily="var(--font-body,sans-serif)"
        >
          {Math.round(pct * 100)}%
        </text>
        <text
          x={C}
          y={C + 12}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(255,255,255,0.3)"
          fontSize="9"
          fontFamily="var(--font-body,sans-serif)"
        >
          đã xem
        </text>
      </svg>
      <div style={{ flex: 1 }}>
        <ChartTitle icon="📊" title="Tiến độ xem phim" sub={null} noCard />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: 12,
          }}
        >
          <DonutLegendRow
            color="#22c55e"
            label="Đã xem"
            value={watched}
            total={total}
          />
          <DonutLegendRow
            color="rgba(255,255,255,0.15)"
            label="Chưa xem"
            value={total - watched}
            total={total}
          />
        </div>
      </div>
    </div>
  );
}
function DonutLegendRow({ color, label, value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          background: color,
          flexShrink: 0,
          display: "inline-block",
        }}
      />
      <span style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
        {label}
      </span>
      <span
        style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 11,
          color: "var(--text-faint)",
          minWidth: 34,
          textAlign: "right",
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

/* ── Empty chart placeholder ─────────────────── */
function EmptyChart({ label }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "40px 20px",
        color: "var(--text-faint)",
        fontSize: 13,
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
      {label}
    </div>
  );
}

/* ── Chart title ─────────────────────────────── */
function ChartTitle({ icon, title, sub, noCard }) {
  return (
    <div style={{ marginBottom: noCard ? 0 : 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: sub ? 3 : 0,
        }}
      >
        <span style={{ fontSize: 16 }}>{icon}</span>
        <h2
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "0.01em",
          }}
        >
          {title}
        </h2>
      </div>
      {sub && (
        <p
          style={{
            margin: "0 0 0 24px",
            fontSize: 11,
            color: "var(--text-faint)",
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

/* ── Hero stat card ──────────────────────────── */
function HeroCard({ icon, label, value, accent, sub, animTarget, delay = 0 }) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGo(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  const counted = useCountUp(animTarget ?? 0, 900, go);
  const display = animTarget !== undefined ? counted : value;
  return (
    <div style={{ ...s.heroCard, borderTop: `2px solid ${accent}` }}>
      <span style={{ fontSize: 22, marginBottom: 8, display: "block" }}>
        {icon}
      </span>
      <p
        style={{
          margin: "0 0 2px",
          fontSize: 22,
          fontWeight: 800,
          color: "var(--text-primary)",
          fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
          letterSpacing: "0.02em",
          lineHeight: 1,
        }}
      >
        {display}
        {animTarget !== undefined ? "" : ""}
      </p>
      {sub && (
        <p
          style={{
            margin: "0 0 4px",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          {sub}
        </p>
      )}
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-faint)",
        }}
      >
        {label}
      </p>
    </div>
  );
}

/* ── Streak card ─────────────────────────────── */
function StreakCard({ current, best }) {
  return (
    <div style={s.chartCard}>
      <ChartTitle
        icon="🔥"
        title="Streak xem phim"
        sub="Số tháng liên tiếp có xem ít nhất 1 phim"
      />
      <div style={{ display: "flex", gap: 16 }}>
        <div style={s.streakBox}>
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 32,
              fontWeight: 800,
              color: "#f97316",
              fontFamily: "var(--font-display)",
              lineHeight: 1,
            }}
          >
            {current}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: "var(--text-faint)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
            }}
          >
            Hiện tại
          </p>
          {current > 0 && (
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 11,
                color: "rgba(249,115,22,0.7)",
              }}
            >
              🔥 Đang duy trì!
            </p>
          )}
        </div>
        <div style={{ ...s.streakBox, borderColor: "rgba(255,255,255,0.07)" }}>
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 32,
              fontWeight: 800,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-display)",
              lineHeight: 1,
            }}
          >
            {best}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: "var(--text-faint)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
            }}
          >
            Kỷ lục
          </p>
          {best > 1 && (
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 11,
                color: "var(--text-faint)",
              }}
            >
              🏆 Best streak
            </p>
          )}
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            paddingLeft: 8,
          }}
        >
          {current === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: "var(--text-faint)",
                lineHeight: 1.6,
              }}
            >
              Xem 1 phim tháng này để bắt đầu streak! 🎬
            </p>
          ) : current >= best ? (
            <p style={{ fontSize: 13, color: "#f97316", lineHeight: 1.6 }}>
              Bạn đang ở streak cao nhất từ trước đến nay! Tiếp tục nhé 💪
            </p>
          ) : (
            <p
              style={{
                fontSize: 13,
                color: "var(--text-faint)",
                lineHeight: 1.6,
              }}
            >
              Còn {best - current} tháng nữa để đạt kỷ lục
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Most active month ───────────────────────── */
function MostActiveMonth({ monthStr, data }) {
  if (!monthStr || !data) return null;
  const [year, month] = monthStr.split("-").map(Number);
  const entry = data.find((d) => d.year === year && d.month === month);
  if (!entry) return null;
  const viMonth = `Tháng ${month}/${year}`;
  return (
    <div
      style={{
        ...s.chartCard,
        background: "rgba(229,9,20,0.06)",
        borderColor: "rgba(229,9,20,0.2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 28 }}>🏆</span>
        <div>
          <p
            style={{
              margin: "0 0 2px",
              fontSize: 12,
              color: "var(--red-text,#ff6b6b)",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Tháng hoạt động nhất
          </p>
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 20,
              fontWeight: 800,
              color: "var(--text-primary)",
              fontFamily: "var(--font-display)",
            }}
          >
            {viMonth}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
            {entry.watched} phim đã xem · {entry.added} phim thêm mới
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function Statistics() {
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
  }, [isLoggedIn]);

  useEffect(() => {
    getDetailedStats()
      .then((r) => {
        setData(r.data);
        setTimeout(() => setEntered(true), 60);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <StatsSkeleton />;
  if (error)
    return (
      <div style={s.page}>
        <Navbar />
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            color: "var(--text-faint)",
          }}
        >
          <p style={{ fontSize: 40, marginBottom: 12 }}>😔</p>
          <p
            style={{
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 8,
              color: "var(--text-secondary)",
            }}
          >
            Không tải được dữ liệu
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ ...s.btnGhost, display: "inline-flex" }}
          >
            Thử lại
          </button>
        </div>
      </div>
    );

  const totalRuntime = data.watched_runtime_minutes || 0;
  const avgRuntime = data.avg_runtime_minutes || 0;
  const pct =
    data.total > 0 ? Math.round((data.watched / data.total) * 100) : 0;

  return (
    <div
      style={{
        ...s.page,
        opacity: entered ? 1 : 0,
        transform: entered ? "none" : "translateY(12px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}
    >
      <Navbar />
      <style>{`
        @keyframes skShine { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={s.container}>
        {/* ── Page header ── */}
        <div style={s.pageHeader}>
          <div>
            <p style={s.eyebrow}>Thống kê cá nhân</p>
            <h1 style={s.pageTitle}>Statistics</h1>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link to="/watchlist" style={s.btnGhost}>
              ← Watchlist
            </Link>
          </div>
        </div>

        {/* ── Hero stat cards ── */}
        <div style={s.heroGrid}>
          <HeroCard
            icon="🎬"
            label="Phim đã lưu"
            value={data.total}
            animTarget={data.total}
            accent="#3b82f6"
            delay={0}
          />
          <HeroCard
            icon="✓"
            label="Đã xem"
            value={data.watched}
            animTarget={data.watched}
            accent="#22c55e"
            delay={80}
          />
          <HeroCard
            icon="⏳"
            label="Chưa xem"
            value={data.unwatched}
            animTarget={data.unwatched}
            accent="#eab308"
            delay={160}
          />
          <HeroCard
            icon="⏱"
            label="Tổng thời gian xem"
            value={fmtRuntime(totalRuntime)}
            accent="#a855f7"
            delay={240}
          />
          <HeroCard
            icon="🎯"
            label="Hoàn thành"
            value={`${pct}%`}
            sub={`${data.watched}/${data.total} phim`}
            accent="var(--red,#e50914)"
            delay={320}
          />
        </div>

        {/* ── Second row: avg runtime + streak ── */}
        <div style={s.twoCol}>
          {avgRuntime > 0 && (
            <div style={s.chartCard}>
              <ChartTitle
                icon="⌛"
                title="Trung bình mỗi phim"
                sub="Thời lượng trung bình phim đã xem"
              />
              <p
                style={{
                  margin: 0,
                  fontSize: 36,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-display)",
                  lineHeight: 1,
                }}
              >
                {fmtRuntime(avgRuntime)}
              </p>
            </div>
          )}
          {data.most_active_month && (
            <MostActiveMonth
              monthStr={data.most_active_month}
              data={data.monthly_activity}
            />
          )}
        </div>

        {/* ── Progress donut ── */}
        <DonutChart watched={data.watched} total={data.total} />

        {/* ── Monthly activity ── */}
        <MonthlyChart data={data.monthly_activity} />

        {/* ── Streak ── */}
        <StreakCard current={data.current_streak} best={data.best_streak} />

        {/* ── Genre chart ── */}
        <GenreChart genres={data.all_genres} />

        {/* ── Footer ── */}
        <p
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "var(--text-dim,rgba(255,255,255,0.15))",
            marginTop: 16,
            marginBottom: 40,
          }}
        >
          Dữ liệu dựa trên watchlist của bạn · Cập nhật realtime
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════ */
const s = {
  page: {
    background: "var(--bg-page)",
    minHeight: "100vh",
    color: "var(--text-primary)",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
    paddingTop: 60,
  },
  container: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "32px clamp(16px,4vw,48px) 60px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 12,
  },
  eyebrow: {
    margin: "0 0 4px",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "var(--text-faint)",
  },
  pageTitle: {
    margin: 0,
    fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
    fontSize: "clamp(32px,5vw,52px)",
    fontWeight: 400,
    letterSpacing: "0.04em",
    lineHeight: 1,
  },
  heroGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: 12,
  },
  heroCard: {
    background: "var(--bg-surface,#0e1218)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg,14px)",
    padding: "16px 18px 14px",
    display: "flex",
    flexDirection: "column",
  },
  chartCard: {
    background: "var(--bg-surface,#0e1218)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg,14px)",
    padding: "20px 20px 16px",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 16,
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "var(--text-muted)",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    flexShrink: 0,
    display: "inline-block",
  },
  streakBox: {
    background: "rgba(249,115,22,0.07)",
    border: "1px solid rgba(249,115,22,0.2)",
    borderRadius: "var(--radius-lg,14px)",
    padding: "14px 20px",
    minWidth: 90,
    textAlign: "center",
  },
  btnGhost: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    background: "var(--bg-card)",
    border: "1px solid var(--border-mid)",
    color: "var(--text-secondary)",
    padding: "9px 16px",
    borderRadius: "var(--radius-md,10px)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "var(--font-body,sans-serif)",
    textDecoration: "none",
    transition: "border-color 0.15s",
  },
};

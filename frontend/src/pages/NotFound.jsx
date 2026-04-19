// src/pages/NotFound.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const SUGGESTIONS = [
  { path: "/", label: "Trang chủ", icon: "🏠" },
  { path: "/watchlist", label: "Watchlist", icon: "🎬" },
  { path: "/recommendations", label: "Gợi ý phim", icon: "✨" },
  { path: "/mood", label: "Khám phá theo tâm trạng", icon: "🎭" },
];

/* ── Countdown tự động redirect ── */
function useCountdown(seconds) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const t = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(t);
  }, [left]);
  return left;
}

export default function NotFound() {
  const navigate = useNavigate();
  const countdown = useCountdown(10);

  useEffect(() => {
    if (countdown === 0) navigate("/", { replace: true });
  }, [countdown, navigate]);

  return (
    <div style={s.page}>
      {/* Noise grain overlay */}
      <div style={s.grain} />

      {/* Floating circles decoration */}
      <div
        style={{
          ...s.circle,
          width: 400,
          height: 400,
          top: -100,
          left: -120,
          animationDelay: "0s",
        }}
      />
      <div
        style={{
          ...s.circle,
          width: 280,
          height: 280,
          bottom: 60,
          right: -80,
          animationDelay: "1.5s",
        }}
      />

      <div style={s.card}>
        {/* 404 big number */}
        <div style={s.codeWrap}>
          <span style={s.code}>4</span>
          <span style={s.codeFilm}>🎬</span>
          <span style={s.code}>4</span>
        </div>

        {/* Divider */}
        <div style={s.divider} />

        {/* Title + description */}
        <h1 style={s.title}>Trang không tồn tại</h1>
        <p style={s.desc}>
          Trang bạn đang tìm kiếm đã bị xóa, đổi tên, hoặc chưa bao giờ tồn tại.
        </p>

        {/* Countdown */}
        <div style={s.countdown}>
          <div
            style={{
              ...s.countdownBar,
              width: `${(countdown / 10) * 100}%`,
            }}
          />
          <span style={s.countdownText}>
            Tự động về trang chủ sau{" "}
            <strong style={{ color: "var(--red, #e50914)" }}>
              {countdown}s
            </strong>
          </span>
        </div>

        {/* CTA buttons */}
        <div style={s.btnRow}>
          <button onClick={() => navigate(-1)} style={s.btnSecondary}>
            ← Quay lại
          </button>
          <Link to="/" style={s.btnPrimary}>
            Về trang chủ
          </Link>
        </div>

        {/* Suggestion links */}
        <div style={s.suggestWrap}>
          <p style={s.suggestLabel}>Có thể bạn muốn đến:</p>
          <div style={s.suggestGrid}>
            {SUGGESTIONS.map((s_) => (
              <Link key={s_.path} to={s_.path} style={s.suggestItem}>
                <span style={{ fontSize: 18 }}>{s_.icon}</span>
                <span style={{ fontSize: 12, marginTop: 4 }}>{s_.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style>{css}</style>
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────── */
const s = {
  page: {
    minHeight: "100vh",
    background: "var(--bg-page, #080b0f)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    position: "relative",
    overflow: "hidden",
    fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
  },
  grain: {
    position: "fixed",
    inset: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
    pointerEvents: "none",
    zIndex: 0,
  },
  circle: {
    position: "absolute",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(229,9,20,0.06) 0%, transparent 70%)",
    animation: "pulse404 4s ease-in-out infinite",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    zIndex: 1,
    maxWidth: 520,
    width: "100%",
    textAlign: "center",
    padding: "48px 40px 40px",
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(100,120,175,0.12)",
    borderRadius: 24,
    backdropFilter: "blur(12px)",
    boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
    animation: "fadeUp 0.5s cubic-bezier(0.34,1.2,0.64,1) both",
  },

  /* 404 number */
  codeWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 20,
    lineHeight: 1,
  },
  code: {
    fontSize: "clamp(72px, 15vw, 108px)",
    fontWeight: 900,
    color: "transparent",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    backgroundImage:
      "linear-gradient(135deg, rgba(229,9,20,0.9) 0%, rgba(255,80,80,0.5) 100%)",
    letterSpacing: "-0.04em",
    lineHeight: 1,
    fontFamily: "var(--font-display, 'DM Sans', sans-serif)",
  },
  codeFilm: {
    fontSize: "clamp(48px, 10vw, 72px)",
    animation: "spin404 6s linear infinite",
    display: "inline-block",
    margin: "0 8px",
  },

  divider: {
    width: 48,
    height: 3,
    background: "rgba(229,9,20,0.4)",
    borderRadius: 99,
    margin: "0 auto 24px",
  },

  title: {
    margin: "0 0 10px",
    fontSize: "clamp(20px, 4vw, 26px)",
    fontWeight: 700,
    color: "var(--text-primary, #f0f4ff)",
    letterSpacing: "-0.02em",
  },
  desc: {
    margin: "0 0 28px",
    fontSize: 14,
    color: "rgba(140,155,195,0.6)",
    lineHeight: 1.7,
  },

  /* Countdown */
  countdown: {
    position: "relative",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(100,120,175,0.1)",
    borderRadius: 10,
    overflow: "hidden",
    padding: "10px 14px",
    marginBottom: 24,
  },
  countdownBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    background: "rgba(229,9,20,0.12)",
    transition: "width 1s linear",
  },
  countdownText: {
    position: "relative",
    fontSize: 12.5,
    color: "rgba(140,155,195,0.55)",
  },

  /* Buttons */
  btnRow: {
    display: "flex",
    gap: 10,
    justifyContent: "center",
    marginBottom: 32,
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    padding: "11px 24px",
    background: "var(--red, #e50914)",
    color: "#fff",
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 13.5,
    textDecoration: "none",
    transition: "all 0.18s ease",
    fontFamily: "inherit",
    boxShadow: "0 4px 16px rgba(229,9,20,0.35)",
  },
  btnSecondary: {
    display: "inline-flex",
    alignItems: "center",
    padding: "11px 20px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(100,120,175,0.18)",
    color: "rgba(160,175,210,0.8)",
    borderRadius: 12,
    fontWeight: 600,
    fontSize: 13.5,
    cursor: "pointer",
    transition: "all 0.18s ease",
    fontFamily: "inherit",
  },

  /* Suggestions */
  suggestWrap: {
    borderTop: "1px solid rgba(100,120,175,0.1)",
    paddingTop: 24,
  },
  suggestLabel: {
    margin: "0 0 14px",
    fontSize: 11.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "rgba(140,155,195,0.4)",
  },
  suggestGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
  },
  suggestItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: "12px 8px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(100,120,175,0.1)",
    borderRadius: 12,
    color: "rgba(160,175,210,0.65)",
    textDecoration: "none",
    transition: "all 0.18s ease",
    fontFamily: "inherit",
  },
};

const css = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes pulse404 {
    0%, 100% { transform: scale(1);    opacity: 1; }
    50%       { transform: scale(1.08); opacity: 0.7; }
  }
  @keyframes spin404 {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  a[href]:hover .suggest-item,
  a[href]:hover {
    border-color: rgba(229,9,20,0.3) !important;
    background: rgba(229,9,20,0.07) !important;
    color: rgba(255,140,140,0.9) !important;
  }
`;

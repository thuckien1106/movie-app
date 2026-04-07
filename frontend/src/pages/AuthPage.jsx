import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login, register } from "../api/movieApi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastContext";

/* ══════════════════════════════════════════════════════
   FILMVERSE — AUTH PAGE
   Layout: Full-bleed cinematic BG + centered glass card
   Unique detail: animated film-strip ticker on edges,
   floating labels, password strength meter, page-enter
══════════════════════════════════════════════════════ */

/* ── SVG Logo (reuse from Navbar) ─────────────────── */
function Logo({ size = 30 }) {
  return (
    <svg width={size * 2.8} height={size} viewBox="0 0 90 32" fill="none">
      <rect
        x="1"
        y="4"
        width="3"
        height="24"
        rx="1.5"
        fill="#e50914"
        opacity="0.9"
      />
      <rect
        x="1"
        y="6"
        width="3"
        height="4"
        rx="1"
        fill="var(--bg-page, #080b0f)"
      />
      <rect
        x="1"
        y="13"
        width="3"
        height="4"
        rx="1"
        fill="var(--bg-page, #080b0f)"
      />
      <rect
        x="1"
        y="20"
        width="3"
        height="4"
        rx="1"
        fill="var(--bg-page, #080b0f)"
      />
      <text
        x="9"
        y="23"
        fontFamily="'Bebas Neue','Arial Narrow',sans-serif"
        fontSize="22"
        letterSpacing="2"
        fill="var(--text-primary, #f0f4ff)"
      >
        FILMVERSE
      </text>
      <circle cx="86" cy="22" r="2.5" fill="#e50914" />
    </svg>
  );
}

/* ── Eye icon for password toggle ─────────────────── */
function EyeIcon({ open }) {
  return open ? (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* ── Password strength ─────────────────────────────── */
function passwordStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "transparent" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: "", color: "transparent" },
    { label: "Yếu", color: "#ef4444" },
    { label: "Trung bình", color: "#eab308" },
    { label: "Tốt", color: "#22c55e" },
    { label: "Mạnh", color: "#22c55e" },
  ];
  return { score, ...map[score] };
}

/* ── Floating label input ──────────────────────────── */
function FloatField({
  label,
  name,
  type: typeProp = "text",
  value,
  onChange,
  required,
  autoComplete,
}) {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const isPassword = typeProp === "password";
  const type = isPassword && showPass ? "text" : typeProp;
  const filled = value.length > 0;
  const lifted = focused || filled;
  const strength = isPassword ? passwordStrength(value) : null;

  return (
    <div
      style={{
        position: "relative",
        marginBottom: isPassword && value ? 28 : 20,
      }}
    >
      {/* floating label */}
      <label
        style={{
          ...s.floatLabel,
          top: lifted ? 6 : "50%",
          fontSize: lifted ? 10 : 14,
          color: focused
            ? "var(--red-text, #ff6b6b)"
            : lifted
              ? "var(--text-muted)"
              : "var(--text-faint)",
          transform: lifted ? "none" : "translateY(-50%)",
        }}
      >
        {label}
      </label>

      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...s.floatInput,
          borderColor: focused
            ? "var(--red-border, rgba(229,9,20,0.5))"
            : filled
              ? "var(--border-bright)"
              : "var(--border-mid)",
          boxShadow: focused
            ? "0 0 0 3px var(--red-dim, rgba(229,9,20,0.14))"
            : "none",
          paddingRight: isPassword ? 44 : 16,
        }}
      />

      {/* password toggle */}
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPass((p) => !p)}
          style={s.eyeBtn}
          tabIndex={-1}
        >
          <EyeIcon open={showPass} />
        </button>
      )}

      {/* password strength bar */}
      {isPassword && value && (
        <div style={s.strengthWrap}>
          <div style={s.strengthTrack}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  ...s.strengthSeg,
                  background:
                    i <= strength.score ? strength.color : "var(--border-mid)",
                  opacity: i <= strength.score ? 1 : 0.35,
                }}
              />
            ))}
          </div>
          <span style={{ ...s.strengthLabel, color: strength.color }}>
            {strength.label}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Animated film-strip ticker ───────────────────── */
const TICKER_ITEMS = [
  "ACTION",
  "DRAMA",
  "SCI-FI",
  "THRILLER",
  "ROMANCE",
  "HORROR",
  "COMEDY",
  "FANTASY",
  "MYSTERY",
  "ADVENTURE",
];

function FilmTicker({ side }) {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div
      style={{
        ...s.ticker,
        [side]: 0,
        writingMode: "vertical-rl",
        transform: side === "left" ? "none" : "rotate(180deg)",
      }}
    >
      <div style={s.tickerTrack}>
        {items.map((t, i) => (
          <span key={i} style={s.tickerItem}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN AUTH PAGE
══════════════════════════════════════════════════════ */
export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", username: "" });
  const [loading, setLoading] = useState(false);
  const [entered, setEntered] = useState(false);

  const { saveSession } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();

  // page-enter animation trigger
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const switchMode = (m) => {
    setMode(m);
    setForm({ email: form.email, password: "", username: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : {
              email: form.email,
              password: form.password,
              username: form.username || undefined,
            };

      const res =
        mode === "login" ? await login(payload) : await register(payload);
      saveSession(res.data.access_token, res.data.user);
      showToast(
        mode === "login"
          ? "Đăng nhập thành công!"
          : "Tạo tài khoản thành công!",
        "success",
      );
      navigate("/");
    } catch (err) {
      showToast(
        err.response?.data?.detail || "Đã có lỗi xảy ra, thử lại nhé.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      {/* ── Cinematic background layers ── */}
      <div style={s.bgBase} />
      {/* Diagonal red slash */}
      <div style={s.bgSlash} />
      {/* Radial ambient glows */}
      <div style={s.glow1} />
      <div style={s.glow2} />
      <div style={s.glow3} />
      {/* Noise grain overlay */}
      <div style={s.grain} />
      {/* Film grid lines */}
      <div style={s.gridLines} />

      {/* ── Film strip tickers ── */}
      <FilmTicker side="left" />
      <FilmTicker side="right" />

      {/* ── Back to home ── */}
      <Link to="/" style={s.backBtn}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span>Trang chủ</span>
      </Link>

      {/* ── Glass card ── */}
      <div
        style={{
          ...s.card,
          opacity: entered ? 1 : 0,
          transform: entered
            ? "translateY(0) scale(1)"
            : "translateY(24px) scale(0.97)",
        }}
      >
        {/* Card inner glow border */}
        <div style={s.cardInnerGlow} />

        {/* ── Header ── */}
        <div style={s.cardHeader}>
          <Link
            to="/"
            style={{ textDecoration: "none", display: "inline-flex" }}
          >
            <Logo size={26} />
          </Link>
          <div style={s.headerDivider} />
          <p style={s.cardSubtitle}>
            {mode === "login" ? "Chào mừng trở lại 👋" : "Tham gia Filmverse"}
          </p>
        </div>

        {/* ── Mode toggle ── */}
        <div style={s.modeToggle}>
          {[
            { key: "login", label: "Đăng nhập" },
            { key: "register", label: "Đăng ký" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => switchMode(key)}
              style={{
                ...s.modeBtn,
                ...(mode === key ? s.modeBtnActive : {}),
              }}
            >
              {label}
              {mode === key && <span style={s.modeIndicator} />}
            </button>
          ))}
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} style={s.form}>
          {mode === "register" && (
            <FloatField
              label="Tên hiển thị (tuỳ chọn)"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
            />
          )}
          <FloatField
            label="Địa chỉ Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            autoComplete="email"
          />
          <FloatField
            label="Mật khẩu"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...s.submitBtn,
              opacity: loading ? 0.75 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "var(--red-hover, #ff1a1a)";
                e.currentTarget.style.boxShadow =
                  "0 6px 28px rgba(229,9,20,0.5), 0 0 0 1px rgba(229,9,20,0.3)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--red)";
              e.currentTarget.style.boxShadow =
                "0 4px 20px rgba(229,9,20,0.35)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {loading ? (
              <span style={s.spinnerWrap}>
                <span style={s.spinner} />
                <span>Đang xử lý…</span>
              </span>
            ) : (
              <span style={s.btnInner}>
                <span>{mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</span>
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
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            )}
          </button>
        </form>

        {/* ── Divider ── */}
        <div style={s.divider}>
          <div style={s.dividerLine} />
          <span style={s.dividerText}>hoặc</span>
          <div style={s.dividerLine} />
        </div>

        {/* ── Social placeholders ── */}
        <div style={s.socialRow}>
          {[
            { label: "Google", icon: "G", color: "#ea4335" },
            { label: "Facebook", icon: "f", color: "#1877f2" },
          ].map(({ label, icon, color }) => (
            <button
              key={label}
              type="button"
              style={s.socialBtn}
              onClick={() => showToast("Chức năng sắp ra mắt!", "info")}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-bright)";
                e.currentTarget.style.background = "var(--bg-card2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-mid)";
                e.currentTarget.style.background = "var(--bg-card)";
              }}
            >
              <span style={{ ...s.socialIcon, color }}>{icon}</span>
              <span style={s.socialLabel}>Tiếp tục với {label}</span>
            </button>
          ))}
        </div>

        {/* ── Switch link ── */}
        <p style={s.switchText}>
          {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
          <button
            type="button"
            style={s.switchLink}
            onClick={() => switchMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Đăng ký ngay →" : "Đăng nhập →"}
          </button>
        </p>

        {/* ── Terms footnote ── */}
        <p style={s.terms}>
          Bằng cách tiếp tục, bạn đồng ý với{" "}
          <span style={s.termsLink}>Điều khoản sử dụng</span> và{" "}
          <span style={s.termsLink}>Chính sách bảo mật</span>.
        </p>
      </div>

      <style>{authCSS}</style>
    </div>
  );
}

/* ── Global CSS for this page ────────────────────── */
const authCSS = `
  @keyframes tickerScroll {
    0%   { transform: translateY(0); }
    100% { transform: translateY(-50%); }
  }
  @keyframes authSpinner {
    to { transform: rotate(360deg); }
  }
  @keyframes glowPulse {
    0%, 100% { opacity: 0.55; transform: scale(1);    }
    50%       { opacity: 0.8;  transform: scale(1.08); }
  }
  @keyframes slashDrift {
    0%, 100% { transform: skewY(-12deg) translateX(0);    }
    50%       { transform: skewY(-12deg) translateX(-8px); }
  }
`;

/* ── Styles ──────────────────────────────────────── */
const s = {
  /* ── Page shell ── */
  page: {
    position: "relative",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 20px",
    overflow: "hidden",
    fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
  },

  /* ── Background ── */
  bgBase: {
    position: "absolute",
    inset: 0,
    zIndex: 0,
    background: "var(--bg-page, #080b0f)",
  },
  bgSlash: {
    position: "absolute",
    top: "-20%",
    left: "-15%",
    width: "55%",
    height: "140%",
    zIndex: 0,
    background:
      "linear-gradient(to right, rgba(229,9,20,0.07) 0%, transparent 100%)",
    transform: "skewY(-12deg)",
    animation: "slashDrift 12s ease-in-out infinite",
    pointerEvents: "none",
  },
  glow1: {
    position: "absolute",
    zIndex: 0,
    width: 600,
    height: 600,
    top: "-15%",
    left: "-10%",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(229,9,20,0.13) 0%, transparent 68%)",
    animation: "glowPulse 8s ease-in-out infinite",
    pointerEvents: "none",
  },
  glow2: {
    position: "absolute",
    zIndex: 0,
    width: 500,
    height: 500,
    bottom: "-10%",
    right: "-5%",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(229,9,20,0.09) 0%, transparent 65%)",
    animation: "glowPulse 10s ease-in-out infinite 2s",
    pointerEvents: "none",
  },
  glow3: {
    position: "absolute",
    zIndex: 0,
    width: 300,
    height: 300,
    top: "40%",
    right: "20%",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(245,197,24,0.05) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  grain: {
    position: "absolute",
    inset: 0,
    zIndex: 1,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E")`,
    backgroundSize: "200px 200px",
    pointerEvents: "none",
    opacity: 0.6,
  },
  gridLines: {
    position: "absolute",
    inset: 0,
    zIndex: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.014) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.014) 1px, transparent 1px)",
    backgroundSize: "80px 80px",
    pointerEvents: "none",
  },

  /* ── Film tickers ── */
  ticker: {
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 2,
    width: 28,
    overflow: "hidden",
    opacity: 0.06,
    pointerEvents: "none",
  },
  tickerTrack: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    animation: "tickerScroll 28s linear infinite",
  },
  tickerItem: {
    fontSize: 8,
    fontFamily: "var(--font-display, 'Bebas Neue', sans-serif)",
    letterSpacing: "0.15em",
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
    lineHeight: 1,
  },

  /* ── Back button ── */
  backBtn: {
    position: "absolute",
    top: 20,
    left: 44,
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "var(--text-muted)",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 500,
    padding: "6px 12px 6px 8px",
    borderRadius: "var(--radius-full, 999px)",
    border: "1px solid var(--border-mid)",
    background: "var(--bg-glass, rgba(14,18,24,0.75))",
    backdropFilter: "blur(12px)",
    transition:
      "color 0.18s ease, border-color 0.18s ease, background 0.18s ease",
  },

  /* ── Glass card ── */
  card: {
    position: "relative",
    zIndex: 5,
    width: "100%",
    maxWidth: 420,
    background: "rgba(14,18,28,0.72)",
    backdropFilter: "blur(28px) saturate(1.6)",
    WebkitBackdropFilter: "blur(28px) saturate(1.6)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "var(--radius-xl, 20px)",
    padding: "36px 32px 28px",
    boxShadow:
      "0 32px 80px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(229,9,20,0.15), inset 0 1px 0 rgba(255,255,255,0.07)",
    transition:
      "opacity 0.5s cubic-bezier(0.4,0,0.2,1), transform 0.5s cubic-bezier(0.34,1.2,0.64,1)",
  },
  cardInnerGlow: {
    position: "absolute",
    top: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "60%",
    height: 1,
    background:
      "linear-gradient(to right, transparent, rgba(229,9,20,0.5), transparent)",
    borderRadius: "50%",
    pointerEvents: "none",
  },

  /* Card header */
  cardHeader: {
    marginBottom: 24,
  },
  headerDivider: {
    height: 1,
    background: "linear-gradient(to right, var(--red), transparent)",
    margin: "14px 0 12px",
    opacity: 0.5,
  },
  cardSubtitle: {
    fontSize: 15,
    fontWeight: 500,
    color: "var(--text-secondary)",
    margin: 0,
  },

  /* ── Mode toggle ── */
  modeToggle: {
    display: "flex",
    background: "rgba(255,255,255,0.04)",
    borderRadius: "var(--radius-md, 10px)",
    padding: 3,
    marginBottom: 24,
    border: "1px solid var(--border)",
    gap: 3,
  },
  modeBtn: {
    flex: 1,
    position: "relative",
    padding: "9px 0",
    border: "none",
    borderRadius: "var(--radius-md, 10px)",
    background: "transparent",
    color: "var(--text-faint)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "var(--font-body, sans-serif)",
    transition: "color 0.2s ease, background 0.2s ease",
    letterSpacing: "0.02em",
  },
  modeBtnActive: {
    background: "rgba(229,9,20,0.16)",
    color: "var(--red-text, #ff6b6b)",
    fontWeight: 700,
  },
  modeIndicator: {
    position: "absolute",
    bottom: 4,
    left: "50%",
    transform: "translateX(-50%)",
    width: 20,
    height: 2,
    borderRadius: "var(--radius-full, 999px)",
    background: "var(--red)",
  },

  /* ── Form ── */
  form: {
    display: "flex",
    flexDirection: "column",
  },

  /* ── Floating label input ── */
  floatLabel: {
    position: "absolute",
    left: 14,
    pointerEvents: "none",
    fontFamily: "var(--font-body, sans-serif)",
    fontWeight: 500,
    letterSpacing: "0.01em",
    transition:
      "top 0.2s ease, font-size 0.2s ease, color 0.2s ease, transform 0.2s ease",
    zIndex: 1,
  },
  floatInput: {
    width: "100%",
    padding: "24px 16px 10px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid",
    borderRadius: "var(--radius-md, 10px)",
    color: "var(--text-primary)",
    fontSize: 14,
    fontFamily: "var(--font-body, sans-serif)",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    WebkitAppearance: "none",
  },

  /* password show/hide button */
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "var(--text-faint)",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--radius-sm, 6px)",
    transition: "color 0.15s ease",
  },

  /* strength meter */
  strengthWrap: {
    position: "absolute",
    bottom: -22,
    left: 0,
    right: 0,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  strengthTrack: {
    flex: 1,
    display: "flex",
    gap: 3,
    height: 3,
  },
  strengthSeg: {
    flex: 1,
    height: 3,
    borderRadius: "var(--radius-full, 999px)",
    transition: "background 0.3s ease, opacity 0.3s ease",
  },
  strengthLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.06em",
    minWidth: 46,
    textAlign: "right",
    transition: "color 0.3s ease",
  },

  /* ── Submit button ── */
  submitBtn: {
    marginTop: 4,
    padding: "14px",
    background: "var(--red)",
    border: "none",
    borderRadius: "var(--radius-md, 10px)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: "0.04em",
    cursor: "pointer",
    fontFamily: "var(--font-body, sans-serif)",
    boxShadow: "0 4px 20px rgba(229,9,20,0.35)",
    transition:
      "background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease, opacity 0.18s ease",
  },
  btnInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  spinnerWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  spinner: {
    display: "inline-block",
    width: 16,
    height: 16,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "authSpinner 0.7s linear infinite",
  },

  /* ── Divider ── */
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "20px 0",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: "var(--border)",
  },
  dividerText: {
    fontSize: 12,
    color: "var(--text-faint)",
    fontWeight: 500,
    letterSpacing: "0.06em",
    whiteSpace: "nowrap",
  },

  /* ── Social buttons ── */
  socialRow: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 20,
  },
  socialBtn: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "11px 16px",
    background: "var(--bg-card, #111620)",
    border: "1px solid var(--border-mid)",
    borderRadius: "var(--radius-md, 10px)",
    cursor: "pointer",
    fontFamily: "var(--font-body, sans-serif)",
    fontSize: 13,
    fontWeight: 500,
    color: "var(--text-secondary)",
    transition: "border-color 0.18s ease, background 0.18s ease",
    textAlign: "left",
    width: "100%",
  },
  socialIcon: {
    fontSize: 16,
    fontWeight: 900,
    width: 22,
    textAlign: "center",
    flexShrink: 0,
    fontFamily: "sans-serif",
  },
  socialLabel: {
    flex: 1,
  },

  /* ── Switch link ── */
  switchText: {
    textAlign: "center",
    fontSize: 13,
    color: "var(--text-faint)",
    margin: "0 0 16px",
  },
  switchLink: {
    background: "none",
    border: "none",
    color: "var(--red-text, #ff6b6b)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "inherit",
    padding: 0,
    textDecoration: "none",
    letterSpacing: "0.01em",
  },

  /* ── Terms ── */
  terms: {
    textAlign: "center",
    fontSize: 11,
    color: "var(--text-dim, rgba(120,135,175,0.22))",
    lineHeight: 1.6,
    margin: 0,
  },
  termsLink: {
    color: "var(--text-faint)",
    cursor: "pointer",
    textDecoration: "underline",
    textUnderlineOffset: 2,
  },
};

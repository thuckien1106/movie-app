// src/pages/AuthPage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { login, register } from "../api/movieApi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const googleLoginUrl = `${API_BASE}/auth/google/login`;

/* ── Real TMDB poster images ──────────────────── */
const TMDB_POSTERS = [
  "https://image.tmdb.org/t/p/w300/qJ2tW6WMUDux911r6m7haRef0WH.jpg", // The Dark Knight
  "https://image.tmdb.org/t/p/w300/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", // Inception
  "https://image.tmdb.org/t/p/w300/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", // Interstellar
  "https://image.tmdb.org/t/p/w300/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg", // Parasite
  "https://image.tmdb.org/t/p/w300/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg", // Oppenheimer
  "https://image.tmdb.org/t/p/w300/d5NXSklpcuveafHejlxZeyRPyRs.jpg", // Dune
  "https://image.tmdb.org/t/p/w300/jRXYjXNq0Cs2TcJjLkki24MLp7u.jpg", // Avatar
  "https://image.tmdb.org/t/p/w300/3bhkrj58Vtu7enYsLMId1SZxZnl.jpg", // The Godfather
  "https://image.tmdb.org/t/p/w300/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", // Pulp Fiction
  "https://image.tmdb.org/t/p/w300/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", // Fight Club
  "https://image.tmdb.org/t/p/w300/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg", // The Matrix
  "https://image.tmdb.org/t/p/w300/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg", // Goodfellas
  "https://image.tmdb.org/t/p/w300/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg", // Schindler's List
  "https://image.tmdb.org/t/p/w300/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg", // Forrest Gump
  "https://image.tmdb.org/t/p/w300/rplLJ2hPcOQmkFhTqUte0MkEaO2.jpg", // Silence of the Lambs
  "https://image.tmdb.org/t/p/w300/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg", // Se7en
];

/* ── Animated Film Strip background ──────────── */
function FilmStripBg() {
  const cols = 5;
  const postersPerCol = 5;
  const columns = Array.from({ length: cols }, (_, colIdx) => ({
    id: colIdx,
    posters: Array.from({ length: postersPerCol }, (_, rowIdx) => {
      const idx = (colIdx * postersPerCol + rowIdx) % TMDB_POSTERS.length;
      return TMDB_POSTERS[idx];
    }),
    direction: colIdx % 2 === 0 ? "up" : "down",
    speed: 28 + colIdx * 5,
  }));

  return (
    <div style={bg.wrap}>
      <div style={bg.grid}>
        {columns.map((col) => (
          <div key={col.id} style={bg.col}>
            <div
              style={{
                ...bg.colInner,
                animationName:
                  col.direction === "up" ? "scrollUp" : "scrollDown",
                animationDuration: `${col.speed}s`,
                animationTimingFunction: "linear",
                animationIterationCount: "infinite",
              }}
            >
              {/* Duplicate for seamless loop */}
              {[...col.posters, ...col.posters].map((src, i) => (
                <div key={i} style={bg.card}>
                  <img
                    src={src}
                    alt=""
                    style={bg.img}
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.parentElement.style.background = "#0d1117";
                    }}
                  />
                  <div style={bg.cardOverlay} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Directional fades */}
      <div style={bg.fadeLeft} />
      <div style={bg.fadeRight} />
      <div style={bg.fadeTop} />
      <div style={bg.fadeBottom} />
      {/* Depth tint */}
      <div style={bg.tint} />
    </div>
  );
}

const bg = {
  wrap: {
    position: "absolute",
    inset: 0,
    zIndex: 0,
    overflow: "hidden",
  },
  grid: {
    display: "flex",
    height: "100%",
    gap: 8,
    padding: "0 4px",
    alignItems: "stretch",
  },
  col: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  colInner: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  card: {
    width: "100%",
    aspectRatio: "2/3",
    borderRadius: 8,
    overflow: "hidden",
    background: "#0a0d14",
    flexShrink: 0,
    position: "relative",
  },
  img: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    opacity: 0.7,
  },
  cardOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.3) 100%)",
  },
  fadeLeft: {
    position: "absolute",
    inset: 0,
    zIndex: 2,
    background:
      "linear-gradient(to right, var(--bg-page,#080b0f) 0%, rgba(8,11,15,0.95) 12%, rgba(8,11,15,0.6) 30%, rgba(8,11,15,0.1) 55%, transparent 100%)",
  },
  fadeRight: {
    position: "absolute",
    inset: 0,
    zIndex: 2,
    background:
      "linear-gradient(to left, var(--bg-page,#080b0f) 0%, rgba(8,11,15,0.9) 10%, rgba(8,11,15,0.3) 28%, transparent 55%)",
  },
  fadeTop: {
    position: "absolute",
    inset: 0,
    zIndex: 2,
    background:
      "linear-gradient(to bottom, var(--bg-page,#080b0f) 0%, transparent 20%)",
  },
  fadeBottom: {
    position: "absolute",
    inset: 0,
    zIndex: 2,
    background:
      "linear-gradient(to top, var(--bg-page,#080b0f) 0%, transparent 20%)",
  },
  tint: {
    position: "absolute",
    inset: 0,
    zIndex: 1,
    background: "rgba(5,8,12,0.55)",
  },
};

/* ── SVG Logo ─────────────────────────────────── */
function Logo({ size = 28 }) {
  return (
    <svg
      width={size * 3.2}
      height={size}
      viewBox="0 0 100 32"
      fill="none"
      style={{ display: "block" }}
    >
      {/* Film strip icon */}
      <rect
        x="1"
        y="3"
        width="4"
        height="26"
        rx="2"
        fill="#e50914"
        opacity="0.95"
      />
      <rect x="1.5" y="6" width="3" height="3.5" rx="0.8" fill="#080b0f" />
      <rect x="1.5" y="12.5" width="3" height="3.5" rx="0.8" fill="#080b0f" />
      <rect x="1.5" y="19" width="3" height="3.5" rx="0.8" fill="#080b0f" />
      <text
        x="10"
        y="23"
        fontFamily="'Bebas Neue','Arial Narrow',sans-serif"
        fontSize="22"
        letterSpacing="2.5"
        fill="var(--text-primary,#f0f4ff)"
      >
        FILMVERSE
      </text>
      <circle cx="97" cy="23" r="2.8" fill="#e50914" />
    </svg>
  );
}

/* ── Google Icon ──────────────────────────────── */
function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

/* ── Eye toggle icon ──────────────────────────── */
function EyeIcon({ open }) {
  return open ? (
    <svg
      width="15"
      height="15"
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
      width="15"
      height="15"
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

/* ── Password strength ────────────────────────── */
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
    { label: "Trung bình", color: "#f97316" },
    { label: "Tốt", color: "#eab308" },
    { label: "Mạnh", color: "#22c55e" },
  ];
  return { score, ...map[score] };
}

/* ── Floating label Input ─────────────────────── */
function InputField({
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
        marginBottom: isPassword && value ? 30 : 14,
      }}
    >
      <label
        style={{
          position: "absolute",
          left: 15,
          pointerEvents: "none",
          zIndex: 1,
          top: lifted ? 8 : "50%",
          fontSize: lifted ? 10 : 14,
          fontWeight: lifted ? 700 : 400,
          color: focused
            ? "rgba(229,9,20,0.85)"
            : lifted
              ? "rgba(160,175,210,0.6)"
              : "rgba(130,145,185,0.45)",
          transform: lifted ? "none" : "translateY(-50%)",
          letterSpacing: lifted ? "0.08em" : "0.01em",
          textTransform: lifted ? "uppercase" : "none",
          transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
          fontFamily: "var(--font-body,sans-serif)",
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
          width: "100%",
          boxSizing: "border-box",
          padding: "23px 15px 9px",
          paddingRight: isPassword ? 44 : 15,
          background: focused
            ? "rgba(255,255,255,0.05)"
            : "rgba(255,255,255,0.025)",
          border: `1.5px solid ${
            focused
              ? "rgba(229,9,20,0.5)"
              : filled
                ? "rgba(130,150,210,0.2)"
                : "rgba(100,120,175,0.12)"
          }`,
          borderRadius: 12,
          color: "var(--text-primary,#f0f4ff)",
          fontSize: 14,
          fontFamily: "var(--font-body,sans-serif)",
          outline: "none",
          boxShadow: focused ? "0 0 0 3.5px rgba(229,9,20,0.1)" : "none",
          transition: "all 0.22s ease",
          WebkitAppearance: "none",
        }}
      />

      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPass((p) => !p)}
          tabIndex={-1}
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            padding: 5,
            color: focused ? "rgba(160,175,210,0.7)" : "rgba(120,135,175,0.4)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 6,
            transition: "color 0.15s",
          }}
        >
          <EyeIcon open={showPass} />
        </button>
      )}

      {isPassword && value && (
        <div
          style={{
            position: "absolute",
            bottom: -22,
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ flex: 1, display: "flex", gap: 3 }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 2.5,
                  borderRadius: 99,
                  background:
                    i <= strength.score
                      ? strength.color
                      : "rgba(100,120,180,0.12)",
                  transition: "background 0.3s ease",
                }}
              />
            ))}
          </div>
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "0.07em",
              color: strength.color,
              minWidth: 48,
              textAlign: "right",
              textTransform: "uppercase",
            }}
          >
            {strength.label}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Feature list for left panel ─────────────── */
const FEATURES = [
  {
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
    label: "Hàng triệu phim & series",
  },
  {
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
    label: "Gợi ý theo tâm trạng",
  },
  {
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
      </svg>
    ),
    label: "Watchlist & nhắc lịch chiếu",
  },
  {
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    label: "Thống kê thói quen xem phim",
  },
];

/* ════════════════════════════════════════════════
   MAIN AUTH PAGE
════════════════════════════════════════════════ */
export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", username: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [entered, setEntered] = useState(false);

  const [searchParams] = useSearchParams();
  const { saveSession } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const oauthError = searchParams.get("oauth_error");
    if (oauthError) {
      const msgs = {
        cancelled: "Bạn đã huỷ đăng nhập Google.",
        invalid_state: "Phiên không hợp lệ, vui lòng thử lại.",
        server_error: "Lỗi máy chủ, vui lòng thử lại sau.",
      };
      showToast(msgs[oauthError] || "Đăng nhập Google thất bại.", "error");
    }
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
      saveSession(res.data.access_token, res.data.refresh_token, res.data.user);
      showToast(
        mode === "login"
          ? "Đăng nhập thành công!"
          : "Tạo tài khoản thành công!",
        "success",
      );
      const from = searchParams.get("from");

      if (mode === "register" && !res.data.user?.is_verified) {
        navigate("/verify-email", { replace: true });
      } else {
        navigate(from && from.startsWith("/") ? from : "/", { replace: true });
      }
    } catch (err) {
      showToast(
        err.response?.data?.detail || "Đã có lỗi xảy ra, thử lại nhé.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    window.location.href = googleLoginUrl;
  };

  return (
    <div style={s.page}>
      {/* Scrolling poster background */}
      <FilmStripBg />

      {/* Red ambient orb */}
      <div style={s.ambientOrb} />
      <div style={s.ambientOrb2} />

      {/* Back to home */}
      <Link
        to="/"
        style={s.backBtn}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(20,26,38,0.95)";
          e.currentTarget.style.borderColor = "rgba(160,175,210,0.25)";
          e.currentTarget.style.color = "var(--text-primary,#f0f4ff)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(12,16,24,0.8)";
          e.currentTarget.style.borderColor = "rgba(100,120,180,0.16)";
          e.currentTarget.style.color = "var(--text-muted)";
        }}
      >
        <svg
          width="13"
          height="13"
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

      {/* ── SPLIT LAYOUT ── */}
      <div
        style={{
          ...s.splitWrap,
          opacity: entered ? 1 : 0,
          transform: entered
            ? "translateY(0) scale(1)"
            : "translateY(28px) scale(0.98)",
        }}
      >
        {/* ── LEFT PANEL — cinematic branding ── */}
        <div style={s.leftPanel} className="auth-left">
          {/* Subtle red sheen on left edge */}
          <div style={s.leftRedEdge} />

          <Logo size={28} />

          <div style={s.taglineBlock}>
            <p style={s.tagline1}>Khám phá</p>
            <p style={s.tagline2}>điện ảnh.</p>
            <p style={s.tagline3}>Theo cách của bạn.</p>
          </div>

          <div style={s.divLine} />

          <p style={s.leftDesc}>
            Hàng triệu bộ phim và series đang chờ. Tạo danh sách xem, nhận gợi ý
            theo tâm trạng và theo dõi hành trình điện ảnh của bạn.
          </p>

          {/* Feature list */}
          <div style={s.featureList}>
            {FEATURES.map(({ icon, label }) => (
              <div key={label} style={s.featureItem}>
                <div style={s.featureIcon}>{icon}</div>
                <span style={s.featureLabel}>{label}</span>
              </div>
            ))}
          </div>

          {/* Bottom film strip decoration */}
          <div style={s.filmStripDeco}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={s.filmHole} />
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL — form ── */}
        <div style={s.formPanel}>
          {/* Top gloss line */}
          <div style={s.topGloss} />

          {/* Header */}
          <div style={s.formHeader}>
            <h1 style={s.formTitle}>
              {mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản mới"}
            </h1>
            <p style={s.formSubtitle}>
              {mode === "login"
                ? "Đăng nhập để tiếp tục hành trình điện ảnh"
                : "Bắt đầu miễn phí, không cần thẻ tín dụng"}
            </p>
          </div>

          {/* ── Google OAuth button ── */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            style={{ ...s.googleBtn, opacity: googleLoading ? 0.75 : 1 }}
            onMouseEnter={(e) => {
              if (!googleLoading) {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                e.currentTarget.style.borderColor = "rgba(200,215,255,0.3)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.4)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.055)";
              e.currentTarget.style.borderColor = "rgba(150,170,220,0.18)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span style={s.googleIconWrap}>
              {googleLoading ? (
                <span style={s.miniSpinner} />
              ) : (
                <GoogleIcon size={18} />
              )}
            </span>
            <span style={s.googleBtnText}>
              {googleLoading ? "Đang chuyển hướng…" : "Tiếp tục với Google"}
            </span>
            {!googleLoading && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(160,175,210,0.4)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginLeft: "auto" }}
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            )}
          </button>

          {/* Divider */}
          <div style={s.orDivider}>
            <div style={s.orLine} />
            <span style={s.orText}>hoặc tiếp tục với email</span>
            <div style={s.orLine} />
          </div>

          {/* Mode tabs */}
          <div style={s.tabs}>
            {[
              { key: "login", label: "Đăng nhập" },
              { key: "register", label: "Đăng ký" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => switchMode(key)}
                style={{
                  ...s.tab,
                  ...(mode === key ? s.tabActive : {}),
                }}
                onMouseEnter={(e) => {
                  if (mode !== key)
                    e.currentTarget.style.color = "rgba(200,215,255,0.7)";
                }}
                onMouseLeave={(e) => {
                  if (mode !== key)
                    e.currentTarget.style.color = "rgba(130,145,185,0.4)";
                }}
              >
                {label}
                {mode === key && <div style={s.tabUnderline} />}
              </button>
            ))}
          </div>

          {/* Form fields */}
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column" }}
          >
            {mode === "register" && (
              <InputField
                label="Tên hiển thị (tuỳ chọn)"
                name="username"
                type="text"
                value={form.username}
                onChange={handleChange}
                autoComplete="username"
              />
            )}
            <InputField
              label="Địa chỉ Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
            <InputField
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

            {mode === "login" && (
              <div
                style={{ textAlign: "right", marginTop: -4, marginBottom: 20 }}
              >
                <Link
                  to="/forgot-password"
                  style={s.forgotLink}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "rgba(255,120,120,0.9)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "rgba(130,145,185,0.4)")
                  }
                >
                  Quên mật khẩu?
                </Link>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              style={{ ...s.submitBtn, opacity: loading ? 0.8 : 1 }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = "var(--red-hover,#c9070f)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 32px rgba(229,9,20,0.55), 0 2px 8px rgba(0,0,0,0.5)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--red,#e50914)";
                e.currentTarget.style.boxShadow =
                  "0 4px 20px rgba(229,9,20,0.35)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {loading ? (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <span style={s.spinner} />
                  <span>Đang xử lý…</span>
                </span>
              ) : (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <span>
                    {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
                  </span>
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
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              )}
            </button>
          </form>

          {/* Switch mode */}
          <p style={s.switchText}>
            {mode === "login" ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
            <button
              type="button"
              style={s.switchLink}
              onClick={() =>
                switchMode(mode === "login" ? "register" : "login")
              }
            >
              {mode === "login" ? "Đăng ký ngay →" : "Đăng nhập →"}
            </button>
          </p>

          <p style={s.terms}>
            Bằng cách tiếp tục, bạn đồng ý với{" "}
            <span style={s.termsLink}>Điều khoản sử dụng</span> và{" "}
            <span style={s.termsLink}>Chính sách bảo mật</span>.
          </p>
        </div>
      </div>

      <style>{authCSS}</style>
    </div>
  );
}

/* ── Keyframes & media queries ────────────────── */
const authCSS = `
  @keyframes scrollUp {
    0%   { transform: translateY(0); }
    100% { transform: translateY(-50%); }
  }
  @keyframes scrollDown {
    0%   { transform: translateY(-50%); }
    100% { transform: translateY(0); }
  }
  @keyframes authSpinner {
    to { transform: rotate(360deg); }
  }
  @keyframes authReveal {
    from { opacity: 0; transform: translateY(28px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  @media (max-width: 820px) {
    .auth-left { display: none !important; }
  }
  @media (max-width: 520px) {
    .auth-split-wrap { border-radius: 20px !important; max-width: 100% !important; }
    .auth-form-panel { padding: 28px 22px 24px !important; }
  }
`;

/* ── Styles ───────────────────────────────────── */
const s = {
  page: {
    position: "relative",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "28px 20px",
    overflow: "hidden",
    background: "var(--bg-page,#080b0f)",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  },

  /* Ambient glows */
  ambientOrb: {
    position: "absolute",
    zIndex: 1,
    width: 700,
    height: 700,
    top: "40%",
    left: "38%",
    transform: "translate(-50%,-50%)",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(229,9,20,0.065) 0%, transparent 65%)",
    pointerEvents: "none",
  },
  ambientOrb2: {
    position: "absolute",
    zIndex: 1,
    width: 400,
    height: 400,
    bottom: "10%",
    right: "15%",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(100,120,255,0.04) 0%, transparent 65%)",
    pointerEvents: "none",
  },

  /* Back button */
  backBtn: {
    position: "absolute",
    top: 20,
    left: 24,
    zIndex: 20,
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "var(--text-muted)",
    textDecoration: "none",
    fontSize: 12,
    fontWeight: 600,
    padding: "6px 12px 6px 9px",
    borderRadius: 999,
    border: "1px solid rgba(100,120,180,0.16)",
    background: "rgba(12,16,24,0.8)",
    backdropFilter: "blur(16px)",
    letterSpacing: "0.02em",
    transition: "all 0.18s ease",
  },

  /* Main split container */
  splitWrap: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    gap: 0,
    width: "100%",
    maxWidth: 880,
    borderRadius: 22,
    overflow: "hidden",
    boxShadow:
      "0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.07), 0 0 80px rgba(229,9,20,0.04)",
    transition:
      "opacity 0.55s ease, transform 0.55s cubic-bezier(0.34,1.15,0.64,1)",
  },

  /* ── LEFT PANEL ── */
  leftPanel: {
    flex: "0 0 300px",
    padding: "44px 34px 36px",
    background:
      "linear-gradient(155deg, rgba(14,8,8,0.99) 0%, rgba(8,12,20,0.98) 60%, rgba(6,10,18,0.99) 100%)",
    borderRight: "1px solid rgba(229,9,20,0.1)",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
  },
  leftRedEdge: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 2,
    bottom: 0,
    background:
      "linear-gradient(to bottom, transparent 0%, rgba(229,9,20,0.6) 30%, rgba(229,9,20,0.6) 70%, transparent 100%)",
  },
  taglineBlock: {
    marginTop: 30,
    marginBottom: 2,
  },
  tagline1: {
    margin: 0,
    fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
    fontSize: 38,
    fontWeight: 400,
    letterSpacing: "0.05em",
    lineHeight: 1.0,
    color: "rgba(240,244,255,0.9)",
  },
  tagline2: {
    margin: 0,
    fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
    fontSize: 38,
    fontWeight: 400,
    letterSpacing: "0.05em",
    lineHeight: 1.0,
    color: "var(--red,#e50914)",
  },
  tagline3: {
    margin: "4px 0 0",
    fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
    fontSize: 21,
    fontWeight: 400,
    letterSpacing: "0.06em",
    lineHeight: 1.2,
    color: "rgba(180,195,230,0.45)",
  },
  divLine: {
    width: 36,
    height: 2.5,
    borderRadius: 99,
    background:
      "linear-gradient(to right, var(--red,#e50914), rgba(229,9,20,0.3))",
    margin: "22px 0",
  },
  leftDesc: {
    fontSize: 12.5,
    lineHeight: 1.75,
    color: "rgba(150,165,200,0.58)",
    margin: 0,
  },
  featureList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginTop: 26,
  },
  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: 11,
  },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    flexShrink: 0,
    background: "rgba(229,9,20,0.1)",
    border: "1px solid rgba(229,9,20,0.18)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "rgba(255,110,110,0.75)",
  },
  featureLabel: {
    fontSize: 12,
    color: "rgba(185,200,235,0.6)",
    fontWeight: 400,
    lineHeight: 1.4,
  },
  filmStripDeco: {
    display: "flex",
    gap: 10,
    marginTop: "auto",
    paddingTop: 28,
    alignItems: "center",
  },
  filmHole: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    border: "1.5px solid rgba(229,9,20,0.18)",
    background: "rgba(229,9,20,0.04)",
    flexShrink: 0,
  },

  /* ── RIGHT FORM PANEL ── */
  formPanel: {
    flex: 1,
    minWidth: 0,
    padding: "38px 36px 30px",
    background: "rgba(9,13,21,0.98)",
    position: "relative",
    backdropFilter: "blur(0px)",
  },
  topGloss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    background:
      "linear-gradient(to right, transparent 5%, rgba(255,255,255,0.07) 40%, rgba(255,255,255,0.07) 60%, transparent 95%)",
    pointerEvents: "none",
  },

  formHeader: { marginBottom: 22 },
  formTitle: {
    margin: 0,
    fontSize: 21,
    fontWeight: 700,
    color: "var(--text-primary,#f0f4ff)",
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
  },
  formSubtitle: {
    margin: "6px 0 0",
    fontSize: 12.5,
    color: "rgba(140,155,195,0.5)",
    lineHeight: 1.55,
  },

  /* Google button — premium */
  googleBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "13px 16px",
    background: "rgba(255,255,255,0.055)",
    border: "1.5px solid rgba(150,170,220,0.18)",
    borderRadius: 12,
    cursor: "pointer",
    fontFamily: "var(--font-body,sans-serif)",
    color: "var(--text-primary,#f0f4ff)",
    transition: "all 0.2s ease",
    marginBottom: 18,
    position: "relative",
  },
  googleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(200,215,255,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  googleBtnText: {
    flex: 1,
    textAlign: "center",
    fontSize: 13.5,
    fontWeight: 600,
    letterSpacing: "0.01em",
    marginLeft: -8,
  },
  miniSpinner: {
    display: "inline-block",
    width: 16,
    height: 16,
    border: "2px solid rgba(255,255,255,0.15)",
    borderTopColor: "#4285f4",
    borderRadius: "50%",
    animation: "authSpinner 0.7s linear infinite",
  },

  orDivider: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "0 0 18px",
  },
  orLine: {
    flex: 1,
    height: 1,
    background: "rgba(100,120,175,0.1)",
  },
  orText: {
    fontSize: 10.5,
    color: "rgba(130,145,185,0.38)",
    fontWeight: 500,
    whiteSpace: "nowrap",
    letterSpacing: "0.06em",
  },

  /* Tabs */
  tabs: {
    display: "flex",
    gap: 0,
    borderBottom: "1px solid rgba(100,120,175,0.1)",
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    padding: "9px 0 11px",
    border: "none",
    borderRadius: 0,
    background: "transparent",
    color: "rgba(130,145,185,0.4)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "var(--font-body,sans-serif)",
    transition: "color 0.18s ease",
    letterSpacing: "0.02em",
    position: "relative",
  },
  tabActive: {
    color: "var(--text-primary,#f0f4ff)",
    fontWeight: 700,
  },
  tabUnderline: {
    position: "absolute",
    bottom: -1,
    left: "15%",
    right: "15%",
    height: 2,
    borderRadius: "2px 2px 0 0",
    background: "var(--red,#e50914)",
  },

  forgotLink: {
    fontSize: 11.5,
    color: "rgba(130,145,185,0.4)",
    textDecoration: "none",
    letterSpacing: "0.01em",
    transition: "color 0.15s",
    cursor: "pointer",
  },

  /* Submit button */
  submitBtn: {
    width: "100%",
    padding: "14px",
    background: "var(--red,#e50914)",
    border: "none",
    borderRadius: 12,
    color: "#fff",
    fontSize: 13.5,
    fontWeight: 700,
    letterSpacing: "0.05em",
    cursor: "pointer",
    fontFamily: "var(--font-body,sans-serif)",
    boxShadow: "0 4px 20px rgba(229,9,20,0.35)",
    transition: "all 0.2s cubic-bezier(0.34,1.2,0.64,1)",
    marginTop: 4,
  },
  spinner: {
    display: "inline-block",
    width: 15,
    height: 15,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "authSpinner 0.7s linear infinite",
  },

  switchText: {
    textAlign: "center",
    fontSize: 12.5,
    color: "rgba(130,145,185,0.45)",
    margin: "16px 0 10px",
  },
  switchLink: {
    background: "none",
    border: "none",
    color: "rgba(255,100,100,0.85)",
    cursor: "pointer",
    fontSize: 12.5,
    fontWeight: 700,
    fontFamily: "inherit",
    padding: 0,
    transition: "color 0.15s",
  },
  terms: {
    textAlign: "center",
    fontSize: 10.5,
    color: "rgba(110,125,165,0.28)",
    lineHeight: 1.6,
    margin: 0,
  },
  termsLink: {
    color: "rgba(130,145,185,0.45)",
    cursor: "pointer",
    textDecoration: "underline",
    textUnderlineOffset: 2,
  },
};

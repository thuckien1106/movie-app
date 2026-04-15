// src/pages/AuthPage.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { login, register } from "../api/movieApi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const googleLoginUrl = `${API_BASE}/auth/google/login`;

/* ── POSTER MOSAIC — background decoration ──── */
const POSTER_SLUGS = [
  "the-dark-knight",
  "inception",
  "interstellar",
  "parasite",
  "oppenheimer",
  "dune",
  "avatar",
  "the-godfather",
  "pulp-fiction",
  "fight-club",
  "the-matrix",
  "goodfellas",
  "schindler-list",
  "forrest-gump",
  "silence-of-the-lambs",
  "se7en",
  "the-usual-suspects",
  "american-history-x",
  "memento",
  "city-of-god",
  "spirited-away",
  "life-is-beautiful",
  "requiem-for-a-dream",
  "a-beautiful-mind",
];

const POSTER_COLORS = [
  "#1a0a0a",
  "#0a0f1a",
  "#0a1a0f",
  "#1a1a0a",
  "#0f0a1a",
  "#1a0a14",
  "#0a1a1a",
  "#14080a",
  "#0a0a14",
  "#1a0f0a",
  "#08100a",
  "#100808",
  "#080a10",
  "#10100a",
  "#0a0810",
  "#140a0a",
  "#0a140a",
  "#0a0a14",
  "#140a14",
  "#0a1410",
  "#10080a",
  "#081010",
  "#100a08",
  "#080a10",
];

function PosterMosaic() {
  return (
    <div style={ms.wrap}>
      <div style={ms.grid}>
        {POSTER_COLORS.map((bg, i) => (
          <div
            key={i}
            style={{
              ...ms.cell,
              background: bg,
              animationDelay: `${(i * 0.18) % 3}s`,
              animationDuration: `${3.5 + (i % 4) * 0.8}s`,
            }}
          >
            <div
              style={{ ...ms.cellShimmer, opacity: 0.06 + (i % 5) * 0.02 }}
            />
          </div>
        ))}
      </div>
      {/* gradient overlays */}
      <div style={ms.overlayLeft} />
      <div style={ms.overlayRight} />
      <div style={ms.overlayTop} />
      <div style={ms.overlayBottom} />
    </div>
  );
}

const ms = {
  wrap: {
    position: "absolute",
    inset: 0,
    zIndex: 0,
    overflow: "hidden",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gridTemplateRows: "repeat(4, 1fr)",
    width: "100%",
    height: "100%",
    gap: 3,
  },
  cell: {
    borderRadius: 4,
    position: "relative",
    overflow: "hidden",
    animation: "cellPulse var(--dur,4s) ease-in-out infinite alternate",
  },
  cellShimmer: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)",
  },
  overlayLeft: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to right, rgba(8,11,15,0.98) 0%, rgba(8,11,15,0.82) 45%, rgba(8,11,15,0.35) 75%, transparent 100%)",
    zIndex: 1,
  },
  overlayRight: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to left, rgba(8,11,15,0.7) 0%, transparent 40%)",
    zIndex: 1,
  },
  overlayTop: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to bottom, rgba(8,11,15,0.9) 0%, transparent 30%)",
    zIndex: 1,
  },
  overlayBottom: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to top, rgba(8,11,15,0.9) 0%, transparent 35%)",
    zIndex: 1,
  },
};

/* ── SVG Logo ─── */
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

/* ── Google icon ── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
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

/* ── Eye icon ── */
function EyeIcon({ open }) {
  return open ? (
    <svg
      width="16"
      height="16"
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
      width="16"
      height="16"
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

/* ── Password strength ── */
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
    { label: "Mạnh", color: "#16a34a" },
  ];
  return { score, ...map[score] };
}

/* ── Input Field component ── */
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
        marginBottom: isPassword && value ? 32 : 16,
      }}
    >
      {/* Floating label */}
      <label
        style={{
          position: "absolute",
          left: 14,
          pointerEvents: "none",
          zIndex: 1,
          top: lifted ? 7 : "50%",
          fontSize: lifted ? 10 : 14,
          fontWeight: lifted ? 600 : 400,
          color: focused
            ? "var(--red-text, #ff6b6b)"
            : lifted
              ? "var(--text-muted)"
              : "var(--text-faint)",
          transform: lifted ? "none" : "translateY(-50%)",
          letterSpacing: lifted ? "0.07em" : "0.01em",
          textTransform: lifted ? "uppercase" : "none",
          transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
          fontFamily: "var(--font-body, sans-serif)",
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
          padding: "22px 16px 8px",
          paddingRight: isPassword ? 44 : 16,
          background: focused
            ? "rgba(255,255,255,0.055)"
            : "rgba(255,255,255,0.03)",
          border: `1px solid ${focused ? "rgba(229,9,20,0.55)" : filled ? "rgba(120,145,210,0.22)" : "rgba(100,120,180,0.14)"}`,
          borderRadius: 12,
          color: "var(--text-primary)",
          fontSize: 14,
          fontFamily: "var(--font-body, sans-serif)",
          outline: "none",
          boxShadow: focused
            ? "0 0 0 3px rgba(229,9,20,0.12), inset 0 1px 0 rgba(255,255,255,0.04)"
            : "none",
          transition: "all 0.2s ease",
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
            padding: 4,
            color: focused ? "var(--text-muted)" : "var(--text-faint)",
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
            bottom: -24,
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
                  height: 3,
                  borderRadius: 99,
                  background:
                    i <= strength.score
                      ? strength.color
                      : "rgba(100,120,180,0.15)",
                  transition: "background 0.3s ease",
                }}
              />
            ))}
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: strength.color,
              minWidth: 52,
              textAlign: "right",
            }}
          >
            {strength.label}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Brand features strip ── */
function FeatureStrip() {
  const items = [
    { icon: "🎬", text: "5M+ phim & series" },
    { icon: "⭐", text: "Đánh giá thực từ cộng đồng" },
    { icon: "📋", text: "Watchlist cá nhân" },
    { icon: "🎭", text: "Gợi ý theo tâm trạng" },
  ];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        marginTop: 32,
      }}
    >
      {items.map(({ icon, text }) => (
        <div
          key={text}
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              flexShrink: 0,
              background: "rgba(229,9,20,0.12)",
              border: "1px solid rgba(229,9,20,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            {icon}
          </div>
          <span
            style={{
              fontSize: 13,
              color: "rgba(200,210,240,0.7)",
              fontWeight: 400,
            }}
          >
            {text}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN AUTH PAGE
════════════════════════════════════════════ */
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
    const t = setTimeout(() => setEntered(true), 60);
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

  const handleGoogleLogin = () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    window.location.href = googleLoginUrl;
  };

  return (
    <div style={s.page}>
      {/* Background mosaic */}
      <PosterMosaic />

      {/* Red ambient glow */}
      <div style={s.ambientGlow} />

      {/* Back button */}
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

      {/* ── SPLIT LAYOUT ── */}
      <div
        style={{
          ...s.splitWrap,
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(20px)",
        }}
      >
        {/* LEFT PANEL — branding */}
        <div style={s.leftPanel}>
          <Logo size={34} />
          <div style={s.tagline}>
            <p style={s.taglineMain}>Khám phá điện ảnh.</p>
            <p style={s.taglineSub}>Theo cách của bạn.</p>
          </div>
          <div style={s.redDivider} />
          <p style={s.leftDesc}>
            Hàng triệu bộ phim, series và câu chuyện đang chờ bạn khám phá. Tạo
            danh sách, theo dõi tâm trạng và nhận gợi ý cá nhân hóa.
          </p>
          <FeatureStrip />
        </div>

        {/* RIGHT PANEL — form */}
        <div style={s.formPanel}>
          {/* Gloss border */}
          <div style={s.formGlossBorder} />

          {/* Header */}
          <div style={s.formHeader}>
            <h1 style={s.formTitle}>
              {mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản"}
            </h1>
            <p style={s.formSubtitle}>
              {mode === "login"
                ? "Đăng nhập để tiếp tục hành trình điện ảnh của bạn"
                : "Bắt đầu miễn phí, không cần thẻ tín dụng"}
            </p>
          </div>

          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            style={{ ...s.googleBtn, opacity: googleLoading ? 0.75 : 1 }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.09)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              e.currentTarget.style.borderColor = "rgba(100,120,180,0.2)";
            }}
          >
            {googleLoading ? <span style={s.miniSpinner} /> : <GoogleIcon />}
            <span
              style={{
                flex: 1,
                textAlign: "center",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {googleLoading ? "Đang chuyển hướng…" : "Tiếp tục với Google"}
            </span>
          </button>

          {/* Divider */}
          <div style={s.divider}>
            <div style={s.dividerLine} />
            <span style={s.dividerText}>hoặc bằng email</span>
            <div style={s.dividerLine} />
          </div>

          {/* Mode toggle pills */}
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
              </button>
            ))}
          </div>

          {/* Form */}
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
                style={{ textAlign: "right", marginTop: -6, marginBottom: 20 }}
              >
                <Link
                  to="/forgot-password"
                  style={s.forgotLink}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#ff6b6b")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text-faint)")
                  }
                >
                  Quên mật khẩu?
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ ...s.submitBtn, opacity: loading ? 0.78 : 1 }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background =
                    "var(--red-hover, #ff1a1a)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 32px rgba(229,9,20,0.55)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--red, #e50914)";
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

          {/* Switch */}
          <p style={s.switchText}>
            {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
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

const authCSS = `
  @keyframes cellPulse { from { opacity: 0.6; } to { opacity: 1; } }
  @keyframes authSpinner { to { transform: rotate(360deg); } }
  @keyframes authFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

  @media (max-width: 768px) {
    .auth-left { display: none !important; }
    .auth-split { max-width: 440px !important; }
    .auth-form-panel { border-radius: 20px !important; }
  }
`;

const s = {
  page: {
    position: "relative",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 20px",
    overflow: "hidden",
    background: "var(--bg-page, #080b0f)",
    fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
  },
  ambientGlow: {
    position: "absolute",
    zIndex: 1,
    width: 800,
    height: 800,
    top: "50%",
    left: "30%",
    transform: "translate(-50%, -50%)",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(229,9,20,0.07) 0%, transparent 65%)",
    pointerEvents: "none",
  },
  backBtn: {
    position: "absolute",
    top: 20,
    left: 28,
    zIndex: 20,
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "var(--text-muted)",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 500,
    padding: "6px 12px 6px 8px",
    borderRadius: 999,
    border: "1px solid rgba(100,120,180,0.16)",
    background: "rgba(14,18,24,0.7)",
    backdropFilter: "blur(12px)",
    transition: "all 0.15s ease",
  },
  splitWrap: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    gap: 0,
    width: "100%",
    maxWidth: 900,
    borderRadius: 24,
    overflow: "hidden",
    boxShadow: "0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)",
    transition:
      "opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.2,0.64,1)",
  },

  /* LEFT PANEL */
  leftPanel: {
    flex: "0 0 320px",
    padding: "44px 36px",
    background:
      "linear-gradient(160deg, rgba(18,8,8,0.98) 0%, rgba(10,14,20,0.96) 100%)",
    borderRight: "1px solid rgba(229,9,20,0.12)",
    display: "flex",
    flexDirection: "column",
  },
  tagline: { marginTop: 28 },
  taglineMain: {
    margin: 0,
    fontSize: 32,
    fontWeight: 800,
    lineHeight: 1.15,
    color: "var(--text-primary, #f0f4ff)",
    fontFamily: "var(--font-display, 'Bebas Neue', sans-serif)",
    letterSpacing: "0.04em",
  },
  taglineSub: {
    margin: "2px 0 0",
    fontSize: 32,
    fontWeight: 800,
    lineHeight: 1.15,
    color: "var(--red, #e50914)",
    fontFamily: "var(--font-display, 'Bebas Neue', sans-serif)",
    letterSpacing: "0.04em",
  },
  redDivider: {
    width: 40,
    height: 3,
    borderRadius: 99,
    background: "var(--red, #e50914)",
    margin: "20px 0",
    opacity: 0.8,
  },
  leftDesc: {
    fontSize: 13,
    lineHeight: 1.7,
    color: "rgba(160,175,210,0.65)",
    margin: 0,
  },

  /* FORM PANEL */
  formPanel: {
    flex: 1,
    minWidth: 0,
    padding: "40px 36px 32px",
    background: "rgba(11,15,22,0.97)",
    position: "relative",
  },
  formGlossBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    background:
      "linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)",
    pointerEvents: "none",
  },
  formHeader: { marginBottom: 24 },
  formTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: "var(--text-primary, #f0f4ff)",
    letterSpacing: "-0.01em",
  },
  formSubtitle: {
    margin: "6px 0 0",
    fontSize: 13,
    color: "var(--text-muted, rgba(160,175,210,0.52))",
    lineHeight: 1.5,
  },

  /* Google button */
  googleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    padding: "12px 16px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(100,120,180,0.2)",
    borderRadius: 12,
    cursor: "pointer",
    fontFamily: "var(--font-body, sans-serif)",
    color: "var(--text-primary)",
    transition: "all 0.18s ease",
    marginBottom: 16,
  },
  miniSpinner: {
    display: "inline-block",
    width: 18,
    height: 18,
    flexShrink: 0,
    border: "2px solid rgba(255,255,255,0.15)",
    borderTopColor: "#4285f4",
    borderRadius: "50%",
    animation: "authSpinner 0.7s linear infinite",
  },

  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "0 0 18px",
  },
  dividerLine: { flex: 1, height: 1, background: "rgba(100,120,180,0.1)" },
  dividerText: {
    fontSize: 11,
    color: "rgba(140,155,195,0.4)",
    fontWeight: 500,
    whiteSpace: "nowrap",
    letterSpacing: "0.05em",
  },

  /* Mode toggle */
  modeToggle: {
    display: "flex",
    gap: 4,
    background: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    padding: 3,
    marginBottom: 20,
    border: "1px solid rgba(100,120,180,0.1)",
  },
  modeBtn: {
    flex: 1,
    padding: "9px 0",
    border: "none",
    borderRadius: 8,
    background: "transparent",
    color: "rgba(160,175,210,0.45)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "var(--font-body, sans-serif)",
    transition: "all 0.2s ease",
    letterSpacing: "0.02em",
  },
  modeBtnActive: {
    background: "rgba(229,9,20,0.18)",
    color: "#ff6b6b",
    fontWeight: 700,
    boxShadow: "0 0 0 1px rgba(229,9,20,0.25)",
  },

  forgotLink: {
    fontSize: 12,
    color: "var(--text-faint)",
    textDecoration: "none",
    transition: "color 0.15s",
  },

  submitBtn: {
    width: "100%",
    padding: "14px",
    background: "var(--red, #e50914)",
    border: "none",
    borderRadius: 12,
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: "0.04em",
    cursor: "pointer",
    fontFamily: "var(--font-body, sans-serif)",
    boxShadow: "0 4px 20px rgba(229,9,20,0.35)",
    transition: "all 0.18s ease",
    marginTop: 4,
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

  switchText: {
    textAlign: "center",
    fontSize: 13,
    color: "var(--text-faint)",
    margin: "16px 0 10px",
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
  },
  terms: {
    textAlign: "center",
    fontSize: 11,
    color: "rgba(120,135,175,0.3)",
    lineHeight: 1.6,
    margin: 0,
  },
  termsLink: {
    color: "rgba(120,135,175,0.5)",
    cursor: "pointer",
    textDecoration: "underline",
    textUnderlineOffset: 2,
  },
};

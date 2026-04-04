import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login, register } from "../api/movieApi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastContext";

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ email: "", password: "", username: "" });
  const [loading, setLoading] = useState(false);
  const { saveSession } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

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
      const msg =
        err.response?.data?.detail || "Đã có lỗi xảy ra, thử lại nhé.";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      {/* Background blur blobs */}
      <div style={s.blob1} />
      <div style={s.blob2} />

      <div style={s.card}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: "none" }}>
          <h1 style={s.logo}>Films</h1>
        </Link>
        <p style={s.subtitle}>
          {mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản mới"}
        </p>

        {/* Tab switch */}
        <div style={s.tabs}>
          {["login", "register"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{ ...s.tab, ...(mode === m ? s.tabActive : {}) }}
            >
              {m === "login" ? "Đăng nhập" : "Đăng ký"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={s.form}>
          {mode === "register" && (
            <Field
              label="Username (tuỳ chọn)"
              name="username"
              type="text"
              placeholder="tên hiển thị của bạn"
              value={form.username}
              onChange={handleChange}
            />
          )}
          <Field
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            required
          />
          <Field
            label="Mật khẩu"
            name="password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            required
          />

          <button type="submit" disabled={loading} style={s.btn}>
            {loading
              ? "Đang xử lý..."
              : mode === "login"
                ? "Đăng nhập"
                : "Tạo tài khoản"}
          </button>
        </form>

        <p style={s.switchText}>
          {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
          <span
            style={s.switchLink}
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Đăng ký ngay" : "Đăng nhập"}
          </span>
        </p>
      </div>
    </div>
  );
}

function Field({ label, name, type, placeholder, value, onChange, required }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={s.label}>{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ ...s.input, ...(focused ? s.inputFocused : {}) }}
      />
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "var(--hero-page-bg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    position: "relative",
    overflow: "hidden",
  },
  blob1: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(229,9,20,0.12) 0%, transparent 70%)",
    top: -100,
    left: -100,
    pointerEvents: "none",
  },
  blob2: {
    position: "absolute",
    width: 350,
    height: 350,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(229,9,20,0.08) 0%, transparent 70%)",
    bottom: -80,
    right: -80,
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    zIndex: 1,
    background: "var(--bg-page)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: "40px 36px",
    width: "100%",
    maxWidth: 400,
    boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
  },
  logo: {
    color: "var(--red)",
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: 1,
    margin: "0 0 4px",
    display: "inline-block",
  },
  subtitle: {
    color: "var(--text-muted)",
    fontSize: 14,
    margin: "0 0 28px",
  },
  tabs: {
    display: "flex",
    background: "var(--bg-input)",
    borderRadius: 8,
    padding: 4,
    marginBottom: 28,
    gap: 4,
  },
  tab: {
    flex: 1,
    padding: "8px 0",
    border: "none",
    borderRadius: 6,
    background: "transparent",
    color: "var(--text-faint)",
    cursor: "pointer",
    fontSize: 14,
    transition: "all 0.2s",
  },
  tabActive: {
    background: "var(--bg-input2)",
    color: "var(--text-primary)",
    fontWeight: 600,
  },
  form: { display: "flex", flexDirection: "column" },
  label: {
    display: "block",
    fontSize: 13,
    color: "var(--text-muted)",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    background: "var(--bg-input)",
    border: "1px solid var(--border-mid)",
    borderRadius: 8,
    color: "var(--text-primary)",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  inputFocused: {
    borderColor: "rgba(229,9,20,0.6)",
  },
  btn: {
    marginTop: 8,
    padding: "12px",
    background: "var(--red)",
    border: "none",
    borderRadius: 8,
    color: "var(--text-primary)",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  switchText: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 13,
    color: "var(--text-faint)",
  },
  switchLink: {
    color: "var(--red)",
    cursor: "pointer",
    fontWeight: 600,
    textDecoration: "underline",
  },
};

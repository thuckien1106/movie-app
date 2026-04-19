// src/components/ErrorBoundary.jsx
//
// ErrorBoundary dùng Class component vì React chỉ hỗ trợ
// getDerivedStateFromError / componentDidCatch ở class component.
//
// Có 2 cách dùng:
//
// 1. Bọc toàn app (trong App.jsx) — bắt mọi crash:
//    <ErrorBoundary><App /></ErrorBoundary>
//
// 2. Bọc từng trang — crash trang này không ảnh hưởng trang khác:
//    <Route path="/movie/:id" element={<ErrorBoundary><MovieDetail /></ErrorBoundary>} />
//
// Fallback tự động reset khi user navigate sang URL khác (nhờ resetKey=pathname).

import { Component } from "react";
import { Link } from "react-router-dom";

// ─── Fallback UI ─────────────────────────────────────────────────────────────
function ErrorFallback({ error, onReset, onReload }) {
  // Rút gọn stack trace cho dễ đọc (chỉ hiện 3 dòng đầu)
  const shortStack = error?.stack
    ? error.stack
        .split("\n")
        .slice(0, 4)
        .map((l) => l.trim())
        .join("\n")
    : null;

  return (
    <div style={s.page}>
      {/* Decoration circles */}
      <div
        style={{ ...s.circle, width: 320, height: 320, top: -80, right: -60 }}
      />
      <div
        style={{ ...s.circle, width: 200, height: 200, bottom: 40, left: -40 }}
      />

      <div style={s.card}>
        {/* Icon */}
        <div style={s.iconWrap}>
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        {/* Title */}
        <h1 style={s.title}>Có lỗi xảy ra</h1>
        <p style={s.desc}>
          Trang này gặp sự cố không mong muốn. Dữ liệu của bạn vẫn an toàn.
        </p>

        {/* Error message box */}
        {error?.message && (
          <div style={s.errorBox}>
            <span style={s.errorLabel}>Chi tiết lỗi</span>
            <code style={s.errorMsg}>{error.message}</code>
            {shortStack && (
              <details style={{ marginTop: 8 }}>
                <summary style={s.stackToggle}>Stack trace</summary>
                <pre style={s.stack}>{shortStack}</pre>
              </details>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={s.btnRow}>
          <button onClick={onReset} style={s.btnPrimary}>
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
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
            </svg>
            Thử lại
          </button>
          <button onClick={onReload} style={s.btnSecondary}>
            Tải lại trang
          </button>
          <Link to="/" onClick={onReset} style={s.btnGhost}>
            Về trang chủ
          </Link>
        </div>
      </div>

      <style>{css}</style>
    </div>
  );
}

// ─── Class component ─────────────────────────────────────────────────────────
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
    this.handleReload = this.handleReload.bind(this);
  }

  // Bắt lỗi render / lifecycle của bất kỳ child nào
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // Log lỗi ra console (production có thể gửi lên Sentry tại đây)
  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Component stack:", info.componentStack);
  }

  // Khi prop resetKey thay đổi (vd: pathname) → tự reset
  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
  }

  handleReload() {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      // Nếu truyền fallback prop tùy chỉnh thì dùng, không thì dùng default UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
          onReload={this.handleReload}
        />
      );
    }

    return this.props.children;
  }
}

// ─── HOC helper — wrap bất kỳ component nào ──────────────────────────────────
// Dùng: export default withErrorBoundary(MyComponent);
export function withErrorBoundary(Component, fallback) {
  const displayName = Component.displayName || Component.name || "Component";

  function Wrapped(props) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  }

  Wrapped.displayName = `withErrorBoundary(${displayName})`;
  return Wrapped;
}

// ─── Styles ──────────────────────────────────────────────────────────────────
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
  circle: {
    position: "absolute",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    zIndex: 1,
    maxWidth: 500,
    width: "100%",
    textAlign: "center",
    padding: "44px 36px 36px",
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(245,158,11,0.15)",
    borderRadius: 24,
    backdropFilter: "blur(12px)",
    boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
    animation: "ebFadeUp 0.4s cubic-bezier(0.34,1.2,0.64,1) both",
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "rgba(245,158,11,0.1)",
    border: "1px solid rgba(245,158,11,0.25)",
    color: "#f59e0b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
  },
  title: {
    margin: "0 0 10px",
    fontSize: "clamp(20px,4vw,24px)",
    fontWeight: 700,
    color: "var(--text-primary, #f0f4ff)",
    letterSpacing: "-0.02em",
  },
  desc: {
    margin: "0 0 20px",
    fontSize: 13.5,
    color: "rgba(140,155,195,0.6)",
    lineHeight: 1.7,
  },

  // Error detail box
  errorBox: {
    textAlign: "left",
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(245,158,11,0.12)",
    borderRadius: 10,
    padding: "12px 14px",
    marginBottom: 24,
  },
  errorLabel: {
    display: "block",
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "rgba(245,158,11,0.6)",
    marginBottom: 6,
  },
  errorMsg: {
    display: "block",
    fontSize: 12.5,
    color: "rgba(255,200,100,0.85)",
    fontFamily: "var(--font-mono, 'Fira Code', monospace)",
    wordBreak: "break-word",
    lineHeight: 1.6,
  },
  stackToggle: {
    fontSize: 11,
    color: "rgba(140,155,195,0.4)",
    cursor: "pointer",
    userSelect: "none",
  },
  stack: {
    marginTop: 8,
    fontSize: 10.5,
    color: "rgba(140,155,195,0.35)",
    fontFamily: "var(--font-mono, monospace)",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    lineHeight: 1.6,
    maxHeight: 120,
    overflowY: "auto",
  },

  // Buttons
  btnRow: {
    display: "flex",
    gap: 8,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "10px 20px",
    background: "#f59e0b",
    color: "#0a0c14",
    border: "none",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "opacity 0.15s",
    boxShadow: "0 4px 16px rgba(245,158,11,0.3)",
  },
  btnSecondary: {
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 18px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(100,120,175,0.18)",
    color: "rgba(160,175,210,0.75)",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background 0.15s",
  },
  btnGhost: {
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 18px",
    background: "transparent",
    border: "1px solid rgba(100,120,175,0.12)",
    color: "rgba(140,155,195,0.55)",
    borderRadius: 10,
    fontWeight: 500,
    fontSize: 13,
    textDecoration: "none",
    fontFamily: "inherit",
    transition: "color 0.15s",
  },
};

const css = `
  @keyframes ebFadeUp {
    from { opacity: 0; transform: translateY(20px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
`;

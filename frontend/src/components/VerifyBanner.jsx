// src/components/VerifyBanner.jsx
/**
 * Banner nhắc user xác thực email.
 * Đặt ngay trong App.jsx (bọc AppRoutes) để hiện ở mọi trang.
 * Tự ẩn khi user đã verified hoặc chưa đăng nhập.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { resendVerify } from "../api/verifyApi";

export default function VerifyBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Không hiện nếu: chưa login, đã verified, đã dismiss, tài khoản Google
  if (!user || user.is_verified || user.is_google || dismissed) return null;

  const handleResend = async () => {
    if (sending || sent) return;
    setSending(true);
    try {
      await resendVerify();
      setSent(true);
      setTimeout(() => setSent(false), 8000);
    } catch {
      // toast đã handle trong interceptor
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={s.banner}>
      <div style={s.inner}>
        {/* Icon */}
        <span style={s.icon}>
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
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </span>

        {/* Text */}
        <span style={s.text}>
          Email của bạn chưa được xác thực.{" "}
          <Link to="/verify-email" style={s.link}>
            Xác thực ngay
          </Link>{" "}
          hoặc{" "}
          <button
            onClick={handleResend}
            disabled={sending || sent}
            style={s.btnResend}
          >
            {sent ? "✓ Đã gửi lại" : sending ? "Đang gửi..." : "gửi lại email"}
          </button>
        </span>
      </div>

      {/* Dismiss */}
      <button onClick={() => setDismissed(true)} style={s.close} title="Đóng">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

const s = {
  banner: {
    position: "fixed",
    top: 60, // dưới navbar
    left: 0,
    right: 0,
    zIndex: 900,
    background: "linear-gradient(90deg, #1c3a2e 0%, #0f2a1e 100%)",
    borderBottom: "1px solid rgba(34,197,94,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "9px 20px",
    gap: 12,
  },
  inner: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
    flexWrap: "wrap",
  },
  icon: {
    color: "#22c55e",
    display: "flex",
    flexShrink: 0,
  },
  text: {
    fontSize: 13,
    color: "#86efac",
    lineHeight: 1.5,
  },
  link: {
    color: "#22c55e",
    fontWeight: 600,
    textDecoration: "none",
  },
  btnResend: {
    background: "transparent",
    border: "none",
    color: "#22c55e",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    padding: 0,
    fontFamily: "inherit",
  },
  close: {
    background: "transparent",
    border: "none",
    color: "#4ade80",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    flexShrink: 0,
    opacity: 0.6,
  },
};

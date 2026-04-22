// src/pages/VerifyEmailPage.jsx
/**
 * Trang xác thực email sau khi đăng ký.
 * Route: /verify-email  (ProtectedRoute)
 *
 * - Hiện form nhập OTP 6 chữ số
 * - Nút gửi lại OTP (cooldown 60 giây)
 * - Sau khi verify thành công → cập nhật user trong context → redirect /
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastContext";
import { verifyEmail, resendVerify } from "../api/verifyApi";

const RESEND_COOLDOWN = 60; // giây

/* ── OTP Input: 6 ô riêng biệt ── */
function OtpInput({ value, onChange, disabled }) {
  const inputs = useRef([]);

  const handleChange = (i, e) => {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    const arr = value.split("");
    arr[i] = char;
    onChange(arr.join(""));
    if (char && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !value[i] && i > 0)
      inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted) {
      onChange(pasted.padEnd(6, "").slice(0, 6));
      inputs.current[Math.min(pasted.length, 5)]?.focus();
    }
    e.preventDefault();
  };

  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          style={{
            width: 46,
            height: 56,
            textAlign: "center",
            fontSize: 22,
            fontWeight: 700,
            fontFamily: "'Courier New', monospace",
            background: value[i]
              ? "rgba(34,197,94,0.08)"
              : "rgba(255,255,255,0.04)",
            border: `1.5px solid ${value[i] ? "rgba(34,197,94,0.5)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 10,
            color: "#f0f4ff",
            outline: "none",
            transition: "all 0.15s",
            caretColor: "#22c55e",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#22c55e")}
          onBlur={(e) =>
            (e.target.style.borderColor = value[i]
              ? "rgba(34,197,94,0.5)"
              : "rgba(255,255,255,0.1)")
          }
        />
      ))}
    </div>
  );
}

export default function VerifyEmailPage() {
  const { user, saveSession } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);
  const [success, setSuccess] = useState(false);

  // Nếu đã verified rồi → redirect về trang chủ
  useEffect(() => {
    if (user?.is_verified) navigate("/", { replace: true });
  }, [user]);

  // Đếm ngược cooldown
  useEffect(() => {
    if (canResend) return;
    const timer = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [canResend]);

  const handleVerify = async () => {
    if (otp.length < 6) {
      showToast("Vui lòng nhập đủ 6 chữ số.", "error");
      return;
    }
    setLoading(true);
    try {
      await verifyEmail(otp);

      // Cập nhật user trong context + localStorage
      const updatedUser = { ...user, is_verified: true };
      const token = localStorage.getItem("token");
      const refreshToken = localStorage.getItem("refresh_token");
      saveSession(token, refreshToken, updatedUser);

      setSuccess(true);
      showToast("Email đã được xác thực!", "success");
      setTimeout(() => navigate("/", { replace: true }), 1800);
    } catch (err) {
      const msg =
        err?.response?.data?.detail || "Mã không đúng hoặc đã hết hạn.";
      showToast(msg, "error");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    try {
      await resendVerify();
      showToast("Đã gửi lại mã xác thực. Kiểm tra email nhé!", "success");
      setCanResend(false);
      setCooldown(RESEND_COOLDOWN);
      setOtp("");
    } catch {
      showToast("Không gửi được email. Thử lại sau.", "error");
    }
  };

  if (!user) return null;

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Icon */}
        <div style={s.iconWrap}>
          {success ? (
            <span style={{ fontSize: 32 }}>✓</span>
          ) : (
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#22c55e"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          )}
        </div>

        {/* Title */}
        <h1 style={s.title}>
          {success ? "Xác thực thành công!" : "Xác thực email"}
        </h1>

        {!success && (
          <>
            <p style={s.desc}>
              Chúng tôi đã gửi mã{" "}
              <strong style={{ color: "#f0f4ff" }}>6 chữ số</strong> đến
            </p>
            <p style={s.email}>{user.email}</p>

            {/* OTP Input */}
            <div style={{ margin: "24px 0" }}>
              <OtpInput value={otp} onChange={setOtp} disabled={loading} />
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerify}
              disabled={loading || otp.length < 6}
              style={{
                ...s.btn,
                opacity: loading || otp.length < 6 ? 0.5 : 1,
                cursor: loading || otp.length < 6 ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Đang xác thực..." : "Xác nhận"}
            </button>

            {/* Divider */}
            <div style={s.divider} />

            {/* Resend */}
            <p style={s.resendRow}>
              Không nhận được email?{" "}
              <button
                onClick={handleResend}
                disabled={!canResend}
                style={{
                  ...s.resendBtn,
                  color: canResend ? "#22c55e" : "#4b5563",
                  cursor: canResend ? "pointer" : "default",
                }}
              >
                {canResend ? "Gửi lại" : `Gửi lại sau ${cooldown}s`}
              </button>
            </p>

            {/* Skip hint */}
            <p style={s.skip}>
              <button
                onClick={() => navigate("/", { replace: true })}
                style={s.skipBtn}
              >
                Bỏ qua, xác thực sau →
              </button>
            </p>
          </>
        )}

        {success && (
          <p style={{ ...s.desc, marginTop: 12 }}>
            Đang chuyển về trang chủ...
          </p>
        )}
      </div>

      <style>{css}</style>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg-page, #080b0f)",
    fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
    padding: "20px",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "var(--bg-card, #111620)",
    border: "1px solid var(--border-mid, rgba(255,255,255,0.08))",
    borderRadius: 18,
    padding: "40px 36px",
    textAlign: "center",
    boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: "50%",
    background: "rgba(34,197,94,0.1)",
    border: "1.5px solid rgba(34,197,94,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
    color: "#22c55e",
  },
  title: {
    margin: "0 0 8px",
    fontSize: 22,
    fontWeight: 700,
    color: "var(--text-primary, #f0f4ff)",
  },
  desc: {
    margin: "0",
    fontSize: 14,
    color: "var(--text-muted, #6b7280)",
    lineHeight: 1.6,
  },
  email: {
    margin: "6px 0 0",
    fontSize: 14,
    fontWeight: 600,
    color: "#22c55e",
    wordBreak: "break-all",
  },
  btn: {
    width: "100%",
    padding: "13px",
    borderRadius: 10,
    border: "none",
    background: "#22c55e",
    color: "#020812",
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "inherit",
    transition: "all 0.15s",
  },
  divider: {
    height: 1,
    background: "var(--border, rgba(255,255,255,0.07))",
    margin: "20px 0",
  },
  resendRow: {
    margin: 0,
    fontSize: 13,
    color: "var(--text-muted, #6b7280)",
  },
  resendBtn: {
    background: "transparent",
    border: "none",
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 600,
    padding: 0,
    transition: "color 0.15s",
  },
  skip: {
    margin: "14px 0 0",
    fontSize: 12,
  },
  skipBtn: {
    background: "transparent",
    border: "none",
    fontFamily: "inherit",
    fontSize: 12,
    color: "var(--text-faint, #4b5563)",
    cursor: "pointer",
    padding: 0,
  },
};

const css = `
  input[type="text"]:focus { outline: none; }
`;

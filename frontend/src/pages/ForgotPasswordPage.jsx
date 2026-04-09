// src/pages/ForgotPasswordPage.jsx
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requestOtp, verifyOtp, resetPassword } from "../api/forgotPasswordApi";
import { useToast } from "../components/ToastContext";

/* ── helpers ─────────────────────────────────────── */
function pwdScore(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const PWD_LABELS = ["", "Yếu", "Trung bình", "Khá", "Tốt", "Mạnh"];
const PWD_COLORS = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];

/* ── Eye icon ────────────────────────────────────── */
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
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* ── OTP Input — 6 individual boxes ─────────────── */
function OtpInput({ value, onChange }) {
  const inputs = useRef([]);

  const handleChange = (i, e) => {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    const arr = value.split("");
    arr[i] = char;
    const next = arr.join("");
    onChange(next);
    if (char && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
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
          style={{
            width: 46,
            height: 54,
            textAlign: "center",
            fontSize: 22,
            fontWeight: 700,
            fontFamily: "'Courier New', monospace",
            background: "var(--bg-input)",
            border: `2px solid ${value[i] ? "var(--red)" : "var(--border-mid)"}`,
            borderRadius: 10,
            color: "var(--text-primary)",
            outline: "none",
            transition: "border-color 0.15s",
            caretColor: "var(--red)",
          }}
        />
      ))}
    </div>
  );
}

/* ── Countdown timer ─────────────────────────────── */
function Countdown({ seconds, onExpire }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) {
      onExpire?.();
      return;
    }
    const t = setTimeout(() => setLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const m = String(Math.floor(left / 60)).padStart(2, "0");
  const s = String(left % 60).padStart(2, "0");
  return (
    <span
      style={{
        color: left < 30 ? "#ef4444" : "var(--text-faint)",
        fontSize: 13,
      }}
    >
      {m}:{s}
    </span>
  );
}

/* ════════════════════════════════════════════════════
   MAIN PAGE — 3 bước
════════════════════════════════════════════════════ */
export default function ForgotPasswordPage() {
  const showToast = useToast();
  const navigate = useNavigate();

  // step: 1 = nhập email, 2 = nhập OTP, 3 = nhập mật khẩu mới, 4 = thành công
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confPwd, setConfPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);
  const [resendCd, setResendCd] = useState(0); // resend cooldown secs

  const strength = pwdScore(newPwd);

  /* ── Step 1: Gửi OTP ── */
  const handleSendOtp = async () => {
    if (!email.trim()) return showToast("Vui lòng nhập email.", "error");
    setLoading(true);
    try {
      await requestOtp(email.trim().toLowerCase());
      showToast("Mã OTP đã được gửi! Kiểm tra hộp thư.", "success");
      setStep(2);
      setExpired(false);
      setResendCd(60);
    } catch (err) {
      // BE luôn 200 nên lỗi ở đây là lỗi mạng thực sự
      showToast(
        err.response?.data?.detail || "Không thể gửi email. Thử lại sau.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ── Gửi lại OTP ── */
  const handleResend = async () => {
    if (resendCd > 0) return;
    setLoading(true);
    try {
      await requestOtp(email);
      showToast("Đã gửi lại mã OTP mới.", "success");
      setOtp("");
      setExpired(false);
      setResendCd(60);
    } catch (err) {
      showToast(err.response?.data?.detail || "Gửi lại thất bại.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: Xác thực OTP ── */
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return showToast("Nhập đủ 6 chữ số.", "error");
    setLoading(true);
    try {
      await verifyOtp(email, otp);
      setStep(3);
    } catch (err) {
      showToast(
        err.response?.data?.detail || "Mã OTP không đúng hoặc đã hết hạn.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 3: Đặt mật khẩu mới ── */
  const handleResetPassword = async () => {
    if (newPwd.length < 6)
      return showToast("Mật khẩu tối thiểu 6 ký tự.", "error");
    if (newPwd !== confPwd)
      return showToast("Mật khẩu xác nhận không khớp.", "error");
    setLoading(true);
    try {
      await resetPassword(email, otp, newPwd);
      setStep(4);
    } catch (err) {
      showToast(err.response?.data?.detail || "Đặt lại thất bại.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ── Step indicator ── */
  const steps = ["Email", "Mã OTP", "Mật khẩu mới"];

  return (
    <div style={s.page}>
      {/* Background glow */}
      <div style={s.bgGlow1} />
      <div style={s.bgGlow2} />

      <div style={s.card}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <span style={s.logo}>
            FILM<span style={{ color: "#e50914" }}>VERSE</span>
          </span>
        </div>

        {/* Step indicator */}
        {step < 4 && (
          <div style={s.stepBar}>
            {steps.map((label, i) => {
              const idx = i + 1;
              const done = step > idx;
              const active = step === idx;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flex: i < 2 ? 1 : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <div
                      style={{
                        ...s.stepDot,
                        background:
                          done || active ? "#e50914" : "var(--bg-input)",
                        border: `2px solid ${done || active ? "#e50914" : "var(--border-mid)"}`,
                        color: done || active ? "#fff" : "var(--text-faint)",
                      }}
                    >
                      {done ? "✓" : idx}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color: active
                          ? "var(--text-primary)"
                          : "var(--text-faint)",
                        fontWeight: active ? 600 : 400,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div
                      style={{
                        flex: 1,
                        height: 2,
                        background: done ? "#e50914" : "var(--border)",
                        margin: "0 8px",
                        marginBottom: 18,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── STEP 1: Email ── */}
        {step === 1 && (
          <div style={s.body}>
            <h2 style={s.title}>Quên mật khẩu?</h2>
            <p style={s.subtitle}>
              Nhập email tài khoản của bạn, chúng tôi sẽ gửi mã OTP 6 chữ số.
            </p>

            <label style={s.label}>Địa chỉ email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
              placeholder="you@example.com"
              style={s.input}
              autoFocus
            />

            <button
              onClick={handleSendOtp}
              disabled={loading || !email.trim()}
              style={{ ...s.btn, opacity: loading || !email.trim() ? 0.55 : 1 }}
            >
              {loading ? "Đang gửi…" : "Gửi mã OTP"}
            </button>

            <div style={s.backRow}>
              <Link to="/login" style={s.backLink}>
                ← Quay lại đăng nhập
              </Link>
            </div>
          </div>
        )}

        {/* ── STEP 2: OTP ── */}
        {step === 2 && (
          <div style={s.body}>
            <h2 style={s.title}>Nhập mã OTP</h2>
            <p style={s.subtitle}>
              Mã 6 chữ số đã gửi đến{" "}
              <strong style={{ color: "var(--text-primary)" }}>{email}</strong>
            </p>

            <div style={{ margin: "24px 0" }}>
              <OtpInput value={otp} onChange={setOtp} />
            </div>

            {expired && (
              <div style={s.errorBox}>Mã OTP đã hết hạn. Vui lòng gửi lại.</div>
            )}

            {!expired && (
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: "var(--text-faint)" }}>
                  Hết hạn sau:{" "}
                </span>
                <Countdown
                  seconds={15 * 60}
                  onExpire={() => setExpired(true)}
                />
              </div>
            )}

            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              style={{
                ...s.btn,
                opacity: loading || otp.length !== 6 ? 0.55 : 1,
              }}
            >
              {loading ? "Đang xác thực…" : "Xác nhận mã"}
            </button>

            {/* Resend */}
            <div style={{ textAlign: "center", marginTop: 14 }}>
              {resendCd > 0 ? (
                <span style={{ fontSize: 13, color: "var(--text-faint)" }}>
                  Gửi lại sau{" "}
                  <Countdown
                    seconds={resendCd}
                    onExpire={() => setResendCd(0)}
                    key={resendCd}
                  />
                </span>
              ) : (
                <button onClick={handleResend} style={s.linkBtn}>
                  Gửi lại mã OTP
                </button>
              )}
            </div>

            <div style={s.backRow}>
              <button onClick={() => setStep(1)} style={s.backLink}>
                ← Đổi email
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Mật khẩu mới ── */}
        {step === 3 && (
          <div style={s.body}>
            <h2 style={s.title}>Đặt mật khẩu mới</h2>
            <p style={s.subtitle}>Chọn mật khẩu mạnh để bảo vệ tài khoản.</p>

            {/* New password */}
            <label style={s.label}>Mật khẩu mới</label>
            <div style={{ position: "relative", marginBottom: 6 }}>
              <input
                type={showPwd ? "text" : "password"}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                style={{ ...s.input, paddingRight: 44, marginBottom: 0 }}
              />
              <button onClick={() => setShowPwd((p) => !p)} style={s.eyeBtn}>
                <EyeIcon open={showPwd} />
              </button>
            </div>

            {/* Strength bar */}
            {newPwd && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 3,
                    height: 3,
                    marginBottom: 4,
                  }}
                >
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 99,
                        background:
                          i <= strength
                            ? PWD_COLORS[strength]
                            : "var(--border)",
                        opacity: i <= strength ? 1 : 0.3,
                        transition: "background 0.3s",
                      }}
                    />
                  ))}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: PWD_COLORS[strength],
                    fontWeight: 600,
                  }}
                >
                  {PWD_LABELS[strength]}
                </span>
              </div>
            )}

            {/* Confirm password */}
            <label style={s.label}>Xác nhận mật khẩu</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPwd ? "text" : "password"}
                value={confPwd}
                onChange={(e) => setConfPwd(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                placeholder="Nhập lại mật khẩu mới"
                style={{ ...s.input, paddingRight: 44 }}
              />
              <button onClick={() => setShowPwd((p) => !p)} style={s.eyeBtn}>
                <EyeIcon open={showPwd} />
              </button>
            </div>

            {confPwd && newPwd !== confPwd && (
              <p
                style={{
                  fontSize: 12,
                  color: "#ef4444",
                  marginTop: -8,
                  marginBottom: 12,
                }}
              >
                Mật khẩu không khớp
              </p>
            )}
            {confPwd && newPwd === confPwd && confPwd.length >= 6 && (
              <p
                style={{
                  fontSize: 12,
                  color: "#22c55e",
                  marginTop: -8,
                  marginBottom: 12,
                }}
              >
                ✓ Mật khẩu khớp
              </p>
            )}

            <button
              onClick={handleResetPassword}
              disabled={loading || newPwd.length < 6 || newPwd !== confPwd}
              style={{
                ...s.btn,
                opacity:
                  loading || newPwd.length < 6 || newPwd !== confPwd ? 0.55 : 1,
              }}
            >
              {loading ? "Đang lưu…" : "Đặt lại mật khẩu"}
            </button>
          </div>
        )}

        {/* ── STEP 4: Thành công ── */}
        {step === 4 && (
          <div style={{ ...s.body, textAlign: "center", padding: "8px 0 0" }}>
            <div style={s.successIcon}>✓</div>
            <h2 style={{ ...s.title, marginBottom: 8 }}>Thành công!</h2>
            <p style={{ ...s.subtitle, marginBottom: 28 }}>
              Mật khẩu của bạn đã được cập nhật. Đăng nhập lại để tiếp tục.
            </p>
            <button onClick={() => navigate("/login")} style={s.btn}>
              Đăng nhập ngay
            </button>
          </div>
        )}
      </div>

      <style>{css}</style>
    </div>
  );
}

/* ── Styles ──────────────────────────────────────── */
const s = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg-page)",
    padding: 20,
    position: "relative",
    overflow: "hidden",
  },
  bgGlow1: {
    position: "absolute",
    top: -120,
    left: -100,
    width: 500,
    height: 500,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(229,9,20,0.08) 0%, transparent 65%)",
    pointerEvents: "none",
  },
  bgGlow2: {
    position: "absolute",
    bottom: -140,
    right: -80,
    width: 450,
    height: 450,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 65%)",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 420,
    background: "var(--bg-card)",
    border: "1px solid var(--border-mid)",
    borderRadius: 16,
    padding: "32px 36px",
    boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
  },
  logo: {
    fontFamily: "'Bebas Neue','Arial Narrow',sans-serif",
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: 3,
    color: "var(--text-primary)",
  },
  stepBar: {
    display: "flex",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    transition: "all 0.2s",
  },
  body: {},
  title: {
    margin: "0 0 6px",
    fontSize: 20,
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  subtitle: {
    margin: "0 0 20px",
    fontSize: 13,
    color: "var(--text-faint)",
    lineHeight: 1.6,
  },
  label: {
    display: "block",
    marginBottom: 7,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text-faint)",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 14px",
    marginBottom: 16,
    background: "var(--bg-input)",
    border: "1px solid var(--border-mid)",
    borderRadius: 8,
    color: "var(--text-primary)",
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
  },
  btn: {
    display: "block",
    width: "100%",
    padding: "12px 0",
    background: "#e50914",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.04em",
    transition: "opacity 0.15s",
    marginBottom: 4,
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "var(--text-faint)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: 4,
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "var(--red, #e50914)",
    fontSize: 13,
    cursor: "pointer",
    textDecoration: "underline",
    padding: 0,
  },
  backRow: { textAlign: "center", marginTop: 16 },
  backLink: {
    fontSize: 13,
    color: "var(--text-faint)",
    textDecoration: "none",
    cursor: "pointer",
    background: "none",
    border: "none",
    fontFamily: "inherit",
  },
  errorBox: {
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: "#fca5a5",
    marginBottom: 12,
    textAlign: "center",
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "rgba(34,197,94,0.15)",
    border: "2px solid rgba(34,197,94,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    color: "#22c55e",
    margin: "0 auto 20px",
  },
};

const css = `
  input:focus { border-color: var(--red, #e50914) !important; box-shadow: 0 0 0 3px rgba(229,9,20,0.15); }
  input::placeholder { color: var(--text-faint, #555); }
`;

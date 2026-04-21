// src/pages/OAuthCallbackPage.jsx
/**
 * Trang trung gian sau khi Google redirect về FE.
 * URL: /oauth/callback?token=...&refresh_token=...&user_email=...&user_name=...
 *
 * Trang này:
 *  1. Đọc query params (token + refresh_token)
 *  2. Lưu token + user vào localStorage qua saveSession
 *  3. Redirect về trang chủ (hoặc trang trước đó)
 *  4. Nếu có lỗi → hiện thông báo + redirect về /login
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastContext";

const ERROR_MESSAGES = {
  cancelled: "Bạn đã huỷ đăng nhập Google.",
  invalid_state: "Phiên đăng nhập không hợp lệ. Vui lòng thử lại.",
  server_error: "Máy chủ gặp lỗi. Vui lòng thử lại sau.",
};

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { saveSession } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // "loading" | "error"

  useEffect(() => {
    const token = params.get("token");
    const refreshToken = params.get("refresh_token"); // ← THÊM MỚI
    const oauthError = params.get("oauth_error");

    // ── Có lỗi từ BE ──
    if (oauthError) {
      const msg = ERROR_MESSAGES[oauthError] || "Đăng nhập Google thất bại.";
      showToast(msg, "error");
      setStatus("error");
      setTimeout(() => navigate("/login", { replace: true }), 1800);
      return;
    }

    // ── Thiếu token ──
    if (!token || !refreshToken) {
      showToast("Không nhận được thông tin xác thực.", "error");
      setStatus("error");
      setTimeout(() => navigate("/login", { replace: true }), 1800);
      return;
    }

    // ── Xây user object từ query params ──
    const userData = {
      id: Number(params.get("user_id")) || 0,
      email: params.get("user_email") || "",
      username: params.get("user_name") || "",
      avatar: params.get("user_avatar") || "🎬",
      avatar_url: params.get("user_avatar_url") || null,
      bio: null,
      is_google: true,
    };

    // ── Lưu session (access token + refresh token + user) ──
    saveSession(token, refreshToken, userData); // ← THÊM refresh_token
    showToast(
      `Chào mừng, ${userData.username || userData.email.split("@")[0]}! 🎬`,
      "success",
    );
    navigate("/", { replace: true });
  }, []);

  return (
    <div style={s.page}>
      <div style={s.card}>
        {status === "loading" ? (
          <>
            <div style={s.spinner} />
            <p style={s.text}>Đang xác thực với Google…</p>
            <p style={s.sub}>Vui lòng chờ trong giây lát</p>
          </>
        ) : (
          <>
            <div style={s.errorIcon}>✕</div>
            <p style={s.text}>Đăng nhập thất bại</p>
            <p style={s.sub}>Đang chuyển về trang đăng nhập…</p>
          </>
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
    background: "var(--bg-page,#080b0f)",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    padding: "48px 40px",
    background: "var(--bg-card,#111620)",
    border: "1px solid var(--border-mid,rgba(255,255,255,0.1))",
    borderRadius: 16,
    minWidth: 260,
    boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
  },
  spinner: {
    width: 44,
    height: 44,
    border: "3px solid rgba(255,255,255,0.08)",
    borderTopColor: "#e50914",
    borderRadius: "50%",
    animation: "oauthSpin 0.75s linear infinite",
  },
  errorIcon: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "rgba(239,68,68,0.15)",
    border: "2px solid rgba(239,68,68,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    color: "#ef4444",
    fontWeight: 700,
  },
  text: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-primary,#f0f4ff)",
  },
  sub: { margin: 0, fontSize: 13, color: "var(--text-faint,#6b7280)" },
};

const css = `
  @keyframes oauthSpin { to { transform: rotate(360deg); } }
`;

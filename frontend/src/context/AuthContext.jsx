// src/context/AuthContext.jsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";
import toastBridge from "../utils/toastBridge";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Routes public — interceptor KHÔNG redirect / KHÔNG toast 401 ──────────
const PUBLIC_ROUTES = ["/login", "/forgot-password", "/oauth/callback", "/w/"];

function isPublicRoute(pathname) {
  return PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r));
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: trích xuất message lỗi từ response BE
//
// BE có thể trả về các format:
//   { error: "...", message: "..." }   ← RequestSizeMiddleware, 413
//   { error: "...", details: [...] }   ← ValidationError 422
//   { error: "..." }                   ← HTTPException chung
//   string (detail field)              ← HTTPException đơn giản
// ─────────────────────────────────────────────────────────────────────────────
function extractErrorMessage(err) {
  const data = err?.response?.data;
  if (!data) return null;

  // { error: "...", message: "..." }
  if (data.message) return data.message;

  // { error: "...", details: [{ field, message }] }
  if (data.details?.length) {
    return data.details.map((d) => d.message).join(" · ");
  }

  // { error: "..." }
  if (typeof data.error === "string") return data.error;

  // detail là string thuần (FastAPI default)
  if (typeof data.detail === "string") return data.detail;

  // detail là object { error: "..." }
  if (typeof data.detail?.error === "string") return data.detail.error;

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT MESSAGES theo status code
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_MESSAGES = {
  400: "Yêu cầu không hợp lệ.",
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy dữ liệu.",
  409: "Dữ liệu bị xung đột, vui lòng thử lại.",
  413: "Dữ liệu gửi lên quá lớn.",
  422: "Dữ liệu không hợp lệ.",
  429: "Bạn thao tác quá nhanh, vui lòng chờ một chút.",
  500: "Lỗi máy chủ, vui lòng thử lại sau.",
  502: "Máy chủ tạm thời không phản hồi.",
  503: "Dịch vụ tạm thời không khả dụng.",
};

// ─────────────────────────────────────────────────────────────────────────────
// CÁC URL PATTERN không hiện toast lỗi tự động
// (background fetch, silent check, polling...)
// ─────────────────────────────────────────────────────────────────────────────
const SILENT_URL_PATTERNS = [
  /\/auth\/me$/, // token check lúc startup
  /\/movies\/genres$/, // genre list — luôn silent
  /\/reminders\/check\//, // reminder check — background
  /\/reviews\/movies\/\d+\/summary$/, // summary fetch — silent
];

function isSilentUrl(url = "") {
  return SILENT_URL_PATTERNS.some((p) => p.test(url));
}

// ─────────────────────────────────────────────────────────────────────────────
// DEDUP TOAST: tránh hiện cùng 1 message nhiều lần liên tiếp
// (vd: nhiều request cùng fail 401 cùng lúc)
// ─────────────────────────────────────────────────────────────────────────────
let _lastToastKey = "";
let _lastToastTime = 0;

function showDedupToast(message, type = "error") {
  const key = `${type}:${message}`;
  const now = Date.now();
  // Cùng message trong vòng 2 giây → bỏ qua
  if (key === _lastToastKey && now - _lastToastTime < 2000) return;
  _lastToastKey = key;
  _lastToastTime = now;
  toastBridge.show(message, type);
}

// ─────────────────────────────────────────────────────────────────────────────
// AXIOS INSTANCE
// ─────────────────────────────────────────────────────────────────────────────
export const api = axios.create({ baseURL: API });

// ── Request interceptor: đính JWT ────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: xử lý lỗi tập trung ───────────────────────────────
api.interceptors.response.use(
  // ── Success: pass through ──────────────────────────────────────────────────
  (res) => res,

  // ── Error handler ─────────────────────────────────────────────────────────
  (err) => {
    const status = err.response?.status;
    const config = err.config || {};
    const url = config.url || "";
    const isSilent = config._silent || isSilentUrl(url);

    // ── Network error (không có response) ─────────────────────────────────
    if (!err.response) {
      if (!isSilent) {
        showDedupToast(
          "Không thể kết nối đến máy chủ. Kiểm tra mạng.",
          "error",
        );
      }
      return Promise.reject(err);
    }

    // ── 401 Unauthorized ──────────────────────────────────────────────────
    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      const currentPath = window.location.pathname;
      if (!isPublicRoute(currentPath)) {
        // Hiện toast trước khi redirect để user biết lý do
        showDedupToast(
          "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.",
          "warning",
        );
        // Delay nhỏ để toast kịp render trước khi navigate
        setTimeout(() => {
          window.location.href = "/login";
        }, 800);
      }
      return Promise.reject(err);
    }

    // ── Silent request → không toast, chỉ reject ──────────────────────────
    if (isSilent) return Promise.reject(err);

    // ── 429 Too Many Requests ─────────────────────────────────────────────
    if (status === 429) {
      const retryAfter = err.response.data?.retry_after;
      const msg = retryAfter
        ? `Quá nhiều yêu cầu. Thử lại sau ${retryAfter} giây.`
        : STATUS_MESSAGES[429];
      showDedupToast(msg, "warning");
      return Promise.reject(err);
    }

    // ── 422 Validation — thường FE đã handle cụ thể, toast generic ────────
    if (status === 422) {
      const msg = extractErrorMessage(err) || STATUS_MESSAGES[422];
      showDedupToast(msg, "error");
      return Promise.reject(err);
    }

    // ── 5xx Server errors ─────────────────────────────────────────────────
    if (status >= 500) {
      const msg =
        extractErrorMessage(err) ||
        STATUS_MESSAGES[status] ||
        "Lỗi máy chủ không xác định.";
      showDedupToast(msg, "error");
      return Promise.reject(err);
    }

    // ── 4xx còn lại (400, 403, 404, 409, 413...) ──────────────────────────
    // Nếu BE có message cụ thể → dùng, không thì fallback
    const msg =
      extractErrorMessage(err) || STATUS_MESSAGES[status] || `Lỗi ${status}.`;
    showDedupToast(msg, "error");

    return Promise.reject(err);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });

  const saveSession = useCallback((token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  // Silent token check lúc startup — dùng config._silent để interceptor bỏ qua toast
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    api.get("/auth/me", { _silent: true }).catch(() => {
      logout();
    });
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{ user, saveSession, logout, isLoggedIn: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

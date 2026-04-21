// src/context/AuthContext.jsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
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

// ── Trích xuất message lỗi từ response BE ────────────────────────────────
function extractErrorMessage(err) {
  const data = err?.response?.data;
  if (!data) return null;
  if (data.message) return data.message;
  if (data.details?.length)
    return data.details.map((d) => d.message).join(" · ");
  if (typeof data.error === "string") return data.error;
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.detail?.error === "string") return data.detail.error;
  return null;
}

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

const SILENT_URL_PATTERNS = [
  /\/auth\/me$/,
  /\/auth\/refresh$/,
  /\/movies\/genres$/,
  /\/reminders\/check\//,
  /\/reviews\/movies\/\d+\/summary$/,
];

function isSilentUrl(url = "") {
  return SILENT_URL_PATTERNS.some((p) => p.test(url));
}

// ── Dedup toast ───────────────────────────────────────────────────────────
let _lastToastKey = "";
let _lastToastTime = 0;

function showDedupToast(message, type = "error") {
  const key = `${type}:${message}`;
  const now = Date.now();
  if (key === _lastToastKey && now - _lastToastTime < 2000) return;
  _lastToastKey = key;
  _lastToastTime = now;
  toastBridge.show(message, type);
}

// ─────────────────────────────────────────────────────────────────────────────
// AXIOS INSTANCE
// ─────────────────────────────────────────────────────────────────────────────
export const api = axios.create({ baseURL: API });

// ── Request interceptor: đính access token ───────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE INTERCEPTOR — xử lý 401 + tự động refresh
//
// Cơ chế:
//  1. Nhận 401 → kiểm tra có refresh token không
//  2. Có → gọi /auth/refresh để lấy access token mới
//  3. Thành công → retry request gốc với token mới
//  4. Thất bại  → logout + redirect /login
//
// isRefreshing + failedQueue: tránh race condition khi nhiều request
// cùng nhận 401 đồng thời — chỉ gọi /refresh 1 lần, các request khác
// chờ trong queue rồi retry sau khi refresh xong.
// ─────────────────────────────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
}

// Hàm này được set từ AuthProvider để interceptor có thể gọi logout
let _logoutHandler = null;
export function setLogoutHandler(fn) {
  _logoutHandler = fn;
}

api.interceptors.response.use(
  (res) => res,

  async (err) => {
    const status = err.response?.status;
    const config = err.config || {};
    const url = config.url || "";
    const isSilent = config._silent || isSilentUrl(url);

    // ── Network error ──────────────────────────────────────────────────────
    if (!err.response) {
      if (!isSilent) {
        showDedupToast(
          "Không thể kết nối đến máy chủ. Kiểm tra mạng.",
          "error",
        );
      }
      return Promise.reject(err);
    }

    // ── 401 — thử refresh trước khi logout ───────────────────────────────
    if (status === 401) {
      // Không retry cho chính /auth/refresh và /auth/logout để tránh loop
      const isAuthEndpoint = /\/auth\/(refresh|logout)$/.test(url);

      const refreshToken = localStorage.getItem("refresh_token");

      if (!isAuthEndpoint && refreshToken && !config._retry) {
        // Đánh dấu request này đã được retry → tránh loop vô tận
        config._retry = true;

        if (isRefreshing) {
          // Đang refresh → đẩy vào queue, chờ token mới
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((newToken) => {
            config.headers.Authorization = `Bearer ${newToken}`;
            return api(config);
          });
        }

        isRefreshing = true;

        try {
          const { data } = await api.post(
            "/auth/refresh",
            { refresh_token: refreshToken },
            { _silent: true }, // không toast lỗi refresh
          );

          const newAccessToken = data.access_token;
          const newRefreshToken = data.refresh_token;

          // Lưu token mới
          localStorage.setItem("token", newAccessToken);
          localStorage.setItem("refresh_token", newRefreshToken);

          // Cập nhật header cho instance
          api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken);

          // Retry request gốc
          config.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(config);
        } catch (refreshErr) {
          processQueue(refreshErr, null);

          // Refresh thất bại → logout
          localStorage.removeItem("token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user");
          if (_logoutHandler) _logoutHandler();

          const currentPath = window.location.pathname;
          if (!isPublicRoute(currentPath)) {
            showDedupToast(
              "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.",
              "warning",
            );
            setTimeout(() => {
              window.location.href = "/login";
            }, 800);
          }
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }

      // Không có refresh token hoặc đã retry → logout trực tiếp
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      if (_logoutHandler) _logoutHandler();

      const currentPath = window.location.pathname;
      if (!isPublicRoute(currentPath)) {
        showDedupToast(
          "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.",
          "warning",
        );
        setTimeout(() => {
          window.location.href = "/login";
        }, 800);
      }
      return Promise.reject(err);
    }

    // ── Silent request ─────────────────────────────────────────────────────
    if (isSilent) return Promise.reject(err);

    // ── 429 ───────────────────────────────────────────────────────────────
    if (status === 429) {
      const retryAfter = err.response.data?.retry_after;
      const msg = retryAfter
        ? `Quá nhiều yêu cầu. Thử lại sau ${retryAfter} giây.`
        : STATUS_MESSAGES[429];
      showDedupToast(msg, "warning");
      return Promise.reject(err);
    }

    // ── 422 ───────────────────────────────────────────────────────────────
    if (status === 422) {
      const msg = extractErrorMessage(err) || STATUS_MESSAGES[422];
      showDedupToast(msg, "error");
      return Promise.reject(err);
    }

    // ── 5xx ───────────────────────────────────────────────────────────────
    if (status >= 500) {
      const msg =
        extractErrorMessage(err) ||
        STATUS_MESSAGES[status] ||
        "Lỗi máy chủ không xác định.";
      showDedupToast(msg, "error");
      return Promise.reject(err);
    }

    // ── 4xx còn lại ───────────────────────────────────────────────────────
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

  // Lưu cả access token + refresh token + user data
  const saveSession = useCallback((accessToken, refreshToken, userData) => {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    // Gọi BE để blacklist token server-side
    const accessToken = localStorage.getItem("token");
    const refreshToken = localStorage.getItem("refresh_token");

    if (accessToken && refreshToken) {
      try {
        await api.post(
          "/auth/logout",
          { refresh_token: refreshToken },
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            _silent: true, // không toast lỗi nếu token đã hết hạn
            _retry: true, // không trigger refresh khi gọi logout
          },
        );
      } catch {
        // Bỏ qua lỗi — client vẫn xoá local state
      }
    }

    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  // Đăng ký logout handler để interceptor gọi được
  useEffect(() => {
    setLogoutHandler(() => setUser(null));
  }, []);

  // Silent token check lúc startup
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    api.get("/auth/me", { _silent: true }).catch(() => {
      // Nếu /me fail, interceptor sẽ tự thử refresh
      // Nếu refresh cũng fail, logout sẽ được gọi tự động
    });
  }, []);

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

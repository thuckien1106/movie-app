import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Routes không cần auth — interceptor KHÔNG redirect ở đây ──────────────
// Dùng prefix match: "/w/" khớp "/w/abc123", v.v.
const PUBLIC_ROUTES = [
  "/login",
  "/forgot-password",
  "/oauth/callback",
  "/w/", // public watchlist share links
];

function isPublicRoute(pathname) {
  return PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r));
}

// ── Axios instance dùng chung toàn app ────────────────────────────────────
export const api = axios.create({ baseURL: API });

// Tự động đính JWT vào mọi request (nếu có token)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 handler: chỉ redirect khi đang ở route cần auth
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const currentPath = window.location.pathname;

      // Trang public → chỉ xóa token cũ, KHÔNG redirect
      if (isPublicRoute(currentPath)) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return Promise.reject(err);
      }

      // Trang cần auth → xóa session và về trang login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

// ── Context ───────────────────────────────────────────────────────────────
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

  // Kiểm tra token còn hợp lệ khi load app.
  // Dùng config._isTokenCheck để interceptor nhận biết đây là
  // silent check → không redirect nếu 401 (token đã hết hạn).
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    api.get("/auth/me", { _isTokenCheck: true }).catch(() => {
      // Token hết hạn hoặc invalid → clear session nhưng KHÔNG redirect
      // vì user có thể đang ở trang public hoặc trang login
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

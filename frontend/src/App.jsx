// src/App.jsx
import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { ToastProvider } from "./components/ToastContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { WatchlistProvider } from "./context/WatchlistContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import { useAuth } from "./context/AuthContext";
import VerifyBanner from "./components/VerifyBanner";
import AiChatBox from "./components/AiChatBox";

// ─── Lazy imports ────────────────────────────────────────────────────────────
// Mỗi page sẽ được tách thành chunk riêng, chỉ tải khi user navigate đến.
// Ước tính tiết kiệm ~70% initial bundle size.

// Public — có thể xuất hiện ngay khi mở app, nhưng vẫn lazy vì Home đủ để render trước
const Home = lazy(() => import("./pages/Home"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const MovieDetail = lazy(() => import("./pages/MovieDetail"));
const PublicWatchlist = lazy(() => import("./pages/PublicWatchlist"));
const PersonPage = lazy(() => import("./pages/PersonPage"));
const ComparePage = lazy(() => import("./pages/ComparePage"));
const PublicProfilePage = lazy(() => import("./pages/PublicProfilePage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const OAuthCallbackPage = lazy(() => import("./pages/OAuthCallbackPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Protected — chỉ load khi đã đăng nhập và navigate đến
const Watchlist = lazy(() => import("./pages/Watchlist")); // 4026 dòng → chunk riêng
const Profile = lazy(() => import("./pages/Profile"));
const MoodDiscovery = lazy(() => import("./pages/MoodDiscovery"));
const RemindersPage = lazy(() => import("./pages/RemindersPage"));
const RecommendationsPage = lazy(() => import("./pages/RecommendationsPage"));
const Statistics = lazy(() => import("./pages/Statistics"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));

// Admin — chunk hoàn toàn tách biệt, user thường không bao giờ tải
const AdminPage = lazy(() => import("./pages/AdminPage")); // 2651 dòng → chunk riêng

// ─── Loading fallback ─────────────────────────────────────────────────────────
// Hiển thị trong khi chunk đang tải — dùng spinner nhẹ, không import thêm gì
function PageLoader() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        width: "100%",
      }}
      aria-label="Đang tải trang..."
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: "3px solid rgba(255,255,255,0.15)",
          borderTop: "3px solid #e50914",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function AdminRedirect() {
  const { user, isLoggedIn } = useAuth();
  const location = useLocation();
  if (
    isLoggedIn &&
    (user?.role === "admin" || user?.role === "moderator") &&
    !location.pathname.startsWith("/admin")
  ) {
    return <Navigate to="/admin" replace />;
  }
  return null;
}

function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}

// Bọc lazy page trong Suspense + ErrorBoundary — dùng chung cho mọi route
function LazyPage({ children }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </RouteErrorBoundary>
  );
}

// ─── Routes ───────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <>
      <AdminRedirect />
      <VerifyBanner />
      <AiChatBox />
      <Routes>
        {/* ── Public ── */}
        <Route
          path="/"
          element={
            <LazyPage>
              <Home />
            </LazyPage>
          }
        />
        <Route
          path="/login"
          element={
            <LazyPage>
              <AuthPage />
            </LazyPage>
          }
        />
        <Route
          path="/movie/:id"
          element={
            <LazyPage>
              <MovieDetail />
            </LazyPage>
          }
        />
        <Route
          path="/w/:token"
          element={
            <LazyPage>
              <PublicWatchlist />
            </LazyPage>
          }
        />
        <Route
          path="/person/:id"
          element={
            <LazyPage>
              <PersonPage />
            </LazyPage>
          }
        />
        <Route
          path="/compare/:id1?/:id2?"
          element={
            <LazyPage>
              <ComparePage />
            </LazyPage>
          }
        />
        <Route
          path="/u/:username"
          element={
            <LazyPage>
              <PublicProfilePage />
            </LazyPage>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <LazyPage>
              <ForgotPasswordPage />
            </LazyPage>
          }
        />
        <Route
          path="/oauth/callback"
          element={
            <LazyPage>
              <OAuthCallbackPage />
            </LazyPage>
          }
        />
        <Route
          path="/verify-email"
          element={
            <LazyPage>
              <VerifyEmailPage />
            </LazyPage>
          }
        />

        {/* ── Protected ── */}
        <Route
          path="/watchlist"
          element={
            <ProtectedRoute>
              <LazyPage>
                <Watchlist />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <LazyPage>
                <Profile />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/mood"
          element={
            <ProtectedRoute>
              <LazyPage>
                <MoodDiscovery />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reminders"
          element={
            <ProtectedRoute>
              <LazyPage>
                <RemindersPage />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/recommendations"
          element={
            <ProtectedRoute>
              <LazyPage>
                <RecommendationsPage />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/statistics"
          element={
            <ProtectedRoute>
              <LazyPage>
                <Statistics />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <LazyPage>
                <NotificationsPage />
              </LazyPage>
            </ProtectedRoute>
          }
        />

        {/* ── Admin ── */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPage />
              </LazyPage>
            </AdminRoute>
          }
        />

        {/* ── 404 ── */}
        <Route
          path="*"
          element={
            <LazyPage>
              <NotFound />
            </LazyPage>
          }
        />
      </Routes>
    </>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <WatchlistProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </WatchlistProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

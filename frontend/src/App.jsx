// src/App.jsx
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ToastProvider } from "./components/ToastContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { WatchlistProvider } from "./context/WatchlistContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import Watchlist from "./pages/Watchlist";
import MovieDetail from "./pages/MovieDetail";
import AuthPage from "./pages/AuthPage";
import PublicWatchlist from "./pages/PublicWatchlist";
import Profile from "./pages/Profile";
import MoodDiscovery from "./pages/MoodDiscovery";
import RemindersPage from "./pages/RemindersPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import RecommendationsPage from "./pages/RecommendationsPage";
import PersonPage from "./pages/PersonPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import Statistics from "./pages/Statistics";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPage from "./pages/AdminPage";
// ─── RouteErrorBoundary ───────────────────────────────────────────────────────
// Tách riêng để dùng được useLocation() (hook chỉ chạy trong BrowserRouter).
// resetKey = pathname: mỗi khi user navigate sang trang khác, ErrorBoundary
// tự reset — tránh trường hợp lỗi trang A làm kẹt cả app.
function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}

// ─── Routes ──────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/"
        element={
          <RouteErrorBoundary>
            <Home />
          </RouteErrorBoundary>
        }
      />
      <Route
        path="/login"
        element={
          <RouteErrorBoundary>
            <AuthPage />
          </RouteErrorBoundary>
        }
      />
      <Route
        path="/movie/:id"
        element={
          <RouteErrorBoundary>
            <MovieDetail />
          </RouteErrorBoundary>
        }
      />
      <Route
        path="/w/:token"
        element={
          <RouteErrorBoundary>
            <PublicWatchlist />
          </RouteErrorBoundary>
        }
      />
      <Route
        path="/person/:id"
        element={
          <RouteErrorBoundary>
            <PersonPage />
          </RouteErrorBoundary>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <RouteErrorBoundary>
            <ForgotPasswordPage />
          </RouteErrorBoundary>
        }
      />
      <Route
        path="/oauth/callback"
        element={
          <RouteErrorBoundary>
            <OAuthCallbackPage />
          </RouteErrorBoundary>
        }
      />

      {/* Protected routes */}
      <Route
        path="/watchlist"
        element={
          <ProtectedRoute>
            <RouteErrorBoundary>
              <Watchlist />
            </RouteErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <RouteErrorBoundary>
              <Profile />
            </RouteErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mood"
        element={
          <ProtectedRoute>
            <RouteErrorBoundary>
              <MoodDiscovery />
            </RouteErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reminders"
        element={
          <ProtectedRoute>
            <RouteErrorBoundary>
              <RemindersPage />
            </RouteErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recommendations"
        element={
          <ProtectedRoute>
            <RouteErrorBoundary>
              <RecommendationsPage />
            </RouteErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/statistics"
        element={
          <ProtectedRoute>
            <RouteErrorBoundary>
              <Statistics />
            </RouteErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <RouteErrorBoundary>
              <AdminPage />
            </RouteErrorBoundary>
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    // ErrorBoundary ngoài cùng: bắt lỗi ở chính các Provider
    // (ThemeProvider, AuthProvider...) trước khi BrowserRouter mount
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

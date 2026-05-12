// src/App.jsx
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
import AdminRoute from "./components/AdminRoute";
import { useAuth } from "./context/AuthContext";
import AdminPage from "./pages/AdminPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import VerifyBanner from "./components/VerifyBanner";
import PublicProfilePage from "./pages/PublicProfilePage";
import ComparePage from "./pages/ComparePage";
import AiChatBox from "./components/AiChatBox";

// Nếu user là admin/moderator mà đang ở trang không phải /admin → redirect về /admin
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

function AppRoutes() {
  return (
    <>
      <AdminRedirect />
      <VerifyBanner />
      <AiChatBox />
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
          path="/compare/:id1?/:id2?"
          element={
            <RouteErrorBoundary>
              <ComparePage />
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/u/:username"
          element={
            <RouteErrorBoundary>
              <PublicProfilePage />
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
          path="/verify-email"
          element={
            <RouteErrorBoundary>
              <VerifyEmailPage />
            </RouteErrorBoundary>
          }
        />

        {/* Admin-only route — chỉ admin + moderator */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <RouteErrorBoundary>
                <AdminPage />
              </RouteErrorBoundary>
            </AdminRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

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

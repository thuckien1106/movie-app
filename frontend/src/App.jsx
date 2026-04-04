import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "./components/ToastContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Home from "./pages/Home";
import Watchlist from "./pages/Watchlist";
import MovieDetail from "./pages/MovieDetail";
import AuthPage from "./pages/AuthPage";
import PublicWatchlist from "./pages/PublicWatchlist";
import Profile from "./pages/Profile";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/movie/:id" element={<MovieDetail />} />
              <Route path="/w/:token" element={<PublicWatchlist />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

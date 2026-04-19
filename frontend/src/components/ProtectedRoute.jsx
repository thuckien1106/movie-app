// src/components/ProtectedRoute.jsx
//
// Bọc các route cần đăng nhập.
// Nếu chưa login → redirect về /login?from=<current_path>
// Sau khi login xong, AuthPage sẽ redirect lại đúng trang.
//
// Dùng trong App.jsx:
//   <Route path="/watchlist" element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    // Lưu lại URL hiện tại vào ?from= để sau khi login redirect về đúng trang
    return (
      <Navigate
        to={`/login?from=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  return children;
}

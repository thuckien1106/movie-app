// src/components/AdminRoute.jsx
// Bảo vệ route /admin: chỉ cho admin + moderator vào.
// User thường → redirect về /
// Chưa login   → redirect về /login
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { isLoggedIn, user } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    return (
      <Navigate
        to={`/login?from=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  if (user?.role === "user") {
    return <Navigate to="/" replace />;
  }

  return children;
}

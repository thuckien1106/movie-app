// src/api/adminApi.js
import { api } from "../context/AuthContext";

// ── Thống kê ──────────────────────────────────────────────
export const getAdminStats = () => api.get("/admin/stats");

// ── User ──────────────────────────────────────────────────
export const getAdminUsers = (params = {}) =>
  api.get("/admin/users", { params });
// params: { page, page_size, search, role, banned }

export const setUserRole = (userId, role) =>
  api.patch(`/admin/users/${userId}/role`, { role });

export const banUser = (userId, reason = "") =>
  api.post(`/admin/users/${userId}/ban`, { reason });

export const unbanUser = (userId) => api.post(`/admin/users/${userId}/unban`);

// ── Review ────────────────────────────────────────────────
export const getAdminReviews = (params = {}) =>
  api.get("/admin/reviews", { params });
// params: { page, page_size, flagged, hidden }

export const hideReview = (reviewId) =>
  api.post(`/admin/reviews/${reviewId}/hide`);

export const unhideReview = (reviewId) =>
  api.post(`/admin/reviews/${reviewId}/unhide`);

export const deleteReviewAdmin = (reviewId) =>
  api.delete(`/admin/reviews/${reviewId}`);

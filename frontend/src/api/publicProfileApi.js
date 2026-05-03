// src/api/publicProfileApi.js
import { api } from "../context/AuthContext";

export const getPublicProfile = (username) =>
  api.get(`/auth/users/${username}`);

// Tìm kiếm user theo username (dùng khi gõ @... trong search)
export const searchUsers = (q, limit = 6) =>
  api.get("/auth/users", { params: { q, limit } });

// ── Follow ────────────────────────────────────────────────────
export const toggleFollow = (username) => api.post(`/follow/${username}`);
export const getFollowStatus = (username) =>
  api.get(`/follow/status/${username}`);
export const getFollowers = (username, page) =>
  api.get(`/follow/${username}/followers`, { params: { page } });
export const getFollowing = (username, page) =>
  api.get(`/follow/${username}/following`, { params: { page } });
export const getSocialFeed = (page = 1) =>
  api.get("/follow/feed/activity", { params: { page } });

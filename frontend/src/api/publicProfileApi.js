// src/api/publicProfileApi.js
import { api } from "../context/AuthContext";

export const getPublicProfile = (username) =>
  api.get(`/auth/users/${username}`);

// Tìm kiếm user theo username (dùng khi gõ @... trong search)
export const searchUsers = (q, limit = 6) =>
  api.get("/auth/users", { params: { q, limit } });

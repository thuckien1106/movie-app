// src/api/publicProfileApi.js
import { api } from "../context/AuthContext";

export const getPublicProfile = (username) =>
  api.get(`/auth/users/${username}`);

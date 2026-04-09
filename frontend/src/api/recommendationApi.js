// src/api/recommendationApi.js
import { api } from "../context/AuthContext";

/** Lấy danh sách phim gợi ý cá nhân hoá */
export const getRecommendations = (page = 1) =>
  api.get("/recommendations/", { params: { page } });

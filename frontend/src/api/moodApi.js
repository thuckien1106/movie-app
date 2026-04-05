import { api } from "../context/AuthContext";

/** Lấy danh sách tất cả mood */
export const getMoods = () => api.get("/mood/");

/** Lấy phim theo mood_id, có thể phân trang */
export const getMoviesByMood = (moodId, page = 1) =>
  api.get(`/mood/${moodId}`, { params: { page } });

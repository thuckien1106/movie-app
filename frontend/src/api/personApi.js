import { api } from "../context/AuthContext";

/** Thông tin cá nhân: tên, tiểu sử, ngày sinh, ảnh */
export const getPersonDetail = (personId) =>
  api.get(`/movies/person/${personId}`);

/** Filmography: tất cả phim đã tham gia */
export const getPersonCredits = (personId) =>
  api.get(`/movies/person/${personId}/credits`);

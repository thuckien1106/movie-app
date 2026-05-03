import { api } from "../context/AuthContext";

// ── Auth ──────────────────────────────────────────────────
export const register = (data) => api.post("/auth/register", data);
export const login = (data) => api.post("/auth/login", data);
export const getMe = () => api.get("/auth/me");

// ── Movies ────────────────────────────────────────────────
export const getAllMovies = (page = 1, genreId = null, filters = {}) =>
  api.get("/movies/all", {
    params: { page, genre_id: genreId, ...filters },
  });

export const getPopularMovies = (page = 1) =>
  api.get("/movies/popular", { params: { page } });

export const getTopRatedMovies = (page = 1) =>
  api.get("/movies/top-rated", { params: { page } });

export const getUpcomingMovies = (page = 1) =>
  api.get("/movies/upcoming", { params: { page } });

export const getTrendingMovies = () => api.get("/movies/trending");

export const searchMovies = (q, page = 1) =>
  api.get("/movies/search", { params: { q, page } });

export const getGenres = () => api.get("/movies/genres");

export const getMovieDetail = (id) => api.get(`/movies/${id}`);
export const getTrailer = (id) => api.get(`/movies/${id}/trailer`);
export const getCast = (id) => api.get(`/movies/${id}/cast`);
export const getSimilarMovies = (id) => api.get(`/movies/${id}/similar`);

// ── Watchlist ─────────────────────────────────────────────
export const getWatchlist = (collectionId = null) =>
  api.get("/watchlist/", {
    params: collectionId ? { collection_id: collectionId } : {},
  });

export const addMovie = (data) => api.post("/watchlist/", data);

export const deleteMovie = (movieId) => api.delete(`/watchlist/${movieId}`);

export const toggleWatched = (movieId) =>
  api.put(`/watchlist/${movieId}/toggle-watched`);

export const updateNote = (movieId, note) =>
  api.patch(`/watchlist/${movieId}/note`, { note });

export const updateRating = (movieId, rating) =>
  api.patch(`/watchlist/${movieId}/rating`, { rating });

export const moveToCollection = (movieId, collectionId) =>
  api.patch(`/watchlist/${movieId}/collection`, {
    collection_id: collectionId,
  });

// ── Stats ─────────────────────────────────────────────────
export const getWatchlistStats = () => api.get("/watchlist/stats");
export const getDetailedStats = () => api.get("/watchlist/stats/detail");
export const backfillRuntime = () => api.post("/watchlist/backfill-runtime");

// ── Collections ───────────────────────────────────────────
export const getCollections = () => api.get("/watchlist/collections");
export const createCollection = (data) =>
  api.post("/watchlist/collections", data);
export const deleteCollection = (id) =>
  api.delete(`/watchlist/collections/${id}`);

// ── Share ─────────────────────────────────────────────────
export const getShareLink = () => api.get("/watchlist/share/link");
export const toggleShareLink = () => api.post("/watchlist/share/toggle");
export const getPublicWatchlist = (token) =>
  api.get(`/watchlist/public/${token}`);

// ── Profile ───────────────────────────────────────────────
export const updateProfile = (data) => api.patch("/auth/profile", data);
export const changePassword = (data) => api.post("/auth/change-password", data);
export const getActivity = (limit = 30) =>
  api.get("/auth/activity", { params: { limit } });

// ── Now Playing ───────────────────────────────────────────
export const getNowPlayingMovies = (page = 1) =>
  api.get("/movies/now-playing", { params: { page } });

// ── Search History (localStorage helpers) ────────────────
const HISTORY_KEY = "filmverse_search_history";
const MAX_HISTORY = 8;

export function getSearchHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

export function addSearchHistory(query) {
  if (!query?.trim()) return;
  const q = query.trim();
  const history = getSearchHistory().filter((h) => h !== q);
  history.unshift(q);
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(history.slice(0, MAX_HISTORY)),
  );
}

export function removeSearchHistory(query) {
  const history = getSearchHistory().filter((h) => h !== query);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearSearchHistory() {
  localStorage.removeItem(HISTORY_KEY);
}
export const updateCollection = (id, data) =>
  api.patch(`/watchlist/collections/${id}`, data);

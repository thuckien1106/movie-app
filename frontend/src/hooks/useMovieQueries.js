// src/hooks/useMovieQueries.js
/**
 * Custom hooks bọc React Query cho toàn bộ API calls.
 *
 * CÁCH DÙNG trong page:
 *
 *   // Trước:
 *   const [genres, setGenres] = useState([]);
 *   const [loading, setLoading] = useState(true);
 *   useEffect(() => {
 *     getGenres().then(r => setGenres(r.data));
 *   }, []);
 *
 *   // Sau:
 *   const { data: genres = [], isLoading: loading } = useGenres();
 *
 * Lợi ích tự động có:
 *   - Cache: navigate đi rồi quay lại → không fetch lại (staleTime 5 phút)
 *   - Dedup: 10 component cùng gọi useGenres() → chỉ 1 request
 *   - Stale-while-revalidate: hiện data cũ ngay, fetch ngầm để cập nhật
 *   - Auto retry: lỗi network tự thử lại 1 lần
 */

import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as api from "../api/movieApi";

// ─── Query Keys ───────────────────────────────────────────────────────────────
// Centralize tất cả key để dễ invalidate chính xác sau mutation
export const KEYS = {
  genres: ["genres"],
  trending: ["trending"],
  popular: (page) => ["popular", page],
  topRated: (page) => ["top-rated", page],
  upcoming: (page) => ["upcoming", page],
  nowPlaying: (page) => ["now-playing", page],
  allMovies: (page, gid, f) => ["all-movies", page, gid, f],
  search: (q, page) => ["search", q, page],
  movieDetail: (id) => ["movie", id],
  trailer: (id) => ["trailer", id],
  cast: (id) => ["cast", id],
  similar: (id) => ["similar", id],
  person: (id) => ["person", id],
  personCredits: (id) => ["person-credits", id],
  watchlist: (colId) => ["watchlist", colId ?? null],
  watchlistStats: () => ["watchlist-stats"],
  detailedStats: () => ["detailed-stats"],
  collections: () => ["collections"],
  shareLink: () => ["share-link"],
  publicWatchlist: (token) => ["public-watchlist", token],
  profile: () => ["profile"],
  activity: (limit) => ["activity", limit],
  viewHistory: (limit) => ["view-history", limit],
  notifications: () => ["notifications"],
  recommendations: () => ["recommendations"],
};

// ═══════════════════════════════════════════════════════════════
// MOVIES
// ═══════════════════════════════════════════════════════════════

export function useGenres() {
  return useQuery({
    queryKey: KEYS.genres,
    queryFn: () => api.getGenres().then((r) => r.data),
    staleTime: 60 * 60 * 1000, // genres thay đổi rất hiếm — cache 1 tiếng
  });
}

export function useTrending() {
  return useQuery({
    queryKey: KEYS.trending,
    queryFn: () => api.getTrendingMovies().then((r) => r.data),
    staleTime: 10 * 60 * 1000, // 10 phút
  });
}

export function usePopularMovies(page = 1) {
  return useQuery({
    queryKey: KEYS.popular(page),
    queryFn: () => api.getPopularMovies(page).then((r) => r.data),
  });
}

export function useTopRatedMovies(page = 1) {
  return useQuery({
    queryKey: KEYS.topRated(page),
    queryFn: () => api.getTopRatedMovies(page).then((r) => r.data),
  });
}

export function useUpcomingMovies(page = 1) {
  return useQuery({
    queryKey: KEYS.upcoming(page),
    queryFn: () => api.getUpcomingMovies(page).then((r) => r.data),
  });
}

export function useNowPlayingMovies(page = 1) {
  return useQuery({
    queryKey: KEYS.nowPlaying(page),
    queryFn: () => api.getNowPlayingMovies(page).then((r) => r.data),
  });
}

export function useAllMovies(page = 1, genreId = null, filters = {}) {
  return useQuery({
    queryKey: KEYS.allMovies(page, genreId, filters),
    queryFn: () => api.getAllMovies(page, genreId, filters).then((r) => r.data),
  });
}

export function useSearchMovies(query, page = 1) {
  return useQuery({
    queryKey: KEYS.search(query, page),
    queryFn: () => api.searchMovies(query, page).then((r) => r.data),
    enabled: !!query?.trim(), // không fetch khi query rỗng
    staleTime: 2 * 60 * 1000, // search result cache 2 phút
  });
}

export function useMovieDetail(id) {
  return useQuery({
    queryKey: KEYS.movieDetail(id),
    queryFn: () => api.getMovieDetail(id).then((r) => r.data),
    enabled: !!id,
    staleTime: 30 * 60 * 1000, // movie detail ổn định — cache 30 phút
  });
}

export function useTrailer(id) {
  return useQuery({
    queryKey: KEYS.trailer(id),
    queryFn: () => api.getTrailer(id).then((r) => r.data),
    enabled: !!id,
    staleTime: 60 * 60 * 1000,
  });
}

export function useCast(id) {
  return useQuery({
    queryKey: KEYS.cast(id),
    queryFn: () => api.getCast(id).then((r) => r.data),
    enabled: !!id,
    staleTime: 60 * 60 * 1000,
  });
}

export function useSimilarMovies(id) {
  return useQuery({
    queryKey: KEYS.similar(id),
    queryFn: () => api.getSimilarMovies(id).then((r) => r.data),
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
  });
}

export function usePersonDetail(id) {
  return useQuery({
    queryKey: KEYS.person(id),
    queryFn: () => api.getPersonDetail(id).then((r) => r.data),
    enabled: !!id,
    staleTime: 60 * 60 * 1000,
  });
}

export function usePersonCredits(id) {
  return useQuery({
    queryKey: KEYS.personCredits(id),
    queryFn: () => api.getPersonCredits(id).then((r) => r.data),
    enabled: !!id,
    staleTime: 60 * 60 * 1000,
  });
}

// ═══════════════════════════════════════════════════════════════
// WATCHLIST
// ═══════════════════════════════════════════════════════════════

export function useWatchlist(collectionId = null) {
  return useQuery({
    queryKey: KEYS.watchlist(collectionId),
    queryFn: () => api.getWatchlist(collectionId).then((r) => r.data),
    staleTime: 0, // watchlist thay đổi nhiều — luôn revalidate khi focus
    refetchOnWindowFocus: true,
  });
}

export function useWatchlistStats() {
  return useQuery({
    queryKey: KEYS.watchlistStats(),
    queryFn: () => api.getWatchlistStats().then((r) => r.data),
  });
}

export function useDetailedStats() {
  return useQuery({
    queryKey: KEYS.detailedStats(),
    queryFn: () => api.getDetailedStats().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCollections() {
  return useQuery({
    queryKey: KEYS.collections(),
    queryFn: () => api.getCollections().then((r) => r.data),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useShareLink() {
  return useQuery({
    queryKey: KEYS.shareLink(),
    queryFn: () => api.getShareLink().then((r) => r.data),
    staleTime: 60 * 60 * 1000,
  });
}

export function usePublicWatchlist(token) {
  return useQuery({
    queryKey: KEYS.publicWatchlist(token),
    queryFn: () => api.getPublicWatchlist(token).then((r) => r.data),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Watchlist Mutations ──────────────────────────────────────────────────────

export function useAddMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.addMovie(data),
    onSuccess: () => {
      // Xóa cache watchlist để lần sau fetch fresh
      qc.invalidateQueries({ queryKey: ["watchlist"] });
      qc.invalidateQueries({ queryKey: KEYS.watchlistStats() });
    },
  });
}

export function useDeleteMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (movieId) => api.deleteMovie(movieId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlist"] });
      qc.invalidateQueries({ queryKey: KEYS.watchlistStats() });
    },
  });
}

export function useToggleWatched() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (movieId) => api.toggleWatched(movieId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlist"] });
      qc.invalidateQueries({ queryKey: KEYS.watchlistStats() });
    },
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ movieId, note }) => api.updateNote(movieId, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });
}

export function useUpdateRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ movieId, rating }) => api.updateRating(movieId, rating),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlist"] });
      qc.invalidateQueries({ queryKey: KEYS.detailedStats() });
    },
  });
}

export function useMoveToCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ movieId, collectionId }) =>
      api.moveToCollection(movieId, collectionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.createCollection(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.collections() }),
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.deleteCollection(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.collections() });
      qc.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });
}

export function useToggleShareLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.toggleShareLink(),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.shareLink() }),
  });
}

// ═══════════════════════════════════════════════════════════════
// PROFILE & ACTIVITY
// ═══════════════════════════════════════════════════════════════

export function useActivity(limit = 30) {
  return useQuery({
    queryKey: KEYS.activity(limit),
    queryFn: () => api.getActivity(limit).then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });
}

export function useViewHistory(limit = 20) {
  return useQuery({
    queryKey: KEYS.viewHistory(limit),
    queryFn: () => api.getViewHistory(limit).then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.updateProfile(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.profile() }),
  });
}

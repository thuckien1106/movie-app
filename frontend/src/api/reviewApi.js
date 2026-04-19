// src/api/reviewApi.js
import { api } from "../context/AuthContext";

export const getReviewSummary = (movieId) =>
  api.get(`/reviews/movies/${movieId}/summary`);

export const getReviews = (movieId, { sort = "recent", page = 1 } = {}) =>
  api.get(`/reviews/movies/${movieId}`, { params: { sort, page } });

export const createReview = (movieId, data) =>
  api.post(`/reviews/movies/${movieId}`, data);

export const updateReview = (reviewId, data) =>
  api.patch(`/reviews/${reviewId}`, data);

export const deleteReview = (reviewId) => api.delete(`/reviews/${reviewId}`);

export const toggleLike = (reviewId) => api.post(`/reviews/${reviewId}/like`);

// src/api/commentApi.js
import { api } from "../context/AuthContext";

export const getComments = (reviewId) =>
  api.get(`/reviews/${reviewId}/comments`);
export const addComment = (reviewId, content, parentId = null) =>
  api.post(`/reviews/${reviewId}/comments`, { content, parent_id: parentId });
export const deleteComment = (commentId) =>
  api.delete(`/reviews/comments/${commentId}`);

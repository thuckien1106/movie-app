// src/api/reminderApi.js
import { api } from "../context/AuthContext";

// ── Reminders ─────────────────────────────────────────────
export const getReminders = () => api.get("/reminders/");
export const createReminder = (data) => api.post("/reminders/", data);
export const deleteReminder = (movieId) => api.delete(`/reminders/${movieId}`);
export const checkReminder = (movieId) =>
  api.get(`/reminders/check/${movieId}`);

// ── Notifications ─────────────────────────────────────────
export const getNotifStats = () => api.get("/reminders/notifications/stats");
export const getNotifs = (params) =>
  api.get("/reminders/notifications/", { params });
export const markAllRead = () => api.post("/reminders/notifications/read-all");
export const markOneRead = (id) =>
  api.patch(`/reminders/notifications/${id}/read`);
export const deleteNotif = (id) => api.delete(`/reminders/notifications/${id}`);

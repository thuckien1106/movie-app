// src/api/forgotPasswordApi.js
import { api } from "../context/AuthContext";

/** Bước 1 — Gửi OTP về email */
export const requestOtp = (email) =>
  api.post("/auth/forgot-password", { email });

/** Bước 2 — Kiểm tra OTP hợp lệ */
export const verifyOtp = (email, otp) =>
  api.post("/auth/verify-otp", { email, otp });

/** Bước 3 — Đặt mật khẩu mới */
export const resetPassword = (email, otp, new_password) =>
  api.post("/auth/reset-password", { email, otp, new_password });

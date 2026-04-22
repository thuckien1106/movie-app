// src/api/verifyApi.js
import { api } from "../context/AuthContext";

export const verifyEmail = (otp) => api.post("/auth/verify-email", { otp });

export const resendVerify = () => api.post("/auth/resend-verify");

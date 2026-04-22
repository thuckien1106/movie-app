// src/api/deleteAccountApi.js
import { api } from "../context/AuthContext";

/**
 * Xoá tài khoản vĩnh viễn.
 * @param {string|null} password - mật khẩu hiện tại (null nếu Google user)
 */
export const deleteAccount = (password = null) =>
  api.delete("/auth/account", {
    data: { password, confirm: true },
  });

// src/utils/toastBridge.js
//
// Bridge để gọi showToast từ bên ngoài React tree (vd: axios interceptor).
//
// Cách dùng:
//   1. ToastProvider gọi toastBridge.init(showToast) lúc mount
//   2. Bất kỳ module nào import toastBridge đều có thể gọi
//      toastBridge.show("message", "error")

const toastBridge = {
  _fn: null,

  /** Được gọi 1 lần duy nhất bởi ToastProvider khi mount */
  init(showToastFn) {
    this._fn = showToastFn;
  },

  /**
   * Hiện toast từ bất kỳ đâu (kể cả ngoài React).
   * Nếu ToastProvider chưa mount → silent fail (không crash).
   */
  show(message, type = "error") {
    this._fn?.(message, type);
  },
};

export default toastBridge;

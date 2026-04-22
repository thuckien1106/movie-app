// src/components/DeleteAccountSection.jsx
/**
 * Section xoá tài khoản — nhúng vào tab "Tài khoản" trong Profile.jsx
 *
 * Luồng 2 bước:
 *   Bước 1: Hiện cảnh báo + nút "Xoá tài khoản"
 *   Bước 2: Modal xác nhận — nhập mật khẩu (user thường) hoặc chỉ confirm (Google)
 *           → gọi API → logout → redirect /login
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./ToastContext";
import { deleteAccount } from "../api/deleteAccountApi";

/* ── Eye icon ── */
function EyeIcon({ open }) {
  return open ? (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function DeleteAccountSection() {
  const { user, logout } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = cảnh báo, 2 = nhập mật khẩu

  const isGoogle = user?.is_google;

  const openModal = () => {
    setStep(1);
    setPassword("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (loading) return;
    setShowModal(false);
    setPassword("");
    setStep(1);
  };

  const handleDelete = async () => {
    if (!isGoogle && !password.trim()) {
      showToast("Vui lòng nhập mật khẩu để xác nhận.", "error");
      return;
    }
    setLoading(true);
    try {
      await deleteAccount(isGoogle ? null : password);
      showToast("Tài khoản đã được xoá. Tạm biệt!", "success");
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.detail || "Không thể xoá tài khoản. Thử lại sau.";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Danger zone card ── */}
      <div style={s.dangerCard}>
        <div style={s.dangerHeader}>
          <div style={s.dangerIconWrap}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f87171"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <p style={s.dangerTitle}>Vùng nguy hiểm</p>
            <p style={s.dangerSubtitle}>Các thao tác không thể hoàn tác</p>
          </div>
        </div>

        <div style={s.dangerBody}>
          <div style={s.dangerRow}>
            <div>
              <p style={s.dangerRowTitle}>Xoá tài khoản</p>
              <p style={s.dangerRowDesc}>
                Xoá vĩnh viễn tài khoản, watchlist, review và toàn bộ dữ liệu
                của bạn. Hành động này{" "}
                <strong style={{ color: "#f87171" }}>không thể hoàn tác</strong>
                .
              </p>
            </div>
            <button onClick={openModal} style={s.dangerBtn}>
              Xoá tài khoản
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div
          style={s.overlay}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div style={s.modal}>
            {/* Step 1 — cảnh báo */}
            {step === 1 && (
              <>
                <div style={s.modalIconWrap}>
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#f87171"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                  </svg>
                </div>

                <h2 style={s.modalTitle}>Xoá tài khoản?</h2>
                <p style={s.modalDesc}>
                  Sau khi xoá, những thứ này sẽ mất vĩnh viễn:
                </p>

                <ul style={s.lossListUl}>
                  {[
                    "Toàn bộ watchlist và bộ sưu tập",
                    "Tất cả review và đánh giá phim",
                    "Lịch sử xem và thống kê",
                    "Các nhắc nhở phim đã đặt",
                    "Thông tin hồ sơ cá nhân",
                  ].map((item) => (
                    <li key={item} style={s.lossItem}>
                      <span style={s.lossDot}>✕</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div style={s.modalActions}>
                  <button onClick={closeModal} style={s.cancelBtn}>
                    Huỷ
                  </button>
                  <button onClick={() => setStep(2)} style={s.proceedBtn}>
                    Tôi hiểu, tiếp tục →
                  </button>
                </div>
              </>
            )}

            {/* Step 2 — xác nhận mật khẩu */}
            {step === 2 && (
              <>
                <div style={s.modalIconWrap}>
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#f87171"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>

                <h2 style={s.modalTitle}>Xác nhận lần cuối</h2>

                {isGoogle ? (
                  <p style={s.modalDesc}>
                    Nhấn xác nhận để xoá vĩnh viễn tài khoản{" "}
                    <strong style={{ color: "#fca5a5" }}>{user?.email}</strong>.
                  </p>
                ) : (
                  <>
                    <p style={s.modalDesc}>
                      Nhập mật khẩu của{" "}
                      <strong style={{ color: "#fca5a5" }}>
                        {user?.email}
                      </strong>{" "}
                      để xác nhận:
                    </p>
                    <div style={s.pwdWrap}>
                      <input
                        type={showPwd ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleDelete()}
                        placeholder="Mật khẩu của bạn"
                        autoFocus
                        style={s.pwdInput}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((p) => !p)}
                        style={s.eyeBtn}
                      >
                        <EyeIcon open={showPwd} />
                      </button>
                    </div>
                  </>
                )}

                <div style={s.modalActions}>
                  <button
                    onClick={() => setStep(1)}
                    disabled={loading}
                    style={s.cancelBtn}
                  >
                    ← Quay lại
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={loading || (!isGoogle && !password.trim())}
                    style={{
                      ...s.deleteBtn,
                      opacity:
                        loading || (!isGoogle && !password.trim()) ? 0.5 : 1,
                      cursor:
                        loading || (!isGoogle && !password.trim())
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {loading ? (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span style={s.spinner} /> Đang xoá...
                      </span>
                    ) : (
                      "Xoá vĩnh viễn"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ── Styles ── */
const s = {
  dangerCard: {
    marginTop: 28,
    border: "1px solid rgba(248,113,113,0.2)",
    borderRadius: 12,
    overflow: "hidden",
    background: "rgba(127,29,29,0.06)",
  },
  dangerHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 18px",
    borderBottom: "1px solid rgba(248,113,113,0.12)",
    background: "rgba(127,29,29,0.08)",
  },
  dangerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    flexShrink: 0,
    background: "rgba(248,113,113,0.1)",
    border: "1px solid rgba(248,113,113,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dangerTitle: { margin: 0, fontSize: 13, fontWeight: 600, color: "#f87171" },
  dangerSubtitle: {
    margin: "2px 0 0",
    fontSize: 11,
    color: "rgba(248,113,113,0.5)",
  },
  dangerBody: { padding: "16px 18px" },
  dangerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  dangerRowTitle: {
    margin: "0 0 4px",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-primary, #f0f4ff)",
  },
  dangerRowDesc: {
    margin: 0,
    fontSize: 12,
    color: "rgba(160,175,210,0.55)",
    lineHeight: 1.6,
    maxWidth: 360,
  },
  dangerBtn: {
    padding: "8px 18px",
    borderRadius: 8,
    flexShrink: 0,
    border: "1px solid rgba(248,113,113,0.35)",
    background: "rgba(127,29,29,0.3)",
    color: "#f87171",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    transition: "all 0.15s",
  },

  /* Modal overlay */
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 2000,
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 420,
    background: "var(--bg-overlay, #0f1420)",
    border: "1px solid rgba(248,113,113,0.2)",
    borderRadius: 18,
    padding: "32px 28px 28px",
    boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(248,113,113,0.1)",
  },
  modalIconWrap: {
    width: 58,
    height: 58,
    borderRadius: "50%",
    background: "rgba(127,29,29,0.15)",
    border: "1.5px solid rgba(248,113,113,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 18px",
  },
  modalTitle: {
    margin: "0 0 10px",
    fontSize: 20,
    fontWeight: 700,
    textAlign: "center",
    color: "var(--text-primary, #f0f4ff)",
  },
  modalDesc: {
    margin: "0 0 18px",
    fontSize: 13,
    color: "rgba(160,175,210,0.65)",
    lineHeight: 1.65,
    textAlign: "center",
  },
  lossListUl: { margin: "0 0 24px", padding: 0, listStyle: "none" },
  lossItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "7px 12px",
    background: "rgba(127,29,29,0.08)",
    borderRadius: 7,
    marginBottom: 5,
    fontSize: 12.5,
    color: "rgba(200,210,235,0.7)",
  },
  lossDot: { color: "#f87171", fontSize: 11, fontWeight: 700, flexShrink: 0 },

  /* Password input */
  pwdWrap: { position: "relative", marginBottom: 20 },
  pwdInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 42px 11px 14px",
    background: "rgba(255,255,255,0.04)",
    border: "1.5px solid rgba(248,113,113,0.25)",
    borderRadius: 10,
    color: "var(--text-primary, #f0f4ff)",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 0.15s",
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "rgba(160,175,210,0.5)",
    cursor: "pointer",
    padding: 4,
    display: "flex",
  },

  /* Actions */
  modalActions: { display: "flex", gap: 10 },
  cancelBtn: {
    flex: 1,
    padding: "11px",
    borderRadius: 10,
    border: "1px solid rgba(100,120,180,0.2)",
    background: "rgba(255,255,255,0.04)",
    color: "rgba(160,175,210,0.7)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  proceedBtn: {
    flex: 1,
    padding: "11px",
    borderRadius: 10,
    border: "1px solid rgba(248,113,113,0.3)",
    background: "rgba(127,29,29,0.2)",
    color: "#f87171",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  deleteBtn: {
    flex: 1,
    padding: "11px",
    borderRadius: 10,
    border: "none",
    background: "#b91c1c",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.15s",
  },
  spinner: {
    display: "inline-block",
    width: 14,
    height: 14,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "deleteSpinner 0.7s linear infinite",
  },
};

// Thêm keyframe vào global (chỉ cần 1 lần)
if (
  typeof document !== "undefined" &&
  !document.getElementById("delete-spinner-style")
) {
  const style = document.createElement("style");
  style.id = "delete-spinner-style";
  style.textContent =
    "@keyframes deleteSpinner { to { transform: rotate(360deg); } }";
  document.head.appendChild(style);
}

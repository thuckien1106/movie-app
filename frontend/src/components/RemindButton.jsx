// src/components/RemindButton.jsx
/**
 * RemindButton
 * Hiển thị nút "Nhắc tôi" / "Đã nhắc" cho phim upcoming.
 *
 * Props:
 *   movie        — { id, title, poster, release_date }
 *   variant      — "pill" (mặc định) | "icon"
 *   initialSet?  — boolean, true nếu đã có reminder từ trước
 *   onToggle?    — callback(isSet: boolean)
 */
import { useState, useCallback } from "react";
import { createReminder, deleteReminder } from "../api/reminderApi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./ToastContext";
import { useNavigate } from "react-router-dom";

export default function RemindButton({
  movie,
  variant = "pill",
  initialSet = false,
  onToggle,
}) {
  const { isLoggedIn } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();

  const [isSet, setIsSet] = useState(initialSet);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(
    async (e) => {
      e.stopPropagation();
      if (!isLoggedIn) {
        showToast("Đăng nhập để đặt nhắc nhở nhé!", "info");
        navigate("/login");
        return;
      }
      if (loading) return;
      setLoading(true);

      try {
        if (isSet) {
          await deleteReminder(movie.id);
          setIsSet(false);
          showToast(`Đã huỷ nhắc "${movie.title}"`, "info");
          onToggle?.(false);
        } else {
          await createReminder({
            movie_id: movie.id,
            title: movie.title,
            poster: movie.poster || null,
            release_date: movie.release_date || null,
          });
          setIsSet(true);
          // Tính ngày thông báo sẽ đến
          const msg = movie.release_date
            ? `Sẽ nhắc bạn trước ${movie.release_date} 3 ngày! 🔔`
            : `Đã đặt nhắc "${movie.title}"! 🔔`;
          showToast(msg, "success");
          onToggle?.(true);
        }
      } catch {
        showToast("Có lỗi xảy ra, thử lại nhé.", "error");
      } finally {
        setLoading(false);
      }
    },
    [isSet, loading, isLoggedIn, movie, navigate, showToast, onToggle],
  );

  /* ── ICON variant (nhỏ gọn, dùng trên MovieCard) ── */
  if (variant === "icon") {
    return (
      <button
        onClick={toggle}
        title={isSet ? "Huỷ nhắc nhở" : "Nhắc tôi khi ra rạp"}
        style={{
          ...si.base,
          background: isSet ? "rgba(241,196,15,0.22)" : "rgba(0,0,0,0.55)",
          border: isSet
            ? "1px solid rgba(241,196,15,0.6)"
            : "1px solid rgba(255,255,255,0.2)",
          opacity: loading ? 0.6 : 1,
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>
          {loading ? "…" : isSet ? "🔔" : "🔕"}
        </span>
      </button>
    );
  }

  /* ── PILL variant (dùng trên trang detail / upcoming list) ── */
  return (
    <button
      onClick={toggle}
      disabled={loading}
      style={{
        ...sp.base,
        ...(isSet ? sp.active : sp.idle),
        opacity: loading ? 0.65 : 1,
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.opacity = "0.85";
          if (isSet)
            e.currentTarget.querySelector(".label").textContent = "Huỷ nhắc";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "1";
        if (isSet)
          e.currentTarget.querySelector(".label").textContent = "Đã nhắc 🔔";
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>
        {loading ? "⏳" : isSet ? "🔔" : "🔕"}
      </span>
      <span className="label" style={sp.label}>
        {loading ? "Đang xử lý..." : isSet ? "Đã nhắc 🔔" : "Nhắc tôi"}
      </span>
    </button>
  );
}

/* ── styles ─────────────────────────────── */
const si = {
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.18s",
    flexShrink: 0,
  },
};

const sp = {
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 20px",
    borderRadius: 10,
    border: "1.5px solid",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    transition: "all 0.18s",
    whiteSpace: "nowrap",
  },
  idle: {
    background: "transparent",
    borderColor: "var(--border-mid)",
    color: "var(--text-secondary)",
  },
  active: {
    background: "rgba(241,196,15,0.14)",
    borderColor: "rgba(241,196,15,0.55)",
    color: "var(--yellow, #f1c40f)",
  },
  label: { fontSize: 14, lineHeight: 1 },
};

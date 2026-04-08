import { useState, useCallback, useRef } from "react";
import { createReminder, deleteReminder } from "../api/reminderApi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./ToastContext";
import { useNavigate } from "react-router-dom";

/* ══════════════════════════════════════════════
   REMIND BUTTON
   - Ripple on click
   - SVG bell icons with ring animation when set
   - Smooth state transition
   - pill | icon variants
══════════════════════════════════════════════ */

/* ── Bell SVGs ─────────────────────────────── */
function BellOn() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
      <circle cx="18" cy="8" r="4" fill="#22c55e" stroke="none" />
    </svg>
  );
}
function BellOff() {
  return (
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
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}
function BellRing() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ animation: "bellRing 0.5s ease-in-out" }}
    >
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

/* ── Ripple hook ───────────────────────────── */
function useRipple() {
  const [ripples, setRipples] = useState([]);
  const nextId = useRef(0);
  const trigger = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = nextId.current++;
    setRipples((r) => [...r, { id, x, y }]);
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 600);
  };
  return { ripples, trigger };
}

export default function RemindButton({
  movie,
  variant = "pill",
  initialSet = false,
  onToggle,
}) {
  const { isLoggedIn } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();
  const { ripples, trigger } = useRipple();

  const [isSet, setIsSet] = useState(initialSet);
  const [loading, setLoading] = useState(false);
  const [justSet, setJustSet] = useState(false);

  const toggle = useCallback(
    async (e) => {
      e.stopPropagation();
      trigger(e);
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
          onToggle?.(false);
          showToast(`Đã huỷ nhắc "${movie.title}"`, "info");
        } else {
          await createReminder({
            movie_id: movie.id,
            title: movie.title,
            poster: movie.poster || null,
            release_date: movie.release_date || null,
          });
          setIsSet(true);
          setJustSet(true);
          onToggle?.(true);
          setTimeout(() => setJustSet(false), 1000);
          showToast(
            movie.release_date
              ? `Sẽ nhắc bạn trước ${movie.release_date} 3 ngày! 🔔`
              : `Đã đặt nhắc "${movie.title}"! 🔔`,
            "success",
          );
        }
      } catch {
        showToast("Có lỗi xảy ra, thử lại nhé.", "error");
      } finally {
        setLoading(false);
      }
    },
    [isSet, loading, isLoggedIn, movie, navigate, showToast, onToggle, trigger],
  );

  /* ── ICON variant ── */
  if (variant === "icon") {
    return (
      <button
        onClick={toggle}
        title={isSet ? "Huỷ nhắc nhở" : "Nhắc tôi khi ra rạp"}
        style={{
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: "var(--radius-md, 10px)",
          background: isSet ? "rgba(245,197,24,0.18)" : "rgba(0,0,0,0.55)",
          border: `1px solid ${isSet ? "rgba(245,197,24,0.55)" : "rgba(255,255,255,0.18)"}`,
          cursor: "pointer",
          opacity: loading ? 0.6 : 1,
          color: isSet ? "#f5c518" : "rgba(255,255,255,0.7)",
          transition:
            "background 0.2s ease, border-color 0.2s ease, color 0.2s ease",
          flexShrink: 0,
        }}
      >
        {loading ? <Spinner size={12} /> : isSet ? <BellRing /> : <BellOff />}
        {ripples.map((rp) => (
          <Ripple key={rp.id} x={rp.x} y={rp.y} color="rgba(245,197,24,0.4)" />
        ))}
        <style>{remindCSS}</style>
      </button>
    );
  }

  /* ── PILL variant ── */
  const active = isSet;
  return (
    <button
      onClick={toggle}
      disabled={loading}
      style={{
        position: "relative",
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "11px 20px",
        borderRadius: "var(--radius-md, 10px)",
        border: `1.5px solid ${active ? "rgba(245,197,24,0.5)" : "var(--border-mid)"}`,
        background: active ? "rgba(245,197,24,0.12)" : "transparent",
        color: active ? "#f5c518" : "var(--text-secondary)",
        cursor: loading ? "default" : "pointer",
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: "0.02em",
        fontFamily: "var(--font-body, sans-serif)",
        opacity: loading ? 0.65 : 1,
        transition:
          "background 0.22s ease, border-color 0.22s ease, color 0.22s ease, transform 0.18s ease",
        transform: justSet ? "scale(1.04)" : "scale(1)",
        boxShadow: active ? "0 0 16px rgba(245,197,24,0.2)" : "none",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!loading && active) {
          e.currentTarget.querySelector(".remind-label").textContent =
            "Huỷ nhắc";
        }
      }}
      onMouseLeave={(e) => {
        if (active && e.currentTarget.querySelector(".remind-label"))
          e.currentTarget.querySelector(".remind-label").textContent =
            "Đã nhắc";
      }}
    >
      <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        {loading ? <Spinner size={14} /> : active ? <BellRing /> : <BellOff />}
      </span>
      <span className="remind-label">
        {loading ? "Đang xử lý…" : active ? "Đã nhắc" : "Nhắc tôi"}
      </span>
      {ripples.map((rp) => (
        <Ripple key={rp.id} x={rp.x} y={rp.y} color="rgba(245,197,24,0.35)" />
      ))}
      <style>{remindCSS}</style>
    </button>
  );
}

/* ── Micro-components ───────────────────────── */
function Ripple({ x, y, color = "rgba(255,255,255,0.3)" }) {
  return (
    <span
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        transform: "translate(-50%, -50%) scale(0)",
        animation: "rippleExpand 0.55s ease-out forwards",
        pointerEvents: "none",
      }}
    />
  );
}

function Spinner({ size = 14 }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `2px solid rgba(255,255,255,0.2)`,
        borderTopColor: "currentColor",
        borderRadius: "50%",
        animation: "microSpin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

const remindCSS = `
  @keyframes bellRing {
    0%  { transform: rotate(0deg); }
    20% { transform: rotate(-12deg); }
    40% { transform: rotate(10deg); }
    60% { transform: rotate(-8deg); }
    80% { transform: rotate(5deg); }
    100%{ transform: rotate(0deg); }
  }
  @keyframes rippleExpand {
    to { transform: translate(-50%, -50%) scale(12); opacity: 0; }
  }
  @keyframes microSpin {
    to { transform: rotate(360deg); }
  }
`;

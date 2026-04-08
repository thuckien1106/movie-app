import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

const ToastCtx = createContext(null);
export function useToast() {
  return useContext(ToastCtx);
}

/* ── type config ─────────────────────────────── */
const TYPES = {
  success: {
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    color: "#22c55e",
    bg: "rgba(34,197,94,0.14)",
    border: "rgba(34,197,94,0.35)",
  },
  error: {
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
    color: "#ef4444",
    bg: "rgba(239,68,68,0.14)",
    border: "rgba(239,68,68,0.35)",
  },
  info: {
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.14)",
    border: "rgba(96,165,250,0.35)",
  },
  warning: {
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.14)",
    border: "rgba(245,158,11,0.35)",
  },
};
const DURATION = 3800;

/* ── single Toast ────────────────────────────── */
function Toast({ toast, onRemove }) {
  const [exiting, setExiting] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const cfg = TYPES[toast.type] || TYPES.info;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 320);
  }, [toast.id, onRemove]);

  /* auto-dismiss */
  useEffect(() => {
    const t = setTimeout(dismiss, DURATION);
    return () => clearTimeout(t);
  }, [dismiss]);

  /* drag-to-dismiss */
  const onPointerDown = (e) => {
    setDragging(true);
    startX.current = e.clientX;
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX.current;
    setDragX(dx > 0 ? dx : 0);
  };
  const onPointerUp = () => {
    setDragging(false);
    if (dragX > 90) dismiss();
    else setDragX(0);
  };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={dismiss}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "11px 14px 14px",
        borderRadius: "var(--radius-lg, 14px)",
        background: "var(--bg-overlay, #1a2030)",
        border: `1px solid ${cfg.border}`,
        boxShadow: "0 12px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)",
        color: "var(--text-primary, #f0f4ff)",
        fontSize: 13,
        fontWeight: 500,
        fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
        minWidth: 260,
        maxWidth: 340,
        cursor: "pointer",
        userSelect: "none",
        overflow: "hidden",
        touchAction: "none",
        willChange: "transform, opacity",
        transform: exiting
          ? "translateX(110%) scale(0.9)"
          : `translateX(${dragX}px) scale(${exiting ? 0.9 : 1})`,
        opacity: exiting ? 0 : Math.max(0, 1 - dragX / 140),
        transition: dragging
          ? "none"
          : exiting
            ? "transform 0.32s cubic-bezier(0.4,0,1,1), opacity 0.28s ease"
            : "transform 0.28s cubic-bezier(0.34,1.4,0.64,1), opacity 0.28s ease",
        animation: exiting
          ? "none"
          : "toastSlideIn 0.38s cubic-bezier(0.34,1.4,0.64,1) both",
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: cfg.color,
          borderRadius: "var(--radius-lg, 14px) 0 0 var(--radius-lg, 14px)",
        }}
      />

      {/* Icon */}
      <span
        style={{
          color: cfg.color,
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          marginLeft: 6,
          filter: `drop-shadow(0 0 6px ${cfg.color}88)`,
        }}
      >
        {cfg.icon}
      </span>

      {/* Message */}
      <span style={{ flex: 1, lineHeight: 1.45, fontSize: 13 }}>
        {toast.message}
      </span>

      {/* Dismiss X */}
      <span
        style={{
          fontSize: 14,
          color: "var(--text-faint)",
          lineHeight: 1,
          flexShrink: 0,
          paddingLeft: 4,
          opacity: 0.6,
        }}
      >
        ✕
      </span>

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "rgba(255,255,255,0.06)",
          borderRadius: "0 0 var(--radius-lg, 14px) var(--radius-lg, 14px)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            background: cfg.color,
            transformOrigin: "left center",
            animation: `toastProgressBar ${DURATION}ms linear forwards`,
            opacity: 0.8,
          }}
        />
      </div>
    </div>
  );
}

/* ── Provider ────────────────────────────────── */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p.slice(-4), { id, message, type }]); // max 5
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((p) => p.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={showToast}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "clamp(16px, 3vh, 32px)",
          right: "clamp(12px, 3vw, 28px)",
          zIndex: "var(--z-toast, 3000)",
          display: "flex",
          flexDirection: "column-reverse",
          gap: 8,
          pointerEvents: "none",
          alignItems: "flex-end",
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: "all" }}>
            <Toast toast={t} onRemove={removeToast} />
          </div>
        ))}
      </div>
      <style>{toastCSS}</style>
    </ToastCtx.Provider>
  );
}

const toastCSS = `
  @keyframes toastSlideIn {
    from { opacity: 0; transform: translateX(28px) scale(0.93); }
    to   { opacity: 1; transform: translateX(0)    scale(1);    }
  }
  @keyframes toastProgressBar {
    from { transform: scaleX(1); }
    to   { transform: scaleX(0); }
  }
`;

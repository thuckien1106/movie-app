import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={showToast}>
      {children}

      {/* Toast Container */}
      <div
        style={{
          position: "fixed",
          bottom: "28px",
          right: "28px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onRemove }) {
  const isSuccess = toast.type === "success";
  const isError = toast.type === "error";

  return (
    <div
      onClick={() => onRemove(toast.id)}
      style={{
        pointerEvents: "all",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 16px",
        borderRadius: "10px",
        background: "#1c1c1c",
        border: `1px solid ${isSuccess ? "rgba(46,204,113,0.4)" : isError ? "rgba(229,9,20,0.4)" : "rgba(255,255,255,0.1)"}`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        color: "white",
        fontSize: "14px",
        fontWeight: "500",
        minWidth: "220px",
        maxWidth: "320px",
        animation: "toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
        userSelect: "none",
      }}
    >
      {/* Icon */}
      <span
        style={{
          fontSize: "18px",
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        {isSuccess ? "✅" : isError ? "❌" : "ℹ️"}
      </span>

      {/* Message */}
      <span style={{ flex: 1, lineHeight: "1.4" }}>{toast.message}</span>

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: "3px",
          borderRadius: "0 0 10px 10px",
          background: isSuccess ? "#2ecc71" : isError ? "#e50914" : "#888",
          animation: "toastProgress 3s linear both",
          width: "100%",
        }}
      />
    </div>
  );
}

// Inject keyframes once
const style = document.createElement("style");
style.textContent = `
  @keyframes toastIn {
    from { opacity: 0; transform: translateY(16px) scale(0.92); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }
  @keyframes toastProgress {
    from { width: 100%; }
    to   { width: 0%; }
  }
`;
document.head.appendChild(style);

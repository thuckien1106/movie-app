import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastContext";
import {
  updateProfile,
  changePassword,
  getActivity,
  getWatchlistStats,
} from "../api/movieApi";
import {
  getFollowStatus,
  getFollowers,
  getFollowing,
} from "../api/publicProfileApi";
import Navbar from "../components/Navbar";
import DeleteAccountSection from "../components/DeleteAccountSection";
/* ── helpers ─────────────────────────────────── */
function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}
function pwdScore(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
function validateUsername(name) {
  if (!name) return null;
  if (name.length < 2) return "Tên cần ít nhất 2 ký tự.";
  if (name.length > 50) return "Tên không được quá 50 ký tự.";
  if (/[<>{}\[\]\\]/.test(name)) return "Tên chứa ký tự không hợp lệ.";
  return null;
}

const PWD_LABELS = ["", "Yếu", "Trung bình", "Khá", "Tốt", "Mạnh"];
const PWD_COLORS = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];

/* ── avatar groups ───────────────────────────── */
const AVATAR_GROUPS = [
  { label: "Phim", items: ["🎬", "🎭", "🍿", "🎥", "🎞", "📽", "🎦", "🎪"] },
  {
    label: "Động vật",
    items: ["🦁", "🐺", "🦊", "🐸", "🐙", "🦋", "🦅", "🐯", "🦄", "🐉"],
  },
  { label: "Vũ trụ", items: ["🚀", "🌙", "⭐", "🌌", "☄️", "🛸", "🌠", "🔭"] },
  { label: "Vibe", items: ["🔥", "🌊", "🌸", "🍉", "🎮", "💎", "⚡", "🌈"] },
  {
    label: "Nhân vật",
    items: ["👾", "🤖", "👻", "💀", "🎃", "🧙", "🦸", "🧝"],
  },
];

/* ── activity config ─────────────────────────── */
const ACT_META = {
  added: {
    label: "Thêm watchlist",
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.3)",
  },
  watched: {
    label: "Đã xem",
    color: "#4ade80",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.3)",
  },
  collection_created: {
    label: "Bộ sưu tập",
    color: "#fde047",
    bg: "rgba(234,179,8,0.12)",
    border: "rgba(234,179,8,0.3)",
  },
  default: {
    label: "Hoạt động",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.1)",
    border: "rgba(148,163,184,0.2)",
  },
};

/* ── SVG icons ───────────────────────────────── */
const Icon = {
  user: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  lock: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
  clock: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  edit: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  check: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  eye: (open) =>
    open ? (
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
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    ),
  close: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  arrow: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  film: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="2.18" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="7" x2="7" y2="7" />
      <line x1="2" y1="17" x2="7" y2="17" />
      <line x1="17" y1="17" x2="22" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" />
    </svg>
  ),
  bookmark: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  ),
  percent: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  ),
};

/* ── StyledInput ─────────────────────────────── */
function StyledInput({
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
  error,
  rightSlot,
  extra = {},
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "11px 14px",
          paddingRight: rightSlot ? 44 : 14,
          background: disabled
            ? "rgba(255,255,255,0.02)"
            : focused
              ? "rgba(255,255,255,0.045)"
              : "rgba(255,255,255,0.028)",
          border: `1.5px solid ${error ? "rgba(239,68,68,0.6)" : focused ? "rgba(229,9,20,0.45)" : "rgba(100,120,175,0.14)"}`,
          borderRadius: 10,
          color: disabled
            ? "rgba(160,175,210,0.35)"
            : "var(--text-primary,#f0f4ff)",
          fontSize: 14,
          fontFamily: "var(--font-body,sans-serif)",
          outline: "none",
          cursor: disabled ? "not-allowed" : "text",
          boxShadow: error
            ? "0 0 0 3px rgba(239,68,68,0.1)"
            : focused
              ? "0 0 0 3px rgba(229,9,20,0.09)"
              : "none",
          opacity: disabled ? 0.55 : 1,
          transition: "all 0.18s ease",
          ...extra,
        }}
      />
      {rightSlot && (
        <div
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          {rightSlot}
        </div>
      )}
    </div>
  );
}

/* ── FieldRow ────────────────────────────────── */
function FieldRow({ label, hint, error, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label
        style={{
          display: "block",
          fontSize: 10.5,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: error ? "#ef4444" : "rgba(140,155,195,0.55)",
          marginBottom: 7,
        }}
      >
        {label}
      </label>
      {children}
      {error && (
        <p style={{ margin: "5px 0 0", fontSize: 11, color: "#ef4444" }}>
          {error}
        </p>
      )}
      {!error && hint && (
        <p
          style={{
            margin: "5px 0 0",
            fontSize: 11,
            color: "rgba(130,145,185,0.4)",
            lineHeight: 1.5,
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

/* ── SectionHead ─────────────────────────────── */
function SectionHead({ children, icon }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 24,
        paddingBottom: 14,
        borderBottom: "1px solid rgba(100,120,175,0.1)",
      }}
    >
      {icon && (
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: "rgba(229,9,20,0.1)",
            border: "1px solid rgba(229,9,20,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,100,100,0.7)",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      )}
      <h2
        style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 700,
          color: "var(--text-primary,#f0f4ff)",
          letterSpacing: "-0.01em",
        }}
      >
        {children}
      </h2>
    </div>
  );
}

/* ── Stat Card ───────────────────────────────── */
function StatCard({ value, label, icon, color, sublabel, barPct }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(100,120,175,0.1)",
        borderRadius: 14,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Accent top line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(to right, ${color}, transparent)`,
          opacity: 0.7,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${color}18`,
            border: `1px solid ${color}28`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color,
          }}
        >
          {icon}
        </div>
        {sublabel && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(140,155,195,0.5)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {sublabel}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color,
          lineHeight: 1,
          fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
          letterSpacing: "0.02em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "rgba(160,175,210,0.55)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      {barPct !== undefined && (
        <div
          style={{
            height: 3,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 99,
            marginTop: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              background: color,
              borderRadius: 99,
              width: animated ? `${barPct}%` : "0%",
              transition: "width 1.2s cubic-bezier(0.4,0,0.2,1) 0.3s",
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ── Avatar Picker Modal ─────────────────────── */
function AvatarPickerModal({ current, onSelect, onClose }) {
  const [activeGroup, setActiveGroup] = useState(0);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "rgba(12,16,26,0.98)",
          border: "1px solid rgba(100,120,175,0.18)",
          borderRadius: 20,
          padding: "24px 24px 20px",
          width: "100%",
          maxWidth: 460,
          boxShadow:
            "0 40px 100px rgba(0,0,0,0.85), 0 0 0 0.5px rgba(229,9,20,0.15)",
          animation: "modalIn 0.28s cubic-bezier(0.34,1.2,0.64,1) both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 3,
                height: 18,
                borderRadius: 99,
                background: "#e50914",
                flexShrink: 0,
              }}
            />
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary,#f0f4ff)",
              }}
            >
              Chọn Avatar
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(100,120,175,0.15)",
              color: "rgba(160,175,210,0.6)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {Icon.close}
          </button>
        </div>

        {/* Group tabs */}
        <div
          style={{
            display: "flex",
            gap: 5,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {AVATAR_GROUPS.map((g, i) => (
            <button
              key={i}
              onClick={() => setActiveGroup(i)}
              style={{
                padding: "5px 12px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "var(--font-body,sans-serif)",
                letterSpacing: "0.04em",
                borderRadius: 99,
                background:
                  activeGroup === i ? "rgba(229,9,20,0.15)" : "transparent",
                border: `1px solid ${activeGroup === i ? "rgba(229,9,20,0.35)" : "rgba(100,120,175,0.15)"}`,
                color:
                  activeGroup === i
                    ? "rgba(255,110,110,0.9)"
                    : "rgba(140,155,195,0.6)",
                transition: "all 0.15s ease",
              }}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5,1fr)",
            gap: 8,
            maxHeight: 240,
            overflowY: "auto",
            scrollbarWidth: "none",
          }}
        >
          {AVATAR_GROUPS[activeGroup].items.map((emoji) => {
            const isActive = emoji === current;
            return (
              <button
                key={emoji}
                onClick={() => {
                  onSelect(emoji);
                  onClose();
                }}
                style={{
                  position: "relative",
                  aspectRatio: "1/1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  cursor: "pointer",
                  padding: 0,
                  background: isActive
                    ? "rgba(229,9,20,0.15)"
                    : "rgba(255,255,255,0.03)",
                  border: `1.5px solid ${isActive ? "rgba(229,9,20,0.45)" : "rgba(100,120,175,0.1)"}`,
                  transition: "all 0.15s ease",
                  boxShadow: isActive ? "0 0 12px rgba(229,9,20,0.2)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.borderColor =
                      "rgba(100,120,175,0.25)";
                    e.currentTarget.style.transform = "scale(1.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderColor = "rgba(100,120,175,0.1)";
                    e.currentTarget.style.transform = "scale(1)";
                  }
                }}
              >
                <span
                  style={{ fontSize: 30, lineHeight: 1, userSelect: "none" }}
                >
                  {emoji}
                </span>
                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: "#e50914",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                    }}
                  >
                    {Icon.check}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <p
          style={{
            margin: "12px 0 0",
            fontSize: 11,
            color: "rgba(120,135,175,0.4)",
            textAlign: "center",
          }}
        >
          Nhấn emoji để chọn làm avatar của bạn
        </p>
      </div>
    </div>
  );
}

/* ── UserList Modal ──────────────────────────── */
function UserListModal({ username, mode, onClose }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchFn = mode === "followers" ? getFollowers : getFollowing;

  useEffect(() => {
    setLoading(true);
    fetchFn(username, page)
      .then((r) => {
        setUsers((prev) =>
          page === 1 ? r.data.users : [...prev, ...r.data.users],
        );
        setTotal(r.data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username, mode, page]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 360,
          maxHeight: 520,
          background: "rgba(10,14,22,0.99)",
          border: "1px solid rgba(100,120,175,0.2)",
          borderRadius: 18,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
          animation: "modalIn 0.2s cubic-bezier(0.34,1.3,0.64,1) both",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(100,120,175,0.1)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary,#f0f4ff)",
            }}
          >
            {mode === "followers"
              ? `${total} Người theo dõi`
              : `${total} Đang theo dõi`}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "rgba(130,145,185,0.5)",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div
          style={{
            overflowY: "auto",
            flex: 1,
            padding: "8px 0",
            scrollbarWidth: "none",
          }}
        >
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                onClose();
                navigate(`/u/${u.username}`);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 20px",
                background: "none",
                border: "none",
                cursor: "pointer",
                transition: "background 0.12s",
                fontFamily: "var(--font-body,sans-serif)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.04)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(229,9,20,0.15)",
                  border: "1px solid rgba(229,9,20,0.2)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {u.avatar_url ? (
                  <img
                    src={u.avatar_url}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 18 }}>
                    {u.avatar || (u.username?.[0]?.toUpperCase() ?? "?")}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "var(--text-primary,#f0f4ff)",
                }}
              >
                @{u.username}
              </span>
            </button>
          ))}

          {!loading && users.length < total && (
            <button
              onClick={() => setPage((p) => p + 1)}
              style={{
                width: "100%",
                padding: "10px 0",
                background: "none",
                border: "none",
                color: "rgba(130,145,185,0.5)",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "var(--font-body,sans-serif)",
              }}
            >
              Xem thêm
            </button>
          )}

          {loading && (
            <div
              style={{ display: "flex", justifyContent: "center", padding: 24 }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  border: "2px solid rgba(255,255,255,0.1)",
                  borderTop: "2px solid var(--red,#e50914)",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }}
              />
            </div>
          )}

          {!loading && users.length === 0 && (
            <p
              style={{
                textAlign: "center",
                fontSize: 13,
                color: "rgba(130,145,185,0.4)",
                padding: "28px 0",
                margin: 0,
              }}
            >
              {mode === "followers"
                ? "Chưa có người theo dõi"
                : "Chưa theo dõi ai"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   MAIN PROFILE PAGE
════════════════════════════════════════════════ */
export default function Profile() {
  const { user, isLoggedIn, saveSession, logout } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();

  const [tab, setTab] = useState("profile");
  const [activity, setActivity] = useState([]);
  const [stats, setStats] = useState(null);
  const [followStats, setFollowStats] = useState(null);
  const [listMode, setListMode] = useState(null); // "followers" | "following" | null // { followers, following_count }
  const [loadingAct, setLoadAct] = useState(false);
  const [entered, setEntered] = useState(false);

  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatar, setAvatar] = useState(user?.avatar || "🎬");
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const savingRef = useRef(false);

  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confPwd, setConfPwd] = useState("");
  const [showPwds, setShowPwds] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const savingPwdRef = useRef(false);

  useEffect(() => {
    if (!isLoggedIn) navigate("/login");
  }, [isLoggedIn]);
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (tab === "activity" && activity.length === 0) {
      setLoadAct(true);
      Promise.all([getActivity(40), getWatchlistStats()])
        .then(([a, st]) => {
          setActivity(a.data?.items || []);
          setStats(st.data);
        })
        .catch(() => showToast("Không tải được lịch sử.", "error"))
        .finally(() => setLoadAct(false));
    }
    if (tab === "profile" && !stats) {
      getWatchlistStats()
        .then((r) => setStats(r.data))
        .catch(() => {});
    }
    // Load follow stats khi có username
    if (tab === "profile" && !followStats && user?.username) {
      getFollowStatus(user.username)
        .then((r) => setFollowStats(r.data))
        .catch(() => {});
    }
  }, [tab]);

  if (!isLoggedIn || !user) return null;

  const displayName =
    username.trim() || user.username || user.email?.split("@")[0] || "User";
  const strength = pwdScore(newPwd);
  const completePct =
    stats?.total > 0 ? Math.round((stats.watched / stats.total) * 100) : 0;

  const handleSaveProfile = async () => {
    if (savingRef.current) return;
    const trimmedName = username.trim();
    const err = trimmedName ? validateUsername(trimmedName) : null;
    if (err) {
      setUsernameError(err);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const res = await updateProfile({
        username: trimmedName || null,
        bio: bio.trim() || null,
        avatar,
      });
      saveSession(localStorage.getItem("token"), { ...user, ...res.data });
      showToast("Đã lưu hồ sơ!", "success");
    } catch (err) {
      const detail = err.response?.data?.detail;
      showToast(
        Array.isArray(detail)
          ? detail.map((d) => d.message || d.msg).join(", ")
          : detail || "Lưu thất bại.",
        "error",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleChangePwd = async () => {
    if (newPwd !== confPwd) {
      showToast("Mật khẩu xác nhận không khớp.", "error");
      return;
    }
    if (newPwd.length < 6) {
      showToast("Mật khẩu mới cần ít nhất 6 ký tự.", "error");
      return;
    }
    if (savingPwdRef.current) return;
    savingPwdRef.current = true;
    setSavingPwd(true);
    try {
      await changePassword({ current_password: curPwd, new_password: newPwd });
      showToast("Đổi mật khẩu thành công! Đang đăng xuất…", "success");
      setCurPwd("");
      setNewPwd("");
      setConfPwd("");
      setTimeout(() => {
        logout();
        navigate("/login");
      }, 1500);
    } catch (err) {
      showToast(
        err.response?.data?.detail || "Đổi mật khẩu thất bại.",
        "error",
      );
    } finally {
      savingPwdRef.current = false;
      setSavingPwd(false);
    }
  };

  const TABS = [
    { key: "profile", label: "Hồ sơ", icon: Icon.user },
    { key: "password", label: "Mật khẩu", icon: Icon.lock },
    { key: "activity", label: "Lịch sử", icon: Icon.clock },
    { key: "account", label: "Tài khoản", icon: Icon.lock },
  ];

  return (
    <div style={s.page}>
      <Navbar />

      {/* ══ HERO ══ */}
      <div style={s.hero}>
        {/* Background layers */}
        <div style={s.heroBg} />
        <div style={s.heroGlowRed} />
        <div style={s.heroGlowBlue} />
        <div style={s.heroGrid} />

        <div
          style={{
            ...s.heroInner,
            opacity: entered ? 1 : 0,
            transform: entered ? "translateY(0)" : "translateY(18px)",
            transition:
              "opacity 0.5s ease, transform 0.55s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            {/* Outer ring */}
            <div
              style={{
                width: 104,
                height: 104,
                borderRadius: "50%",
                padding: 3,
                background:
                  "linear-gradient(135deg, rgba(229,9,20,0.7), rgba(100,120,255,0.3))",
                boxShadow:
                  "0 8px 32px rgba(229,9,20,0.2), 0 0 0 1px rgba(229,9,20,0.15)",
              }}
            >
              <button
                style={s.avatarBtn}
                onClick={() => setShowPicker(true)}
                title="Đổi avatar"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <span
                  style={{ fontSize: 48, lineHeight: 1, userSelect: "none" }}
                >
                  {avatar}
                </span>
              </button>
            </div>
            {/* Edit badge */}
            <button
              onClick={() => setShowPicker(true)}
              style={s.editBadge}
              title="Đổi avatar"
            >
              {Icon.edit}
            </button>
          </div>

          {/* Info */}
          <div style={s.heroInfo}>
            <div style={s.memberBadge}>
              <span style={{ opacity: 0.7 }}>✦</span>
              <span>Thành viên Filmverse</span>
            </div>
            <h1 style={s.heroName}>{displayName}</h1>
            <p style={s.heroEmail}>{user.email}</p>
            {(bio.trim() || user.bio) && (
              <p style={s.heroBio}>"{bio.trim() || user.bio}"</p>
            )}

            {/* Follow stats */}
            {followStats && (
              <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
                <button
                  onClick={() => setListMode("followers")}
                  style={s.followStatBtn}
                >
                  <span style={s.followStatNum}>{followStats.followers}</span>
                  <span style={s.followStatLabel}>Người theo dõi</span>
                </button>
                <button
                  onClick={() => setListMode("following")}
                  style={s.followStatBtn}
                >
                  <span style={s.followStatNum}>
                    {followStats.following_count}
                  </span>
                  <span style={s.followStatLabel}>Đang theo dõi</span>
                </button>
              </div>
            )}
          </div>

          {/* Stat cards row */}
          {stats && (
            <div style={s.heroStatRow}>
              {[
                {
                  v: stats.total,
                  label: "Đã lưu",
                  color: "#60a5fa",
                  icon: Icon.bookmark,
                },
                {
                  v: stats.watched,
                  label: "Đã xem",
                  color: "#4ade80",
                  icon: Icon.film,
                },
                {
                  v: completePct + "%",
                  label: "Hoàn thành",
                  color: "#f5c518",
                  icon: Icon.percent,
                },
              ].map(({ v, label, color, icon }) => (
                <div key={label} style={s.heroStatCard}>
                  <div style={{ color, marginBottom: 4 }}>{icon}</div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color,
                      lineHeight: 1,
                      fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {v}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "rgba(160,175,210,0.5)",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      marginTop: 2,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ TAB BAR ══ */}
      <div style={s.tabBar}>
        <div style={s.tabBarInner}>
          {TABS.map(({ key, label, icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  ...s.tabBtn,
                  color: active
                    ? "var(--text-primary,#f0f4ff)"
                    : "rgba(140,155,195,0.55)",
                  background: active ? "rgba(229,9,20,0.1)" : "transparent",
                  border: active
                    ? "1px solid rgba(229,9,20,0.22)"
                    : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!active)
                    e.currentTarget.style.color = "rgba(200,215,255,0.7)";
                }}
                onMouseLeave={(e) => {
                  if (!active)
                    e.currentTarget.style.color = "rgba(140,155,195,0.55)";
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {icon}
                  <span>{label}</span>
                </span>
                {active && <div style={s.tabUnderline} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div style={s.body}>
        {/* ─── PROFILE TAB ─── */}
        {tab === "profile" && (
          <div style={s.twoCol}>
            {/* Form column */}
            <div style={s.formCard}>
              <SectionHead icon={Icon.user}>Thông tin cá nhân</SectionHead>

              <FieldRow
                label="Tên hiển thị"
                error={usernameError}
                hint={
                  !usernameError
                    ? "Cho phép tiếng Việt, khoảng trắng, số, dấu _ . -"
                    : undefined
                }
              >
                <StyledInput
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameError(
                      e.target.value.trim()
                        ? validateUsername(e.target.value.trim()) || ""
                        : "",
                    );
                  }}
                  placeholder="VD: Nguyễn Văn A"
                  error={usernameError}
                  rightSlot={
                    username.trim() && !usernameError ? (
                      <span style={{ color: "#4ade80", display: "flex" }}>
                        {Icon.check}
                      </span>
                    ) : null
                  }
                />
              </FieldRow>

              <FieldRow label="Email" hint="Email không thể thay đổi.">
                <StyledInput value={user.email} disabled />
              </FieldRow>

              <FieldRow label="Giới thiệu" hint={`${bio.length}/200 ký tự`}>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Sở thích phim ảnh, thể loại yêu thích…"
                  rows={3}
                  maxLength={200}
                  style={s.textarea}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(229,9,20,0.45)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(229,9,20,0.09)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(100,120,175,0.14)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </FieldRow>

              <FieldRow label="Avatar">
                <button
                  onClick={() => setShowPicker(true)}
                  style={s.avatarPickerBtn}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(200,215,255,0.22)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(100,120,175,0.12)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  }}
                >
                  <span style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>
                    {avatar}
                  </span>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary,#f0f4ff)",
                      }}
                    >
                      Avatar hiện tại
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: 11,
                        color: "rgba(130,145,185,0.45)",
                      }}
                    >
                      Nhấn để thay đổi
                    </p>
                  </div>
                  <span style={{ color: "rgba(140,155,195,0.4)" }}>
                    {Icon.arrow}
                  </span>
                </button>
              </FieldRow>

              <button
                onClick={handleSaveProfile}
                disabled={saving || !!usernameError}
                style={{
                  ...s.btnPrimary,
                  opacity: saving || !!usernameError ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!saving && !usernameError) {
                    e.currentTarget.style.background =
                      "var(--red-hover,#c9070f)";
                    e.currentTarget.style.boxShadow =
                      "0 8px 28px rgba(229,9,20,0.5)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--red,#e50914)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 18px rgba(229,9,20,0.3)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {saving ? (
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span style={s.btnSpinner} />
                    Đang lưu…
                  </span>
                ) : (
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    Lưu thay đổi {Icon.arrow}
                  </span>
                )}
              </button>
            </div>

            {/* Stats column */}
            {stats && (
              <div>
                <SectionHead icon={Icon.film}>Thống kê của bạn</SectionHead>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    marginBottom: 24,
                  }}
                >
                  <StatCard
                    value={stats.total}
                    label="Phim đã lưu"
                    icon={Icon.bookmark}
                    color="#60a5fa"
                    barPct={Math.min((stats.total / 100) * 100, 100)}
                  />
                  <StatCard
                    value={stats.watched}
                    label="Đã xem"
                    icon={Icon.film}
                    color="#4ade80"
                    barPct={completePct}
                    sublabel={`${completePct}%`}
                  />
                  {stats.collections != null && (
                    <StatCard
                      value={stats.collections}
                      label="Bộ sưu tập"
                      icon={Icon.percent}
                      color="#f5c518"
                      barPct={Math.min((stats.collections / 20) * 100, 100)}
                    />
                  )}
                </div>

                {stats.top_genres?.length > 0 && (
                  <div style={s.genreCard}>
                    <p style={s.genreCardTitle}>Thể loại yêu thích</p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      {stats.top_genres.slice(0, 4).map((g, i) => {
                        const pct = Math.round(
                          (g.count / (stats.top_genres[0]?.count || 1)) * 100,
                        );
                        const colors = [
                          "#e50914",
                          "#60a5fa",
                          "#4ade80",
                          "#f5c518",
                        ];
                        return (
                          <div key={g.genre_id || i}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 6,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: "rgba(200,215,255,0.75)",
                                }}
                              >
                                {g.genre_name}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "rgba(130,145,185,0.5)",
                                }}
                              >
                                {g.count} phim
                              </span>
                            </div>
                            <div
                              style={{
                                height: 4,
                                background: "rgba(255,255,255,0.06)",
                                borderRadius: 99,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${pct}%`,
                                  background: colors[i],
                                  borderRadius: 99,
                                  transition:
                                    "width 1.2s cubic-bezier(0.4,0,0.2,1)",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── PASSWORD TAB ─── */}
        {tab === "password" && (
          <div style={{ maxWidth: 480 }}>
            <div style={s.formCard}>
              <SectionHead icon={Icon.lock}>Đổi mật khẩu</SectionHead>

              {user.is_google ? (
                <div style={s.infoNote}>
                  <div style={{ fontSize: 22, flexShrink: 0 }}>🔑</div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "rgba(160,175,210,0.7)",
                      lineHeight: 1.65,
                    }}
                  >
                    Tài khoản của bạn đăng nhập qua Google. Vui lòng đổi mật
                    khẩu trực tiếp trong tài khoản Google.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ ...s.infoNote, marginBottom: 24 }}>
                    <div style={{ fontSize: 18, flexShrink: 0 }}>🔒</div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12.5,
                        color: "rgba(160,175,210,0.6)",
                        lineHeight: 1.65,
                      }}
                    >
                      Sau khi đổi thành công, bạn sẽ được đăng xuất tự động để
                      bảo mật tài khoản.
                    </p>
                  </div>

                  {[
                    {
                      label: "Mật khẩu hiện tại",
                      val: curPwd,
                      set: setCurPwd,
                      ph: "Nhập mật khẩu hiện tại",
                    },
                    {
                      label: "Mật khẩu mới",
                      val: newPwd,
                      set: setNewPwd,
                      ph: "Ít nhất 6 ký tự",
                      showStrength: true,
                    },
                    {
                      label: "Xác nhận mật khẩu",
                      val: confPwd,
                      set: setConfPwd,
                      ph: "Nhập lại mật khẩu mới",
                      showMatch: true,
                    },
                  ].map(({ label, val, set, ph, showStrength, showMatch }) => (
                    <FieldRow key={label} label={label}>
                      <StyledInput
                        type={showPwds ? "text" : "password"}
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        placeholder={ph}
                        rightSlot={
                          <button
                            type="button"
                            onClick={() => setShowPwds((p) => !p)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "rgba(140,155,195,0.45)",
                              display: "flex",
                              padding: 3,
                            }}
                          >
                            {Icon.eye(showPwds)}
                          </button>
                        }
                      />
                      {showStrength && val && (
                        <div style={{ marginTop: 8 }}>
                          <div
                            style={{
                              display: "flex",
                              gap: 3,
                              height: 3,
                              marginBottom: 4,
                            }}
                          >
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                style={{
                                  flex: 1,
                                  height: 3,
                                  borderRadius: 99,
                                  background:
                                    i <= strength
                                      ? PWD_COLORS[strength]
                                      : "rgba(100,120,175,0.1)",
                                  transition: "background 0.3s",
                                }}
                              />
                            ))}
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              color: PWD_COLORS[strength],
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                            }}
                          >
                            {PWD_LABELS[strength]}
                          </span>
                        </div>
                      )}
                      {showMatch && confPwd && (
                        <span
                          style={{
                            fontSize: 11,
                            color: newPwd === confPwd ? "#4ade80" : "#ef4444",
                            marginTop: 5,
                            display: "block",
                            fontWeight: 600,
                          }}
                        >
                          {newPwd === confPwd
                            ? "✓ Mật khẩu khớp"
                            : "✗ Mật khẩu không khớp"}
                        </span>
                      )}
                    </FieldRow>
                  ))}

                  <button
                    onClick={handleChangePwd}
                    disabled={
                      savingPwd || !curPwd || !newPwd || newPwd !== confPwd
                    }
                    style={{
                      ...s.btnPrimary,
                      opacity:
                        savingPwd || !curPwd || !newPwd || newPwd !== confPwd
                          ? 0.45
                          : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (
                        !savingPwd &&
                        curPwd &&
                        newPwd &&
                        newPwd === confPwd
                      ) {
                        e.currentTarget.style.background =
                          "var(--red-hover,#c9070f)";
                        e.currentTarget.style.boxShadow =
                          "0 8px 28px rgba(229,9,20,0.5)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--red,#e50914)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 18px rgba(229,9,20,0.3)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {savingPwd ? (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span style={s.btnSpinner} />
                        Đang xử lý…
                      </span>
                    ) : (
                      "Đổi mật khẩu"
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ─── ACTIVITY TAB ─── */}
        {tab === "activity" && (
          <div style={{ maxWidth: 660 }}>
            <SectionHead icon={Icon.clock}>Lịch sử hoạt động</SectionHead>

            {loadingAct ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "56px 0",
                }}
              >
                <div style={s.spinner} />
                <span style={{ color: "rgba(130,145,185,0.5)", fontSize: 14 }}>
                  Đang tải…
                </span>
              </div>
            ) : activity.length === 0 ? (
              <div style={{ textAlign: "center", padding: "72px 0" }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>📭</div>
                <p
                  style={{
                    color: "rgba(140,155,195,0.5)",
                    fontSize: 15,
                    marginBottom: 24,
                  }}
                >
                  Chưa có hoạt động nào.
                </p>
                <Link
                  to="/"
                  style={{
                    ...s.btnPrimary,
                    display: "inline-flex",
                    textDecoration: "none",
                  }}
                >
                  Khám phá phim ngay
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {activity.map((item, i) => {
                  const meta = ACT_META[item.type] || ACT_META.default;
                  const isLast = i === activity.length - 1;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 14,
                        alignItems: "flex-start",
                      }}
                    >
                      {/* Timeline connector */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          flexShrink: 0,
                          width: 34,
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: meta.bg,
                            border: `1.5px solid ${meta.border}`,
                            fontSize: 11,
                            color: meta.color,
                            fontWeight: 800,
                          }}
                        >
                          {item.type === "added"
                            ? "+"
                            : item.type === "watched"
                              ? "✓"
                              : "▣"}
                        </div>
                        {!isLast && (
                          <div
                            style={{
                              width: 1.5,
                              flex: 1,
                              minHeight: 12,
                              background: "rgba(100,120,175,0.1)",
                              margin: "3px 0",
                            }}
                          />
                        )}
                      </div>

                      {/* Card */}
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          background: "rgba(255,255,255,0.025)",
                          border: "1px solid rgba(100,120,175,0.1)",
                          borderRadius: 12,
                          padding: "11px 14px",
                          marginBottom: isLast ? 0 : 8,
                          transition: "border-color 0.15s, background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "rgba(255,255,255,0.04)";
                          e.currentTarget.style.borderColor =
                            "rgba(100,120,175,0.2)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            "rgba(255,255,255,0.025)";
                          e.currentTarget.style.borderColor =
                            "rgba(100,120,175,0.1)";
                        }}
                      >
                        {item.poster && (
                          <Link
                            to={`/movie/${item.movie_id}`}
                            style={{ flexShrink: 0, display: "block" }}
                          >
                            <img
                              src={item.poster}
                              alt={item.title || ""}
                              style={{
                                width: 36,
                                height: 52,
                                objectFit: "cover",
                                borderRadius: 6,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
                                display: "block",
                              }}
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </Link>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: 9.5,
                              fontWeight: 800,
                              letterSpacing: "0.09em",
                              textTransform: "uppercase",
                              color: meta.color,
                            }}
                          >
                            {meta.label}
                          </span>
                          {item.movie_id ? (
                            <Link
                              to={`/movie/${item.movie_id}`}
                              style={{
                                display: "block",
                                color: "var(--text-primary,#f0f4ff)",
                                textDecoration: "none",
                                fontWeight: 600,
                                fontSize: 13.5,
                                marginTop: 2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.title}
                            </Link>
                          ) : (
                            <p
                              style={{
                                color: "var(--text-primary,#f0f4ff)",
                                fontWeight: 600,
                                fontSize: 13.5,
                                margin: "2px 0 0",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.title}
                            </p>
                          )}
                          <span
                            style={{
                              fontSize: 11,
                              color: "rgba(130,145,185,0.45)",
                              marginTop: 2,
                              display: "block",
                            }}
                          >
                            {timeAgo(item.at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {tab === "account" && (
          <div style={{ maxWidth: 480 }}>
            <div style={s.formCard}>
              <SectionHead icon={Icon.lock}>Quản lý tài khoản</SectionHead>
              <DeleteAccountSection />
            </div>
          </div>
        )}
      </div>

      {showPicker && (
        <AvatarPickerModal
          current={avatar}
          onSelect={setAvatar}
          onClose={() => setShowPicker(false)}
        />
      )}

      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @media (max-width: 900px) { .profile-two-col { grid-template-columns: 1fr !important; } }
        @media (max-width: 640px) { .profile-hero-inner { flex-wrap: wrap !important; } .profile-stat-row { display: none !important; } }
      `}</style>
    </div>
  );
}

/* ── Styles ───────────────────────────────────── */
const s = {
  page: {
    background: "var(--bg-page,#080b0f)",
    minHeight: "100vh",
    color: "var(--text-primary,#f0f4ff)",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
    paddingTop: 60,
  },

  /* Hero */
  hero: {
    position: "relative",
    overflow: "hidden",
    padding: "clamp(28px,4.5vh,52px) clamp(24px,6vw,72px)",
    borderBottom: "1px solid rgba(100,120,175,0.1)",
    minHeight: 200,
  },
  heroBg: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(135deg, rgba(229,9,20,0.07) 0%, rgba(8,11,15,0.95) 40%, rgba(59,130,246,0.04) 100%)",
  },
  heroGlowRed: {
    position: "absolute",
    top: -100,
    left: -80,
    width: 500,
    height: 500,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(229,9,20,0.09) 0%, transparent 65%)",
    pointerEvents: "none",
  },
  heroGlowBlue: {
    position: "absolute",
    bottom: -120,
    right: -60,
    width: 400,
    height: 400,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 65%)",
    pointerEvents: "none",
  },
  heroGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.011) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.011) 1px, transparent 1px)",
    backgroundSize: "64px 64px",
    pointerEvents: "none",
  },
  heroInner: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    gap: "clamp(18px,3vw,36px)",
    flexWrap: "wrap",
  },
  avatarBtn: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background: "rgba(14,18,28,0.95)",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    transition: "transform 0.2s ease",
  },
  editBadge: {
    position: "absolute",
    bottom: 3,
    right: 3,
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "var(--red,#e50914)",
    border: "2.5px solid var(--bg-page,#080b0f)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#fff",
    padding: 0,
    boxShadow: "0 2px 8px rgba(229,9,20,0.4)",
  },
  heroInfo: { flex: 1, minWidth: 180 },
  followStatBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 1,
    textAlign: "left",
  },
  followStatNum: {
    fontSize: 18,
    fontWeight: 800,
    color: "var(--text-primary,#f0f4ff)",
    lineHeight: 1.1,
    fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
    letterSpacing: "0.02em",
  },
  followStatLabel: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "rgba(130,145,185,0.45)",
  },
  memberBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 9.5,
    fontWeight: 800,
    letterSpacing: "0.14em",
    color: "rgba(245,197,24,0.8)",
    background: "rgba(245,197,24,0.08)",
    border: "1px solid rgba(245,197,24,0.18)",
    borderRadius: 99,
    padding: "3px 10px",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  heroName: {
    fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
    fontSize: "clamp(28px,4vw,48px)",
    fontWeight: 400,
    letterSpacing: "0.03em",
    margin: "0 0 4px",
    lineHeight: 1.0,
  },
  heroEmail: {
    margin: "0 0 5px",
    fontSize: 12.5,
    color: "rgba(140,155,195,0.5)",
  },
  heroBio: {
    margin: 0,
    fontSize: 13,
    color: "rgba(180,195,230,0.6)",
    fontStyle: "italic",
    lineHeight: 1.5,
  },
  heroStatRow: {
    display: "flex",
    gap: 10,
    marginLeft: "auto",
    flexWrap: "wrap",
  },
  heroStatCard: {
    background: "rgba(255,255,255,0.035)",
    border: "1px solid rgba(100,120,175,0.12)",
    borderRadius: 14,
    padding: "14px 18px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: 72,
    backdropFilter: "blur(8px)",
  },

  /* Tab bar */
  tabBar: {
    background: "rgba(8,11,15,0.95)",
    borderBottom: "1px solid rgba(100,120,175,0.1)",
    position: "sticky",
    top: 60,
    zIndex: 50,
    backdropFilter: "blur(16px)",
  },
  tabBarInner: {
    display: "flex",
    gap: 4,
    padding: "8px clamp(24px,6vw,72px)",
    alignItems: "center",
  },
  tabBtn: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    padding: "8px 16px",
    cursor: "pointer",
    border: "none",
    borderRadius: 10,
    fontFamily: "var(--font-body,sans-serif)",
    transition: "all 0.18s ease",
  },
  tabUnderline: {
    position: "absolute",
    bottom: -1,
    left: "12%",
    right: "12%",
    height: 2,
    background: "var(--red,#e50914)",
    borderRadius: "2px 2px 0 0",
  },

  /* Body */
  body: {
    maxWidth: 1080,
    margin: "0 auto",
    padding: "36px clamp(24px,6vw,72px) 80px",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) minmax(0,360px)",
    gap: 40,
    alignItems: "start",
  },

  /* Form card */
  formCard: {
    background: "rgba(255,255,255,0.018)",
    border: "1px solid rgba(100,120,175,0.1)",
    borderRadius: 18,
    padding: "28px 28px 24px",
  },

  textarea: {
    width: "100%",
    padding: "11px 14px",
    background: "rgba(255,255,255,0.028)",
    border: "1.5px solid rgba(100,120,175,0.14)",
    borderRadius: 10,
    color: "var(--text-primary,#f0f4ff)",
    fontSize: 14,
    fontFamily: "var(--font-body,sans-serif)",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
    transition: "border-color 0.18s, box-shadow 0.18s",
  },

  avatarPickerBtn: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    width: "100%",
    padding: "13px 16px",
    background: "rgba(255,255,255,0.02)",
    border: "1.5px solid rgba(100,120,175,0.12)",
    borderRadius: 10,
    cursor: "pointer",
    fontFamily: "var(--font-body,sans-serif)",
    transition: "all 0.18s ease",
  },

  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--red,#e50914)",
    border: "none",
    color: "#fff",
    padding: "12px 28px",
    borderRadius: 10,
    fontSize: 13.5,
    fontWeight: 700,
    letterSpacing: "0.04em",
    cursor: "pointer",
    fontFamily: "var(--font-body,sans-serif)",
    boxShadow: "0 4px 18px rgba(229,9,20,0.3)",
    transition: "all 0.2s cubic-bezier(0.34,1.2,0.64,1)",
    marginTop: 4,
  },
  btnSpinner: {
    display: "inline-block",
    width: 14,
    height: 14,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },

  /* Stats */
  genreCard: {
    background: "rgba(255,255,255,0.018)",
    border: "1px solid rgba(100,120,175,0.1)",
    borderRadius: 14,
    padding: "18px 20px",
  },
  genreCardTitle: {
    margin: "0 0 16px",
    fontSize: 10.5,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "rgba(140,155,195,0.5)",
  },

  /* Info note */
  infoNote: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    background: "rgba(59,130,246,0.07)",
    border: "1px solid rgba(59,130,246,0.18)",
    borderRadius: 10,
    padding: "14px 16px",
  },

  /* Loading / spinner */
  spinner: {
    width: 22,
    height: 22,
    border: "2px solid rgba(255,255,255,0.06)",
    borderTop: "2px solid var(--red,#e50914)",
    borderRadius: "50%",
    animation: "spin 0.75s linear infinite",
    flexShrink: 0,
  },
};

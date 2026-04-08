import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotifStats,
  getNotifs,
  markAllRead,
  markOneRead,
  deleteNotif,
} from "../api/reminderApi";
import { useAuth } from "../context/AuthContext";

const POLL_MS = 60_000;

/* ── Time formatter ────────────────────────── */
function timeAgo(iso) {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

/* ── Bell SVG ──────────────────────────────── */
function BellSVG({ hasUnread }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        animation: hasUnread ? "bellWiggle 3s ease-in-out infinite 1s" : "none",
      }}
    >
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

/* ── Empty state SVG ───────────────────────── */
function EmptyBell() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--text-faint)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
      <line
        x1="1"
        y1="1"
        x2="23"
        y2="23"
        stroke="var(--text-faint)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/* ── Notification item ─────────────────────── */
function NotifItem({ notif, onRead, onDelete, onNavigate }) {
  const [hov, setHov] = useState(false);
  const [exiting, setExiting] = useState(false);

  const handleDelete = async (e) => {
    e.stopPropagation();
    setExiting(true);
    setTimeout(() => onDelete(notif.id), 220);
  };

  return (
    <div
      onClick={() => onNavigate(notif)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 14px",
        cursor: notif.movie_id ? "pointer" : "default",
        borderBottom: "1px solid var(--border)",
        background: hov
          ? "var(--bg-card2)"
          : notif.is_read
            ? "transparent"
            : "rgba(229,9,20,0.05)",
        transform: exiting ? "translateX(100%)" : "translateX(0)",
        opacity: exiting ? 0 : 1,
        transition:
          "background 0.15s ease, transform 0.22s ease, opacity 0.22s ease",
        overflow: "hidden",
      }}
    >
      {/* Poster */}
      {notif.poster ? (
        <img
          src={notif.poster}
          alt=""
          loading="lazy"
          style={{
            width: 40,
            height: 56,
            objectFit: "cover",
            borderRadius: "var(--radius-sm, 6px)",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          }}
        />
      ) : (
        <div
          style={{
            width: 40,
            height: 56,
            borderRadius: "var(--radius-sm, 6px)",
            background: "var(--bg-card2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          🎬
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: "0 0 3px",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {notif.title}
        </p>
        {notif.body && (
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 11,
              color: "var(--text-muted)",
              lineHeight: 1.45,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {notif.body}
          </p>
        )}
        <p
          style={{
            margin: 0,
            fontSize: 10,
            color: "var(--text-faint)",
            letterSpacing: "0.02em",
          }}
        >
          {timeAgo(notif.created_at)}
        </p>
      </div>

      {/* Right: unread dot + delete */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
          paddingTop: 2,
        }}
      >
        {!notif.is_read && (
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--red)",
              boxShadow: "0 0 6px rgba(229,9,20,0.6)",
              flexShrink: 0,
            }}
          />
        )}
        <button
          onClick={handleDelete}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-faint)",
            cursor: "pointer",
            fontSize: 11,
            padding: "2px 4px",
            lineHeight: 1,
            borderRadius: "var(--radius-sm)",
            opacity: hov ? 1 : 0.4,
            transition: "opacity 0.15s ease, color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--text-faint)")
          }
          title="Xoá"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function NotificationBell() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropRef = useRef(null);
  const pollRef = useRef(null);

  const fetchStats = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const r = await getNotifStats();
      setUnread(r.data.unread);
    } catch {}
  }, [isLoggedIn]);

  useEffect(() => {
    fetchStats();
    pollRef.current = setInterval(fetchStats, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchStats]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getNotifs({ limit: 30 })
      .then((r) => setNotifs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    const h = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleMarkAll = async () => {
    await markAllRead();
    setUnread(0);
    setNotifs((p) => p.map((n) => ({ ...n, is_read: true })));
  };
  const handleMarkOne = async (id) => {
    await markOneRead(id);
    setUnread((u) => Math.max(0, u - 1));
    setNotifs((p) => p.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };
  const handleDelete = async (id) => {
    await deleteNotif(id);
    const deleted = notifs.find((n) => n.id === id);
    if (deleted && !deleted.is_read) setUnread((u) => Math.max(0, u - 1));
    setNotifs((p) => p.filter((n) => n.id !== id));
  };
  const handleNav = (notif) => {
    if (!notif.is_read) handleMarkOne(notif.id);
    if (notif.movie_id) {
      setOpen(false);
      navigate(`/movie/${notif.movie_id}`);
    }
  };

  if (!isLoggedIn) return null;

  return (
    <div style={{ position: "relative" }} ref={dropRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((p) => !p)}
        title="Thông báo"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: "var(--radius-md, 10px)",
          border: "1px solid var(--border-mid)",
          background: open ? "var(--red-dim)" : "transparent",
          color: open ? "var(--red-text)" : "var(--text-muted)",
          cursor: "pointer",
          transition:
            "background 0.18s ease, color 0.18s ease, border-color 0.18s ease",
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.background = "var(--bg-card2)";
            e.currentTarget.style.borderColor = "var(--border-bright)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "var(--border-mid)";
            e.currentTarget.style.color = "var(--text-muted)";
          }
        }}
      >
        <BellSVG hasUnread={unread > 0} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: 1,
              right: 1,
              minWidth: 15,
              height: 15,
              borderRadius: "var(--radius-full)",
              background: "var(--red)",
              color: "#fff",
              fontSize: 8,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
              lineHeight: 1,
              border: "1.5px solid var(--bg-page)",
              animation: "badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 10px)",
            width: 340,
            maxHeight: 480,
            background: "var(--bg-overlay, #1a2030)",
            border: "1px solid var(--border-mid)",
            borderRadius: "var(--radius-lg, 14px)",
            boxShadow: "var(--shadow-menu, 0 12px 40px rgba(0,0,0,0.7))",
            zIndex: "var(--z-overlay, 100)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "dropIn 0.22s cubic-bezier(0.34,1.3,0.64,1) both",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px 12px",
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 3,
                  height: 14,
                  borderRadius: "var(--radius-full)",
                  background: "var(--red)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                Thông báo
              </span>
              {unread > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    background: "var(--red-dim)",
                    color: "var(--red-text)",
                    border: "1px solid var(--red-border)",
                    borderRadius: "var(--radius-full)",
                    padding: "1px 7px",
                  }}
                >
                  {unread} chưa đọc
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--red-text)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "3px 6px",
                  borderRadius: "var(--radius-sm)",
                  fontFamily: "var(--font-body, sans-serif)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--red-dim)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "none")
                }
              >
                Đọc tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1, scrollbarWidth: "none" }}>
            {loading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: "32px 20px",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    border: "2px solid rgba(255,255,255,0.1)",
                    borderTopColor: "var(--red)",
                    borderRadius: "50%",
                    animation: "microSpin 0.7s linear infinite",
                  }}
                />
                <span style={{ color: "var(--text-faint)", fontSize: 13 }}>
                  Đang tải…
                </span>
              </div>
            )}

            {!loading && notifs.length === 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  padding: "36px 20px",
                  textAlign: "center",
                }}
              >
                <EmptyBell />
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                  }}
                >
                  Chưa có thông báo
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "var(--text-faint)",
                    lineHeight: 1.5,
                  }}
                >
                  Đặt nhắc nhở phim sắp chiếu để nhận thông báo tại đây
                </p>
              </div>
            )}

            {!loading &&
              notifs.map((n) => (
                <NotifItem
                  key={n.id}
                  notif={n}
                  onRead={handleMarkOne}
                  onDelete={handleDelete}
                  onNavigate={handleNav}
                />
              ))}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div
              style={{
                borderTop: "1px solid var(--border)",
                padding: "10px 14px",
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/reminders");
                }}
                style={{
                  width: "100%",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-mid)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-secondary)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "8px",
                  fontFamily: "var(--font-body, sans-serif)",
                  letterSpacing: "0.02em",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg-card2)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "var(--bg-card)")
                }
              >
                Xem tất cả nhắc nhở →
              </button>
            </div>
          )}
        </div>
      )}

      <style>{bellCSS}</style>
    </div>
  );
}

const bellCSS = `
  @keyframes bellWiggle {
    0%,100%{ transform:rotate(0deg); }
    10%    { transform:rotate(-8deg); }
    20%    { transform:rotate(8deg); }
    30%    { transform:rotate(-5deg); }
    40%    { transform:rotate(5deg); }
    50%    { transform:rotate(0deg); }
  }
  @keyframes badgePop {
    from { transform: scale(0.5); opacity:0; }
    to   { transform: scale(1);   opacity:1; }
  }
  @keyframes dropIn {
    from { opacity:0; transform:translateY(-8px) scale(0.97); }
    to   { opacity:1; transform:translateY(0)    scale(1);    }
  }
  @keyframes microSpin {
    to { transform: rotate(360deg); }
  }
  ::-webkit-scrollbar { display:none; }
`;

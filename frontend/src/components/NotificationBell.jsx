// src/components/NotificationBell.jsx
/**
 * NotificationBell
 * Bell icon trên Navbar với badge unread count.
 * Click → mở dropdown danh sách thông báo.
 */
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

const POLL_MS = 60_000; // poll mỗi 60 giây

export default function NotificationBell() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(false);

  const dropRef = useRef(null);
  const pollRef = useRef(null);

  /* ── fetch unread count (polling) ── */
  const fetchStats = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await getNotifStats();
      setUnread(res.data.unread);
    } catch {
      /* silent */
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchStats();
    pollRef.current = setInterval(fetchStats, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchStats]);

  /* ── fetch full list on open ── */
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getNotifs({ limit: 30 })
      .then((res) => setNotifs(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  /* ── close on outside click ── */
  useEffect(() => {
    const h = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleMarkAllRead = async () => {
    await markAllRead();
    setUnread(0);
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleMarkOne = async (id) => {
    await markOneRead(id);
    setUnread((u) => Math.max(0, u - 1));
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await deleteNotif(id);
    const deleted = notifs.find((n) => n.id === id);
    if (deleted && !deleted.is_read) setUnread((u) => Math.max(0, u - 1));
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClick = (notif) => {
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
        style={{
          ...s.bell,
          background: open ? "var(--red-dim)" : "transparent",
        }}
        title="Thông báo"
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>🔔</span>
        {unread > 0 && (
          <span style={s.badge}>{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={s.dropdown}>
          {/* Header */}
          <div style={s.dropHeader}>
            <span style={s.dropTitle}>Thông báo</span>
            {unread > 0 && (
              <button style={s.markAllBtn} onClick={handleMarkAllRead}>
                Đọc tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div style={s.list}>
            {loading && (
              <div style={s.empty}>
                <span style={{ fontSize: 20 }}>⏳</span>
                <span>Đang tải...</span>
              </div>
            )}

            {!loading && notifs.length === 0 && (
              <div style={s.empty}>
                <span style={{ fontSize: 32 }}>🔕</span>
                <span style={{ color: "var(--text-muted)" }}>
                  Chưa có thông báo nào
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-faint)",
                    textAlign: "center",
                  }}
                >
                  Đặt nhắc nhở phim sắp chiếu để nhận thông báo tại đây
                </span>
              </div>
            )}

            {!loading &&
              notifs.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    ...s.item,
                    background: n.is_read
                      ? "transparent"
                      : "var(--red-dim, rgba(229,9,20,0.07))",
                  }}
                >
                  {/* Poster thumbnail */}
                  {n.poster ? (
                    <img src={n.poster} alt="" style={s.thumb} />
                  ) : (
                    <div style={s.thumbPlaceholder}>🎬</div>
                  )}

                  {/* Content */}
                  <div style={s.itemContent}>
                    <p style={s.itemTitle}>{n.title}</p>
                    {n.body && <p style={s.itemBody}>{n.body}</p>}
                    <p style={s.itemTime}>{formatTime(n.created_at)}</p>
                  </div>

                  {/* Unread dot + delete */}
                  <div style={s.itemActions}>
                    {!n.is_read && <div style={s.unreadDot} />}
                    <button
                      style={s.deleteBtn}
                      onClick={(e) => handleDelete(e, n.id)}
                      title="Xoá"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div style={s.dropFooter}>
              <button
                style={s.footerBtn}
                onClick={() => {
                  setOpen(false);
                  navigate("/reminders");
                }}
              >
                Xem tất cả nhắc nhở →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

/* ── styles ─────────────────────────────── */
const s = {
  bell: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 999,
    background: "var(--red, #e50914)",
    color: "#fff",
    fontSize: 9,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 3px",
    lineHeight: 1,
  },
  dropdown: {
    position: "absolute",
    right: 0,
    top: "calc(100% + 8px)",
    width: 340,
    maxHeight: 480,
    background: "var(--bg-overlay)",
    border: "1px solid var(--border-mid)",
    borderRadius: 12,
    boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
    zIndex: 200,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  dropHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px 10px",
    borderBottom: "1px solid var(--border)",
    flexShrink: 0,
  },
  dropTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  markAllBtn: {
    background: "transparent",
    border: "none",
    color: "var(--red-text, #ff6b6b)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    padding: "2px 6px",
  },
  list: {
    overflowY: "auto",
    flex: 1,
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    padding: "32px 20px",
    color: "var(--text-secondary)",
    fontSize: 14,
  },
  item: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "12px 14px",
    cursor: "pointer",
    transition: "background 0.12s",
    borderBottom: "1px solid var(--border)",
  },
  thumb: {
    width: 44,
    height: 62,
    objectFit: "cover",
    borderRadius: 6,
    flexShrink: 0,
  },
  thumbPlaceholder: {
    width: 44,
    height: 62,
    borderRadius: 6,
    background: "var(--bg-card2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    margin: "0 0 3px",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-primary)",
    lineHeight: 1.35,
  },
  itemBody: {
    margin: "0 0 4px",
    fontSize: 12,
    color: "var(--text-muted)",
    lineHeight: 1.45,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  itemTime: {
    margin: 0,
    fontSize: 11,
    color: "var(--text-faint)",
  },
  itemActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "var(--red, #e50914)",
  },
  deleteBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-faint)",
    cursor: "pointer",
    fontSize: 11,
    padding: 2,
    lineHeight: 1,
    transition: "color 0.12s",
  },
  dropFooter: {
    borderTop: "1px solid var(--border)",
    padding: "10px 14px",
    flexShrink: 0,
  },
  footerBtn: {
    width: "100%",
    background: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "center",
    padding: 4,
  },
};

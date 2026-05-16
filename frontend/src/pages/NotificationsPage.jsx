// src/pages/NotificationsPage.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getNotifs,
  markAllRead,
  markOneRead,
  deleteNotif,
  getNotifStats,
} from "../api/reminderApi";
import { useAuth } from "../context/AuthContext";

/* ─── helpers ───────────────────────────────────────────── */
function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return "Vừa xong";
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "Hôm qua" : `${d} ngày trước`;
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TYPE_CFG = {
  like: {
    emoji: "❤️",
    label: "Lượt thích",
    accent: "#f5c518",
    bg: "rgba(245,197,24,0.1)",
  },
  comment: {
    emoji: "💬",
    label: "Bình luận",
    accent: "#60a5fa",
    bg: "rgba(96,165,250,0.1)",
  },
  broadcast: {
    emoji: "📢",
    label: "Thông báo",
    accent: "#a855f7",
    bg: "rgba(168,85,247,0.1)",
  },
  reminder: {
    emoji: "🎬",
    label: "Nhắc nhở",
    accent: "#e11d48",
    bg: "rgba(225,29,72,0.08)",
  },
};

function getType(n) {
  return (
    n.notif_type ||
    (n.title?.startsWith("❤️")
      ? "like"
      : n.title?.startsWith("💬")
        ? "comment"
        : n.title?.startsWith("📢")
          ? "broadcast"
          : "reminder")
  );
}

/* ─── NotifIcon ─────────────────────────────────────────── */
function NotifIcon({ notif, size = 48 }) {
  const type = getType(notif);
  const cfg = TYPE_CFG[type] || TYPE_CFG.reminder;

  if (type === "reminder" && notif.poster) {
    return (
      <img
        src={notif.poster}
        alt=""
        loading="lazy"
        style={{
          width: size * 0.75,
          height: size,
          objectFit: "cover",
          borderRadius: 8,
          flexShrink: 0,
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: cfg.bg,
        border: `1px solid ${cfg.accent}33`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.42,
      }}
    >
      {cfg.emoji}
    </div>
  );
}

/* ─── FilterBar ─────────────────────────────────────────── */
const FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "activity", label: "Hoạt động" },
  { key: "broadcast", label: "Thông báo" },
  { key: "reminder", label: "Nhắc nhở" },
  { key: "unread", label: "Chưa đọc" },
];

function FilterBar({ active, onChange, counts }) {
  return (
    <div
      style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}
    >
      {FILTERS.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "7px 14px",
            borderRadius: 99,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
            border: `1px solid ${active === f.key ? "rgba(225,29,72,0.4)" : "var(--border-mid)"}`,
            background:
              active === f.key ? "rgba(225,29,72,0.12)" : "var(--bg-card)",
            color:
              active === f.key
                ? "var(--red-text,#ff6b6b)"
                : "var(--text-secondary)",
            transition: "all 0.15s ease",
          }}
        >
          {f.label}
          {counts[f.key] > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                minWidth: 16,
                height: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 99,
                padding: "0 4px",
                background: active === f.key ? "var(--red)" : "var(--bg-card2)",
                color: active === f.key ? "#fff" : "var(--text-muted)",
              }}
            >
              {counts[f.key]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ─── NotifCard ─────────────────────────────────────────── */
function NotifCard({ notif, onRead, onDelete, onClick }) {
  const [removing, setRemoving] = useState(false);
  const type = getType(notif);
  const cfg = TYPE_CFG[type] || TYPE_CFG.reminder;
  const isClickable = !!(
    notif.movie_id ||
    notif.review_id ||
    type === "broadcast"
  );

  const handleClick = () => {
    if (!notif.is_read) onRead(notif.id);
    onClick(notif);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setRemoving(true);
    setTimeout(() => onDelete(notif.id), 260);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        display: "flex",
        gap: 14,
        padding: "16px 20px",
        background: notif.is_read ? "var(--bg-card)" : "var(--bg-card2)",
        border: `1px solid ${notif.is_read ? "var(--border)" : cfg.accent + "33"}`,
        borderRadius: 14,
        cursor: isClickable ? "pointer" : "default",
        transform: removing ? "translateX(110%)" : "translateX(0)",
        opacity: removing ? 0 : 1,
        transition:
          "transform 0.28s ease, opacity 0.24s ease, background 0.15s, border-color 0.15s",
        position: "relative",
      }}
      className="notif-card"
    >
      <NotifIcon notif={notif} size={48} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Type badge + time */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              padding: "2px 8px",
              borderRadius: 99,
              background: cfg.bg,
              color: cfg.accent,
              border: `1px solid ${cfg.accent}33`,
            }}
          >
            {cfg.emoji} {cfg.label}
          </span>
          {!notif.is_read && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: cfg.accent,
                boxShadow: `0 0 6px ${cfg.accent}88`,
              }}
            />
          )}
          <span
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color: "var(--text-faint)",
            }}
            title={fmtDate(notif.created_at)}
          >
            {timeAgo(notif.created_at)}
          </span>
        </div>

        {/* Title */}
        <h3
          style={{
            margin: "0 0 6px",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.35,
          }}
        >
          {notif.title}
        </h3>

        {/* Body — full text */}
        {notif.body && (
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.65,
            }}
          >
            {notif.body}
          </p>
        )}

        {/* Action hint */}
        {isClickable && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              color: cfg.accent,
              fontWeight: 500,
            }}
          >
            {type === "reminder" && notif.movie_id && (
              <>
                🎬 <span>Xem chi tiết phim →</span>
              </>
            )}
            {type === "like" && notif.movie_id && (
              <>
                👁️ <span>Xem review →</span>
              </>
            )}
            {type === "comment" && notif.movie_id && (
              <>
                💬 <span>Xem bình luận →</span>
              </>
            )}
            {type === "broadcast" && (
              <>
                📖 <span>Đã đọc</span>
              </>
            )}
          </div>
        )}

        {/* Timestamp full */}
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-faint)" }}>
          {fmtDate(notif.created_at)}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="notif-card-del"
        title="Xoá thông báo"
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          width: 26,
          height: 26,
          borderRadius: 7,
          border: "1px solid var(--border)",
          background: "var(--bg-card2)",
          color: "var(--text-faint)",
          cursor: "pointer",
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s ease",
          opacity: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}

/* ─── MAIN ──────────────────────────────────────────────── */
export default function NotificationsPage() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, unread: 0 });
  const [filter, setFilter] = useState(searchParams.get("tab") || "all");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nRes, sRes] = await Promise.all([
        getNotifs({ limit: 100 }),
        getNotifStats(),
      ]);
      setNotifs(nRes.data || []);
      setStats(sRes.data || { total: 0, unread: 0 });
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) load();
  }, [isLoggedIn, load]);

  useEffect(() => {
    setSearchParams(filter !== "all" ? { tab: filter } : {}, { replace: true });
  }, [filter]);

  const handleMarkAll = async () => {
    await markAllRead();
    setNotifs((p) => p.map((n) => ({ ...n, is_read: true })));
    setStats((s) => ({ ...s, unread: 0 }));
  };

  const handleRead = async (id) => {
    await markOneRead(id);
    setNotifs((p) => p.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setStats((s) => ({ ...s, unread: Math.max(0, s.unread - 1) }));
  };

  const handleDelete = async (id) => {
    const target = notifs.find((n) => n.id === id);
    setNotifs((p) => p.filter((n) => n.id !== id));
    if (target && !target.is_read)
      setStats((s) => ({ ...s, unread: Math.max(0, s.unread - 1) }));
    try {
      await deleteNotif(id);
    } catch {}
  };

  const handleClick = (notif) => {
    const type = getType(notif);
    if (type === "broadcast") return; // đã đọc, không navigate
    if (notif.review_id && notif.movie_id) {
      navigate(`/movie/${notif.movie_id}`, {
        state: { scrollToReview: notif.review_id },
      });
    } else if (notif.movie_id) {
      navigate(`/movie/${notif.movie_id}`);
    }
  };

  // Filter
  const filtered = notifs.filter((n) => {
    const t = getType(n);
    if (filter === "unread") return !n.is_read;
    if (filter === "activity") return ["like", "comment"].includes(t);
    if (filter === "broadcast") return t === "broadcast";
    if (filter === "reminder") return t === "reminder";
    return true;
  });

  // Counts cho filter bar
  const counts = {
    all: notifs.length,
    activity: notifs.filter((n) => ["like", "comment"].includes(getType(n)))
      .length,
    broadcast: notifs.filter((n) => getType(n) === "broadcast").length,
    reminder: notifs.filter((n) => getType(n) === "reminder").length,
    unread: notifs.filter((n) => !n.is_read).length,
  };

  // Group theo ngày
  const grouped = filtered.reduce((acc, n) => {
    const d = new Date(n.created_at);
    const now = new Date();
    let label;
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) label = "Hôm nay";
    else if (diff === 1) label = "Hôm qua";
    else if (diff < 7) label = `${diff} ngày trước`;
    else
      label = d.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
    if (!acc[label]) acc[label] = [];
    acc[label].push(n);
    return acc;
  }, {});

  if (!isLoggedIn) {
    navigate("/login");
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-page)",
        paddingTop: 80,
        paddingBottom: 60,
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 24,
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 4,
              }}
            >
              <button
                onClick={() => navigate(-1)}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-mid)",
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  fontSize: 16,
                }}
              >
                ←
              </button>
              <h1
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                Thông báo
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
              {stats.total} thông báo
              {stats.unread > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    color: "var(--red-text,#ff6b6b)",
                    fontWeight: 600,
                  }}
                >
                  · {stats.unread} chưa đọc
                </span>
              )}
            </p>
          </div>

          {stats.unread > 0 && (
            <button
              onClick={handleMarkAll}
              style={{
                padding: "8px 16px",
                borderRadius: 99,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                border: "1px solid rgba(225,29,72,0.3)",
                background: "rgba(225,29,72,0.1)",
                color: "var(--red-text,#ff6b6b)",
                transition: "all 0.15s ease",
              }}
              className="mark-all-btn"
            >
              ✓ Đọc tất cả
            </button>
          )}
        </div>

        {/* Filter */}
        <FilterBar active={filter} onChange={setFilter} counts={counts} />

        {/* Content */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                style={{
                  height: 100,
                  borderRadius: 14,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  animation: "skelPulse 1.4s ease-in-out infinite",
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>
              🔕
            </div>
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-muted)",
                margin: "0 0 6px",
              }}
            >
              Không có thông báo nào
            </p>
            <p style={{ fontSize: 13, color: "var(--text-faint)", margin: 0 }}>
              {filter === "unread"
                ? "Bạn đã đọc hết thông báo 🎉"
                : "Thông báo sẽ xuất hiện ở đây"}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {Object.entries(grouped).map(([label, items]) => (
              <div key={label}>
                {/* Group header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 3,
                      height: 14,
                      borderRadius: 99,
                      background: "var(--red)",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                    }}
                  >
                    {label}
                  </span>
                  <div
                    style={{ flex: 1, height: 1, background: "var(--border)" }}
                  />
                  <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
                    {items.length}
                  </span>
                </div>

                {/* Cards */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {items.map((n) => (
                    <NotifCard
                      key={n.id}
                      notif={n}
                      onRead={handleRead}
                      onDelete={handleDelete}
                      onClick={handleClick}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{pageCSS}</style>
    </div>
  );
}

const pageCSS = `
  @keyframes skelPulse {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.45; }
  }
  .notif-card:hover .notif-card-del { opacity: 1 !important; }
  .notif-card:hover { border-color: var(--border-bright) !important; }
  .notif-card-del:hover { background: rgba(239,68,68,0.15) !important; color: #ef4444 !important; border-color: rgba(239,68,68,0.3) !important; }
  .mark-all-btn:hover { background: rgba(225,29,72,0.18) !important; }
`;

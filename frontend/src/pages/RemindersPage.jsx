// src/pages/RemindersPage.jsx
/**
 * Trang quản lý nhắc nhở — /reminders
 * Hiển thị tất cả phim đã đặt nhắc, kèm đếm ngược ngày ra rạp.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getReminders, deleteReminder } from "../api/reminderApi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastContext";
import Navbar from "../components/Navbar";
import ScrollToTop from "../components/ScrollToTop";

export default function RemindersPage() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();

  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    getReminders()
      .then((res) => setReminders(res.data))
      .catch(() => showToast("Không tải được danh sách nhắc nhở.", "error"))
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  const handleCancel = useCallback(async (movieId, title) => {
    try {
      await deleteReminder(movieId);
      setReminders((prev) => prev.filter((r) => r.movie_id !== movieId));
      showToast(`Đã huỷ nhắc "${title}"`, "info");
    } catch {
      showToast("Huỷ thất bại, thử lại nhé.", "error");
    }
  }, []);

  /* ── sort: chưa gửi trước, gần ngày trước ── */
  const sorted = [...reminders].sort((a, b) => {
    if (a.is_sent !== b.is_sent) return a.is_sent ? 1 : -1;
    return (a.release_date || "9999") < (b.release_date || "9999") ? -1 : 1;
  });

  const upcoming = sorted.filter((r) => !r.is_sent);
  const past = sorted.filter((r) => r.is_sent);

  return (
    <div style={s.page}>
      <Navbar />

      <div style={s.content}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <h1 style={s.title}>🔔 Nhắc nhở phim</h1>
            <p style={s.sub}>
              {reminders.length > 0
                ? `${upcoming.length} phim đang chờ · ${past.length} đã thông báo`
                : "Chưa có nhắc nhở nào"}
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={s.grid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={s.skeleton} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && reminders.length === 0 && (
          <div style={s.emptyState}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔕</div>
            <p style={s.emptyTitle}>Chưa đặt nhắc nhở nào</p>
            <p style={s.emptySub}>
              Vào trang "Sắp chiếu" và bấm <strong>"Nhắc tôi"</strong> trên phim
              bạn muốn theo dõi.
            </p>
            <button
              style={s.emptyBtn}
              onClick={() => navigate("/?tab=upcoming")}
            >
              Xem phim sắp chiếu
            </button>
          </div>
        )}

        {/* Upcoming section */}
        {!loading && upcoming.length > 0 && (
          <>
            <p style={s.sectionLabel}>Đang chờ thông báo</p>
            <div style={s.grid}>
              {upcoming.map((r) => (
                <ReminderCard key={r.id} reminder={r} onCancel={handleCancel} />
              ))}
            </div>
          </>
        )}

        {/* Past/sent section */}
        {!loading && past.length > 0 && (
          <>
            <p style={{ ...s.sectionLabel, marginTop: 32 }}>Đã thông báo</p>
            <div style={s.grid}>
              {past.map((r) => (
                <ReminderCard
                  key={r.id}
                  reminder={r}
                  onCancel={handleCancel}
                  dimmed
                />
              ))}
            </div>
          </>
        )}
      </div>

      <ScrollToTop />
    </div>
  );
}

/* ── ReminderCard ─────────────────────────────────────────── */
function ReminderCard({ reminder: r, onCancel, dimmed = false }) {
  const navigate = useNavigate();
  const daysLeft = calcDaysLeft(r.release_date);

  const countdownColor =
    daysLeft === null
      ? "var(--text-muted)"
      : daysLeft <= 0
        ? "var(--green)"
        : daysLeft <= 7
          ? "var(--red-text)"
          : daysLeft <= 30
            ? "var(--yellow)"
            : "var(--text-secondary)";

  const countdownLabel =
    daysLeft === null
      ? "Chưa có ngày chiếu"
      : daysLeft < 0
        ? `Đã ra rạp ${Math.abs(daysLeft)} ngày trước`
        : daysLeft === 0
          ? "Ra rạp hôm nay! 🎉"
          : `Còn ${daysLeft} ngày`;

  return (
    <div
      style={{
        ...s.card,
        opacity: dimmed ? 0.55 : 1,
        cursor: "pointer",
      }}
      onClick={() => navigate(`/movie/${r.movie_id}`)}
    >
      {/* Poster */}
      <div style={s.posterWrap}>
        {r.poster ? (
          <img src={r.poster} alt={r.title} style={s.poster} />
        ) : (
          <div style={s.posterPlaceholder}>🎬</div>
        )}
        {/* sent badge */}
        {r.is_sent && <div style={s.sentBadge}>✓ Đã gửi</div>}
      </div>

      {/* Info */}
      <div style={s.info}>
        <p style={s.movieTitle}>{r.title}</p>

        {r.release_date && (
          <p style={s.releaseDate}>📅 {formatDate(r.release_date)}</p>
        )}

        <p style={{ ...s.countdown, color: countdownColor }}>
          {countdownLabel}
        </p>

        {r.notify_on && !r.is_sent && (
          <p style={s.notifyOn}>🔔 Thông báo vào: {formatDate(r.notify_on)}</p>
        )}
      </div>

      {/* Cancel button */}
      <button
        style={s.cancelBtn}
        onClick={(e) => {
          e.stopPropagation();
          onCancel(r.movie_id, r.title);
        }}
        title="Huỷ nhắc nhở"
      >
        ✕
      </button>
    </div>
  );
}

function calcDaysLeft(dateStr) {
  if (!dateStr) return null;
  try {
    const release = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.floor((release - today) / 86_400_000);
  } catch {
    return null;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/* ── styles ─────────────────────────────── */
const s = {
  page: {
    minHeight: "100vh",
    background: "var(--bg-page)",
    color: "var(--text-primary)",
  },
  content: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "80px 16px 60px",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  title: {
    margin: "0 0 6px",
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },
  sub: {
    margin: 0,
    fontSize: 14,
    color: "var(--text-muted)",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-faint)",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    margin: "0 0 12px",
  },
  grid: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  skeleton: {
    height: 96,
    borderRadius: 12,
    background: "var(--bg-card)",
    animation: "shimmer 1.6s ease-in-out infinite",
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "var(--bg-card)",
    border: "1px solid var(--border-mid)",
    borderRadius: 12,
    padding: "12px 14px",
    position: "relative",
    transition: "border-color 0.15s",
  },
  posterWrap: {
    position: "relative",
    flexShrink: 0,
  },
  poster: {
    width: 54,
    height: 78,
    objectFit: "cover",
    borderRadius: 7,
    display: "block",
  },
  posterPlaceholder: {
    width: 54,
    height: 78,
    borderRadius: 7,
    background: "var(--bg-card2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
  },
  sentBadge: {
    position: "absolute",
    bottom: 4,
    left: 0,
    right: 0,
    background: "rgba(46,204,113,0.85)",
    color: "#fff",
    fontSize: 9,
    fontWeight: 700,
    textAlign: "center",
    padding: "2px 0",
    borderRadius: "0 0 7px 7px",
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  movieTitle: {
    margin: "0 0 4px",
    fontSize: 15,
    fontWeight: 700,
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  releaseDate: {
    margin: "0 0 3px",
    fontSize: 12,
    color: "var(--text-muted)",
  },
  countdown: {
    margin: "0 0 3px",
    fontSize: 13,
    fontWeight: 700,
  },
  notifyOn: {
    margin: 0,
    fontSize: 11,
    color: "var(--text-faint)",
  },
  cancelBtn: {
    position: "absolute",
    top: 10,
    right: 12,
    background: "transparent",
    border: "none",
    color: "var(--text-faint)",
    fontSize: 12,
    cursor: "pointer",
    padding: 4,
    lineHeight: 1,
    transition: "color 0.12s",
  },
  emptyState: {
    textAlign: "center",
    padding: "80px 24px",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: "0 0 8px",
  },
  emptySub: {
    fontSize: 14,
    color: "var(--text-muted)",
    margin: "0 0 24px",
    maxWidth: 380,
    marginLeft: "auto",
    marginRight: "auto",
    lineHeight: 1.6,
  },
  emptyBtn: {
    padding: "11px 26px",
    borderRadius: 10,
    border: "none",
    background: "var(--red)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
};

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getWatchlist,
  deleteMovie,
  toggleWatched,
  updateNote,
  getWatchlistStats,
  getCollections,
  createCollection,
  deleteCollection,
  moveToCollection,
  getShareLink,
  toggleShareLink,
} from "../api/movieApi";
import { useToast } from "../components/ToastContext";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

/* ─── helpers ──────────────────────────────────── */
function useIsMobile(bp = 768) {
  const [m, setM] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", h, { passive: true });
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return m;
}
function fmt(min) {
  if (!min) return "0p";
  const h = Math.floor(min / 60),
    m = min % 60;
  return h > 0 ? `${h}g ${m}p` : `${m}p`;
}
const ORDER_KEY = (uid, colId) => `wl_order_${uid}_${colId ?? "all"}`;
function saveOrder(uid, colId, ids) {
  try {
    localStorage.setItem(ORDER_KEY(uid, colId), JSON.stringify(ids));
  } catch {}
}
function loadOrder(uid, colId) {
  try {
    return JSON.parse(localStorage.getItem(ORDER_KEY(uid, colId)) || "null");
  } catch {
    return null;
  }
}
function applyOrder(movies, saved) {
  if (!saved) return movies;
  const map = Object.fromEntries(movies.map((m) => [m.movie_id, m]));
  return [
    ...saved.filter((id) => map[id]).map((id) => map[id]),
    ...movies.filter((m) => !saved.includes(m.movie_id)),
  ];
}

/* ─── SVG Icons ─────────────────────────────────── */
const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const IconList = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <circle cx="3" cy="6" r="1" fill="currentColor" />
    <circle cx="3" cy="12" r="1" fill="currentColor" />
    <circle cx="3" cy="18" r="1" fill="currentColor" />
  </svg>
);
const IconShare = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);
const IconTrash = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);
const IconNote = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);
const IconCheck = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconDrag = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="8" cy="6" r="1.5" />
    <circle cx="16" cy="6" r="1.5" />
    <circle cx="8" cy="12" r="1.5" />
    <circle cx="16" cy="12" r="1.5" />
    <circle cx="8" cy="18" r="1.5" />
    <circle cx="16" cy="18" r="1.5" />
  </svg>
);
const IconPlus = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

/* ─── Stat card with animated number ────────────── */
function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div style={{ ...w.statCard, borderTop: `2px solid ${accent}` }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
        {sub && (
          <span
            style={{
              fontSize: 10,
              color: "var(--text-faint)",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {sub}
          </span>
        )}
      </div>
      <p
        style={{
          margin: "0 0 3px",
          fontSize: 28,
          fontWeight: 800,
          color: "var(--text-primary)",
          fontFamily: "var(--font-display)",
          letterSpacing: "0.02em",
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 11,
          color: "var(--text-faint)",
          fontWeight: 500,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </p>
    </div>
  );
}

/* ─── Progress bar ───────────────────────────────── */
function ProgressBar({ pct, color = "var(--red)" }) {
  return (
    <div
      style={{
        height: 4,
        background: "var(--border)",
        borderRadius: "var(--radius-full)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: "var(--radius-full)",
          transition: "width 0.8s ease",
        }}
      />
    </div>
  );
}

/* ─── Section heading ────────────────────────────── */
function SectionHead({ children, action }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 3,
            height: 16,
            borderRadius: "var(--radius-full)",
            background: "var(--red)",
            flexShrink: 0,
          }}
        />
        <h2
          style={{
            margin: 0,
            fontSize: "var(--text-base)",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "0.01em",
          }}
        >
          {children}
        </h2>
      </div>
      {action}
    </div>
  );
}

/* ══════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════ */
function Sidebar({
  stats,
  collections,
  activeCol,
  newColName,
  setNewColName,
  onSelectAll,
  onOpenDetail,
  onDeleteCol,
  onCreateCol,
  isMobile,
  onClose,
}) {
  const pct =
    stats?.total > 0 ? Math.round((stats.watched / stats.total) * 100) : 0;

  return (
    <div style={isMobile ? w.sidebarMobile : w.sidebar}>
      {isMobile && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
            paddingBottom: 14,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Bộ sưu tập
          </span>
          <button
            onClick={onClose}
            style={{
              background: "var(--bg-card2)",
              border: "1px solid var(--border-mid)",
              borderRadius: "var(--radius-md)",
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Mini stats */}
      {stats && (
        <div style={w.sideStats}>
          <div style={w.sideStat}>
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "var(--text-primary)",
                fontFamily: "var(--font-display)",
              }}
            >
              {stats.total}
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-faint)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Phim
            </span>
          </div>
          <div style={w.sideStatDivider} />
          <div style={w.sideStat}>
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "var(--green)",
                fontFamily: "var(--font-display)",
              }}
            >
              {stats.watched}
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-faint)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Đã xem
            </span>
          </div>
          <div style={w.sideStatDivider} />
          <div style={w.sideStat}>
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "var(--red-text)",
                fontFamily: "var(--font-display)",
              }}
            >
              {pct}%
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-faint)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Xong
            </span>
          </div>
        </div>
      )}
      {stats && <ProgressBar pct={pct} />}

      <div style={{ height: 20 }} />

      {/* Collections label */}
      <p
        style={{
          margin: "0 0 8px",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-faint)",
        }}
      >
        DANH SÁCH
      </p>

      {/* All */}
      <button
        onClick={() => {
          onSelectAll();
          isMobile && onClose();
        }}
        style={{ ...w.colBtn, ...(activeCol === null ? w.colBtnActive : {}) }}
        onMouseEnter={(e) => {
          if (activeCol !== null)
            e.currentTarget.style.background = "var(--bg-card2)";
        }}
        onMouseLeave={(e) => {
          if (activeCol !== null)
            e.currentTarget.style.background = "transparent";
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>▣</span>
          <span>Tất cả phim</span>
        </span>
        <span style={w.colCount}>{stats?.total ?? 0}</span>
      </button>

      {/* Collections */}
      {collections.map((col) => (
        <div
          key={col.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 2,
          }}
        >
          <button
            onClick={() => {
              onOpenDetail(col.id);
              isMobile && onClose();
            }}
            style={{
              ...w.colBtn,
              flex: 1,
              marginBottom: 0,
              ...(activeCol === col.id ? w.colBtnActive : {}),
            }}
            onMouseEnter={(e) => {
              if (activeCol !== col.id)
                e.currentTarget.style.background = "var(--bg-card2)";
            }}
            onMouseLeave={(e) => {
              if (activeCol !== col.id)
                e.currentTarget.style.background = "transparent";
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, opacity: 0.6 }}>◈</span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {col.name}
              </span>
            </span>
            <span style={w.colCount}>{col.movie_count}</span>
          </button>
          <button
            onClick={() => onDeleteCol(col.id)}
            style={w.colDeleteBtn}
            title="Xoá"
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-faint)")
            }
          >
            <IconTrash />
          </button>
        </div>
      ))}

      {/* New collection */}
      <div style={{ marginTop: 14 }}>
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-faint)",
          }}
        >
          TẠO MỚI
        </p>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onCreateCol()}
            placeholder="Tên bộ sưu tập..."
            style={w.colInput}
            onFocus={(e) => (e.target.style.borderColor = "var(--red-border)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-mid)")}
          />
          <button
            onClick={onCreateCol}
            style={w.addBtn}
            title="Tạo"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--red-hover)";
              e.currentTarget.style.boxShadow = "var(--red-glow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--red)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <IconPlus />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MOVIE ITEM — List view
══════════════════════════════════════════════ */
function MovieItem({
  movie,
  collections,
  editNote,
  setEditNote,
  onDelete,
  onToggleWatched,
  onSaveNote,
  onMoveCol,
  canDrag,
}) {
  const [showNote, setShowNote] = useState(false);
  const [hov, setHov] = useState(false);
  const noteVal =
    editNote[movie.movie_id] !== undefined
      ? editNote[movie.movie_id]
      : movie.note || "";

  return (
    <div
      style={{
        ...w.listCard,
        ...(movie.is_watched ? w.listCardWatched : {}),
        ...(hov ? w.listCardHov : {}),
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {canDrag && (
        <div style={w.dragHandle} title="Kéo để sắp xếp">
          <IconDrag />
        </div>
      )}

      {/* Poster */}
      <Link
        to={`/movie/${movie.movie_id}`}
        style={{
          display: "block",
          flexShrink: 0,
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
        }}
      >
        <img
          src={
            movie.poster || "https://placehold.co/60x88/0e1218/1e2a3a?text=?"
          }
          alt={movie.title}
          loading="lazy"
          style={{
            width: 60,
            height: 88,
            objectFit: "cover",
            display: "block",
            transition: "transform 0.3s ease",
            transform: hov ? "scale(1.05)" : "scale(1)",
          }}
        />
      </Link>

      {/* Info */}
      <div style={w.listInfo}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <Link
            to={`/movie/${movie.movie_id}`}
            style={{ textDecoration: "none", flex: 1, minWidth: 0 }}
          >
            <p style={w.listTitle}>{movie.title}</p>
          </Link>
          <span
            style={{
              ...w.watchBadge,
              ...(movie.is_watched ? w.watchBadgeWatched : w.watchBadgePending),
            }}
          >
            {movie.is_watched ? "✓ Đã xem" : "Chưa xem"}
          </span>
        </div>

        {movie.note && !showNote && (
          <p style={w.notePreview}>💬 {movie.note}</p>
        )}

        {showNote && (
          <div style={{ marginTop: 8 }}>
            <textarea
              rows={2}
              value={noteVal}
              onChange={(e) =>
                setEditNote((p) => ({ ...p, [movie.movie_id]: e.target.value }))
              }
              placeholder="Ghi chú của bạn..."
              style={w.noteArea}
              onFocus={(e) =>
                (e.target.style.borderColor = "var(--red-border)")
              }
              onBlur={(e) => (e.target.style.borderColor = "var(--border-mid)")}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button
                onClick={() => {
                  onSaveNote(movie.movie_id);
                  setShowNote(false);
                }}
                style={w.btnXs}
              >
                Lưu
              </button>
              <button
                onClick={() => setShowNote(false)}
                style={{ ...w.btnXs, background: "var(--bg-card)" }}
              >
                Huỷ
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={w.listActions}>
          <select
            value={movie.collection_id || ""}
            onChange={(e) =>
              onMoveCol(
                movie.movie_id,
                e.target.value ? Number(e.target.value) : null,
              )
            }
            style={w.colSelect}
          >
            <option value="">— Không có bộ sưu tập —</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => onToggleWatched(movie.movie_id)}
            style={{
              ...w.actionBtn,
              ...(movie.is_watched ? w.actionBtnGreen : {}),
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <IconCheck /> {movie.is_watched ? "Bỏ đã xem" : "Đánh dấu đã xem"}
          </button>
          <button
            onClick={() => setShowNote((p) => !p)}
            style={w.actionBtn}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-card2)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--bg-card)")
            }
          >
            <IconNote /> Ghi chú
          </button>
          <button
            onClick={() => onDelete(movie.movie_id)}
            style={w.actionBtnDanger}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.18)";
              e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-card)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <IconTrash /> Xoá
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Grid card ───────────────────────────────────── */
function GridCard({
  movie,
  collections,
  onDelete,
  onToggleWatched,
  onMoveCol,
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      style={{
        ...w.gridCard,
        ...(movie.is_watched ? { opacity: 0.7 } : {}),
        transform: hov ? "translateY(-5px)" : "none",
        boxShadow: hov
          ? "0 16px 40px rgba(0,0,0,0.8), 0 0 0 1.5px rgba(229,9,20,0.4)"
          : "var(--shadow-card)",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <Link
        to={`/movie/${movie.movie_id}`}
        style={{
          display: "block",
          position: "relative",
          overflow: "hidden",
          borderRadius: "var(--radius-md) var(--radius-md) 0 0",
        }}
      >
        <img
          src={
            movie.poster || "https://placehold.co/160x240/0e1218/1e2a3a?text=?"
          }
          alt={movie.title}
          style={{
            width: "100%",
            aspectRatio: "2/3",
            objectFit: "cover",
            display: "block",
            transform: hov ? "scale(1.06)" : "scale(1)",
            transition: "transform 0.4s ease",
          }}
          loading="lazy"
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 55%)",
            pointerEvents: "none",
          }}
        />
        {movie.is_watched && (
          <div style={w.gridWatchedBadge}>
            <IconCheck />
          </div>
        )}
      </Link>
      <div style={{ padding: "10px 10px 12px" }}>
        <Link
          to={`/movie/${movie.movie_id}`}
          style={{ textDecoration: "none" }}
        >
          <p style={w.gridTitle}>{movie.title}</p>
        </Link>
        <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
          <button
            onClick={() => onToggleWatched(movie.movie_id)}
            style={{
              ...w.gridBtn,
              ...(movie.is_watched
                ? { color: "var(--green)", borderColor: "rgba(34,197,94,0.35)" }
                : {}),
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-card2)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <IconCheck /> {movie.is_watched ? "Xem lại" : "Đánh dấu"}
          </button>
          <button
            onClick={() => onDelete(movie.movie_id)}
            style={{
              ...w.gridBtn,
              color: "var(--red-text)",
              borderColor: "var(--red-border)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--red-dim)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <IconTrash />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Draggable list wrapper ──────────────────────── */
function DraggableList({
  movies,
  viewMode,
  collections,
  editNote,
  setEditNote,
  onDelete,
  onToggleWatched,
  onSaveNote,
  onMoveCol,
  onReorder,
}) {
  const [items, setItems] = useState(movies);
  const [dragging, setDragging] = useState(null);
  const dragItem = useRef(null),
    dragNode = useRef(null);

  useEffect(() => {
    setItems(movies);
  }, [movies]);

  const handleDragStart = (e, idx) => {
    dragItem.current = idx;
    dragNode.current = e.currentTarget;
    dragNode.current.addEventListener("dragend", handleDragEnd);
    setTimeout(() => setDragging(idx), 0);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragEnter = (e, idx) => {
    e.preventDefault();
    if (dragItem.current === idx) return;
    const ni = [...items];
    const [m] = ni.splice(dragItem.current, 1);
    ni.splice(idx, 0, m);
    dragItem.current = idx;
    setItems(ni);
  };
  const handleDragEnd = () => {
    setDragging(null);
    dragNode.current?.removeEventListener("dragend", handleDragEnd);
    dragItem.current = null;
    dragNode.current = null;
    if (onReorder) onReorder(items);
  };
  const canDrag = !!onReorder && viewMode === "list";

  if (viewMode === "grid") {
    return (
      <div style={w.gridLayout}>
        {items.map((movie) => (
          <GridCard
            key={movie.movie_id}
            movie={movie}
            collections={collections}
            onDelete={onDelete}
            onToggleWatched={onToggleWatched}
            onMoveCol={onMoveCol}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((movie, idx) => (
        <div
          key={movie.movie_id}
          draggable={canDrag}
          onDragStart={canDrag ? (e) => handleDragStart(e, idx) : undefined}
          onDragEnter={canDrag ? (e) => handleDragEnter(e, idx) : undefined}
          onDragOver={canDrag ? (e) => e.preventDefault() : undefined}
          style={{
            opacity: dragging === idx ? 0.4 : 1,
            transition: "opacity 0.15s",
          }}
        >
          <MovieItem
            movie={movie}
            collections={collections}
            editNote={editNote}
            setEditNote={setEditNote}
            onDelete={onDelete}
            onToggleWatched={onToggleWatched}
            onSaveNote={onSaveNote}
            onMoveCol={onMoveCol}
            canDrag={canDrag}
          />
        </div>
      ))}
    </div>
  );
}

/* ── Share panel ────────────────────────────────── */
function SharePanel({ shareInfo, onToggle, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(shareInfo?.share_url || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={w.sharePanel}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 3,
              height: 16,
              borderRadius: "var(--radius-full)",
              background: "var(--red)",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 700 }}>
            Chia sẻ Watchlist
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "var(--bg-card2)",
            border: "1px solid var(--border-mid)",
            borderRadius: "var(--radius-md)",
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--text-muted)",
            fontSize: 13,
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          readOnly
          value={shareInfo.is_active ? shareInfo.share_url : "Chia sẻ đang tắt"}
          style={{ ...w.shareInput, opacity: shareInfo.is_active ? 1 : 0.45 }}
        />
        {shareInfo.is_active && (
          <button
            onClick={copy}
            style={{
              ...w.btnPrimary,
              whiteSpace: "nowrap",
              padding: "8px 16px",
              fontSize: 13,
            }}
          >
            {copied ? "✓ Đã sao chép" : "Sao chép"}
          </button>
        )}
      </div>
      <button
        onClick={onToggle}
        style={{ ...w.btnGhost, fontSize: 12, padding: "6px 14px" }}
      >
        {shareInfo.is_active ? "🚫 Tắt chia sẻ" : "✅ Bật chia sẻ"}
      </button>
    </div>
  );
}

/* ── Empty state ────────────────────────────────── */
function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "72px 20px" }}>
      <p style={{ fontSize: 52, marginBottom: 14 }}>🎬</p>
      <p
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "var(--text-secondary)",
          marginBottom: 8,
        }}
      >
        Danh sách trống
      </p>
      <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 24 }}>
        Khám phá phim và thêm vào watchlist của bạn
      </p>
      <Link
        to="/"
        style={{
          ...w.btnPrimary,
          display: "inline-flex",
          textDecoration: "none",
        }}
      >
        Khám phá phim →
      </Link>
    </div>
  );
}

/* ── Mobile bottom drawer ───────────────────────── */
function Drawer({ open, onClose, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 400,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 500,
          background: "var(--bg-overlay)",
          borderRadius: "20px 20px 0 0",
          border: "1px solid var(--border-mid)",
          borderBottom: "none",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -12px 48px rgba(0,0,0,0.5)",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.32,1,0.23,1)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: "var(--border-bright)",
            margin: "10px auto 4px",
            flexShrink: 0,
          }}
        />
        <div style={{ overflowY: "auto", padding: "8px 20px 40px", flex: 1 }}>
          {children}
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function Watchlist() {
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const isMobile = useIsMobile();

  const [movies, setMovies] = useState([]);
  const [orderedMovies, setOrdered] = useState([]);
  const [stats, setStats] = useState(null);
  const [collections, setCols] = useState([]);
  const [activeCol, setActiveCol] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // "list"|"grid"|"detail"|"stats"
  const [listView, setListView] = useState("list"); // "list"|"grid" toggle
  const [shareInfo, setShareInfo] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [editNote, setEditNote] = useState({});
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [entered, setEntered] = useState(false);

  const uid = user?.id ?? user?.email ?? "guest";

  useEffect(() => {
    if (!isLoggedIn) navigate("/login");
  }, [isLoggedIn]);
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, sRes, cRes] = await Promise.all([
        getWatchlist(activeCol),
        getWatchlistStats(),
        getCollections(),
      ]);
      const raw = mRes.data || [];
      setMovies(raw);
      setStats(sRes.data);
      setCols(cRes.data || []);
      setOrdered(applyOrder(raw, loadOrder(uid, activeCol)));
    } catch {
      showToast("Không tải được dữ liệu.", "error");
    } finally {
      setLoading(false);
    }
  }, [activeCol, uid]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setOrdered((prev) => {
      if (prev.length === 0)
        return applyOrder(movies, loadOrder(uid, activeCol));
      const ids = prev.map((m) => m.movie_id);
      const map = Object.fromEntries(movies.map((m) => [m.movie_id, m]));
      return [
        ...ids.filter((id) => map[id]).map((id) => map[id]),
        ...movies.filter((m) => !ids.includes(m.movie_id)),
      ];
    });
  }, [movies]);

  const handleDelete = async (id) => {
    await deleteMovie(id);
    showToast("Đã xoá.", "success");
    load();
  };
  const handleToggle = async (id) => {
    await toggleWatched(id);
    load();
  };
  const handleSaveNote = async (id) => {
    await updateNote(id, editNote[id] ?? "");
    showToast("Đã lưu.", "success");
    setEditNote((p) => {
      const x = { ...p };
      delete x[id];
      return x;
    });
    load();
  };
  const handleCreateCol = async () => {
    if (!newColName.trim()) return;
    await createCollection({ name: newColName.trim() });
    showToast(`Tạo "${newColName}" thành công!`, "success");
    setNewColName("");
    load();
  };
  const handleDeleteCol = async (id) => {
    await deleteCollection(id);
    if (activeCol === id) {
      setActiveCol(null);
      setViewMode("list");
    }
    showToast("Đã xoá bộ sưu tập.", "success");
    load();
  };
  const handleMoveCol = async (mid, cid) => {
    await moveToCollection(mid, cid || null);
    showToast("Đã cập nhật.", "success");
    load();
  };
  const handleLoadShare = async () => {
    const r = await getShareLink();
    setShareInfo(r.data);
    setShowShare(true);
  };
  const handleToggleShare = async () => {
    const r = await toggleShareLink();
    setShareInfo(r.data);
    showToast(
      r.data.is_active ? "Đã bật chia sẻ." : "Đã tắt chia sẻ.",
      "success",
    );
  };
  const handleReorder = (list) => {
    setOrdered(list);
    saveOrder(
      uid,
      activeCol,
      list.map((m) => m.movie_id),
    );
  };
  const openDetail = (colId) => {
    setActiveCol(colId);
    setViewMode("detail");
  };

  if (!isLoggedIn) return null;

  const pct =
    stats?.total > 0 ? Math.round((stats.watched / stats.total) * 100) : 0;
  const activeColObj = collections.find((c) => c.id === activeCol);

  const sidebarProps = {
    stats,
    collections,
    activeCol,
    newColName,
    setNewColName,
    onSelectAll: () => {
      setActiveCol(null);
      setViewMode("list");
    },
    onOpenDetail: openDetail,
    onDeleteCol: handleDeleteCol,
    onCreateCol: handleCreateCol,
    onClose: () => setDrawerOpen(false),
  };

  return (
    <div
      style={{
        background: "var(--bg-page)",
        minHeight: "100vh",
        color: "var(--text-primary)",
        fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
        paddingTop: 60,
      }}
    >
      <Navbar />

      {/* ════════════════════════════════
          DASHBOARD HEADER
      ════════════════════════════════ */}
      <div
        style={{
          ...w.dashHeader,
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(12px)",
          transition:
            "opacity 0.45s ease, transform 0.45s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Title row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 4px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--text-faint)",
              }}
            >
              Trang cá nhân
            </p>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "clamp(28px,4vw,42px)",
                fontWeight: 400,
                letterSpacing: "0.04em",
                lineHeight: 1,
              }}
            >
              {viewMode === "detail" && activeColObj
                ? activeColObj.name
                : "My Watchlist"}
            </h1>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {viewMode !== "list" && viewMode !== "grid" && (
              <button
                style={w.btnGhost}
                onClick={() => {
                  setViewMode("list");
                  setActiveCol(null);
                }}
              >
                ← Quay lại
              </button>
            )}
            {(viewMode === "list" || viewMode === "grid") && (
              <>
                {/* List / Grid toggle */}
                <div style={w.viewToggle}>
                  <button
                    style={{
                      ...w.viewToggleBtn,
                      ...(listView === "list" ? w.viewToggleBtnActive : {}),
                    }}
                    onClick={() => {
                      setListView("list");
                      setViewMode("list");
                    }}
                  >
                    <IconList />
                  </button>
                  <button
                    style={{
                      ...w.viewToggleBtn,
                      ...(listView === "grid" ? w.viewToggleBtnActive : {}),
                    }}
                    onClick={() => {
                      setListView("grid");
                      setViewMode("grid");
                    }}
                  >
                    <IconGrid />
                  </button>
                </div>
                <button style={w.btnGhost} onClick={handleLoadShare}>
                  <IconShare /> <span>Chia sẻ</span>
                </button>
              </>
            )}
            <Link to="/" style={{ ...w.btnPrimary, textDecoration: "none" }}>
              ← Trang chủ
            </Link>
          </div>
        </div>

        {/* Share panel */}
        {showShare && shareInfo && (
          <SharePanel
            shareInfo={shareInfo}
            onToggle={handleToggleShare}
            onClose={() => setShowShare(false)}
          />
        )}

        {/* Stat cards row */}
        {stats && (viewMode === "list" || viewMode === "grid") && (
          <div style={w.statsRow}>
            <StatCard
              icon="🎬"
              label="Phim đã lưu"
              value={stats.total}
              accent="#3b82f6"
            />
            <StatCard
              icon="✓"
              label="Đã xem"
              value={stats.watched}
              accent="#22c55e"
            />
            <StatCard
              icon="⏳"
              label="Chưa xem"
              value={stats.unwatched ?? stats.total - stats.watched}
              accent="#eab308"
            />
            <StatCard
              icon="⏱"
              label="Tổng thời gian"
              value={fmt(stats.total_runtime_minutes)}
              accent="#8b5cf6"
            />
            <StatCard
              icon="📈"
              label="Hoàn thành"
              value={`${pct}%`}
              accent="var(--red)"
              sub={`${stats.watched}/${stats.total}`}
            />
          </div>
        )}

        {/* Progress bar */}
        {stats && (viewMode === "list" || viewMode === "grid") && (
          <div style={{ marginTop: 12 }}>
            <ProgressBar pct={pct} />
          </div>
        )}
      </div>

      {/* ════════════════════════════════
          MAIN LAYOUT
      ════════════════════════════════ */}
      <div style={w.body}>
        {viewMode === "list" || viewMode === "grid" ? (
          <div
            style={
              isMobile ? { display: "flex", flexDirection: "column" } : w.layout
            }
          >
            {/* Desktop sidebar */}
            {!isMobile && (
              <aside>
                <Sidebar {...sidebarProps} isMobile={false} />
              </aside>
            )}

            {/* Mobile collection chips */}
            {isMobile && (
              <div style={w.chipBar}>
                <button
                  onClick={() => setActiveCol(null)}
                  style={{
                    ...w.chip,
                    ...(activeCol === null ? w.chipActive : {}),
                  }}
                >
                  ▣ Tất cả <span style={w.chipCount}>{stats?.total ?? 0}</span>
                </button>
                {collections.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => openDetail(col.id)}
                    style={{
                      ...w.chip,
                      ...(activeCol === col.id ? w.chipActive : {}),
                    }}
                  >
                    ◈ {col.name}{" "}
                    <span style={w.chipCount}>{col.movie_count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Main content */}
            <main style={{ flex: 1, minWidth: 0 }}>
              {loading ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "48px 0",
                  }}
                >
                  <div style={w.spinner} />{" "}
                  <span style={{ color: "var(--text-faint)" }}>
                    Đang tải...
                  </span>
                </div>
              ) : orderedMovies.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 14,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: "var(--text-faint)",
                      }}
                    >
                      {orderedMovies.length} phim
                    </p>
                    {listView === "list" && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          color: "var(--text-dim)",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span style={{ opacity: 0.5 }}>⠿</span> Kéo thả để sắp
                        xếp
                      </p>
                    )}
                  </div>
                  <DraggableList
                    movies={orderedMovies}
                    viewMode={listView}
                    collections={collections}
                    editNote={editNote}
                    setEditNote={setEditNote}
                    onDelete={handleDelete}
                    onToggleWatched={handleToggle}
                    onSaveNote={handleSaveNote}
                    onMoveCol={handleMoveCol}
                    onReorder={handleReorder}
                  />
                </>
              )}
            </main>
          </div>
        ) : viewMode === "detail" ? (
          /* Collection detail */
          <CollectionDetail
            collection={activeColObj}
            movies={orderedMovies}
            collections={collections}
            editNote={editNote}
            setEditNote={setEditNote}
            loading={loading}
            listView={listView}
            setListView={setListView}
            onDelete={handleDelete}
            onToggleWatched={handleToggle}
            onSaveNote={handleSaveNote}
            onMoveCol={handleMoveCol}
            onReorder={handleReorder}
            onDeleteCol={() => handleDeleteCol(activeCol)}
          />
        ) : null}
      </div>

      {/* Mobile FAB */}
      {isMobile && (viewMode === "list" || viewMode === "grid") && (
        <button onClick={() => setDrawerOpen(true)} style={w.fab}>
          ◈
          {collections.length > 0 && (
            <span style={w.fabBadge}>{collections.length}</span>
          )}
        </button>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <Sidebar {...sidebarProps} isMobile={true} />
        </Drawer>
      )}

      <style>{`
        [draggable=true] { cursor: grab; }
        [draggable=true]:active { cursor: grabbing; }
        ::-webkit-scrollbar { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

/* ── Collection Detail ───────────────────────────── */
function CollectionDetail({
  collection,
  movies,
  collections,
  editNote,
  setEditNote,
  loading,
  listView,
  setListView,
  onDelete,
  onToggleWatched,
  onSaveNote,
  onMoveCol,
  onReorder,
  onDeleteCol,
}) {
  const [filter, setFilter] = useState("all");
  const filtered =
    filter === "watched"
      ? movies.filter((m) => m.is_watched)
      : filter === "unwatched"
        ? movies.filter((m) => !m.is_watched)
        : movies;
  const pct =
    movies.length > 0
      ? Math.round(
          (movies.filter((m) => m.is_watched).length / movies.length) * 100,
        )
      : 0;

  return (
    <div>
      {/* Progress */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "16px 20px",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            Tiến độ xem
          </span>
          <span
            style={{ fontSize: 12, color: "var(--red-text)", fontWeight: 700 }}
          >
            {pct}%
          </span>
        </div>
        <ProgressBar pct={pct} />
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { key: "all", label: "Tất cả" },
            { key: "watched", label: "✓ Đã xem" },
            { key: "unwatched", label: "⏳ Chưa xem" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                ...w.filterPill,
                ...(filter === key ? w.filterPillActive : {}),
              }}
              onMouseEnter={(e) => {
                if (filter !== key)
                  e.currentTarget.style.borderColor = "var(--border-bright)";
              }}
              onMouseLeave={(e) => {
                if (filter !== key)
                  e.currentTarget.style.borderColor = "var(--border-mid)";
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={w.viewToggle}>
            <button
              style={{
                ...w.viewToggleBtn,
                ...(listView === "list" ? w.viewToggleBtnActive : {}),
              }}
              onClick={() => setListView("list")}
            >
              <IconList />
            </button>
            <button
              style={{
                ...w.viewToggleBtn,
                ...(listView === "grid" ? w.viewToggleBtnActive : {}),
              }}
              onClick={() => setListView("grid")}
            >
              <IconGrid />
            </button>
          </div>
          <button
            onClick={onDeleteCol}
            style={{
              ...w.btnGhost,
              color: "#ef4444",
              borderColor: "rgba(239,68,68,0.3)",
              fontSize: 12,
              padding: "6px 12px",
            }}
          >
            <IconTrash /> Xoá collection
          </button>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "40px 0",
          }}
        >
          <div style={w.spinner} />{" "}
          <span style={{ color: "var(--text-faint)" }}>Đang tải...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <DraggableList
          movies={filtered}
          viewMode={listView}
          collections={collections}
          editNote={editNote}
          setEditNote={setEditNote}
          onDelete={onDelete}
          onToggleWatched={onToggleWatched}
          onSaveNote={onSaveNote}
          onMoveCol={onMoveCol}
          onReorder={filter === "all" ? onReorder : null}
        />
      )}
    </div>
  );
}

/* ── Styles ─────────────────────────────────────── */
const w = {
  /* Dashboard header */
  dashHeader: {
    padding: "clamp(20px,4vh,36px) clamp(20px,5vw,48px) 24px",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg-surface, #0e1218)",
  },

  /* Stat cards */
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: 12,
    marginTop: 20,
  },
  statCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "16px 18px",
    transition: "border-color 0.18s ease",
  },

  /* Body layout */
  body: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "28px clamp(16px,4vw,48px) 60px",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "220px 1fr",
    gap: 28,
    alignItems: "start",
  },

  /* Sidebar */
  sidebar: {
    position: "sticky",
    top: "calc(60px + 20px)",
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-xl)",
    padding: "20px 16px",
  },
  sidebarMobile: { padding: "4px 0 8px" },
  sideStats: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    padding: "12px 10px",
    background: "var(--bg-card)",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border)",
  },
  sideStat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    flex: 1,
  },
  sideStatDivider: {
    width: 1,
    height: 28,
    background: "var(--border)",
    flexShrink: 0,
  },

  /* Collection buttons */
  colBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "9px 10px",
    background: "transparent",
    border: "none",
    borderRadius: "var(--radius-md)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 2,
    fontFamily: "var(--font-body, sans-serif)",
    textAlign: "left",
    transition: "background 0.15s ease, color 0.15s ease",
  },
  colBtnActive: {
    background: "var(--red-dim)",
    color: "var(--red-text)",
    fontWeight: 700,
  },
  colCount: {
    fontSize: 10,
    fontWeight: 600,
    background: "var(--border-mid)",
    borderRadius: "var(--radius-full)",
    padding: "1px 7px",
    color: "var(--text-faint)",
    flexShrink: 0,
  },
  colDeleteBtn: {
    width: 26,
    height: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    color: "var(--text-faint)",
    cursor: "pointer",
    borderRadius: "var(--radius-sm)",
    transition: "color 0.15s ease",
    flexShrink: 0,
    padding: 0,
  },
  colInput: {
    flex: 1,
    padding: "8px 10px",
    background: "var(--bg-input)",
    border: "1px solid var(--border-mid)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: 12,
    fontFamily: "var(--font-body,sans-serif)",
    outline: "none",
    transition: "border-color 0.18s ease",
  },
  addBtn: {
    width: 34,
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--red)",
    border: "none",
    borderRadius: "var(--radius-md)",
    color: "#fff",
    cursor: "pointer",
    flexShrink: 0,
    transition: "background 0.18s ease, box-shadow 0.18s ease",
  },

  /* View toggle */
  viewToggle: {
    display: "flex",
    background: "var(--bg-card)",
    border: "1px solid var(--border-mid)",
    borderRadius: "var(--radius-md)",
    overflow: "hidden",
  },
  viewToggleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    transition: "background 0.15s ease, color 0.15s ease",
  },
  viewToggleBtnActive: {
    background: "var(--red-dim)",
    color: "var(--red-text)",
  },

  /* Buttons */
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    background: "var(--red)",
    border: "none",
    color: "#fff",
    padding: "9px 18px",
    borderRadius: "var(--radius-md)",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.04em",
    cursor: "pointer",
    fontFamily: "var(--font-body, sans-serif)",
    boxShadow: "0 4px 16px rgba(229,9,20,0.3)",
    transition: "background 0.18s ease",
  },
  btnGhost: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    background: "var(--bg-card)",
    border: "1px solid var(--border-mid)",
    color: "var(--text-secondary)",
    padding: "9px 16px",
    borderRadius: "var(--radius-md)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "var(--font-body, sans-serif)",
    transition: "border-color 0.15s ease, background 0.15s ease",
  },

  /* List card */
  listCard: {
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "12px 16px",
    transition: "border-color 0.18s ease, box-shadow 0.18s ease",
  },
  listCardHov: {
    borderColor: "var(--border-bright)",
    boxShadow: "var(--shadow-hover)",
  },
  listCardWatched: { opacity: 0.65 },
  dragHandle: {
    display: "flex",
    alignItems: "center",
    paddingRight: 4,
    cursor: "grab",
    color: "var(--text-faint)",
    flexShrink: 0,
    marginTop: 4,
  },
  listInfo: { flex: 1, minWidth: 0 },
  listTitle: {
    margin: "0 0 6px",
    fontSize: 15,
    fontWeight: 700,
    color: "var(--text-primary)",
    lineHeight: 1.3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  watchBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 10,
    fontWeight: 700,
    padding: "3px 9px",
    borderRadius: "var(--radius-full)",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  watchBadgeWatched: {
    background: "rgba(34,197,94,0.14)",
    color: "var(--green)",
    border: "1px solid rgba(34,197,94,0.3)",
  },
  watchBadgePending: {
    background: "var(--border)",
    color: "var(--text-muted)",
    border: "1px solid var(--border-mid)",
  },
  notePreview: {
    margin: "4px 0 0",
    fontSize: 12,
    color: "var(--text-faint)",
    fontStyle: "italic",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  noteArea: {
    width: "100%",
    padding: "9px 12px",
    background: "var(--bg-input)",
    border: "1px solid var(--border-mid)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: 13,
    fontFamily: "var(--font-body,sans-serif)",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.18s ease",
  },
  listActions: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 10,
  },
  colSelect: {
    background: "var(--bg-input)",
    border: "1px solid var(--border-mid)",
    borderRadius: "var(--radius-sm)",
    color: "var(--text-muted)",
    fontSize: 11,
    padding: "5px 8px",
    cursor: "pointer",
    outline: "none",
    fontFamily: "var(--font-body,sans-serif)",
    maxWidth: 180,
  },
  actionBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    borderRadius: "var(--radius-sm)",
    padding: "5px 10px",
    fontSize: 11,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "var(--font-body,sans-serif)",
    transition: "background 0.15s ease",
  },
  actionBtnGreen: {
    color: "var(--green)",
    borderColor: "rgba(34,197,94,0.35)",
  },
  actionBtnDanger: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    color: "var(--red-text)",
    borderRadius: "var(--radius-sm)",
    padding: "5px 10px",
    fontSize: 11,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "var(--font-body,sans-serif)",
    transition: "background 0.15s ease, border-color 0.15s ease",
  },
  btnXs: {
    background: "var(--bg-card2)",
    border: "1px solid var(--border-mid)",
    color: "var(--text-primary)",
    padding: "5px 12px",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "var(--font-body,sans-serif)",
  },

  /* Grid */
  gridLayout: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: 14,
  },
  gridCard: {
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    cursor: "pointer",
    transition:
      "transform 0.3s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.3s ease",
  },
  gridWatchedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "var(--green)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 8px rgba(34,197,94,0.5)",
  },
  gridTitle: {
    margin: "0 0 4px",
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text-primary)",
    lineHeight: 1.3,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  gridBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--text-muted)",
    borderRadius: "var(--radius-sm)",
    padding: "5px 0",
    fontSize: 10,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "var(--font-body,sans-serif)",
    transition: "background 0.15s ease",
  },

  /* Filter pills */
  filterPill: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-mid)",
    borderRadius: "var(--radius-full)",
    color: "var(--text-muted)",
    padding: "6px 14px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "var(--font-body,sans-serif)",
    transition: "border-color 0.15s ease",
  },
  filterPillActive: {
    background: "var(--red-dim)",
    borderColor: "var(--red-border)",
    color: "var(--red-text)",
    fontWeight: 700,
  },

  /* Share panel */
  sharePanel: {
    background: "var(--bg-card)",
    border: "1px solid var(--red-border)",
    borderRadius: "var(--radius-lg)",
    padding: "16px 18px",
    marginBottom: 20,
    boxShadow: "0 4px 20px rgba(229,9,20,0.1)",
  },
  shareInput: {
    flex: 1,
    padding: "9px 12px",
    background: "var(--bg-input)",
    border: "1px solid var(--border-mid)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: 13,
    fontFamily: "var(--font-body,sans-serif)",
    outline: "none",
  },

  /* Mobile chips */
  chipBar: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    scrollbarWidth: "none",
    paddingBottom: 14,
    marginBottom: 4,
  },
  chip: {
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "var(--bg-card)",
    border: "1px solid var(--border-mid)",
    color: "var(--text-muted)",
    borderRadius: "var(--radius-full)",
    padding: "7px 14px",
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "var(--font-body,sans-serif)",
    transition: "all 0.15s ease",
  },
  chipActive: {
    background: "var(--red-dim)",
    borderColor: "var(--red-border)",
    color: "var(--red-text)",
    fontWeight: 700,
  },
  chipCount: {
    fontSize: 10,
    background: "var(--border-mid)",
    borderRadius: "var(--radius-full)",
    padding: "1px 6px",
    color: "var(--text-faint)",
  },

  /* FAB */
  fab: {
    position: "fixed",
    bottom: 24,
    right: 24,
    zIndex: 300,
    width: 50,
    height: 50,
    borderRadius: "50%",
    background: "var(--red)",
    border: "none",
    color: "#fff",
    fontSize: 18,
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(229,9,20,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.18s ease",
  },
  fabBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    background: "#fff",
    color: "var(--red)",
    borderRadius: "50%",
    width: 18,
    height: 18,
    fontSize: 10,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid var(--red)",
  },

  /* Spinner */
  spinner: {
    width: 20,
    height: 20,
    flexShrink: 0,
    border: "2px solid rgba(255,255,255,0.08)",
    borderTop: "2px solid var(--red)",
    borderRadius: "50%",
    animation: "spin 0.75s linear infinite",
  },
};

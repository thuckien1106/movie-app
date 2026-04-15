import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  getWatchlist,
  deleteMovie,
  toggleWatched,
  updateNote,
  getWatchlistStats,
  backfillRuntime,
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

/* ─── useDebounce ────────────────────────────────── */
function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
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
const IconSearch = () => (
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
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconDownload = () => (
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
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const IconCSV = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="12" y2="17" />
  </svg>
);
const IconPDF = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="15" x2="15" y2="15" />
    <line x1="9" y1="11" x2="15" y2="11" />
  </svg>
);
const IconX = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
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
    <div
      style={{
        ...w.statCard,
        borderTop: `2px solid ${accent}`,
        background: `linear-gradient(160deg, var(--bg-card) 0%, var(--bg-card2) 100%)`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            flexShrink: 0,
            background: `${accent}1a`,
            border: `1px solid ${accent}33`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          {icon}
        </div>
        {sub && (
          <span
            style={{
              fontSize: 10,
              color: "var(--text-faint)",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: "var(--border)",
              borderRadius: 99,
              padding: "2px 7px",
            }}
          >
            {sub}
          </span>
        )}
      </div>
      <p
        style={{
          margin: "0 0 3px",
          fontSize: 26,
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
  maxCollections = 20,
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-faint)",
            }}
          >
            TẠO MỚI
          </p>
          <span
            style={{
              fontSize: 10,
              color:
                collections.length >= maxCollections
                  ? "var(--red-text)"
                  : "var(--text-faint)",
              fontWeight: 600,
            }}
          >
            {collections.length}/{maxCollections}
          </span>
        </div>

        {collections.length >= maxCollections ? (
          <p
            style={{
              fontSize: 11,
              color: "var(--text-faint)",
              fontStyle: "italic",
              lineHeight: 1.5,
              margin: 0,
              padding: "8px 10px",
              background: "var(--bg-card)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
            }}
          >
            Đã đạt giới hạn {maxCollections} bộ sưu tập. Xoá bớt để tạo mới.
          </p>
        ) : (
          <>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={newColName}
                onChange={(e) => setNewColName(e.target.value.slice(0, 100))}
                onKeyDown={(e) => e.key === "Enter" && onCreateCol()}
                placeholder="Tên bộ sưu tập..."
                maxLength={100}
                style={w.colInput}
                onFocus={(e) =>
                  (e.target.style.borderColor = "var(--red-border)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "var(--border-mid)")
                }
              />
              <button
                onClick={onCreateCol}
                disabled={!newColName.trim()}
                style={{
                  ...w.addBtn,
                  opacity: newColName.trim() ? 1 : 0.4,
                  cursor: newColName.trim() ? "pointer" : "not-allowed",
                }}
                title="Tạo"
                onMouseEnter={(e) => {
                  if (!newColName.trim()) return;
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
            {newColName.length > 80 && (
              <p
                style={{
                  margin: "5px 0 0",
                  fontSize: 10,
                  color:
                    newColName.length >= 100
                      ? "var(--red-text)"
                      : "var(--text-faint)",
                }}
              >
                {newColName.length}/100 ký tự
              </p>
            )}
          </>
        )}
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
        transform: hov ? "translateY(-6px)" : "none",
        boxShadow: hov
          ? "0 20px 48px rgba(0,0,0,0.8), 0 0 0 1.5px rgba(229,9,20,0.45)"
          : "var(--shadow-card)",
        borderColor: hov ? "rgba(229,9,20,0.35)" : "var(--border)",
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

/* ══════════════════════════════════════════════
   EXPORT UTILITIES
══════════════════════════════════════════════ */

const GENRE_MAP = {
  28: "Hành động",
  12: "Phiêu lưu",
  16: "Hoạt hình",
  35: "Hài",
  80: "Tội phạm",
  99: "Tài liệu",
  18: "Chính kịch",
  10751: "Gia đình",
  14: "Kỳ ảo",
  36: "Lịch sử",
  27: "Kinh dị",
  10402: "Âm nhạc",
  9648: "Bí ẩn",
  10749: "Lãng mạn",
  878: "Sci-Fi",
  53: "Giật gân",
  10752: "Chiến tranh",
  37: "Cao bồi",
};

function fmtRuntime(min) {
  if (!min || min < 1) return "";
  const h = Math.floor(min / 60),
    m = min % 60;
  return h > 0 ? `${h}g ${m}p` : `${m}p`;
}
function fmtDateVN(isoStr) {
  if (!isoStr) return "";
  try {
    return new Date(isoStr).toLocaleDateString("vi-VN");
  } catch {
    return "";
  }
}
function mapGenres(genreIdsStr) {
  if (!genreIdsStr) return "";
  return genreIdsStr
    .split(",")
    .map((id) => GENRE_MAP[parseInt(id.trim())] || id.trim())
    .filter(Boolean)
    .join(", ");
}

/* ── CSV export ─────────────────────────────── */
function exportCSV(movies, collections, username) {
  const colMap = Object.fromEntries(collections.map((c) => [c.id, c.name]));
  const headers = [
    "STT",
    "Tên phim",
    "Trạng thái",
    "Bộ sưu tập",
    "Thể loại",
    "Thời lượng",
    "Ghi chú",
    "Ngày thêm",
    "Ngày xem",
    "TMDB ID",
  ];

  const escape = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const rows = movies.map((m, i) =>
    [
      i + 1,
      m.title,
      m.is_watched ? "Đã xem" : "Chưa xem",
      m.collection_id ? (colMap[m.collection_id] ?? "") : "",
      mapGenres(m.genre_ids),
      fmtRuntime(m.runtime),
      m.note ?? "",
      fmtDateVN(m.added_at),
      fmtDateVN(m.watched_at),
      m.movie_id,
    ]
      .map(escape)
      .join(","),
  );

  const BOM = "\uFEFF"; // UTF-8 BOM cho Excel đọc đúng tiếng Việt
  const content = BOM + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `watchlist_${username || "my"}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── PDF export (print) ─────────────────────── */
function exportPDF(movies, collections, stats, username) {
  const colMap = Object.fromEntries(collections.map((c) => [c.id, c.name]));
  const watched = movies.filter((m) => m.is_watched).length;
  const pct =
    movies.length > 0 ? Math.round((watched / movies.length) * 100) : 0;
  const total_runtime = movies.reduce((s, m) => s + (m.runtime || 0), 0);

  const rows = movies
    .map(
      (m, i) => `
    <tr class="${m.is_watched ? "watched" : ""}">
      <td class="num">${i + 1}</td>
      <td class="title">${m.title.replace(/</g, "&lt;")}</td>
      <td class="status">${
        m.is_watched
          ? `<span class="badge-watched">✓ Đã xem</span>`
          : `<span class="badge-unwatched">Chưa xem</span>`
      }</td>
      <td>${m.collection_id ? (colMap[m.collection_id] ?? "") : ""}</td>
      <td>${mapGenres(m.genre_ids)}</td>
      <td>${fmtRuntime(m.runtime)}</td>
      <td class="note">${(m.note ?? "").replace(/</g, "&lt;")}</td>
      <td>${fmtDateVN(m.added_at)}</td>
    </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Watchlist – ${username || "My"}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4 landscape; margin: 14mm 12mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9pt; color: #1a1a1a; background: #fff; }

  .header { display: flex; justify-content: space-between; align-items: flex-end;
            padding-bottom: 10px; border-bottom: 2px solid #e50914; margin-bottom: 12px; }
  .header-left h1 { font-size: 20pt; font-weight: 800; letter-spacing: -0.02em; color: #0d0d0d; }
  .header-left p  { font-size: 8pt; color: #888; margin-top: 3px; }
  .header-right   { text-align: right; font-size: 8pt; color: #666; }

  .stats { display: flex; gap: 16px; margin-bottom: 14px; }
  .stat  { background: #f7f7f7; border-radius: 8px; padding: 8px 14px; text-align: center; }
  .stat-val  { font-size: 15pt; font-weight: 800; color: #0d0d0d; }
  .stat-lbl  { font-size: 7pt; color: #888; text-transform: uppercase; letter-spacing: 0.06em; }

  .prog-wrap  { margin-bottom: 14px; }
  .prog-label { font-size: 8pt; color: #666; margin-bottom: 4px; }
  .prog-track { height: 6px; background: #eee; border-radius: 3px; overflow: hidden; }
  .prog-fill  { height: 100%; background: linear-gradient(90deg,#e50914,#ff6b35); border-radius: 3px; width: ${pct}%; }

  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #0d0d0d; color: #fff; }
  thead th { padding: 7px 8px; text-align: left; font-size: 7.5pt; font-weight: 700;
             letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; }
  tbody tr { border-bottom: 1px solid #f0f0f0; }
  tbody tr:nth-child(even) { background: #fafafa; }
  tbody tr.watched { opacity: 0.75; }
  td { padding: 5px 8px; font-size: 8.5pt; vertical-align: top; }
  td.num   { color: #aaa; width: 28px; text-align: right; padding-right: 12px; }
  td.title { font-weight: 600; max-width: 200px; }
  td.note  { color: #666; font-style: italic; max-width: 130px; font-size: 7.5pt; }
  td.status { white-space: nowrap; }

  .badge-watched   { background: #dcfce7; color: #166534; padding: 2px 7px; border-radius: 10px; font-size: 7.5pt; font-weight: 700; }
  .badge-unwatched { background: #fef9c3; color: #854d0e; padding: 2px 7px; border-radius: 10px; font-size: 7.5pt; font-weight: 600; }

  .footer { margin-top: 12px; padding-top: 8px; border-top: 1px solid #eee;
            font-size: 7pt; color: #bbb; display: flex; justify-content: space-between; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>🎬 My Watchlist</h1>
      <p>${username ? `@${username} · ` : ""}Xuất ngày ${fmtDateVN(new Date().toISOString())}</p>
    </div>
    <div class="header-right">
      Films App<br>films.app
    </div>
  </div>

  <div class="stats">
    <div class="stat"><div class="stat-val">${movies.length}</div><div class="stat-lbl">Tổng phim</div></div>
    <div class="stat"><div class="stat-val" style="color:#16a34a">${watched}</div><div class="stat-lbl">Đã xem</div></div>
    <div class="stat"><div class="stat-val" style="color:#b45309">${movies.length - watched}</div><div class="stat-lbl">Chưa xem</div></div>
    <div class="stat"><div class="stat-val">${pct}%</div><div class="stat-lbl">Hoàn thành</div></div>
    ${total_runtime > 0 ? `<div class="stat"><div class="stat-val">${fmtRuntime(total_runtime)}</div><div class="stat-lbl">Tổng TG</div></div>` : ""}
    ${collections.length > 0 ? `<div class="stat"><div class="stat-val">${collections.length}</div><div class="stat-lbl">Bộ sưu tập</div></div>` : ""}
  </div>

  <div class="prog-wrap">
    <div class="prog-label">${pct}% đã xem</div>
    <div class="prog-track"><div class="prog-fill"></div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th><th>Tên phim</th><th>Trạng thái</th><th>Bộ sưu tập</th>
        <th>Thể loại</th><th>Thời lượng</th><th>Ghi chú</th><th>Ngày thêm</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    <span>Films App – Watchlist Export</span>
    <span>Tổng ${movies.length} phim · ${fmtDateVN(new Date().toISOString())}</span>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=1100,height=750");
  if (!win) {
    alert("Vui lòng cho phép popup để xuất PDF.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}

/* ── Export Panel ───────────────────────────── */
function ExportPanel({ movies, collections, stats, username, onClose }) {
  const [exporting, setExporting] = useState(null); // "csv"|"pdf"|null

  const handleCSV = async () => {
    setExporting("csv");
    try {
      exportCSV(movies, collections, username);
    } finally {
      setTimeout(() => setExporting(null), 800);
    }
  };
  const handlePDF = async () => {
    setExporting("pdf");
    try {
      exportPDF(movies, collections, stats, username);
    } finally {
      setTimeout(() => setExporting(null), 600);
    }
  };

  const watched = movies.filter((m) => m.is_watched).length;
  const unwatched = movies.length - watched;

  return (
    <div style={w.exportPanel}>
      {/* Header */}
      <div style={w.exportHeader}>
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
            Xuất danh sách phim
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

      {/* Summary row */}
      <div style={w.exportSummary}>
        <span style={w.exportSummaryChip}>
          <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>
            {movies.length}
          </span>{" "}
          phim
        </span>
        <span style={w.exportSummaryChip}>
          <span style={{ color: "var(--green)", fontWeight: 700 }}>
            {watched}
          </span>{" "}
          đã xem
        </span>
        <span style={w.exportSummaryChip}>
          <span style={{ color: "#eab308", fontWeight: 700 }}>{unwatched}</span>{" "}
          chưa xem
        </span>
        {collections.length > 0 && (
          <span style={w.exportSummaryChip}>
            <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>
              {collections.length}
            </span>{" "}
            bộ sưu tập
          </span>
        )}
      </div>

      {/* Format cards */}
      <div style={w.exportCards}>
        {/* CSV */}
        <div style={w.exportCard}>
          <div style={w.exportCardIcon}>
            <IconCSV />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={w.exportCardTitle}>CSV / Excel</p>
            <p style={w.exportCardDesc}>
              Mở bằng Excel, Google Sheets. Có đủ tên phim, trạng thái, thể
              loại, ghi chú, ngày thêm.
            </p>
          </div>
          <button
            onClick={handleCSV}
            disabled={!!exporting}
            style={{
              ...w.exportBtn,
              opacity: exporting ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!exporting)
                e.currentTarget.style.background = "var(--bg-card2)";
            }}
            onMouseLeave={(e) => {
              if (!exporting)
                e.currentTarget.style.background = "var(--bg-card)";
            }}
          >
            {exporting === "csv" ? (
              "Đang tạo…"
            ) : (
              <>
                <IconDownload /> CSV
              </>
            )}
          </button>
        </div>

        {/* PDF */}
        <div style={w.exportCard}>
          <div
            style={{
              ...w.exportCardIcon,
              background: "rgba(229,9,20,0.1)",
              color: "var(--red-text)",
            }}
          >
            <IconPDF />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={w.exportCardTitle}>PDF / In</p>
            <p style={w.exportCardDesc}>
              Trang A4 ngang, có stats tổng quan, progress bar và bảng phim đầy
              đủ.
            </p>
          </div>
          <button
            onClick={handlePDF}
            disabled={!!exporting}
            style={{
              ...w.exportBtn,
              opacity: exporting ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!exporting)
                e.currentTarget.style.background = "var(--bg-card2)";
            }}
            onMouseLeave={(e) => {
              if (!exporting)
                e.currentTarget.style.background = "var(--bg-card)";
            }}
          >
            {exporting === "pdf" ? (
              "Đang tạo…"
            ) : (
              <>
                <IconDownload /> PDF
              </>
            )}
          </button>
        </div>
      </div>

      <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
        * PDF mở tab mới → chọn Save as PDF trong hộp thoại in.
      </p>
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

/* ── Search + Filter Bar ────────────────────────── */
const STATUS_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "unwatched", label: "Chưa xem" },
  { value: "watched", label: "Đã xem" },
];

function SearchFilterBar({
  query,
  onQuery,
  status,
  onStatus,
  total,
  filtered,
}) {
  const inputRef = useRef(null);
  const hasFilter = query.length > 0 || status !== "all";

  return (
    <div style={w.searchBar}>
      {/* Search input */}
      <div style={w.searchInputWrap}>
        <span style={w.searchIcon}>
          <IconSearch />
        </span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Tìm phim trong watchlist…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          style={w.searchInput}
        />
        {query.length > 0 && (
          <button
            style={w.searchClearBtn}
            onClick={() => {
              onQuery("");
              inputRef.current?.focus();
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-faint)")
            }
          >
            <IconX />
          </button>
        )}
      </div>

      {/* Status filter pills */}
      <div style={w.filterPills}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onStatus(f.value)}
            style={{
              ...w.filterPill,
              ...(status === f.value ? w.filterPillActive : {}),
            }}
            onMouseEnter={(e) => {
              if (status !== f.value)
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
            }}
            onMouseLeave={(e) => {
              if (status !== f.value)
                e.currentTarget.style.borderColor = "var(--border-mid)";
            }}
          >
            {f.value === "watched" && <span style={w.filterDotGreen} />}
            {f.value === "unwatched" && <span style={w.filterDotYellow} />}
            {f.label}
          </button>
        ))}
      </div>

      {/* Result count — chỉ show khi đang filter */}
      {hasFilter && (
        <div style={w.searchResultInfo}>
          <span style={{ color: "var(--text-faint)", fontSize: 12 }}>
            {filtered === 0
              ? "Không tìm thấy phim nào"
              : `${filtered} / ${total} phim`}
          </span>
          <button
            style={w.resetFilterBtn}
            onClick={() => {
              onQuery("");
              onStatus("all");
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--red-text)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-faint)")
            }
          >
            Xóa bộ lọc
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Empty state khi search không có kết quả ──── */
function EmptySearch({ query, status, onReset }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 20px" }}>
      <p style={{ fontSize: 44, marginBottom: 12 }}>🔍</p>
      <p
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "var(--text-secondary)",
          marginBottom: 6,
        }}
      >
        Không tìm thấy kết quả
      </p>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-faint)",
          marginBottom: 20,
          lineHeight: 1.6,
        }}
      >
        {query && (
          <span>
            Không có phim nào khớp với{" "}
            <strong style={{ color: "var(--text-secondary)" }}>
              "{query}"
            </strong>
          </span>
        )}
        {query && status !== "all" && <span> trong mục </span>}
        {status === "watched" && (
          <span>
            <strong style={{ color: "var(--green)" }}>Đã xem</strong>
          </span>
        )}
        {status === "unwatched" && (
          <span>
            <strong style={{ color: "#eab308" }}>Chưa xem</strong>
          </span>
        )}
      </p>
      <button
        onClick={onReset}
        style={{ ...w.btnGhost, display: "inline-flex" }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.borderColor = "var(--border-mid)")
        }
      >
        Xóa bộ lọc
      </button>
    </div>
  );
}

/* ── Empty state ────────────────────────────────── */
function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "72px 20px" }}>
      <div style={{ display: "inline-block", marginBottom: 20, opacity: 0.6 }}>
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <rect
            x="10"
            y="16"
            width="38"
            height="52"
            rx="4"
            fill="rgba(229,9,20,0.12)"
            stroke="rgba(229,9,20,0.3)"
            strokeWidth="1.5"
          />
          <rect
            x="14"
            y="22"
            width="30"
            height="4"
            rx="2"
            fill="rgba(229,9,20,0.25)"
          />
          <rect
            x="14"
            y="30"
            width="22"
            height="3"
            rx="1.5"
            fill="rgba(255,255,255,0.1)"
          />
          <rect
            x="14"
            y="37"
            width="26"
            height="3"
            rx="1.5"
            fill="rgba(255,255,255,0.08)"
          />
          <rect
            x="14"
            y="44"
            width="18"
            height="3"
            rx="1.5"
            fill="rgba(255,255,255,0.06)"
          />
          <rect
            x="28"
            y="24"
            width="36"
            height="48"
            rx="4"
            fill="rgba(59,130,246,0.1)"
            stroke="rgba(59,130,246,0.25)"
            strokeWidth="1.5"
          />
          <rect
            x="33"
            y="31"
            width="26"
            height="4"
            rx="2"
            fill="rgba(59,130,246,0.3)"
          />
          <rect
            x="33"
            y="39"
            width="20"
            height="3"
            rx="1.5"
            fill="rgba(255,255,255,0.1)"
          />
          <rect
            x="33"
            y="46"
            width="24"
            height="3"
            rx="1.5"
            fill="rgba(255,255,255,0.08)"
          />
          <rect
            x="33"
            y="53"
            width="16"
            height="3"
            rx="1.5"
            fill="rgba(255,255,255,0.06)"
          />
          <circle
            cx="60"
            cy="20"
            r="8"
            fill="rgba(229,9,20,0.15)"
            stroke="rgba(229,9,20,0.4)"
            strokeWidth="1.5"
          />
          <line
            x1="57"
            y1="20"
            x2="63"
            y2="20"
            stroke="rgba(229,9,20,0.8)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="60"
            y1="17"
            x2="60"
            y2="23"
            stroke="rgba(229,9,20,0.8)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: "var(--text-secondary)",
          marginBottom: 8,
          margin: "0 0 8px",
        }}
      >
        Watchlist trống
      </p>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-faint)",
          marginBottom: 24,
          margin: "0 0 24px",
          lineHeight: 1.6,
        }}
      >
        Khám phá phim và thêm vào watchlist của bạn để theo dõi
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

/* ── Confirm Dialog ─────────────────────────────── */
function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Xoá",
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-overlay, #1a2030)",
          border: "1px solid var(--border-mid)",
          borderRadius: "var(--radius-xl)",
          padding: "28px 28px 24px",
          width: "100%",
          maxWidth: 360,
          boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
          animation: "confirmIn 0.2s cubic-bezier(0.34,1.3,0.64,1) both",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <IconTrash />
        </div>

        <p
          style={{
            margin: "0 0 8px",
            fontSize: 16,
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.3,
          }}
        >
          {title}
        </p>
        <p
          style={{
            margin: "0 0 24px",
            fontSize: 13,
            color: "var(--text-muted)",
            lineHeight: 1.6,
          }}
        >
          {message}
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "10px 0",
              background: "var(--bg-card2)",
              border: "1px solid var(--border-mid)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-secondary)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-body,sans-serif)",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-card)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--bg-card2)")
            }
          >
            Huỷ
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "10px 0",
              background: "#ef4444",
              border: "none",
              borderRadius: "var(--radius-md)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--font-body,sans-serif)",
              boxShadow: "0 4px 14px rgba(239,68,68,0.35)",
              transition: "background 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#dc2626";
              e.currentTarget.style.boxShadow =
                "0 4px 18px rgba(239,68,68,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ef4444";
              e.currentTarget.style.boxShadow =
                "0 4px 14px rgba(239,68,68,0.35)";
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
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
  const [showExport, setShowExport] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [editNote, setEditNote] = useState({});
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null); // { movieId, title } | null

  /* ── Search + filter state ── */
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // "all"|"watched"|"unwatched"
  const debouncedSearch = useDebounce(searchQuery, 200);

  /* ── Reset search khi đổi collection ── */
  useEffect(() => {
    setSearchQuery("");
    setFilterStatus("all");
  }, [activeCol]);

  /* ── Computed: filtered movies ── */
  const displayMovies = useMemo(() => {
    let result = orderedMovies;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      result = result.filter((m) => m.title?.toLowerCase().includes(q));
    }
    if (filterStatus === "watched") result = result.filter((m) => m.is_watched);
    if (filterStatus === "unwatched")
      result = result.filter((m) => !m.is_watched);
    return result;
  }, [orderedMovies, debouncedSearch, filterStatus]);

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

  const handleDelete = (id) => {
    const movie = orderedMovies.find((m) => m.movie_id === id);
    setConfirmDialog({ movieId: id, title: movie?.title || "phim này" });
  };
  const confirmDelete = async () => {
    if (!confirmDialog) return;
    try {
      await deleteMovie(confirmDialog.movieId);
      showToast("Đã xoá.", "success");
      load();
    } catch {
      showToast("Xoá thất bại, vui lòng thử lại.", "error");
    } finally {
      setConfirmDialog(null);
    }
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
  const MAX_COLLECTIONS = 20;

  const handleCreateCol = async () => {
    const name = newColName.trim();
    if (!name) return;
    if (name.length > 100) {
      showToast("Tên bộ sưu tập không được quá 100 ký tự.", "error");
      return;
    }
    if (collections.length >= MAX_COLLECTIONS) {
      showToast(`Đã đạt giới hạn ${MAX_COLLECTIONS} bộ sưu tập.`, "error");
      return;
    }
    try {
      await createCollection({ name });
      showToast(`Tạo "${name}" thành công!`, "success");
      setNewColName("");
      load();
    } catch (err) {
      showToast(err.response?.data?.detail || "Tạo thất bại.", "error");
    }
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
  const handleBackfill = async () => {
    if (backfilling) return;
    setBackfilling(true);
    try {
      const r = await backfillRuntime();
      const n = r.data?.updated ?? 0;
      showToast(
        n > 0
          ? `Đã cập nhật thời lượng cho ${n} phim!`
          : "Tất cả phim đã có thời lượng rồi.",
        "success",
      );
      if (n > 0) load();
    } catch {
      showToast("Cập nhật thất bại, thử lại sau.", "error");
    } finally {
      setBackfilling(false);
    }
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
                <button
                  style={w.btnGhost}
                  onClick={() => setShowExport((v) => !v)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.25)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "var(--border-mid)")
                  }
                >
                  <IconDownload /> <span>Xuất</span>
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

        {/* Export panel */}
        {showExport && (
          <ExportPanel
            movies={orderedMovies}
            collections={collections}
            stats={stats}
            username={user?.username}
            onClose={() => setShowExport(false)}
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

        {/* Backfill notice — hiện khi có phim thiếu thời lượng */}
        {stats &&
          stats.total > 0 &&
          orderedMovies.some((m) => !m.runtime || m.runtime === 0) &&
          (viewMode === "list" || viewMode === "grid") && (
            <div style={w.backfillNotice}>
              <span style={{ fontSize: 14 }}>⏱</span>
              <span
                style={{ flex: 1, fontSize: 12, color: "var(--text-muted)" }}
              >
                {
                  orderedMovies.filter((m) => !m.runtime || m.runtime === 0)
                    .length
                }{" "}
                phim chưa có thời lượng. Bấm để cập nhật từ TMDB.
              </span>
              <button
                onClick={handleBackfill}
                disabled={backfilling}
                style={{
                  ...w.btnGhost,
                  fontSize: 12,
                  padding: "6px 14px",
                  opacity: backfilling ? 0.6 : 1,
                  flexShrink: 0,
                }}
              >
                {backfilling ? "Đang cập nhật…" : "Cập nhật thời lượng"}
              </button>
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
                  {/* Search + filter bar */}
                  <SearchFilterBar
                    query={searchQuery}
                    onQuery={setSearchQuery}
                    status={filterStatus}
                    onStatus={setFilterStatus}
                    total={orderedMovies.length}
                    filtered={displayMovies.length}
                  />

                  {displayMovies.length === 0 ? (
                    <EmptySearch
                      query={searchQuery}
                      status={filterStatus}
                      onReset={() => {
                        setSearchQuery("");
                        setFilterStatus("all");
                      }}
                    />
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
                          {displayMovies.length}
                          {displayMovies.length !== orderedMovies.length && (
                            <span style={{ color: "var(--text-dim)" }}>
                              {" "}
                              / {orderedMovies.length}
                            </span>
                          )}{" "}
                          phim
                        </p>
                        {listView === "list" &&
                          !searchQuery &&
                          filterStatus === "all" && (
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
                              <span style={{ opacity: 0.5 }}>⠿</span> Kéo thả để
                              sắp xếp
                            </p>
                          )}
                      </div>
                      <DraggableList
                        movies={displayMovies}
                        viewMode={listView}
                        collections={collections}
                        editNote={editNote}
                        setEditNote={setEditNote}
                        onDelete={handleDelete}
                        onToggleWatched={handleToggle}
                        onSaveNote={handleSaveNote}
                        onMoveCol={handleMoveCol}
                        onReorder={
                          searchQuery || filterStatus !== "all"
                            ? null
                            : handleReorder
                        }
                      />
                    </>
                  )}
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

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={!!confirmDialog}
        title="Xoá phim khỏi watchlist?"
        message={
          confirmDialog
            ? `"${confirmDialog.title}" sẽ bị xoá khỏi watchlist của bạn. Hành động này không thể hoàn tác.`
            : ""
        }
        confirmLabel="Xoá"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDialog(null)}
      />

      <style>{`
        [draggable=true] { cursor: grab; }
        [draggable=true]:active { cursor: grabbing; }
        ::-webkit-scrollbar { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes confirmIn {
          from { opacity: 0; transform: scale(0.94) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        input[type="text"]:focus {
          border-color: rgba(229,9,20,0.5) !important;
          box-shadow: 0 0 0 3px rgba(229,9,20,0.08);
        }
        input[type="text"]::placeholder { color: var(--text-dim, rgba(255,255,255,0.2)); }
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
  /* ── Export panel ── */
  exportPanel: {
    background: "var(--bg-surface, #0e1218)",
    border: "1px solid var(--border-mid)",
    borderRadius: "var(--radius-xl, 16px)",
    padding: "18px 20px 16px",
    marginBottom: 16,
    animation: "confirmIn 0.2s cubic-bezier(0.34,1.3,0.64,1) both",
  },
  exportHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  exportSummary: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  exportSummaryChip: {
    fontSize: 12,
    color: "var(--text-muted)",
    background: "var(--bg-card2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-full)",
    padding: "3px 10px",
  },
  exportCards: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 10,
  },
  exportCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "12px 16px",
  },
  exportCardIcon: {
    width: 36,
    height: 36,
    borderRadius: "var(--radius-md)",
    background: "rgba(59,130,246,0.1)",
    color: "#60a5fa",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  exportCardTitle: {
    margin: "0 0 3px",
    fontSize: 13,
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  exportCardDesc: {
    margin: 0,
    fontSize: 11,
    color: "var(--text-faint)",
    lineHeight: 1.5,
  },
  exportBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "var(--bg-card)",
    border: "1px solid var(--border-mid)",
    color: "var(--text-secondary)",
    padding: "7px 14px",
    borderRadius: "var(--radius-md)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "var(--font-body, sans-serif)",
    whiteSpace: "nowrap",
    flexShrink: 0,
    transition: "background 0.15s ease",
  },
  backfillNotice: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    padding: "10px 14px",
    background: "rgba(234,179,8,0.07)",
    border: "1px solid rgba(234,179,8,0.2)",
    borderRadius: "var(--radius-md)",
  },
  searchBar: {
    marginBottom: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  searchInputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    color: "var(--text-faint)",
    display: "flex",
    alignItems: "center",
    pointerEvents: "none",
    zIndex: 1,
  },
  searchInput: {
    width: "100%",
    height: 40,
    background: "var(--bg-card2, #1a1f2a)",
    border: "1px solid var(--border-mid)",
    borderRadius: "var(--radius-md, 10px)",
    color: "var(--text-primary)",
    fontSize: 13,
    fontFamily: "var(--font-body, sans-serif)",
    paddingLeft: 36,
    paddingRight: 36,
    outline: "none",
    transition: "border-color 0.15s ease",
    boxSizing: "border-box",
  },
  searchClearBtn: {
    position: "absolute",
    right: 10,
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-faint)",
    display: "flex",
    alignItems: "center",
    padding: 4,
    borderRadius: 4,
    transition: "color 0.15s",
  },
  filterPills: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  filterPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 13px",
    borderRadius: "var(--radius-full, 999px)",
    border: "1px solid var(--border-mid)",
    background: "transparent",
    color: "var(--text-muted)",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "var(--font-body, sans-serif)",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  },
  filterPillActive: {
    background: "rgba(229,9,20,0.12)",
    borderColor: "rgba(229,9,20,0.4)",
    color: "var(--red-text, #ff6b6b)",
    fontWeight: 700,
  },
  filterDotGreen: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#22c55e",
    flexShrink: 0,
    display: "inline-block",
  },
  filterDotYellow: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#eab308",
    flexShrink: 0,
    display: "inline-block",
  },
  searchResultInfo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  resetFilterBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-faint)",
    fontSize: 12,
    fontFamily: "var(--font-body, sans-serif)",
    padding: "2px 4px",
    transition: "color 0.15s",
  },
  /* Dashboard header */
  dashHeader: {
    padding: "clamp(20px,4vh,36px) clamp(20px,5vw,48px) 28px",
    borderBottom: "1px solid var(--border)",
    background:
      "linear-gradient(160deg, rgba(229,9,20,0.04) 0%, var(--bg-surface,#0e1218) 40%, rgba(59,130,246,0.03) 100%)",
    position: "relative",
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
    background:
      "linear-gradient(160deg, var(--bg-surface) 0%, var(--bg-card) 100%)",
    border: "1px solid var(--border-mid)",
    borderRadius: "var(--radius-xl)",
    padding: "20px 16px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
  },
  sidebarMobile: { padding: "4px 0 8px" },
  sideStats: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    padding: "12px 10px",
    background: "rgba(229,9,20,0.05)",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(229,9,20,0.12)",
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
    background: "rgba(229,9,20,0.14)",
    color: "var(--red-text)",
    fontWeight: 700,
    boxShadow: "0 0 0 1px rgba(229,9,20,0.25)",
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
    gap: 16,
    alignItems: "flex-start",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "14px 18px",
    transition:
      "border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease",
  },
  listCardHov: {
    borderColor: "var(--border-bright)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(120,145,210,0.15)",
    transform: "translateY(-1px)",
  },
  listCardWatched: { opacity: 0.6 },
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
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: 16,
  },
  gridCard: {
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    cursor: "pointer",
    transition:
      "transform 0.3s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.3s ease, border-color 0.2s ease",
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

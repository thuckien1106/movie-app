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
import ThemeToggle from "../components/ThemeToggle";

/* ─── mobile breakpoint hook ───────────────────────── */
function useIsMobile(bp = 640) {
  const [mobile, setMobile] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < bp);
    window.addEventListener("resize", handler, { passive: true });
    return () => window.removeEventListener("resize", handler);
  }, [bp]);
  return mobile;
}

/* ─── helpers ──────────────────────────────────────── */
const GENRE_NAMES = {
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
  878: "Khoa học viễn tưởng",
  53: "Giật gân",
  10752: "Chiến tranh",
  37: "Cao bồi",
};

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
function applyOrder(movies, savedIds) {
  if (!savedIds) return movies;
  const map = Object.fromEntries(movies.map((m) => [m.movie_id, m]));
  const ordered = savedIds.filter((id) => map[id]).map((id) => map[id]);
  const newOnes = movies.filter((m) => !savedIds.includes(m.movie_id));
  return [...ordered, ...newOnes];
}

/* ══════════════════════════════════════════════════════
   SIDEBAR CONTENT  (shared between desktop & drawer)
══════════════════════════════════════════════════════ */
function SidebarContent({
  stats,
  collections,
  activeCol,
  newColName,
  setNewColName,
  onSelectAll,
  onOpenDetail,
  onDeleteCol,
  onCreateCol,
  onClose,
  isMobile,
}) {
  return (
    <>
      {isMobile && (
        <div style={d.drawerHeader}>
          <span style={d.drawerTitle}>Bộ sưu tập</span>
          <button onClick={onClose} style={d.drawerCloseBtn}>
            ✕
          </button>
        </div>
      )}

      {!isMobile && <p style={s.sideLabel}>Bộ sưu tập</p>}

      <button
        onClick={() => {
          onSelectAll();
          if (isMobile) onClose();
        }}
        style={{ ...s.colBtn, ...(activeCol === null ? s.colBtnActive : {}) }}
      >
        <span>📋 Tất cả</span>
        <span style={s.colCount}>{stats?.total ?? 0}</span>
      </button>

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
              if (isMobile) onClose();
            }}
            style={{ ...s.colBtn, flex: 1, marginBottom: 0 }}
          >
            <span>📁 {col.name}</span>
            <span style={s.colCount}>{col.movie_count}</span>
          </button>
          <button
            onClick={() => {
              onOpenDetail(col.id);
              if (isMobile) onClose();
            }}
            style={s.iconBtnBlue}
            title="Chi tiết"
          >
            →
          </button>
          <button
            onClick={() => onDeleteCol(col.id)}
            style={s.iconBtn}
            title="Xoá"
          >
            ✕
          </button>
        </div>
      ))}

      <div style={{ marginTop: 14, display: "flex", gap: 6 }}>
        <input
          value={newColName}
          onChange={(e) => setNewColName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onCreateCol()}
          placeholder="Tên bộ sưu tập mới..."
          style={s.colInput}
        />
        <button onClick={onCreateCol} style={s.addBtn}>
          +
        </button>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════
   BOTTOM DRAWER  (mobile only)
══════════════════════════════════════════════════════ */
function BottomDrawer({ open, onClose, children }) {
  /* lock body scroll while open */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          ...d.backdrop,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.28s ease",
        }}
      />
      {/* sheet */}
      <div
        style={{
          ...d.sheet,
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.32s cubic-bezier(.32,1,.23,1)",
        }}
      >
        {/* drag pill */}
        <div style={d.pill} />
        <div style={d.sheetBody}>{children}</div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════ */
export default function Watchlist() {
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const isMobile = useIsMobile();

  const [movies, setMovies] = useState([]);
  const [orderedMovies, setOrdered] = useState([]);
  const [stats, setStats] = useState(null);
  const [collections, setCollections] = useState([]);
  const [activeCol, setActiveCol] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [shareInfo, setShareInfo] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [editNote, setEditNote] = useState({});
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const uid = user?.id ?? user?.email ?? "guest";

  useEffect(() => {
    if (!isLoggedIn) navigate("/login");
  }, [isLoggedIn, navigate]);

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
      setCollections(cRes.data || []);
      const saved = loadOrder(uid, activeCol);
      setOrdered(applyOrder(raw, saved));
    } catch {
      showToast("Không tải được dữ liệu.", "error");
    } finally {
      setLoading(false);
    }
  }, [activeCol, showToast, uid]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setOrdered((prev) => {
      if (prev.length === 0) {
        const saved = loadOrder(uid, activeCol);
        return applyOrder(movies, saved);
      }
      const ids = prev.map((m) => m.movie_id);
      const map = Object.fromEntries(movies.map((m) => [m.movie_id, m]));
      const kept = ids.filter((id) => map[id]).map((id) => map[id]);
      const added = movies.filter((m) => !ids.includes(m.movie_id));
      return [...kept, ...added];
    });
  }, [movies]);

  /* actions */
  const handleDelete = async (id) => {
    await deleteMovie(id);
    showToast("Đã xoá.", "success");
    load();
  };
  const handleToggleWatched = async (id) => {
    await toggleWatched(id);
    load();
  };
  const handleSaveNote = async (id) => {
    const n = editNote[id] ?? "";
    await updateNote(id, n);
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
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareInfo?.share_url || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleReorder = (list) => {
    setOrdered(list);
    saveOrder(
      uid,
      activeCol,
      list.map((m) => m.movie_id),
    );
  };
  const openCollectionDetail = (colId) => {
    setActiveCol(colId);
    setViewMode("detail");
  };

  if (!isLoggedIn) return null;

  const activeColObj = collections.find((c) => c.id === activeCol);
  const watchedCount = orderedMovies.filter((m) => m.is_watched).length;

  /* shared sidebar props */
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
    onOpenDetail: openCollectionDetail,
    onDeleteCol: handleDeleteCol,
    onCreateCol: handleCreateCol,
    onClose: () => setDrawerOpen(false),
  };

  return (
    <div style={{ ...s.page, paddingBottom: isMobile ? 80 : 24 }}>
      {/* ══ HEADER ══ */}
      <div style={s.header}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {viewMode !== "list" && (
              <button
                onClick={() => {
                  setViewMode("list");
                  setActiveCol(null);
                }}
                style={s.backBtn}
              >
                ← Quay lại
              </button>
            )}
            <h1 style={s.title}>
              {viewMode === "detail" && activeColObj
                ? `📁 ${activeColObj.name}`
                : "My Watchlist"}
            </h1>
          </div>
          {stats && viewMode === "list" && (
            <p style={s.headerSub}>
              {stats.total} phim · {stats.watched} đã xem · ~
              {fmt(stats.total_runtime_minutes)}
            </p>
          )}
          {viewMode === "detail" && activeColObj && (
            <p style={s.headerSub}>
              {activeColObj.movie_count} phim · {watchedCount} đã xem
              {activeColObj.description && ` · ${activeColObj.description}`}
            </p>
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <ThemeToggle />
          {viewMode === "list" && (
            <>
              <button onClick={handleLoadShare} style={s.btnOutline}>
                🔗 Chia sẻ
              </button>
              <button onClick={() => setViewMode("stats")} style={s.btnOutline}>
                📊
              </button>
            </>
          )}
          <Link to="/" style={s.btnRed}>
            ← Trang chủ
          </Link>
        </div>
      </div>

      {/* ══ SHARE PANEL ══ */}
      {showShare && shareInfo && (
        <div style={s.sharePanel}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              Chia sẻ Watchlist
            </span>
            <button onClick={() => setShowShare(false)} style={s.closeBtn}>
              ✕
            </button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              readOnly
              value={
                shareInfo.is_active ? shareInfo.share_url : "Chia sẻ đang tắt"
              }
              style={{
                ...s.shareInput,
                opacity: shareInfo.is_active ? 1 : 0.4,
              }}
            />
            {shareInfo.is_active && (
              <button onClick={handleCopyLink} style={s.btnRed}>
                {copied ? "✓ Đã sao chép" : "Sao chép"}
              </button>
            )}
          </div>
          <button
            onClick={handleToggleShare}
            style={{ ...s.btnOutline, marginTop: 10, fontSize: 13 }}
          >
            {shareInfo.is_active ? "🚫 Tắt chia sẻ" : "✅ Bật chia sẻ"}
          </button>
        </div>
      )}

      {/* ══ MAIN CONTENT ══ */}
      {viewMode === "stats" ? (
        <StatsView stats={stats} onBack={() => setViewMode("list")} />
      ) : viewMode === "detail" ? (
        <CollectionDetail
          collection={activeColObj}
          movies={orderedMovies}
          collections={collections}
          editNote={editNote}
          setEditNote={setEditNote}
          loading={loading}
          onDelete={handleDelete}
          onToggleWatched={handleToggleWatched}
          onSaveNote={handleSaveNote}
          onMoveCol={handleMoveCol}
          onReorder={handleReorder}
          onDeleteCol={() => handleDeleteCol(activeCol)}
        />
      ) : (
        <div
          style={
            isMobile ? { display: "flex", flexDirection: "column" } : s.layout
          }
        >
          {/* ── DESKTOP: sticky sidebar ── */}
          {!isMobile && (
            <aside style={s.sidebar}>
              <SidebarContent {...sidebarProps} isMobile={false} />
            </aside>
          )}

          {/* ── MOBILE: active collection chip bar ── */}
          {isMobile && (
            <div style={d.chipBar}>
              <button
                onClick={() => {
                  setActiveCol(null);
                }}
                style={{
                  ...d.chip,
                  ...(activeCol === null ? d.chipActive : {}),
                }}
              >
                📋 Tất cả
                <span style={d.chipCount}>{stats?.total ?? 0}</span>
              </button>
              {collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => openCollectionDetail(col.id)}
                  style={{
                    ...d.chip,
                    ...(activeCol === col.id ? d.chipActive : {}),
                  }}
                >
                  📁 {col.name}
                  <span style={d.chipCount}>{col.movie_count}</span>
                </button>
              ))}
            </div>
          )}

          {/* main movie list */}
          <main style={{ flex: 1 }}>
            {loading ? (
              <p style={{ color: "var(--text-faint)", padding: 20 }}>
                Đang tải...
              </p>
            ) : orderedMovies.length === 0 ? (
              <EmptyState />
            ) : (
              <DraggableList
                movies={orderedMovies}
                collections={collections}
                editNote={editNote}
                setEditNote={setEditNote}
                onDelete={handleDelete}
                onToggleWatched={handleToggleWatched}
                onSaveNote={handleSaveNote}
                onMoveCol={handleMoveCol}
                onReorder={handleReorder}
                isMobile={isMobile}
              />
            )}
          </main>
        </div>
      )}

      {/* ══ MOBILE: FAB to open drawer ══ */}
      {isMobile && viewMode === "list" && (
        <button onClick={() => setDrawerOpen(true)} style={d.fab}>
          📋
          {collections.length > 0 && (
            <span style={d.fabBadge}>{collections.length}</span>
          )}
        </button>
      )}

      {/* ══ MOBILE: Bottom Drawer ══ */}
      {isMobile && (
        <BottomDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <SidebarContent {...sidebarProps} isMobile={true} />
        </BottomDrawer>
      )}

      <style>{globalCSS}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   COLLECTION DETAIL VIEW
══════════════════════════════════════════════════════ */
function CollectionDetail({
  collection,
  movies,
  collections,
  editNote,
  setEditNote,
  loading,
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
      <div style={s.detailProgress}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
            Tiến độ xem
          </span>
          <span
            style={{ fontSize: 12, color: "var(--red-text)", fontWeight: 600 }}
          >
            {pct}%
          </span>
        </div>
        <div style={s.progressBg}>
          <div style={{ ...s.progressFill, width: `${pct}%` }} />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { key: "all", label: "Tất cả" },
            { key: "watched", label: "✓ Đã xem" },
            { key: "unwatched", label: "⏳ Chưa xem" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                ...s.filterPill,
                ...(filter === key ? s.filterPillActive : {}),
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={onDeleteCol}
          style={{
            ...s.btnOutline,
            fontSize: 12,
            padding: "5px 10px",
            color: "#e57373",
          }}
        >
          🗑 Xoá collection
        </button>
      </div>
      <div style={s.dragHint}>⠿ Kéo thả để sắp xếp thứ tự</div>
      {loading ? (
        <p style={{ color: "var(--text-faint)", padding: 20 }}>Đang tải...</p>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <DraggableList
          movies={filtered}
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

/* ══════════════════════════════════════════════════════
   DRAGGABLE LIST
══════════════════════════════════════════════════════ */
function DraggableList({
  movies,
  collections,
  editNote,
  setEditNote,
  onDelete,
  onToggleWatched,
  onSaveNote,
  onMoveCol,
  onReorder,
  isMobile,
}) {
  const [items, setItems] = useState(movies);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const dragItem = useRef(null);
  const dragNode = useRef(null);

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
    setDragOver(idx);
    const newItems = [...items];
    const [moved] = newItems.splice(dragItem.current, 1);
    newItems.splice(idx, 0, moved);
    dragItem.current = idx;
    setItems(newItems);
  };
  const handleDragEnd = () => {
    setDragging(null);
    setDragOver(null);
    dragNode.current?.removeEventListener("dragend", handleDragEnd);
    dragItem.current = null;
    dragNode.current = null;
    if (onReorder) onReorder(items);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const canDrag = !!onReorder && !isMobile; // drag disabled on mobile (touch)

  return (
    <div style={s.grid}>
      {items.map((movie, idx) => (
        <div
          key={movie.movie_id}
          draggable={canDrag}
          onDragStart={canDrag ? (e) => handleDragStart(e, idx) : undefined}
          onDragEnter={canDrag ? (e) => handleDragEnter(e, idx) : undefined}
          onDragOver={canDrag ? handleDragOver : undefined}
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
            isMobile={isMobile}
          />
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MOVIE ITEM CARD
══════════════════════════════════════════════════════ */
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
  isMobile,
}) {
  const [showNote, setShowNote] = useState(false);
  const [showActions, setShowActions] = useState(false); // mobile expand
  const noteVal =
    editNote[movie.movie_id] !== undefined
      ? editNote[movie.movie_id]
      : movie.note || "";

  return (
    <div style={{ ...s.card, ...(movie.is_watched ? s.cardWatched : {}) }}>
      {canDrag && (
        <div style={s.dragHandle}>
          <span style={s.dragDots}>⠿</span>
        </div>
      )}

      <Link
        to={`/movie/${movie.movie_id}`}
        style={{ display: "block", flexShrink: 0 }}
      >
        <img
          src={movie.poster || "https://placehold.co/68x100/222/555?text=?"}
          alt={movie.title}
          style={s.poster}
        />
      </Link>

      <div style={s.info}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 6,
          }}
        >
          <Link
            to={`/movie/${movie.movie_id}`}
            style={{ textDecoration: "none", flex: 1 }}
          >
            <p style={s.movieTitle}>{movie.title}</p>
          </Link>
          {/* mobile: tap to expand actions */}
          {isMobile && (
            <button
              onClick={() => setShowActions((p) => !p)}
              style={{
                ...s.iconBtn,
                fontSize: 16,
                padding: "2px 6px",
                flexShrink: 0,
              }}
            >
              {showActions ? "▲" : "▼"}
            </button>
          )}
        </div>

        <span
          style={{
            ...s.badge,
            ...(movie.is_watched ? s.badgeWatched : s.badgePending),
          }}
        >
          {movie.is_watched ? "✓ Đã xem" : "⏳ Chưa xem"}
        </span>

        {movie.note && !showNote && (
          <p style={s.notePreview}>💬 {movie.note}</p>
        )}

        {showNote && (
          <div style={{ marginTop: 8 }}>
            <textarea
              rows={3}
              value={noteVal}
              onChange={(e) =>
                setEditNote((p) => ({ ...p, [movie.movie_id]: e.target.value }))
              }
              placeholder="Ghi chú của bạn..."
              style={s.noteArea}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <button
                onClick={() => {
                  onSaveNote(movie.movie_id);
                  setShowNote(false);
                }}
                style={s.btnSm}
              >
                Lưu
              </button>
              <button
                onClick={() => setShowNote(false)}
                style={{ ...s.btnSm, background: "var(--bg-input)" }}
              >
                Huỷ
              </button>
            </div>
          </div>
        )}

        {/* on desktop: always visible. on mobile: toggle */}
        {(!isMobile || showActions) && (
          <>
            <select
              value={movie.collection_id || ""}
              onChange={(e) =>
                onMoveCol(
                  movie.movie_id,
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              style={s.select}
            >
              <option value="">— Không có bộ sưu tập —</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div style={s.actions}>
              <button
                onClick={() => onToggleWatched(movie.movie_id)}
                style={{
                  ...s.btnSm,
                  background: movie.is_watched
                    ? "rgba(26,107,58,0.8)"
                    : "var(--bg-input2)",
                }}
              >
                {movie.is_watched ? "↩ Chưa xem" : "✓ Đã xem"}
              </button>
              <button
                onClick={() => setShowNote((p) => !p)}
                style={{ ...s.btnSm, background: "var(--bg-input2)" }}
              >
                💬 Ghi chú
              </button>
              <button
                onClick={() => onDelete(movie.movie_id)}
                style={{
                  ...s.btnSm,
                  background: "rgba(90,26,26,0.8)",
                  color: "#ff8080",
                }}
              >
                🗑 Xoá
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   STATS VIEW
══════════════════════════════════════════════════════ */
function StatsView({ stats, onBack }) {
  if (!stats) return null;
  const pct =
    stats.total > 0 ? Math.round((stats.watched / stats.total) * 100) : 0;
  return (
    <div>
      <button onClick={onBack} style={{ ...s.backBtn, marginBottom: 20 }}>
        ← Về danh sách
      </button>
      <div style={s.statsGrid}>
        <StatCard label="Tổng phim" value={stats.total} icon="🎬" />
        <StatCard label="Đã xem" value={stats.watched} icon="✅" />
        <StatCard label="Chưa xem" value={stats.unwatched} icon="⏳" />
        <StatCard
          label="Tổng thời gian"
          value={fmt(stats.total_runtime_minutes)}
          icon="⏱"
        />
        <StatCard
          label="Thời gian đã xem"
          value={fmt(stats.watched_runtime_minutes)}
          icon="🎞"
        />
        <StatCard label="Tiến độ" value={`${pct}%`} icon="📈" />
      </div>
      <div style={{ marginTop: 20 }}>
        <p
          style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}
        >
          Tiến độ: {stats.watched}/{stats.total} phim
        </p>
        <div style={s.progressBg}>
          <div style={{ ...s.progressFill, width: `${pct}%` }} />
        </div>
      </div>
      {stats.top_genres?.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            🎭 Thể loại yêu thích
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.top_genres.map((g, i) => {
              const name = GENRE_NAMES[g.genre_id] || `Genre #${g.genre_id}`;
              const max = stats.top_genres[0].count;
              const bar = Math.round((g.count / max) * 100);
              return (
                <div
                  key={g.genre_id}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <span
                    style={{
                      width: 140,
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      flexShrink: 0,
                    }}
                  >
                    {i === 0 ? "❤️ " : ""}
                    {name}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      background: "var(--border)",
                      borderRadius: 4,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${bar}%`,
                        background: "var(--red)",
                        borderRadius: 4,
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-faint)",
                      minWidth: 24,
                    }}
                  >
                    {g.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div style={s.statCard}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span
        style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}
      >
        {value}
      </span>
      <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{label}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <p style={{ fontSize: 40, marginBottom: 12 }}>🎬</p>
      <p style={{ color: "var(--text-muted)", fontSize: 16 }}>
        Danh sách trống
      </p>
      <Link to="/" style={{ color: "var(--red)", fontSize: 14 }}>
        Khám phá phim ngay →
      </Link>
    </div>
  );
}

/* ─── Desktop styles ─────────────────────────────── */
const s = {
  page: {
    background: "var(--bg-page)",
    minHeight: "100vh",
    color: "var(--text-primary)",
    padding: "24px 20px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 12,
  },
  title: { color: "var(--red)", margin: 0, fontSize: 26, fontWeight: 700 },
  headerSub: { fontSize: 13, color: "var(--text-faint)", margin: "4px 0 0" },
  backBtn: {
    background: "transparent",
    border: "1px solid var(--border-mid)",
    color: "var(--text-secondary)",
    padding: "6px 12px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
  },
  layout: { display: "flex", gap: 20, alignItems: "flex-start" },
  sidebar: {
    width: 210,
    flexShrink: 0,
    background: "var(--bg-card)",
    borderRadius: 12,
    padding: 16,
    border: "1px solid var(--border)",
    position: "sticky",
    top: 20,
  },
  sideLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "var(--text-faint)",
    margin: "0 0 10px",
  },
  colBtn: {
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    padding: "7px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    marginBottom: 2,
    transition: "all 0.15s",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  colBtnActive: {
    background: "var(--red-dim)",
    color: "var(--red-text)",
    fontWeight: 600,
  },
  colCount: {
    fontSize: 10,
    background: "var(--border-mid)",
    borderRadius: 10,
    padding: "1px 6px",
    color: "var(--text-faint)",
  },
  iconBtn: {
    background: "transparent",
    border: "none",
    color: "var(--border-bright)",
    cursor: "pointer",
    fontSize: 12,
    padding: "4px 6px",
    borderRadius: 4,
  },
  iconBtnBlue: {
    background: "transparent",
    border: "none",
    color: "rgba(100,160,255,0.6)",
    cursor: "pointer",
    fontSize: 14,
    padding: "4px 6px",
    borderRadius: 4,
    fontWeight: 700,
  },
  colInput: {
    flex: 1,
    background: "var(--bg-input2)",
    border: "1px solid var(--border-mid)",
    borderRadius: 6,
    padding: "6px 8px",
    color: "var(--text-primary)",
    fontSize: 12,
    outline: "none",
  },
  addBtn: {
    background: "var(--red)",
    border: "none",
    borderRadius: 6,
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 10px",
    fontSize: 18,
  },
  detailProgress: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "16px 20px",
    marginBottom: 16,
  },
  filterPill: {
    background: "var(--border)",
    border: "1px solid var(--border-mid)",
    color: "var(--text-muted)",
    borderRadius: 20,
    padding: "5px 14px",
    fontSize: 12,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  filterPillActive: {
    background: "var(--red-dim)",
    borderColor: "var(--red-border)",
    color: "var(--red-text)",
    fontWeight: 600,
  },
  dragHint: {
    fontSize: 11,
    color: "var(--border-bright)",
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  grid: { display: "flex", flexDirection: "column", gap: 12 },
  card: {
    display: "flex",
    gap: 12,
    background: "var(--bg-card)",
    borderRadius: 12,
    padding: "12px 14px",
    border: "1px solid var(--border)",
    transition: "border-color 0.2s, box-shadow 0.2s",
    position: "relative",
  },
  cardWatched: { opacity: 0.65 },
  dragHandle: {
    display: "flex",
    alignItems: "center",
    paddingRight: 6,
    cursor: "grab",
    flexShrink: 0,
    color: "var(--border-bright)",
    userSelect: "none",
  },
  dragDots: { fontSize: 18, lineHeight: 1, letterSpacing: "-2px" },
  poster: {
    width: 68,
    height: 100,
    objectFit: "cover",
    borderRadius: 8,
    display: "block",
    flexShrink: 0,
  },
  info: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
  },
  movieTitle: {
    margin: 0,
    fontWeight: 600,
    fontSize: 15,
    color: "var(--text-primary)",
    lineHeight: 1.3,
  },
  badge: {
    display: "inline-block",
    fontSize: 11,
    padding: "3px 9px",
    borderRadius: 12,
    fontWeight: 600,
  },
  badgeWatched: { background: "var(--green-dim)", color: "var(--green)" },
  badgePending: { background: "var(--border)", color: "var(--text-muted)" },
  notePreview: {
    fontSize: 12,
    color: "var(--text-faint)",
    margin: 0,
    fontStyle: "italic",
  },
  noteArea: {
    width: "100%",
    background: "var(--bg-input2)",
    border: "1px solid var(--border-mid)",
    borderRadius: 8,
    padding: 10,
    color: "var(--text-primary)",
    fontSize: 13,
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
  },
  select: {
    background: "var(--bg-input2)",
    border: "1px solid var(--border-mid)",
    borderRadius: 6,
    color: "var(--text-muted)",
    fontSize: 12,
    padding: "4px 8px",
    cursor: "pointer",
    outline: "none",
    maxWidth: 220,
  },
  actions: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 },
  btnSm: {
    background: "var(--bg-input2)",
    border: "none",
    color: "var(--text-primary)",
    padding: "5px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
  },
  btnRed: {
    background: "var(--red)",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
  },
  btnOutline: {
    background: "transparent",
    border: "1px solid var(--border-bright)",
    color: "var(--text-secondary)",
    padding: "8px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
  },
  sharePanel: {
    background: "var(--bg-card)",
    border: "1px solid var(--red-border)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  shareInput: {
    flex: 1,
    background: "var(--bg-input2)",
    border: "1px solid var(--border-mid)",
    borderRadius: 8,
    padding: "8px 12px",
    color: "var(--text-primary)",
    fontSize: 13,
    outline: "none",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-faint)",
    cursor: "pointer",
    fontSize: 18,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
    gap: 12,
  },
  statCard: {
    background: "var(--bg-overlay)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "16px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    alignItems: "flex-start",
  },
  progressBg: {
    height: 8,
    background: "var(--border)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, var(--red), var(--red-text))",
    borderRadius: 4,
    transition: "width 0.6s ease",
  },
};

/* ─── Mobile-specific styles ─────────────────────── */
const d = {
  /* horizontal chip bar */
  chipBar: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    scrollbarWidth: "none",
    padding: "0 0 12px",
    marginBottom: 4,
  },
  chip: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: "var(--bg-card)",
    border: "1px solid var(--border-mid)",
    color: "var(--text-muted)",
    borderRadius: 20,
    padding: "6px 14px",
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.15s",
  },
  chipActive: {
    background: "var(--red-dim)",
    borderColor: "var(--red-border)",
    color: "var(--red-text)",
    fontWeight: 600,
  },
  chipCount: {
    fontSize: 10,
    background: "var(--border-mid)",
    borderRadius: 10,
    padding: "1px 6px",
    color: "var(--text-faint)",
  },
  /* floating action button */
  fab: {
    position: "fixed",
    bottom: 20,
    right: 20,
    zIndex: 300,
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: "var(--red)",
    border: "none",
    color: "#fff",
    fontSize: 22,
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(229,9,20,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.18s, box-shadow 0.18s",
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
  /* backdrop */
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 400,
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(2px)",
  },
  /* bottom sheet */
  sheet: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 500,
    background: "var(--bg-overlay)",
    borderRadius: "20px 20px 0 0",
    border: "1px solid var(--border-mid)",
    borderBottom: "none",
    maxHeight: "82vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 -8px 40px rgba(0,0,0,0.4)",
  },
  pill: {
    width: 40,
    height: 4,
    borderRadius: 2,
    background: "var(--border-bright)",
    margin: "10px auto 4px",
    flexShrink: 0,
  },
  sheetBody: {
    overflowY: "auto",
    padding: "8px 20px 36px",
    flex: 1,
  },
  /* drawer header */
  drawerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 12,
    borderBottom: "1px solid var(--border)",
  },
  drawerTitle: { fontSize: 16, fontWeight: 700, color: "var(--text-primary)" },
  drawerCloseBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-faint)",
    cursor: "pointer",
    fontSize: 20,
    lineHeight: 1,
    padding: 4,
  },
};

const globalCSS = `
  [draggable=true] { cursor: grab; }
  [draggable=true]:active { cursor: grabbing; }
  ::-webkit-scrollbar { display: none; }
`;

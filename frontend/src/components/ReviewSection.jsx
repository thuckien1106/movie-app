// src/components/ReviewSection.jsx
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./ToastContext";
import { Link } from "react-router-dom";
import {
  getReviewSummary,
  getReviews,
  createReview,
  updateReview,
  deleteReview,
  toggleLike,
} from "../api/reviewApi";

/* ── helpers ─────────────────────────────────────────────── */
function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

/* ── Star row ────────────────────────────────────────────── */
function StarRow({ value, onChange, size = 28, readonly = false }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          onClick={() => !readonly && onChange?.(n)}
          onMouseEnter={() => !readonly && setHovered(n)}
          onMouseLeave={() => !readonly && setHovered(0)}
          style={{
            background: "none",
            border: "none",
            cursor: readonly ? "default" : "pointer",
            padding: 0,
            lineHeight: 1,
            fontSize: size,
            color: n <= display ? "#f5c518" : "rgba(255,255,255,0.15)",
            transition: "color 0.12s, transform 0.12s",
            transform: !readonly && hovered === n ? "scale(1.25)" : "scale(1)",
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

/* ── Rating distribution bar ─────────────────────────────── */
function RatingBar({ label, count, total, active }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}
    >
      <span
        style={{
          fontSize: 11,
          color: "rgba(160,175,210,0.6)",
          width: 16,
          textAlign: "right",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 6,
          background: "rgba(255,255,255,0.07)",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: active ? "#f5c518" : "rgba(245,197,24,0.45)",
            borderRadius: 99,
            transition: "width 0.5s ease",
          }}
        />
      </div>
      <span
        style={{ fontSize: 11, color: "rgba(160,175,210,0.45)", width: 20 }}
      >
        {count}
      </span>
    </div>
  );
}

/* ── Avatar ──────────────────────────────────────────────── */
function Avatar({ author, size = 36 }) {
  if (author.avatar_url) {
    return (
      <img
        src={author.avatar_url}
        alt={author.username}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
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
        background: "rgba(229,9,20,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.5,
        flexShrink: 0,
      }}
    >
      {author.avatar || (author.username?.[0]?.toUpperCase() ?? "?")}
    </div>
  );
}

/* ── Review Form ─────────────────────────────────────────── */
function ReviewForm({ movieId, existing, onSuccess, onCancel }) {
  const showToast = useToast();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [content, setContent] = useState(existing?.content ?? "");
  const [isSpoiler, setIsSpoiler] = useState(existing?.is_spoiler ?? false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!rating) return showToast("Vui lòng chọn số sao!", "error");
    setLoading(true);
    try {
      if (existing) {
        await updateReview(existing.id, {
          rating,
          content: content || null,
          is_spoiler: isSpoiler,
        });
        showToast("Đã cập nhật review!", "success");
      } else {
        await createReview(movieId, {
          rating,
          content: content || null,
          is_spoiler: isSpoiler,
        });
        showToast("Đã đăng review!", "success");
      }
      onSuccess?.();
    } catch (e) {
      if (e.response?.status === 409) {
        showToast("Bạn đã đánh giá phim này rồi.", "error");
        onSuccess?.(); // refresh để sync UI
      } else {
        const msg = e.response?.data?.error || "Có lỗi xảy ra.";
        showToast(msg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={sf.card}>
      <p style={sf.label}>Đánh giá của bạn</p>
      <div style={{ marginBottom: 16 }}>
        <StarRow value={rating} onChange={setRating} size={26} />
        {rating > 0 && (
          <span
            style={{
              fontSize: 12,
              color: "rgba(245,197,24,0.8)",
              marginTop: 6,
              display: "block",
            }}
          >
            {
              [
                "",
                "Thảm họa",
                "Rất tệ",
                "Tệ",
                "Dưới trung bình",
                "Trung bình",
                "Tạm được",
                "Khá tốt",
                "Tốt",
                "Rất tốt",
                "Xuất sắc",
              ][rating]
            }
          </span>
        )}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Chia sẻ cảm nhận của bạn về bộ phim này... (tùy chọn)"
        maxLength={2000}
        rows={4}
        style={sf.textarea}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 11, color: "rgba(140,155,195,0.4)" }}>
          {content.length}/2000
        </span>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={isSpoiler}
            onChange={(e) => setIsSpoiler(e.target.checked)}
            style={{ accentColor: "#e50914", width: 14, height: 14 }}
          />
          <span style={{ fontSize: 12, color: "rgba(160,175,210,0.7)" }}>
            Có spoiler
          </span>
        </label>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {onCancel && (
          <button onClick={onCancel} style={sf.btnCancel} disabled={loading}>
            Huỷ
          </button>
        )}
        <button
          onClick={submit}
          disabled={loading || !rating}
          style={{ ...sf.btnSubmit, opacity: loading || !rating ? 0.5 : 1 }}
        >
          {loading ? "Đang gửi..." : existing ? "Cập nhật" : "Đăng review"}
        </button>
      </div>
    </div>
  );
}

/* ── Single Review Card ──────────────────────────────────── */
function ReviewCard({ review, currentUserId, onLike, onEdit, onDelete }) {
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [liking, setLiking] = useState(false);
  const isOwner = currentUserId && currentUserId === review.author.id;

  const handleLike = async () => {
    if (!currentUserId || liking) return;
    setLiking(true);
    await onLike(review.id);
    setLiking(false);
  };

  return (
    <div style={sc.card}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <Avatar author={review.author} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <Link
              to={`/u/${review.author.username}`}
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-primary,#f0f4ff)",
                textDecoration: "none",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {review.author.username || "Người dùng"}
            </Link>
            {review.is_spoiler && (
              <span style={sc.spoilerBadge}>⚠ Spoiler</span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 3,
            }}
          >
            <div style={{ display: "flex", gap: 1 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <span
                  key={n}
                  style={{
                    fontSize: 11,
                    color:
                      n <= review.rating ? "#f5c518" : "rgba(255,255,255,0.12)",
                  }}
                >
                  ★
                </span>
              ))}
            </div>
            <span style={{ fontSize: 11, color: "#f5c518", fontWeight: 700 }}>
              {review.rating}/10
            </span>
            <span style={{ fontSize: 11, color: "rgba(140,155,195,0.45)" }}>
              ·
            </span>
            <span style={{ fontSize: 11, color: "rgba(140,155,195,0.45)" }}>
              {timeAgo(review.created_at)}
            </span>
          </div>
        </div>
        {isOwner && (
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={() => onEdit(review)} style={sc.actionBtn}>
              Sửa
            </button>
            <button
              onClick={() => onDelete(review.id)}
              style={{ ...sc.actionBtn, color: "rgba(255,80,80,0.7)" }}
            >
              Xoá
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {review.content && (
        <div style={{ marginBottom: 12 }}>
          {review.is_spoiler && !showSpoiler ? (
            <div
              onClick={() => setShowSpoiler(true)}
              style={{
                background: "rgba(229,9,20,0.07)",
                border: "1px solid rgba(229,9,20,0.2)",
                borderRadius: 8,
                padding: "10px 14px",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 12, color: "rgba(255,110,110,0.8)" }}>
                Nội dung chứa spoiler — nhấn để xem
              </span>
            </div>
          ) : (
            <p
              style={{
                margin: 0,
                fontSize: 13.5,
                color: "rgba(200,215,255,0.8)",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {review.content}
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={handleLike}
          style={{
            ...sc.likeBtn,
            color: review.liked_by_me ? "#f5c518" : "rgba(160,175,210,0.5)",
            background: review.liked_by_me
              ? "rgba(245,197,24,0.1)"
              : "transparent",
            borderColor: review.liked_by_me
              ? "rgba(245,197,24,0.3)"
              : "rgba(100,120,175,0.15)",
          }}
        >
          ♥ {review.likes > 0 ? review.likes : ""} Hữu ích
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN EXPORT: ReviewSection
══════════════════════════════════════════════ */
export default function ReviewSection({ movieId }) {
  const { isLoggedIn, user } = useAuth();
  const showToast = useToast();

  const [summary, setSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("recent");
  const [loadingList, setLoadingList] = useState(true);
  const [editingReview, setEditingReview] = useState(null); // review obj đang edit
  const [showForm, setShowForm] = useState(false);

  /* ── fetch summary ── */
  const fetchSummary = useCallback(async () => {
    try {
      const res = await getReviewSummary(movieId);
      setSummary(res.data);
      // Nếu user đã có review rồi → đóng form tránh submit 409
      if (res.data?.my_review_id != null) {
        setShowForm(false);
      }
    } catch {
      /* silent */
    }
  }, [movieId]);

  /* ── fetch list ── */
  const fetchReviews = useCallback(
    async (p = 1, s = sort, reset = false) => {
      setLoadingList(true);
      try {
        const res = await getReviews(movieId, { sort: s, page: p });
        setReviews((prev) =>
          reset ? res.data.reviews : [...prev, ...res.data.reviews],
        );
        setTotal(res.data.total);
        setPage(p);
      } catch {
        /* silent */
      } finally {
        setLoadingList(false);
      }
    },
    [movieId, sort],
  );

  useEffect(() => {
    fetchSummary();
    fetchReviews(1, "recent", true);
  }, [movieId]);

  const handleSortChange = (s) => {
    setSort(s);
    setReviews([]);
    fetchReviews(1, s, true);
  };

  const handleFormSuccess = async () => {
    setShowForm(false);
    setEditingReview(null);
    // Fetch song song, không await để không block UI
    fetchSummary();
    fetchReviews(1, sort, true);
  };

  const handleLike = async (reviewId) => {
    if (!isLoggedIn) return showToast("Đăng nhập để thích review!", "info");
    try {
      const res = await toggleLike(reviewId);
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, likes: res.data.likes, liked_by_me: res.data.liked }
            : r,
        ),
      );
    } catch {
      /* silent */
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm("Xoá review này?")) return;
    try {
      await deleteReview(reviewId);
      showToast("Đã xoá review.", "success");
      fetchSummary();
      fetchReviews(1, sort, true);
    } catch {
      showToast("Có lỗi xảy ra.", "error");
    }
  };

  const alreadyReviewed = summary?.my_review_id != null;
  const hasMore = reviews.length < total;

  return (
    <div style={s.wrap}>
      {/* ── Section header ── */}
      <div style={s.sectionHeader}>
        <div style={s.sectionTitleWrap}>
          <div style={s.sectionAccent} />
          <h2 style={s.sectionTitle}>Đánh giá từ cộng đồng</h2>
        </div>
        {summary?.count > 0 && (
          <div style={s.headerBadge}>
            <span style={{ color: "#f5c518", fontWeight: 700, fontSize: 15 }}>
              {summary.average ?? "—"}
            </span>
            <span
              style={{
                color: "rgba(160,175,210,0.6)",
                fontSize: 12,
                marginLeft: 4,
              }}
            >
              / 10 · {summary.count} đánh giá
            </span>
          </div>
        )}
      </div>

      {/* ── Summary panel ── */}
      {summary && summary.count > 0 && (
        <div style={s.summaryPanel}>
          {/* Big score */}
          <div style={s.bigScore}>
            <div style={s.bigScoreNum}>{summary.average ?? "—"}</div>
            <div style={{ display: "flex", gap: 2, margin: "6px 0 4px" }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <span
                  key={n}
                  style={{
                    fontSize: 13,
                    color:
                      n <= Math.round(summary.average ?? 0)
                        ? "#f5c518"
                        : "rgba(255,255,255,0.12)",
                  }}
                >
                  ★
                </span>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "rgba(160,175,210,0.5)" }}>
              {summary.count} lượt đánh giá
            </div>
          </div>
          {/* Distribution bars */}
          <div style={{ flex: 1 }}>
            {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
              <RatingBar
                key={n}
                label={n}
                count={summary.distribution[String(n)] ?? 0}
                total={summary.count}
                active={summary.my_rating === n}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Write review CTA ── */}
      {isLoggedIn && summary !== null && !alreadyReviewed && !showForm && (
        <button onClick={() => setShowForm(true)} style={s.writeBtn}>
          ✏ Viết đánh giá của bạn
        </button>
      )}

      {/* ── Form: new review ── */}
      {isLoggedIn && showForm && !editingReview && (
        <ReviewForm
          movieId={movieId}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* ── Loading placeholder khi chưa biết user đã review chưa ── */}
      {isLoggedIn && summary === null && (
        <div
          style={{
            height: 44,
            background: "rgba(255,255,255,0.02)",
            borderRadius: 12,
            marginBottom: 20,
          }}
        />
      )}

      {/* ── Login prompt ── */}
      {!isLoggedIn && (
        <div style={s.loginPrompt}>
          <span style={{ color: "rgba(160,175,210,0.6)", fontSize: 13 }}>
            <a
              href="/login"
              style={{
                color: "var(--red,#e50914)",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Đăng nhập
            </a>{" "}
            để đánh giá bộ phim này
          </span>
        </div>
      )}

      {/* ── Sort bar ── */}
      {total > 0 && (
        <div style={s.sortBar}>
          <span style={{ fontSize: 12, color: "rgba(140,155,195,0.5)" }}>
            {total} đánh giá
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { key: "recent", label: "Mới nhất" },
              { key: "top", label: "Hữu ích nhất" },
            ].map((o) => (
              <button
                key={o.key}
                onClick={() => handleSortChange(o.key)}
                style={{
                  ...s.sortBtn,
                  background:
                    sort === o.key ? "rgba(229,9,20,0.12)" : "transparent",
                  borderColor:
                    sort === o.key
                      ? "rgba(229,9,20,0.35)"
                      : "rgba(100,120,175,0.15)",
                  color:
                    sort === o.key
                      ? "rgba(255,110,110,0.9)"
                      : "rgba(160,175,210,0.6)",
                  fontWeight: sort === o.key ? 700 : 500,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Review list ── */}
      <div>
        {reviews.map((r) =>
          editingReview?.id === r.id ? (
            <ReviewForm
              key={r.id}
              movieId={movieId}
              existing={editingReview}
              onSuccess={handleFormSuccess}
              onCancel={() => setEditingReview(null)}
            />
          ) : (
            <ReviewCard
              key={r.id}
              review={r}
              currentUserId={user?.id}
              onLike={handleLike}
              onEdit={(rv) => setEditingReview(rv)}
              onDelete={handleDelete}
            />
          ),
        )}
      </div>

      {/* Load more */}
      {hasMore && (
        <button
          onClick={() => fetchReviews(page + 1, sort, false)}
          disabled={loadingList}
          style={s.loadMoreBtn}
        >
          {loadingList
            ? "Đang tải..."
            : `Xem thêm (${total - reviews.length} còn lại)`}
        </button>
      )}

      {/* Empty */}
      {!loadingList && total === 0 && (
        <div style={s.emptyState}>
          <p style={{ fontSize: 28, margin: "0 0 8px" }}>🎬</p>
          <p style={{ fontSize: 13, color: "rgba(140,155,195,0.5)" }}>
            Chưa có đánh giá nào. Hãy là người đầu tiên!
          </p>
        </div>
      )}

      <style>{reviewCSS}</style>
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────── */
const s = {
  wrap: { padding: "0 0 40px" },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitleWrap: { display: "flex", alignItems: "center", gap: 14 },
  sectionAccent: {
    width: 4,
    height: 22,
    borderRadius: 99,
    background: "var(--red,#e50914)",
    flexShrink: 0,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    color: "var(--text-primary,#f0f4ff)",
    letterSpacing: "-0.01em",
  },
  headerBadge: { display: "flex", alignItems: "center" },
  summaryPanel: {
    display: "flex",
    gap: 24,
    alignItems: "flex-start",
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(100,120,175,0.1)",
    borderRadius: 14,
    padding: "18px 20px",
    marginBottom: 20,
  },
  bigScore: { textAlign: "center", minWidth: 90 },
  bigScoreNum: {
    fontSize: 48,
    fontWeight: 800,
    color: "#f5c518",
    lineHeight: 1,
    letterSpacing: "-0.03em",
  },
  writeBtn: {
    width: "100%",
    padding: "13px 0",
    background: "rgba(229,9,20,0.08)",
    border: "1.5px dashed rgba(229,9,20,0.3)",
    borderRadius: 12,
    color: "rgba(255,110,110,0.8)",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: 20,
    transition: "all 0.18s ease",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  },
  loginPrompt: {
    padding: "14px 18px",
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(100,120,175,0.1)",
    borderRadius: 12,
    marginBottom: 20,
    textAlign: "center",
  },
  sortBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sortBtn: {
    padding: "5px 12px",
    borderRadius: 8,
    border: "1px solid",
    cursor: "pointer",
    fontSize: 12,
    transition: "all 0.15s ease",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  },
  loadMoreBtn: {
    width: "100%",
    padding: "11px 0",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(100,120,175,0.12)",
    borderRadius: 10,
    color: "rgba(160,175,210,0.6)",
    fontSize: 13,
    cursor: "pointer",
    marginTop: 12,
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
    transition: "background 0.15s",
  },
  emptyState: { textAlign: "center", padding: "32px 0" },
};

const sc = {
  card: {
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(100,120,175,0.1)",
    borderRadius: 14,
    padding: "16px 18px",
    marginBottom: 12,
    transition: "border-color 0.15s",
  },
  spoilerBadge: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.04em",
    background: "rgba(229,9,20,0.12)",
    border: "1px solid rgba(229,9,20,0.25)",
    color: "rgba(255,110,110,0.8)",
    borderRadius: 6,
    padding: "2px 7px",
  },
  actionBtn: {
    background: "transparent",
    border: "none",
    color: "rgba(140,155,195,0.45)",
    fontSize: 11.5,
    cursor: "pointer",
    padding: "2px 6px",
    borderRadius: 6,
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
    transition: "color 0.15s",
  },
  likeBtn: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 12px",
    borderRadius: 8,
    border: "1px solid",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    transition: "all 0.15s ease",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  },
};

const sf = {
  card: {
    background: "rgba(10,14,22,0.95)",
    border: "1.5px solid rgba(229,9,20,0.2)",
    borderRadius: 14,
    padding: "20px 20px 16px",
    marginBottom: 20,
    boxShadow: "0 0 0 1px rgba(229,9,20,0.06)",
  },
  label: {
    margin: "0 0 12px",
    fontSize: 13,
    fontWeight: 700,
    color: "var(--text-primary,#f0f4ff)",
    letterSpacing: "-0.01em",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.035)",
    border: "1px solid rgba(100,120,175,0.15)",
    borderRadius: 10,
    padding: "12px 14px",
    color: "var(--text-primary,#f0f4ff)",
    fontSize: 13.5,
    lineHeight: 1.65,
    resize: "vertical",
    outline: "none",
    marginBottom: 8,
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  },
  btnSubmit: {
    flex: 2,
    padding: "10px 0",
    background: "var(--red,#e50914)",
    border: "none",
    color: "#fff",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
    transition: "opacity 0.15s",
  },
  btnCancel: {
    flex: 1,
    padding: "10px 0",
    background: "transparent",
    border: "1px solid rgba(100,120,175,0.18)",
    color: "rgba(160,175,210,0.6)",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
  },
};

const reviewCSS = `
  .review-write-btn:hover {
    background: rgba(229,9,20,0.14) !important;
    border-color: rgba(229,9,20,0.5) !important;
  }
`;

// src/components/CommentSection.jsx
/**
 * Section bình luận dưới mỗi ReviewCard.
 * Props: reviewId, currentUserId
 *
 * Tính năng:
 *  - Xem bình luận (click "N bình luận" để mở)
 *  - Thêm bình luận mới
 *  - Reply bình luận (1 cấp)
 *  - Xoá bình luận của mình
 */
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { getComments, addComment, deleteComment } from "../api/commentApi";
import { useToast } from "./ToastContext";

function timeAgo(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return "vừa xong";
  if (s < 3600) return `${Math.floor(s / 60)}p trước`;
  if (s < 86400) return `${Math.floor(s / 3600)}g trước`;
  return new Date(d).toLocaleDateString("vi-VN");
}

/* ── Avatar nhỏ ── */
function MiniAvatar({ author, size = 28 }) {
  if (author.avatar_url) {
    return (
      <img
        src={author.avatar_url}
        alt=""
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
        flexShrink: 0,
        background: "rgba(229,9,20,0.18)",
        border: "1px solid rgba(229,9,20,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.45,
        userSelect: "none",
      }}
    >
      {author.avatar || (author.username?.[0]?.toUpperCase() ?? "?")}
    </div>
  );
}

/* ── Input box ── */
function CommentInput({ placeholder, onSubmit, onCancel, loading, autoFocus }) {
  const [text, setText] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const submit = () => {
    if (!text.trim() || loading) return;
    onSubmit(text.trim());
    setText("");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: "100%",
      }}
    >
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
          if (e.key === "Escape" && onCancel) onCancel();
        }}
        placeholder={placeholder || "Viết bình luận..."}
        maxLength={1000}
        rows={2}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "8px 12px",
          resize: "vertical",
          background: "rgba(255,255,255,0.03)",
          border: "1.5px solid rgba(100,120,175,0.15)",
          borderRadius: 8,
          color: "var(--text-primary,#f0f4ff)",
          fontSize: 13,
          fontFamily: "inherit",
          outline: "none",
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "rgba(229,9,20,0.4)")}
        onBlur={(e) => (e.target.style.borderColor = "rgba(100,120,175,0.15)")}
      />
      <div
        style={{
          display: "flex",
          gap: 7,
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "rgba(130,145,185,0.35)",
            marginRight: "auto",
          }}
        >
          Ctrl+Enter để gửi
        </span>
        {onCancel && (
          <button onClick={onCancel} style={s.btnCancel}>
            Huỷ
          </button>
        )}
        <button
          onClick={submit}
          disabled={!text.trim() || loading}
          style={{ ...s.btnSend, opacity: !text.trim() || loading ? 0.4 : 1 }}
        >
          {loading ? "Đang gửi..." : "Gửi"}
        </button>
      </div>
    </div>
  );
}

/* ── Single comment + replies ── */
function CommentItem({
  comment,
  currentUserId,
  onDelete,
  onReply,
  replyingTo,
  onSubmitReply,
  replyLoading,
}) {
  const isOwner = currentUserId && currentUserId === comment.author.id;
  const isReplying = replyingTo === comment.id;

  return (
    <div style={{ marginBottom: 10 }}>
      {/* Comment chính */}
      <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
        <Link
          to={comment.author.username ? `/u/${comment.author.username}` : "#"}
          style={{ flexShrink: 0 }}
        >
          <MiniAvatar author={comment.author} size={28} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Bubble */}
          <div
            style={{
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(100,120,175,0.1)",
              borderRadius: "0 10px 10px 10px",
              padding: "8px 12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <Link
                to={
                  comment.author.username
                    ? `/u/${comment.author.username}`
                    : "#"
                }
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "var(--text-primary,#f0f4ff)",
                  textDecoration: "none",
                }}
              >
                {comment.author.username || "Người dùng"}
              </Link>
              <span style={{ fontSize: 10.5, color: "rgba(130,145,185,0.4)" }}>
                {timeAgo(comment.created_at)}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "rgba(200,215,255,0.82)",
                lineHeight: 1.6,
                wordBreak: "break-word",
                whiteSpace: "pre-wrap",
              }}
            >
              {comment.content}
            </p>
          </div>

          {/* Actions dưới bubble */}
          <div
            style={{ display: "flex", gap: 10, marginTop: 4, paddingLeft: 4 }}
          >
            {currentUserId && (
              <button onClick={() => onReply(comment.id)} style={s.actionLink}>
                Trả lời
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => onDelete(comment.id)}
                style={{ ...s.actionLink, color: "rgba(229,9,20,0.5)" }}
              >
                Xoá
              </button>
            )}
          </div>

          {/* Reply input */}
          {isReplying && (
            <div style={{ marginTop: 8 }}>
              <CommentInput
                placeholder={`Trả lời @${comment.author.username || "người dùng"}...`}
                onSubmit={(text) => onSubmitReply(comment.id, text)}
                onCancel={() => onReply(null)}
                loading={replyLoading}
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies?.length > 0 && (
        <div
          style={{
            marginLeft: 37,
            marginTop: 6,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {comment.replies.map((reply) => (
            <div
              key={reply.id}
              style={{ display: "flex", gap: 9, alignItems: "flex-start" }}
            >
              <Link
                to={reply.author.username ? `/u/${reply.author.username}` : "#"}
                style={{ flexShrink: 0 }}
              >
                <MiniAvatar author={reply.author} size={24} />
              </Link>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(100,120,175,0.08)",
                    borderRadius: "0 8px 8px 8px",
                    padding: "6px 10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 3,
                    }}
                  >
                    <Link
                      to={
                        reply.author.username
                          ? `/u/${reply.author.username}`
                          : "#"
                      }
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text-primary,#f0f4ff)",
                        textDecoration: "none",
                      }}
                    >
                      {reply.author.username || "Người dùng"}
                    </Link>
                    <span
                      style={{ fontSize: 10, color: "rgba(130,145,185,0.4)" }}
                    >
                      {timeAgo(reply.created_at)}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12.5,
                      color: "rgba(200,215,255,0.78)",
                      lineHeight: 1.55,
                      wordBreak: "break-word",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {reply.content}
                  </p>
                </div>
                {currentUserId === reply.author.id && (
                  <button
                    onClick={() => onDelete(reply.id)}
                    style={{
                      ...s.actionLink,
                      marginTop: 3,
                      marginLeft: 4,
                      color: "rgba(229,9,20,0.5)",
                    }}
                  >
                    Xoá
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN EXPORT
════════════════════════════════════════════ */
export default function CommentSection({
  reviewId,
  currentUserId,
  isLoggedIn,
}) {
  const showToast = useToast();

  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // comment id đang reply

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data } = await getComments(reviewId);
      setComments(data.comments || []);
      setTotal(data.total || 0);
    } catch {
      showToast("Không tải được bình luận.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!open && comments.length === 0) fetchComments();
    setOpen((p) => !p);
  };

  const handleAddComment = async (text) => {
    if (!isLoggedIn) return showToast("Đăng nhập để bình luận.", "warning");
    setSending(true);
    try {
      const { data } = await addComment(reviewId, text, null);
      setComments((prev) => [...prev, { ...data, replies: [] }]);
      setTotal((t) => t + 1);
    } catch {
      showToast("Gửi bình luận thất bại.", "error");
    } finally {
      setSending(false);
    }
  };

  const handleReply = async (parentId, text) => {
    if (!isLoggedIn) return showToast("Đăng nhập để trả lời.", "warning");
    setReplyLoading(true);
    try {
      const { data } = await addComment(reviewId, text, parentId);
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: [...(c.replies || []), data] }
            : c,
        ),
      );
      setReplyingTo(null);
    } catch {
      showToast("Gửi trả lời thất bại.", "error");
    } finally {
      setReplyLoading(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await deleteComment(commentId);
      // Xoá khỏi top-level hoặc replies
      setComments((prev) => {
        const filtered = prev.filter((c) => c.id !== commentId);
        return filtered.map((c) => ({
          ...c,
          replies: (c.replies || []).filter((r) => r.id !== commentId),
        }));
      });
      setTotal((t) => Math.max(0, t - 1));
      showToast("Đã xoá bình luận.", "success");
    } catch {
      showToast("Xoá thất bại.", "error");
    }
  };

  const totalCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length || 0),
    0,
  );

  return (
    <div style={{ marginTop: 10 }}>
      {/* Toggle button */}
      <button onClick={handleToggle} style={s.toggleBtn}>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        {open ? "Ẩn bình luận" : total > 0 ? `${total} bình luận` : "Bình luận"}
        <span style={{ opacity: 0.4, fontSize: 11 }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Panel */}
      {open && (
        <div style={s.panel}>
          {/* Loading */}
          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 0",
              }}
            >
              <div style={s.spinner} />
              <span style={{ fontSize: 12, color: "rgba(130,145,185,0.4)" }}>
                Đang tải...
              </span>
            </div>
          )}

          {/* Danh sách comment */}
          {!loading &&
            comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                currentUserId={currentUserId}
                onDelete={handleDelete}
                onReply={(id) =>
                  setReplyingTo((prev) => (prev === id ? null : id))
                }
                replyingTo={replyingTo}
                onSubmitReply={handleReply}
                replyLoading={replyLoading}
              />
            ))}

          {/* Empty state */}
          {!loading && comments.length === 0 && (
            <p
              style={{
                fontSize: 12,
                color: "rgba(130,145,185,0.35)",
                margin: "6px 0 10px",
              }}
            >
              Chưa có bình luận nào. Hãy là người đầu tiên!
            </p>
          )}

          {/* Input bình luận mới */}
          {isLoggedIn ? (
            <div style={{ marginTop: 10 }}>
              <CommentInput
                placeholder="Viết bình luận... (Ctrl+Enter để gửi)"
                onSubmit={handleAddComment}
                loading={sending}
              />
            </div>
          ) : (
            <p
              style={{
                fontSize: 12,
                color: "rgba(130,145,185,0.4)",
                marginTop: 10,
              }}
            >
              <a href="/login" style={{ color: "#60a5fa" }}>
                Đăng nhập
              </a>{" "}
              để bình luận.
            </p>
          )}
        </div>
      )}

      <style>{`@keyframes cmtSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Styles ── */
const s = {
  toggleBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    border: "none",
    color: "rgba(140,155,195,0.55)",
    cursor: "pointer",
    fontSize: 12.5,
    fontWeight: 500,
    fontFamily: "inherit",
    padding: "4px 0",
    transition: "color 0.15s",
  },
  panel: {
    marginTop: 8,
    paddingTop: 10,
    borderTop: "1px solid rgba(100,120,175,0.1)",
  },
  actionLink: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 600,
    fontFamily: "inherit",
    color: "rgba(96,165,250,0.6)",
    padding: 0,
    transition: "color 0.15s",
  },
  btnCancel: {
    padding: "5px 12px",
    borderRadius: 7,
    border: "1px solid rgba(100,120,175,0.2)",
    background: "transparent",
    color: "rgba(140,155,195,0.6)",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  btnSend: {
    padding: "5px 14px",
    borderRadius: 7,
    border: "none",
    background: "rgba(229,9,20,0.85)",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "opacity 0.15s",
  },
  spinner: {
    width: 14,
    height: 14,
    border: "2px solid rgba(255,255,255,0.06)",
    borderTop: "2px solid var(--red,#e50914)",
    borderRadius: "50%",
    animation: "cmtSpin 0.75s linear infinite",
  },
};

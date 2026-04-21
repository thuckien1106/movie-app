// src/pages/AdminPage.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastContext";
import Navbar from "../components/Navbar";
import {
  getAdminStats,
  getAdminUsers,
  getAdminReviews,
  setUserRole,
  banUser,
  unbanUser,
  hideReview,
  unhideReview,
  deleteReviewAdmin,
} from "../api/adminApi";

/* ─── helpers ──────────────────────────────────────────── */
function timeAgo(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return "vừa xong";
  if (s < 3600) return `${Math.floor(s / 60)}p trước`;
  if (s < 86400) return `${Math.floor(s / 3600)}g trước`;
  return new Date(d).toLocaleDateString("vi-VN");
}

const ROLE_LABEL = { user: "User", moderator: "Mod", admin: "Admin" };
const ROLE_COLOR = {
  user: { bg: "#1e293b", color: "#94a3b8" },
  moderator: { bg: "#1c3a5e", color: "#60a5fa" },
  admin: { bg: "#3b1c1c", color: "#f87171" },
};

/* ─── stat card ─────────────────────────────────────────── */
function StatCard({ label, value, accent }) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 10,
        padding: "18px 22px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#475569",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{ fontSize: 28, fontWeight: 700, color: accent || "#f1f5f9" }}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}

/* ─── pagination ────────────────────────────────────────── */
function Pager({ page, total_pages, onPage }) {
  if (total_pages <= 1) return null;
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        justifyContent: "center",
        marginTop: 20,
      }}
    >
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        style={pBtn}
      >
        ‹
      </button>
      <span
        style={{
          color: "#64748b",
          fontSize: 13,
          padding: "0 8px",
          lineHeight: "30px",
        }}
      >
        {page} / {total_pages}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= total_pages}
        style={pBtn}
      >
        ›
      </button>
    </div>
  );
}
const pBtn = {
  width: 30,
  height: 30,
  border: "1px solid #1e293b",
  borderRadius: 6,
  background: "#0f172a",
  color: "#94a3b8",
  cursor: "pointer",
  fontSize: 16,
};

/* ════════════════════════════════════════════════════════ */
export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();

  const [tab, setTab] = useState("overview"); // "overview" | "users" | "reviews"
  const [stats, setStats] = useState(null);

  /* ── Users state ── */
  const [users, setUsers] = useState([]);
  const [uTotal, setUTotal] = useState(0);
  const [uPages, setUPages] = useState(1);
  const [uPage, setUPage] = useState(1);
  const [uSearch, setUSearch] = useState("");
  const [uRole, setURole] = useState("");
  const [uBanned, setUBanned] = useState("");
  const [uLoading, setULoading] = useState(false);

  /* ── Reviews state ── */
  const [reviews, setReviews] = useState([]);
  const [rTotal, setRTotal] = useState(0);
  const [rPages, setRPages] = useState(1);
  const [rPage, setRPage] = useState(1);
  const [rFlagged, setRFlagged] = useState("");
  const [rHidden, setRHidden] = useState("");
  const [rLoading, setRLoading] = useState(false);

  /* ── Modal confirm ── */
  const [confirm, setConfirm] = useState(null); // { message, onOk }

  /* ── Guard: chỉ admin / moderator ── */
  useEffect(() => {
    if (user && user.role === "user") {
      showToast("Bạn không có quyền truy cập.", "error");
      navigate("/", { replace: true });
    }
  }, [user]);

  /* ── Fetch stats ── */
  useEffect(() => {
    getAdminStats()
      .then((r) => setStats(r.data))
      .catch(() => {});
  }, []);

  /* ── Fetch users ── */
  const fetchUsers = useCallback(
    async (p = uPage) => {
      setULoading(true);
      try {
        const params = { page: p, page_size: 20 };
        if (uSearch) params.search = uSearch;
        if (uRole) params.role = uRole;
        if (uBanned !== "") params.banned = uBanned === "true";
        const { data } = await getAdminUsers(params);
        setUsers(data.users);
        setUTotal(data.total);
        setUPages(data.total_pages);
        setUPage(p);
      } catch {
        showToast("Không tải được danh sách user.", "error");
      } finally {
        setULoading(false);
      }
    },
    [uSearch, uRole, uBanned],
  );

  useEffect(() => {
    if (tab === "users") fetchUsers(1);
  }, [tab]);

  /* ── Fetch reviews ── */
  const fetchReviews = useCallback(
    async (p = rPage) => {
      setRLoading(true);
      try {
        const params = { page: p, page_size: 20 };
        if (rFlagged !== "") params.flagged = rFlagged === "true";
        if (rHidden !== "") params.hidden = rHidden === "true";
        const { data } = await getAdminReviews(params);
        setReviews(data.reviews);
        setRTotal(data.total);
        setRPages(data.total_pages);
        setRPage(p);
      } catch {
        showToast("Không tải được danh sách review.", "error");
      } finally {
        setRLoading(false);
      }
    },
    [rFlagged, rHidden],
  );

  useEffect(() => {
    if (tab === "reviews") fetchReviews(1);
  }, [tab]);

  /* ── Actions: users ── */
  const handleSetRole = (u, newRole) => {
    setConfirm({
      message: `Đổi role của "${u.username || u.email}" thành ${ROLE_LABEL[newRole]}?`,
      onOk: async () => {
        try {
          await setUserRole(u.id, newRole);
          showToast("Đã đổi role.", "success");
          fetchUsers(uPage);
          getAdminStats().then((r) => setStats(r.data));
        } catch {}
        setConfirm(null);
      },
    });
  };

  const handleBan = (u) => {
    setConfirm({
      message: `Khoá tài khoản "${u.username || u.email}"?`,
      onOk: async () => {
        try {
          await banUser(u.id, "Vi phạm nội quy");
          showToast("Đã khoá tài khoản.", "success");
          fetchUsers(uPage);
          getAdminStats().then((r) => setStats(r.data));
        } catch {}
        setConfirm(null);
      },
    });
  };

  const handleUnban = async (u) => {
    try {
      await unbanUser(u.id);
      showToast("Đã gỡ khoá.", "success");
      fetchUsers(uPage);
      getAdminStats().then((r) => setStats(r.data));
    } catch {}
  };

  /* ── Actions: reviews ── */
  const handleHide = async (r) => {
    try {
      await (r.is_hidden ? unhideReview(r.id) : hideReview(r.id));
      showToast(r.is_hidden ? "Đã hiện review." : "Đã ẩn review.", "success");
      fetchReviews(rPage);
      getAdminStats().then((res) => setStats(res.data));
    } catch {}
  };

  const handleDeleteReview = (r) => {
    setConfirm({
      message: `Xoá vĩnh viễn review của "${r.author?.username}"? Không thể hoàn tác.`,
      onOk: async () => {
        try {
          await deleteReviewAdmin(r.id);
          showToast("Đã xoá review.", "success");
          fetchReviews(rPage);
          getAdminStats().then((res) => setStats(res.data));
        } catch {}
        setConfirm(null);
      },
    });
  };

  if (!user || user.role === "user") return null;

  return (
    <div
      style={{ minHeight: "100vh", background: "#020812", color: "#e2e8f0" }}
    >
      <Navbar />
      <div
        style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 60px" }}
      >
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "#e11d48",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {ROLE_LABEL[user.role]}
            </span>
            <span style={{ color: "#1e293b" }}>·</span>
            <span style={{ fontSize: 11, color: "#475569" }}>
              Bảng điều khiển
            </span>
          </div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "#f1f5f9",
              margin: 0,
            }}
          >
            Quản lý hệ thống
          </h1>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 28,
            borderBottom: "1px solid #1e293b",
            paddingBottom: 0,
          }}
        >
          {[
            { id: "overview", label: "Tổng quan" },
            {
              id: "users",
              label: `Người dùng${stats ? ` (${stats.total_users})` : ""}`,
            },
            {
              id: "reviews",
              label: `Review${stats ? ` (${stats.total_reviews})` : ""}`,
            },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "8px 18px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? "#f1f5f9" : "#475569",
                borderBottom:
                  tab === t.id ? "2px solid #e11d48" : "2px solid transparent",
                marginBottom: -1,
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && stats && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
                gap: 12,
                marginBottom: 28,
              }}
            >
              <StatCard label="Tổng user" value={stats.total_users} />
              <StatCard
                label="Bị khoá"
                value={stats.banned_users}
                accent="#f87171"
              />
              <StatCard
                label="Moderator"
                value={stats.moderators}
                accent="#60a5fa"
              />
              <StatCard label="Admin" value={stats.admins} accent="#e11d48" />
              <StatCard label="Tổng review" value={stats.total_reviews} />
              <StatCard
                label="Bị báo cáo"
                value={stats.flagged_reviews}
                accent="#fb923c"
              />
              <StatCard
                label="Đã ẩn"
                value={stats.hidden_reviews}
                accent="#a78bfa"
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setTab("users")}
                style={actionBtn("#1e293b", "#94a3b8")}
              >
                Quản lý User →
              </button>
              {stats.flagged_reviews > 0 && (
                <button
                  onClick={() => {
                    setTab("reviews");
                    setRFlagged("true");
                  }}
                  style={actionBtn("#3b1c0e", "#fb923c")}
                >
                  Xem {stats.flagged_reviews} review bị báo cáo →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === "users" && (
          <div>
            {/* Filters */}
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <input
                value={uSearch}
                onChange={(e) => setUSearch(e.target.value)}
                placeholder="Tìm email / username..."
                onKeyDown={(e) => e.key === "Enter" && fetchUsers(1)}
                style={inputStyle}
              />
              <select
                value={uRole}
                onChange={(e) => setURole(e.target.value)}
                style={selectStyle}
              >
                <option value="">Tất cả role</option>
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
              <select
                value={uBanned}
                onChange={(e) => setUBanned(e.target.value)}
                style={selectStyle}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="false">Đang hoạt động</option>
                <option value="true">Đã bị khoá</option>
              </select>
              <button
                onClick={() => fetchUsers(1)}
                style={actionBtn("#1e293b", "#94a3b8")}
              >
                Tìm kiếm
              </button>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid #1e293b" }}>
                    {[
                      "ID",
                      "Người dùng",
                      "Role",
                      "Review",
                      "Trạng thái",
                      "Hành động",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "8px 12px",
                          color: "#475569",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          textAlign: "center",
                          padding: 40,
                          color: "#475569",
                        }}
                      >
                        Đang tải...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          textAlign: "center",
                          padding: 40,
                          color: "#475569",
                        }}
                      >
                        Không có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr
                        key={u.id}
                        style={{ borderBottom: "1px solid #0f172a" }}
                      >
                        <td style={td}>
                          <span style={{ color: "#475569" }}>#{u.id}</span>
                        </td>
                        <td style={td}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: "50%",
                                background: "#1e293b",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 14,
                                overflow: "hidden",
                                flexShrink: 0,
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
                                u.avatar || "👤"
                              )}
                            </div>
                            <div>
                              <div
                                style={{ color: "#e2e8f0", fontWeight: 500 }}
                              >
                                {u.username || "—"}
                              </div>
                              <div style={{ color: "#475569", fontSize: 11 }}>
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={td}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              ...ROLE_COLOR[u.role],
                            }}
                          >
                            {ROLE_LABEL[u.role]}
                          </span>
                        </td>
                        <td style={{ ...td, color: "#64748b" }}>
                          {u.review_count}
                        </td>
                        <td style={td}>
                          {u.is_banned ? (
                            <span style={{ color: "#f87171", fontSize: 12 }}>
                              🔒 Bị khoá
                            </span>
                          ) : (
                            <span style={{ color: "#4ade80", fontSize: 12 }}>
                              ● Hoạt động
                            </span>
                          )}
                        </td>
                        <td style={td}>
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            {/* Đổi role (chỉ admin) */}
                            {user.role === "admin" &&
                              u.role !== "admin" &&
                              u.id !== user.id &&
                              (u.role === "user" ? (
                                <button
                                  onClick={() => handleSetRole(u, "moderator")}
                                  style={smBtn("#1c3a5e", "#60a5fa")}
                                >
                                  → Mod
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleSetRole(u, "user")}
                                  style={smBtn("#1e293b", "#94a3b8")}
                                >
                                  → User
                                </button>
                              ))}
                            {/* Ban / Unban */}
                            {u.id !== user.id &&
                              u.role !== "admin" &&
                              (u.is_banned ? (
                                <button
                                  onClick={() => handleUnban(u)}
                                  style={smBtn("#14291c", "#4ade80")}
                                >
                                  Gỡ khoá
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleBan(u)}
                                  style={smBtn("#3b1c1c", "#f87171")}
                                >
                                  Khoá
                                </button>
                              ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ color: "#475569", fontSize: 12, marginTop: 12 }}>
              Tổng: {uTotal} user
            </div>
            <Pager
              page={uPage}
              total_pages={uPages}
              onPage={(p) => fetchUsers(p)}
            />
          </div>
        )}

        {/* ── REVIEWS ── */}
        {tab === "reviews" && (
          <div>
            {/* Filters */}
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <select
                value={rFlagged}
                onChange={(e) => setRFlagged(e.target.value)}
                style={selectStyle}
              >
                <option value="">Tất cả</option>
                <option value="true">Đã bị báo cáo</option>
                <option value="false">Chưa bị báo cáo</option>
              </select>
              <select
                value={rHidden}
                onChange={(e) => setRHidden(e.target.value)}
                style={selectStyle}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="false">Đang hiển thị</option>
                <option value="true">Đã ẩn</option>
              </select>
              <button
                onClick={() => fetchReviews(1)}
                style={actionBtn("#1e293b", "#94a3b8")}
              >
                Lọc
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rLoading ? (
                <div
                  style={{ textAlign: "center", padding: 40, color: "#475569" }}
                >
                  Đang tải...
                </div>
              ) : reviews.length === 0 ? (
                <div
                  style={{ textAlign: "center", padding: 40, color: "#475569" }}
                >
                  Không có review nào
                </div>
              ) : (
                reviews.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      background: "#0f172a",
                      border: `1px solid ${r.is_flagged ? "#7c2d12" : "#1e293b"}`,
                      borderRadius: 10,
                      padding: "14px 16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 10,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Meta */}
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            flexWrap: "wrap",
                            marginBottom: 8,
                          }}
                        >
                          <span
                            style={{
                              color: "#94a3b8",
                              fontSize: 12,
                              fontWeight: 500,
                            }}
                          >
                            {r.author?.username || "?"}
                          </span>
                          <span style={{ color: "#334155", fontSize: 11 }}>
                            #{r.id}
                          </span>
                          <span style={{ color: "#f59e0b", fontSize: 12 }}>
                            ★ {r.rating}/10
                          </span>
                          <span style={{ color: "#475569", fontSize: 11 }}>
                            phim #{r.movie_id}
                          </span>
                          {r.is_flagged && (
                            <span
                              style={{
                                fontSize: 11,
                                padding: "1px 7px",
                                borderRadius: 4,
                                background: "#7c2d12",
                                color: "#fca5a5",
                              }}
                            >
                              ⚑ Bị báo cáo
                            </span>
                          )}
                          {r.is_hidden && (
                            <span
                              style={{
                                fontSize: 11,
                                padding: "1px 7px",
                                borderRadius: 4,
                                background: "#1e1b4b",
                                color: "#a5b4fc",
                              }}
                            >
                              ⊘ Đã ẩn
                            </span>
                          )}
                          {r.is_spoiler && (
                            <span
                              style={{
                                fontSize: 11,
                                padding: "1px 7px",
                                borderRadius: 4,
                                background: "#1c3a2e",
                                color: "#6ee7b7",
                              }}
                            >
                              Spoiler
                            </span>
                          )}
                          <span
                            style={{
                              color: "#334155",
                              fontSize: 11,
                              marginLeft: "auto",
                            }}
                          >
                            {timeAgo(r.created_at)}
                          </span>
                        </div>
                        {/* Content */}
                        <p
                          style={{
                            margin: 0,
                            color: "#94a3b8",
                            fontSize: 13,
                            lineHeight: 1.6,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {r.content || (
                            <span
                              style={{ fontStyle: "italic", color: "#334155" }}
                            >
                              Không có nội dung
                            </span>
                          )}
                        </p>
                        {r.flag_reason && (
                          <p
                            style={{
                              margin: "6px 0 0",
                              fontSize: 12,
                              color: "#fca5a5",
                            }}
                          >
                            Lý do báo cáo: {r.flag_reason}
                          </p>
                        )}
                      </div>
                      {/* Actions */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          flexShrink: 0,
                        }}
                      >
                        <button
                          onClick={() => handleHide(r)}
                          style={smBtn(
                            r.is_hidden ? "#1c3a2e" : "#1e1b4b",
                            r.is_hidden ? "#6ee7b7" : "#a5b4fc",
                          )}
                        >
                          {r.is_hidden ? "Hiện lại" : "Ẩn"}
                        </button>
                        <button
                          onClick={() => handleDeleteReview(r)}
                          style={smBtn("#3b1c1c", "#f87171")}
                        >
                          Xoá
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{ color: "#475569", fontSize: 12, marginTop: 12 }}>
              Tổng: {rTotal} review
            </div>
            <Pager
              page={rPage}
              total_pages={rPages}
              onPage={(p) => fetchReviews(p)}
            />
          </div>
        )}
      </div>

      {/* ── Confirm Modal ── */}
      {confirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: 14,
              padding: "28px 32px",
              maxWidth: 380,
              width: "90%",
            }}
          >
            <p
              style={{
                margin: "0 0 20px",
                fontSize: 15,
                color: "#e2e8f0",
                lineHeight: 1.6,
              }}
            >
              {confirm.message}
            </p>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setConfirm(null)}
                style={actionBtn("#1e293b", "#64748b")}
              >
                Huỷ
              </button>
              <button
                onClick={confirm.onOk}
                style={actionBtn("#7f1d1d", "#fca5a5")}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── style helpers ──────────────────────────────────────── */
const td = { padding: "10px 12px", verticalAlign: "middle" };

const inputStyle = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 7,
  padding: "7px 12px",
  color: "#e2e8f0",
  fontSize: 13,
  outline: "none",
  minWidth: 200,
};
const selectStyle = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 7,
  padding: "7px 10px",
  color: "#e2e8f0",
  fontSize: 13,
  cursor: "pointer",
};
const actionBtn = (bg, color) => ({
  padding: "7px 14px",
  borderRadius: 7,
  border: `1px solid ${color}33`,
  background: bg,
  color,
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap",
});
const smBtn = (bg, color) => ({
  padding: "4px 10px",
  borderRadius: 5,
  border: `1px solid ${color}33`,
  background: bg,
  color,
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
});

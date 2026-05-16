// src/pages/AdminPage.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastContext";
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
  sendBroadcast,
  getBroadcastHistory,
} from "../api/adminApi";

/* ─── Constants ─────────────────────────────────────────── */
const C = {
  bg: "var(--bg-page,#060c18)",
  card: "var(--bg-card,#0d1526)",
  card2: "var(--bg-card2,#111c30)",
  border: "var(--border,#1a2540)",
  borderBr: "var(--border-bright,#243050)",
  text: "var(--text-primary,#e2e8f0)",
  muted: "var(--text-muted,#64748b)",
  faint: "var(--text-faint,#2d3f5a)",
  red: "var(--red,#e11d48)",
  redDim: "var(--red-dim,rgba(225,29,72,0.12))",
  redText: "var(--red-text,#ff6b6b)",
  blue: "#3b82f6",
  blueDim: "rgba(59,130,246,0.12)",
  green: "#22c55e",
  greenDim: "rgba(34,197,94,0.1)",
  amber: "#f59e0b",
  amberDim: "rgba(245,158,11,0.1)",
  purple: "#a78bfa",
  purpleDim: "rgba(167,139,250,0.1)",
};

const ROLE_CFG = {
  user: { label: "User", color: C.muted, bg: "rgba(100,116,139,0.15)" },
  moderator: { label: "Mod", color: C.blue, bg: C.blueDim },
  admin: { label: "Admin", color: C.red, bg: C.redDim },
};

function timeAgo(d) {
  if (!d) return "—";
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return "vừa xong";
  if (s < 3600) return `${Math.floor(s / 60)}p trước`;
  if (s < 86400) return `${Math.floor(s / 3600)}g trước`;
  const days = Math.floor(s / 86400);
  return days === 1 ? "hôm qua" : `${days} ngày trước`;
}
function fmtNum(n) {
  if (n == null) return "—";
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

/* ─── Reusable UI ───────────────────────────────────────── */
function Badge({ label, color, bg, dot }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 9px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        color,
        background: bg,
        border: `1px solid ${color}33`,
      }}
    >
      {dot && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
          }}
        />
      )}
      {label}
    </span>
  );
}

function Spinner({ size = 20 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${C.border}`,
        borderTopColor: C.red,
        animation: "adminSpin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

function Empty({ text = "Không có dữ liệu", icon = "📭" }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: C.muted }}>
      <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.4 }}>{icon}</div>
      <div style={{ fontSize: 14 }}>{text}</div>
    </div>
  );
}

function Pager({ page, totalPages, total, onPage }) {
  if (totalPages <= 1)
    return (
      <div
        style={{
          color: C.muted,
          fontSize: 12,
          marginTop: 12,
          textAlign: "right",
        }}
      >
        {total} mục
      </div>
    );
  const pages = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++)
    pages.push(i);
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 16,
      }}
    >
      <span style={{ color: C.muted, fontSize: 12 }}>{total} mục</span>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <PBtn onClick={() => onPage(1)} disabled={page <= 1} label="«" />
        <PBtn onClick={() => onPage(page - 1)} disabled={page <= 1} label="‹" />
        {pages.map((p) => (
          <PBtn
            key={p}
            onClick={() => onPage(p)}
            active={p === page}
            label={String(p)}
          />
        ))}
        <PBtn
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          label="›"
        />
        <PBtn
          onClick={() => onPage(totalPages)}
          disabled={page >= totalPages}
          label="»"
        />
      </div>
    </div>
  );
}
function PBtn({ onClick, disabled, label, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 30,
        height: 30,
        borderRadius: 6,
        fontSize: 13,
        border: `1px solid ${active ? C.red : C.border}`,
        background: active ? C.redDim : C.card,
        color: active ? C.red : disabled ? C.faint : C.muted,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

function ConfirmModal({ msg, onOk, onCancel, danger = true }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        animation: "adminFadeIn 0.15s ease",
      }}
    >
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: "28px 32px",
          maxWidth: 400,
          width: "90%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
        }}
      >
        <div style={{ fontSize: 22, marginBottom: 12 }}>
          {danger ? "⚠️" : "❓"}
        </div>
        <p
          style={{
            margin: "0 0 24px",
            fontSize: 14,
            color: C.text,
            lineHeight: 1.65,
          }}
        >
          {msg}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn
            onClick={onCancel}
            label="Huỷ"
            color={C.muted}
            bg="transparent"
            border={C.border}
          />
          <Btn
            onClick={onOk}
            label="Xác nhận"
            color={danger ? C.red : C.blue}
            bg={danger ? C.redDim : C.blueDim}
            border={danger ? C.red : C.blue}
          />
        </div>
      </div>
    </div>
  );
}

function Btn({ onClick, label, color, bg, border, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 18px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        border: `1px solid ${border || color}44`,
        background: bg,
        color,
        cursor: disabled ? "default" : "pointer",
        fontFamily: "inherit",
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function SmBtn({ label, color, bg, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "4px 12px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        border: `1px solid ${color}33`,
        background: bg,
        color,
        cursor: disabled ? "default" : "pointer",
        whiteSpace: "nowrap",
        fontFamily: "inherit",
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.15s",
      }}
      className="sm-btn"
    >
      {label}
    </button>
  );
}

/* ─── Stat Card ─────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, accent, trend, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: "18px 20px",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s, transform 0.15s",
        position: "relative",
        overflow: "hidden",
      }}
      className="admin-stat-card"
    >
      <div
        style={{
          position: "absolute",
          right: 16,
          top: 12,
          fontSize: 32,
          opacity: 0.07,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: 10,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: "0.09em",
          marginBottom: 10,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: accent || C.text,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {fmtNum(value)}
      </div>
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}
      >
        {trend != null && (
          <span
            style={{
              fontSize: 11,
              color: trend >= 0 ? C.green : C.red,
              fontWeight: 600,
            }}
          >
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
        {sub && <span style={{ fontSize: 11, color: C.muted }}>{sub}</span>}
      </div>
    </div>
  );
}

/* ─── Mini Bar Chart ────────────────────────────────────── */
function MiniBarChart({ data, color = "#e11d48", height = 48 }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height }}>
      {data.map((d, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            height: "100%",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "flex-end",
              width: "100%",
            }}
          >
            <div
              style={{
                width: "100%",
                height: `${Math.max(4, Math.round((d.value / max) * 100))}%`,
                background: color,
                borderRadius: "3px 3px 0 0",
                opacity: 0.8,
                transition: "height 0.5s ease",
              }}
            />
          </div>
          <span style={{ fontSize: 9, color: C.faint, whiteSpace: "nowrap" }}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Section Header ────────────────────────────────────── */
function SectionTitle({ title, sub, action }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 18,
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <div
          style={{
            width: 3,
            height: 16,
            borderRadius: 99,
            background: C.red,
            flexShrink: 0,
            alignSelf: "center",
          }}
        />
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>
          {title}
        </h2>
        {sub && <span style={{ fontSize: 12, color: C.muted }}>{sub}</span>}
      </div>
      {action}
    </div>
  );
}

/* ─── User Avatar ───────────────────────────────────────── */
function UserAvatar({ user, size = 34 }) {
  const [imgErr, setImgErr] = useState(false);

  // Màu background dựa theo tên (deterministic)
  const COLORS = [
    ["#3b82f6", "#1d4ed8"],
    ["#e11d48", "#9f1239"],
    ["#22c55e", "#15803d"],
    ["#f59e0b", "#b45309"],
    ["#a78bfa", "#6d28d9"],
    ["#06b6d4", "#0e7490"],
    ["#f97316", "#c2410c"],
    ["#ec4899", "#be185d"],
  ];
  const name = user?.username || user?.email || "?";
  const idx = name.charCodeAt(0) % COLORS.length;
  const [bg1, bg2] = COLORS[idx];
  const initials = name[0].toUpperCase();
  const hasImage = user?.avatar_url && !imgErr;
  const isEmoji = user?.avatar && !user.avatar.match(/^[a-zA-Z]/);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: hasImage
          ? "transparent"
          : `linear-gradient(135deg, ${bg1}, ${bg2})`,
        border: `1.5px solid ${hasImage ? C.border : bg1 + "66"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: isEmoji ? size * 0.5 : size * 0.42,
        fontWeight: 700,
        color: "#fff",
        overflow: "hidden",
        userSelect: "none",
        letterSpacing: "-0.02em",
      }}
    >
      {hasImage ? (
        <img
          src={user.avatar_url}
          alt={name}
          loading="lazy"
          onError={() => setImgErr(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : isEmoji ? (
        user.avatar
      ) : (
        initials
      )}
    </div>
  );
}

/* ─── OVERVIEW ──────────────────────────────────────────── */
function OverviewSection({ stats, onGoTo }) {
  if (!stats)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 60,
          gap: 12,
          color: C.muted,
        }}
      >
        <Spinner size={24} />
        <span>Đang tải...</span>
      </div>
    );

  const activeUsers = stats.total_users - stats.banned_users;
  const barData = [
    { label: "User", value: stats.total_users - stats.moderators },
    { label: "Mod", value: stats.moderators },
    { label: "Active", value: activeUsers },
    { label: "Banned", value: stats.banned_users },
  ];
  const reviewBar = [
    { label: "Tổng", value: stats.total_reviews },
    { label: "Ẩn", value: stats.hidden_reviews },
    { label: "Báo cáo", value: stats.flagged_reviews },
  ];

  return (
    <div>
      <SectionTitle
        title="Tổng quan"
        sub={`Cập nhật lúc ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`}
      />

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
          gap: 10,
          marginBottom: 24,
        }}
      >
        <StatCard
          icon="👥"
          label="Tổng user"
          value={stats.total_users}
          accent={C.blue}
          sub="tài khoản"
        />
        <StatCard
          icon="✅"
          label="Hoạt động"
          value={activeUsers}
          accent={C.green}
          sub="đang dùng"
        />
        <StatCard
          icon="🔒"
          label="Bị khoá"
          value={stats.banned_users}
          accent={C.red}
          sub="tài khoản"
          onClick={
            stats.banned_users > 0
              ? () => onGoTo("users", { banned: "true" })
              : null
          }
        />
        <StatCard
          icon="🛡️"
          label="Moderator"
          value={stats.moderators}
          accent={C.blue}
          sub="tài khoản"
        />
        <StatCard
          icon="💬"
          label="Tổng review"
          value={stats.total_reviews}
          accent={C.purple}
          sub="bình luận"
        />
        <StatCard
          icon="⚑"
          label="Bị báo cáo"
          value={stats.flagged_reviews}
          accent={C.amber}
          sub="review"
          onClick={
            stats.flagged_reviews > 0
              ? () => onGoTo("reviews", { flagged: "true" })
              : null
          }
        />
        <StatCard
          icon="🚫"
          label="Đã ẩn"
          value={stats.hidden_reviews}
          accent={C.purple}
          sub="review"
          onClick={
            stats.hidden_reviews > 0
              ? () => onGoTo("reviews", { hidden: "true" })
              : null
          }
        />
      </div>

      {/* Charts row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: C.muted,
              fontWeight: 600,
              marginBottom: 14,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            Phân bổ người dùng
          </div>
          <MiniBarChart data={barData} color={C.blue} height={56} />
        </div>
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: C.muted,
              fontWeight: 600,
              marginBottom: 14,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            Trạng thái Review
          </div>
          <MiniBarChart data={reviewBar} color={C.purple} height={56} />
        </div>
      </div>

      {/* Alerts */}
      {(stats.flagged_reviews > 0 || stats.banned_users > 0) && (
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            🔔 Cần xử lý
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {stats.flagged_reviews > 0 && (
              <AlertCard
                icon="⚑"
                title={`${stats.flagged_reviews} review bị báo cáo`}
                desc="Cần xem xét nội dung"
                accent={C.amber}
                onClick={() => onGoTo("reviews", { flagged: "true" })}
              />
            )}
            {stats.banned_users > 0 && (
              <AlertCard
                icon="🔒"
                title={`${stats.banned_users} tài khoản bị khoá`}
                desc="Xem danh sách khoá"
                accent={C.red}
                onClick={() => onGoTo("users", { banned: "true" })}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AlertCard({ icon, title, desc, accent, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: C.card,
        border: `1px solid ${accent}33`,
        borderRadius: 12,
        padding: "14px 18px",
        cursor: "pointer",
        flex: "1 1 240px",
        maxWidth: 380,
        transition: "border-color 0.15s, transform 0.15s",
      }}
      className="admin-alert-card"
    >
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: accent }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{ marginLeft: "auto", color: C.faint, fontSize: 18 }}>›</div>
    </div>
  );
}

/* ─── USERS ─────────────────────────────────────────────── */
function UsersSection({ currentUser, showToast, initialFilters = {} }) {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [banned, setBanned] = useState(initialFilters.banned || "");
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(
    async (p = 1, ov = {}) => {
      setLoading(true);
      try {
        const params = { page: p, page_size: 20 };
        const s = ov.search ?? search;
        const r = ov.role ?? role;
        const b = ov.banned ?? banned;
        if (s) params.search = s;
        if (r) params.role = r;
        if (b !== "") params.banned = b === "true";
        const { data } = await getAdminUsers(params);
        setUsers(data.users);
        setTotal(data.total);
        setPages(data.total_pages);
        setPage(p);
      } catch {
        showToast("Không tải được danh sách user.", "error");
      } finally {
        setLoading(false);
      }
    },
    [search, role, banned],
  );

  useEffect(() => {
    load(1);
  }, []);

  const confirm2 = (msg, onOk) => setConfirm({ msg, onOk });

  const handleRole = (u, nr) =>
    confirm2(
      `Đổi role "${u.username || u.email}" → ${ROLE_CFG[nr].label}?`,
      async () => {
        await setUserRole(u.id, nr);
        showToast("Đã đổi role.", "success");
        load(page);
        setConfirm(null);
      },
    );
  const handleBan = (u) =>
    confirm2(
      `Khoá tài khoản "${u.username || u.email}"? User sẽ không thể đăng nhập.`,
      async () => {
        await banUser(u.id, "Vi phạm nội quy");
        showToast("Đã khoá.", "success");
        load(page);
        setConfirm(null);
      },
    );
  const handleUnban = async (u) => {
    await unbanUser(u.id);
    showToast("Đã gỡ khoá.", "success");
    load(page);
  };

  return (
    <div>
      <SectionTitle title="Người dùng" sub={`${total} tài khoản`} />

      {/* Filters */}
      <div
        style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}
      >
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 140 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(1)}
            placeholder="Tìm email / username…"
            style={inp}
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                load(1, { search: "" });
              }}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: C.muted,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              ✕
            </button>
          )}
        </div>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            load(1, { role: e.target.value });
          }}
          style={sel}
        >
          <option value="">Tất cả role</option>
          <option value="user">User</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={banned}
          onChange={(e) => {
            setBanned(e.target.value);
            load(1, { banned: e.target.value });
          }}
          style={sel}
        >
          <option value="">Mọi trạng thái</option>
          <option value="false">Hoạt động</option>
          <option value="true">Bị khoá</option>
        </select>
        <Btn
          onClick={() => load(1)}
          label="Tìm"
          color={C.muted}
          bg={C.card}
          border={C.border}
        />
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <Spinner size={24} />
        </div>
      ) : users.length === 0 ? (
        <Empty text="Không tìm thấy user nào" icon="👤" />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {[
                  "ID",
                  "Người dùng",
                  "Role",
                  "Review",
                  "Tham gia",
                  "Trạng thái",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      color: C.muted,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  style={{ borderBottom: `1px solid ${C.faint}33` }}
                  className="admin-trow"
                >
                  <td style={td}>
                    <span
                      style={{
                        color: C.faint,
                        fontFamily: "monospace",
                        fontSize: 11,
                      }}
                    >
                      #{u.id}
                    </span>
                  </td>
                  <td style={td}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <UserAvatar user={u} />
                      <div>
                        <div
                          style={{
                            color: C.text,
                            fontWeight: 600,
                            fontSize: 13,
                          }}
                        >
                          {u.username || "—"}
                          {u.id === currentUser.id && (
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 9,
                                background: C.blueDim,
                                color: C.blue,
                                borderRadius: 99,
                                padding: "1px 6px",
                                fontWeight: 700,
                              }}
                            >
                              BẠN
                            </span>
                          )}
                        </div>
                        <div style={{ color: C.muted, fontSize: 11 }}>
                          {u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={td}>
                    <Badge {...(ROLE_CFG[u.role] || ROLE_CFG.user)} />
                  </td>
                  <td style={{ ...td, color: C.muted, textAlign: "center" }}>
                    {u.review_count ?? 0}
                  </td>
                  <td
                    style={{
                      ...td,
                      color: C.muted,
                      fontSize: 11,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString("vi-VN")
                      : "—"}
                  </td>
                  <td style={td}>
                    {u.is_banned ? (
                      <Badge label="🔒 Khoá" color={C.red} bg={C.redDim} dot />
                    ) : (
                      <Badge
                        label="● Online"
                        color={C.green}
                        bg={C.greenDim}
                        dot
                      />
                    )}
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {currentUser.role === "admin" &&
                        u.id !== currentUser.id &&
                        u.role !== "admin" &&
                        (u.role === "user" ? (
                          <SmBtn
                            label="→ Mod"
                            color={C.blue}
                            bg={C.blueDim}
                            onClick={() => handleRole(u, "moderator")}
                          />
                        ) : (
                          <SmBtn
                            label="→ User"
                            color={C.muted}
                            bg={C.card2}
                            onClick={() => handleRole(u, "user")}
                          />
                        ))}
                      {u.id !== currentUser.id &&
                        u.role !== "admin" &&
                        (u.is_banned ? (
                          <SmBtn
                            label="Gỡ khoá"
                            color={C.green}
                            bg={C.greenDim}
                            onClick={() => handleUnban(u)}
                          />
                        ) : (
                          <SmBtn
                            label="Khoá"
                            color={C.red}
                            bg={C.redDim}
                            onClick={() => handleBan(u)}
                          />
                        ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager
        page={page}
        totalPages={pages}
        total={total}
        onPage={(p) => load(p)}
      />
      {confirm && (
        <ConfirmModal
          msg={confirm.msg}
          onOk={confirm.onOk}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

/* ─── REVIEWS ───────────────────────────────────────────── */
function ReviewsSection({ showToast, initialFilters = {} }) {
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [flagged, setFlagged] = useState(initialFilters.flagged || "");
  const [hidden, setHidden] = useState(initialFilters.hidden || "");
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(
    async (p = 1, ov = {}) => {
      setLoading(true);
      try {
        const params = { page: p, page_size: 15 };
        const f = ov.flagged ?? flagged;
        const h = ov.hidden ?? hidden;
        if (f !== "") params.flagged = f === "true";
        if (h !== "") params.hidden = h === "true";
        const { data } = await getAdminReviews(params);
        setReviews(data.reviews);
        setTotal(data.total);
        setPages(data.total_pages);
        setPage(p);
      } catch {
        showToast("Không tải được review.", "error");
      } finally {
        setLoading(false);
      }
    },
    [flagged, hidden],
  );

  useEffect(() => {
    load(1);
  }, []);

  const handleHide = async (r) => {
    await (r.is_hidden ? unhideReview(r.id) : hideReview(r.id));
    showToast(r.is_hidden ? "Đã hiện review." : "Đã ẩn review.", "success");
    setReviews((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, is_hidden: !r.is_hidden } : x)),
    );
  };

  const handleDel = (r) =>
    setConfirm({
      msg: `Xoá vĩnh viễn review của "${r.author?.username}"? Không thể hoàn tác.`,
      onOk: async () => {
        await deleteReviewAdmin(r.id);
        showToast("Đã xoá.", "success");
        setReviews((prev) => prev.filter((x) => x.id !== r.id));
        setTotal((t) => t - 1);
        setConfirm(null);
      },
    });

  const ratingColor = (n) => (n >= 7 ? C.green : n >= 5 ? C.amber : C.red);

  return (
    <div>
      <SectionTitle title="Review" sub={`${total} review`} />

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 14,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <select
          value={flagged}
          onChange={(e) => {
            setFlagged(e.target.value);
            load(1, { flagged: e.target.value });
          }}
          style={sel}
        >
          <option value="">Mọi review</option>
          <option value="true">Bị báo cáo</option>
          <option value="false">Chưa bị báo</option>
        </select>
        <select
          value={hidden}
          onChange={(e) => {
            setHidden(e.target.value);
            load(1, { hidden: e.target.value });
          }}
          style={sel}
        >
          <option value="">Mọi trạng thái</option>
          <option value="false">Đang hiển thị</option>
          <option value="true">Đã ẩn</option>
        </select>
        {(flagged || hidden) && (
          <button
            onClick={() => {
              setFlagged("");
              setHidden("");
              load(1, { flagged: "", hidden: "" });
            }}
            style={{
              background: "none",
              border: "none",
              color: C.muted,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            ✕ Xoá bộ lọc
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <Spinner size={24} />
        </div>
      ) : reviews.length === 0 ? (
        <Empty text="Không có review nào" icon="💬" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {reviews.map((r) => (
            <div
              key={r.id}
              style={{
                background: C.card,
                border: `1px solid ${r.is_flagged ? C.amber + "44" : C.border}`,
                borderRadius: 12,
                padding: "14px 16px",
                transition: "border-color 0.15s",
              }}
              className="admin-review-card"
            >
              <div
                style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
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
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <UserAvatar user={r.author} size={28} />
                      <span
                        style={{ fontWeight: 700, color: C.text, fontSize: 13 }}
                      >
                        {r.author?.username || "?"}
                      </span>
                    </div>
                    <span
                      style={{
                        color: C.faint,
                        fontSize: 10,
                        fontFamily: "monospace",
                      }}
                    >
                      #{r.id}
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        padding: "1px 8px",
                        borderRadius: 99,
                        fontSize: 12,
                        fontWeight: 700,
                        color: ratingColor(r.rating),
                        background: ratingColor(r.rating) + "22",
                      }}
                    >
                      ★ {r.rating}/10
                    </span>
                    <span style={{ color: C.muted, fontSize: 11 }}>
                      phim #{r.movie_id}
                    </span>
                    {r.is_flagged && (
                      <Badge
                        label="⚑ Báo cáo"
                        color={C.amber}
                        bg={C.amberDim}
                      />
                    )}
                    {r.is_hidden && (
                      <Badge label="⊘ Ẩn" color={C.purple} bg={C.purpleDim} />
                    )}
                    {r.is_spoiler && (
                      <Badge label="Spoiler" color={C.green} bg={C.greenDim} />
                    )}
                    <span
                      style={{
                        marginLeft: "auto",
                        color: C.faint,
                        fontSize: 10,
                      }}
                    >
                      {timeAgo(r.created_at)}
                    </span>
                  </div>

                  {/* Content */}
                  {r.content ? (
                    <p
                      style={{
                        margin: "0 0 6px",
                        color: "#94a3b8",
                        fontSize: 13,
                        lineHeight: 1.6,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {r.content}
                    </p>
                  ) : (
                    <p
                      style={{
                        margin: "0 0 6px",
                        color: C.faint,
                        fontSize: 12,
                        fontStyle: "italic",
                      }}
                    >
                      Không có nội dung
                    </p>
                  )}

                  {r.flag_reason && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: C.amberDim,
                        border: `1px solid ${C.amber}33`,
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 11,
                        color: C.amber,
                      }}
                    >
                      ⚑ Lý do: {r.flag_reason}
                    </div>
                  )}
                  <div style={{ marginTop: 6, fontSize: 11, color: C.faint }}>
                    ❤️ {r.likes ?? 0} lượt thích
                  </div>
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
                  <SmBtn
                    label={r.is_hidden ? "Hiện lại" : "Ẩn review"}
                    color={r.is_hidden ? C.green : C.purple}
                    bg={r.is_hidden ? C.greenDim : C.purpleDim}
                    onClick={() => handleHide(r)}
                  />
                  <SmBtn
                    label="Xoá vĩnh viễn"
                    color={C.red}
                    bg={C.redDim}
                    onClick={() => handleDel(r)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pager
        page={page}
        totalPages={pages}
        total={total}
        onPage={(p) => load(p)}
      />
      {confirm && (
        <ConfirmModal
          msg={confirm.msg}
          onOk={confirm.onOk}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

/* ─── SIDEBAR ───────────────────────────────────────────── */
function Sidebar({ tab, setTab, stats, user, onLogout }) {
  const [showLogout, setShowLogout] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const NAV = [
    { id: "overview", icon: "◈", label: "Tổng quan", sub: "Dashboard" },
    {
      id: "users",
      icon: "👥",
      label: "Người dùng",
      sub: "Quản lý tài khoản",
      badge: stats?.total_users,
      badgeColor: C.blue,
    },
    {
      id: "reviews",
      icon: "💬",
      label: "Review",
      sub: "Kiểm duyệt nội dung",
      badge: stats?.flagged_reviews,
      badgeColor: C.amber,
      alert: (stats?.flagged_reviews || 0) > 0,
    },
    { id: "broadcast", icon: "📢", label: "Broadcast", sub: "Gửi thông báo" },
  ];

  const w = collapsed ? 64 : 240;

  return (
    <>
      <aside
        style={{
          width: w,
          flexShrink: 0,
          background: "linear-gradient(180deg, #060c1a 0%, #080e1c 100%)",
          borderRight: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          position: "sticky",
          top: 0,
          transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
          boxShadow: "4px 0 24px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: collapsed ? "16px 10px" : "18px 16px",
            borderBottom: `1px solid rgba(255,255,255,0.05)`,
            background:
              "linear-gradient(135deg, rgba(225,29,72,0.08), rgba(124,58,237,0.06))",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "space-between",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minWidth: 0,
                opacity: collapsed ? 0 : 1,
                transition: "opacity 0.2s",
                maxWidth: collapsed ? 0 : 200,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: "linear-gradient(135deg, #e11d48, #7c3aed)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 17,
                  boxShadow: "0 4px 12px rgba(225,29,72,0.35)",
                }}
              >
                🛡️
              </div>
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: C.text,
                    letterSpacing: "-0.02em",
                    whiteSpace: "nowrap",
                  }}
                >
                  Admin Panel
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: C.muted,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                  }}
                >
                  {user?.role === "admin" ? "Quản trị viên" : "Kiểm duyệt"}
                </div>
              </div>
            </div>
            {collapsed && (
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #e11d48, #7c3aed)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 17,
                }}
              >
                🛡️
              </div>
            )}
            <button
              onClick={() => setCollapsed((p) => !p)}
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                border: `1px solid rgba(255,255,255,0.08)`,
                background: "rgba(255,255,255,0.05)",
                color: C.muted,
                cursor: "pointer",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                transition: "all 0.15s",
              }}
              className="sidebar-btn"
            >
              {collapsed ? "›" : "‹"}
            </button>
          </div>

          {/* User card */}
          {!collapsed && (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 10,
                padding: "8px 10px",
                border: `1px solid rgba(255,255,255,0.06)`,
              }}
            >
              <UserAvatar user={user} size={30} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user?.username || user?.email}
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
                  {user?.email?.split("@")[0]}@…
                </div>
              </div>
              <div
                style={{
                  padding: "2px 7px",
                  borderRadius: 99,
                  fontSize: 9,
                  fontWeight: 800,
                  background: user?.role === "admin" ? C.redDim : C.blueDim,
                  color: user?.role === "admin" ? C.red : C.blue,
                  border: `1px solid ${user?.role === "admin" ? C.red : C.blue}33`,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  flexShrink: 0,
                }}
              >
                {user?.role === "admin" ? "Admin" : "Mod"}
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            padding: collapsed ? "10px 8px" : "12px 10px",
            overflowY: "auto",
            scrollbarWidth: "none",
          }}
        >
          {NAV.map((item) => {
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                title={collapsed ? item.label : ""}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: collapsed ? 0 : 10,
                  justifyContent: collapsed ? "center" : "flex-start",
                  padding: collapsed ? "11px 0" : "10px 12px",
                  borderRadius: 10,
                  marginBottom: 4,
                  background: isActive
                    ? "linear-gradient(135deg, rgba(225,29,72,0.15), rgba(124,58,237,0.08))"
                    : "transparent",
                  border: `1px solid ${isActive ? "rgba(225,29,72,0.3)" : "transparent"}`,
                  color: isActive ? "#fff" : C.muted,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  transition: "all 0.18s ease",
                  position: "relative",
                }}
                className="sidebar-btn"
              >
                {item.alert && !collapsed && (
                  <div
                    style={{
                      position: "absolute",
                      top: 7,
                      left: 7,
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: C.amber,
                      boxShadow: `0 0 6px ${C.amber}`,
                      animation: "alertPulse 2s ease infinite",
                    }}
                  />
                )}
                <span
                  style={{
                    fontSize: collapsed ? 19 : 16,
                    width: collapsed ? "auto" : 22,
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </span>
                {!collapsed && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? C.text : C.muted,
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: isActive ? "rgba(255,255,255,0.35)" : C.faint,
                        marginTop: 1,
                      }}
                    >
                      {item.sub}
                    </div>
                  </div>
                )}
                {!collapsed && item.badge > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      background: item.badgeColor + "22",
                      color: item.badgeColor,
                      borderRadius: 99,
                      padding: "2px 7px",
                      border: `1px solid ${item.badgeColor}33`,
                    }}
                  >
                    {fmtNum(item.badge)}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Stats mini */}
        {!collapsed && stats && (
          <div
            style={{
              margin: "0 10px 8px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: 10,
              border: `1px solid rgba(255,255,255,0.05)`,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: C.faint,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 10,
              }}
            >
              Thống kê nhanh
            </div>
            {[
              {
                label: "Tổng user",
                value: stats.total_users,
                color: C.blue,
                icon: "👥",
              },
              {
                label: "Tổng review",
                value: stats.total_reviews,
                color: C.purple,
                icon: "💬",
              },
              {
                label: "Bị khoá",
                value: stats.banned_users,
                color: C.red,
                icon: "🔒",
              },
              {
                label: "Báo cáo",
                value: stats.flagged_reviews,
                color: C.amber,
                icon: "⚑",
              },
            ].map(({ label, value, color, icon }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 7,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12 }}>{icon}</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color }}>
                  {fmtNum(value)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Bottom actions */}
        <div
          style={{
            padding: collapsed ? "10px 8px" : "10px",
            borderTop: `1px solid rgba(255,255,255,0.05)`,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {/* Theme toggle */}
          {!collapsed && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "7px 10px",
                borderRadius: 9,
                background: "rgba(255,255,255,0.03)",
                border: `1px solid rgba(255,255,255,0.06)`,
              }}
            >
              <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>
                Giao diện
              </span>
              <ThemeToggleInline />
            </div>
          )}

          {/* Logout button */}
          <button
            onClick={() => setShowLogout(true)}
            title={collapsed ? "Đăng xuất" : ""}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: collapsed ? 0 : 8,
              padding: collapsed ? "11px 0" : "9px 12px",
              borderRadius: 9,
              border: "1px solid rgba(225,29,72,0.2)",
              background: "rgba(225,29,72,0.06)",
              color: "rgba(225,29,72,0.8)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
            className="logout-btn"
          >
            <span style={{ fontSize: collapsed ? 18 : 14 }}>🚪</span>
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {showLogout && (
        <ConfirmModal
          msg="Bạn có chắc muốn đăng xuất khỏi Admin Panel không?"
          onOk={() => {
            setShowLogout(false);
            onLogout();
          }}
          onCancel={() => setShowLogout(false)}
        />
      )}
    </>
  );
}

/* ── Theme Toggle inline ────────────────────────────────── */
function ThemeToggleInline() {
  const [dark, setDark] = useState(
    () => document.documentElement.getAttribute("data-theme") === "dark",
  );
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute(
      "data-theme",
      next ? "dark" : "light",
    );
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  return (
    <button
      onClick={toggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        background: dark ? "rgba(99,102,241,0.15)" : "rgba(251,191,36,0.15)",
        border: `1px solid ${dark ? "rgba(99,102,241,0.3)" : "rgba(251,191,36,0.3)"}`,
        borderRadius: 99,
        padding: "3px 8px 3px 5px",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 600,
        color: dark ? "#818cf8" : "#d97706",
        fontFamily: "inherit",
        transition: "all 0.2s",
      }}
    >
      <span style={{ fontSize: 13 }}>{dark ? "🌙" : "☀️"}</span>
      {dark ? "Dark" : "Light"}
    </button>
  );
}

/* ─── BROADCAST ─────────────────────────────────────────── */
const TARGET_OPTIONS = [
  {
    value: "all",
    label: "Tất cả người dùng",
    icon: "👥",
    desc: "Gửi tới toàn bộ user (trừ banned)",
  },
  {
    value: "verified",
    label: "Đã xác thực email",
    icon: "✅",
    desc: "User đã verify email",
  },
  {
    value: "unverified",
    label: "Chưa xác thực email",
    icon: "📧",
    desc: "User chưa verify — nhắc nhở verify",
  },
  {
    value: "role",
    label: "Theo role",
    icon: "🛡️",
    desc: "Chọn role cụ thể bên dưới",
  },
];

const EMOJI_PRESETS = [
  "📢",
  "🎬",
  "🎉",
  "⭐",
  "🔥",
  "💡",
  "⚠️",
  "🎁",
  "📣",
  "✨",
];

function BroadcastSection({ showToast }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("all");
  const [targetRole, setTargetRole] = useState("user");
  const [emoji, setEmoji] = useState("📢");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingH, setLoadingH] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    setLoadingH(true);
    getBroadcastHistory()
      .then((r) => setHistory(r.data.history || []))
      .catch(() => {})
      .finally(() => setLoadingH(false));
  }, [result]);

  const preview = title ? `${emoji} ${title}` : "";
  const charLeft = 2000 - body.length;
  const canSend = title.trim() && body.trim() && !sending;

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    try {
      const payload = { title, body, target, emoji };
      if (target === "role") payload.target_role = targetRole;
      const { data } = await sendBroadcast(payload);
      setResult({ ok: true, ...data });
      showToast(`✅ Đã gửi tới ${data.sent} người dùng!`, "success");
      setTitle("");
      setBody("");
      setTarget("all");
      setEmoji("📢");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Gửi thất bại.";
      setResult({ ok: false, message: msg });
      showToast(msg, "error");
    } finally {
      setSending(false);
      setConfirm(false);
    }
  };

  return (
    <div>
      <SectionTitle
        title="Broadcast Notification"
        sub="Gửi thông báo hàng loạt tới người dùng"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Left: Compose */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Target selector */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "16px 18px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 12,
              }}
            >
              Đối tượng nhận
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {TARGET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTarget(opt.value)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 9,
                    cursor: "pointer",
                    background: target === opt.value ? C.redDim : C.card2,
                    border: `1px solid ${target === opt.value ? C.red + "55" : C.border}`,
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>
                    {opt.icon}
                  </span>
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: target === opt.value ? C.redText : C.text,
                      }}
                    >
                      {opt.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: C.muted,
                        marginTop: 2,
                        lineHeight: 1.4,
                      }}
                    >
                      {opt.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {target === "role" && (
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                {["user", "moderator"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setTargetRole(r)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: 8,
                      cursor: "pointer",
                      background: targetRole === r ? C.blueDim : C.card2,
                      border: `1px solid ${targetRole === r ? C.blue + "55" : C.border}`,
                      color: targetRole === r ? C.blue : C.muted,
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    {r === "user" ? "👤 User" : "🛡️ Moderator"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Compose */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "16px 18px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 12,
              }}
            >
              Nội dung thông báo
            </div>

            {/* Emoji picker */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
                Icon thông báo
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {EMOJI_PRESETS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      fontSize: 18,
                      border: `1px solid ${emoji === e ? C.red + "55" : C.border}`,
                      background: emoji === e ? C.redDim : C.card2,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>
                Tiêu đề <span style={{ color: C.red }}>*</span>
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="VD: Phim mới ra rạp tuần này!"
                style={{ ...inp, width: "100%", boxSizing: "border-box" }}
              />
            </div>

            {/* Body */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <div style={{ fontSize: 11, color: C.muted }}>
                  Nội dung <span style={{ color: C.red }}>*</span>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: charLeft < 100 ? C.amber : C.faint,
                  }}
                >
                  {charLeft} ký tự còn lại
                </div>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                rows={5}
                placeholder="Nội dung chi tiết của thông báo..."
                style={{
                  ...inp,
                  width: "100%",
                  boxSizing: "border-box",
                  resize: "vertical",
                  lineHeight: 1.55,
                  minHeight: 100,
                }}
              />
            </div>
          </div>

          {/* Send button */}
          <button
            onClick={() => setConfirm(true)}
            disabled={!canSend}
            style={{
              padding: "13px 0",
              borderRadius: 10,
              border: "none",
              background: canSend
                ? `linear-gradient(135deg, ${C.red}, #be123c)`
                : C.card2,
              color: canSend ? "#fff" : C.faint,
              fontSize: 14,
              fontWeight: 700,
              cursor: canSend ? "pointer" : "default",
              fontFamily: "inherit",
              boxShadow: canSend ? "0 4px 16px rgba(225,29,72,0.3)" : "none",
              transition: "all 0.2s",
            }}
          >
            {sending ? "Đang gửi…" : "📤 Gửi Broadcast"}
          </button>

          {/* Result banner */}
          {result && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                background: result.ok ? C.greenDim : C.redDim,
                border: `1px solid ${result.ok ? C.green : C.red}44`,
                fontSize: 13,
                color: result.ok ? C.green : C.red,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {result.ok ? "✅" : "❌"} {result.message}
              {result.ok && (
                <span
                  style={{ marginLeft: "auto", color: C.muted, fontSize: 11 }}
                >
                  {result.sent} người nhận
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Preview + History */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Live preview */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "16px 18px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 14,
              }}
            >
              Xem trước
            </div>
            <div
              style={{
                background: C.card2,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {/* Notification item mockup */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "12px 14px",
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: "rgba(168,85,247,0.15)",
                    border: "1px solid rgba(168,85,247,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    alignSelf: "center",
                  }}
                >
                  {emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: "0 0 3px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: C.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {preview || (
                      <span style={{ color: C.faint, fontStyle: "italic" }}>
                        Tiêu đề thông báo…
                      </span>
                    )}
                  </p>
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: 11,
                      color: C.muted,
                      lineHeight: 1.45,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {body || (
                      <span style={{ fontStyle: "italic" }}>
                        Nội dung thông báo sẽ hiển thị ở đây…
                      </span>
                    )}
                  </p>
                  <p style={{ margin: 0, fontSize: 10, color: C.faint }}>
                    Vừa xong
                  </p>
                </div>
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#a855f7",
                    boxShadow: "0 0 6px #a855f799",
                    flexShrink: 0,
                    marginTop: 4,
                  }}
                />
              </div>
              <div style={{ padding: "8px 14px 10px" }}>
                <div
                  style={{
                    fontSize: 10,
                    color: C.faint,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: C.green,
                      display: "inline-block",
                    }}
                  />
                  Hiển thị trong tab{" "}
                  <strong style={{ color: C.muted }}>Hoạt động</strong>
                </div>
              </div>
            </div>

            {/* Target summary */}
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                background: C.card2,
                borderRadius: 9,
                border: `1px solid ${C.border}`,
              }}
            >
              <div style={{ fontSize: 11, color: C.muted }}>Gửi tới:</div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.text,
                  marginTop: 3,
                }}
              >
                {TARGET_OPTIONS.find((o) => o.value === target)?.icon}{" "}
                {TARGET_OPTIONS.find((o) => o.value === target)?.label}
                {target === "role" &&
                  ` — ${targetRole === "user" ? "User" : "Moderator"}`}
              </div>
            </div>
          </div>

          {/* History */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "16px 18px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 12,
              }}
            >
              Lịch sử gửi
            </div>
            {loadingH ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: 20,
                }}
              >
                <Spinner />
              </div>
            ) : history.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px 0",
                  color: C.faint,
                  fontSize: 13,
                }}
              >
                Chưa có broadcast nào
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.slice(0, 8).map((h, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 12px",
                      background: C.card2,
                      borderRadius: 9,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: C.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginBottom: 3,
                      }}
                    >
                      {h.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: C.muted,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginBottom: 5,
                      }}
                    >
                      {h.body}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 10,
                        color: C.faint,
                      }}
                    >
                      <span>👥 {h.recipients} người nhận</span>
                      <span>
                        {new Date(h.sent_at).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirm && (
        <ConfirmModal
          msg={`Gửi broadcast "${emoji} ${title}" tới nhóm "${TARGET_OPTIONS.find((o) => o.value === target)?.label}"${target === "role" ? ` (${targetRole})` : ""}?\n\nHành động này không thể hoàn tác.`}
          onOk={handleSend}
          onCancel={() => setConfirm(false)}
          danger={false}
        />
      )}
    </div>
  );
}

/* ─── MAIN ──────────────────────────────────────────────── */
export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const [tab, setTab] = useState("overview");
  const [tabFilters, setTabFilters] = useState({});
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getAdminStats()
      .then((r) => setStats(r.data))
      .catch(() => {});
  }, []);

  const handleGoTo = (targetTab, filters = {}) => {
    setTabFilters(filters);
    setTab(targetTab);
  };

  if (!user || user.role === "user") return null;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "var(--font-body,system-ui,sans-serif)",
      }}
    >
      <Sidebar
        tab={tab}
        setTab={(t) => {
          setTabFilters({});
          setTab(t);
        }}
        stats={stats}
        user={user}
        onLogout={() => {
          logout();
          navigate("/login", { replace: true });
        }}
      />

      <main
        style={{
          flex: 1,
          minWidth: 0,
          padding: "28px 28px 60px",
          overflowY: "auto",
          maxWidth: "calc(100vw - 220px)",
        }}
      >
        {tab === "overview" && (
          <OverviewSection stats={stats} onGoTo={handleGoTo} />
        )}
        {tab === "users" && (
          <UsersSection
            key={JSON.stringify(tabFilters)}
            currentUser={user}
            showToast={showToast}
            initialFilters={tabFilters}
          />
        )}
        {tab === "reviews" && (
          <ReviewsSection
            key={JSON.stringify(tabFilters)}
            showToast={showToast}
            initialFilters={tabFilters}
          />
        )}
        {tab === "broadcast" && <BroadcastSection showToast={showToast} />}
      </main>

      <style>{adminCSS}</style>
    </div>
  );
}

const inp = {
  width: "100%",
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "8px 32px 8px 12px",
  color: C.text,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
const sel = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "8px 12px",
  color: C.text,
  fontSize: 13,
  cursor: "pointer",
  outline: "none",
  fontFamily: "inherit",
};
const td = { padding: "11px 12px", verticalAlign: "middle" };

const adminCSS = `
  @keyframes adminSpin   { to { transform: rotate(360deg); } }
  @keyframes adminFadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes alertPulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }

  .admin-stat-card:hover  { border-color: var(--border-bright,#243050) !important; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important; }
  .admin-alert-card:hover { transform: translateY(-1px); }
  .admin-trow:hover       { background: var(--bg-card2,#111c30); }
  .admin-review-card:hover{ border-color: var(--border-bright,#243050) !important; }
  .sm-btn:hover           { opacity: 0.8 !important; }
  .sidebar-btn:hover      { color: rgba(255,255,255,0.8) !important; background: rgba(255,255,255,0.06) !important; }
  .logout-btn:hover       { background: rgba(225,29,72,0.15) !important; color: #ff6b6b !important; border-color: rgba(225,29,72,0.4) !important; }
  nav::-webkit-scrollbar  { display: none; }
`;

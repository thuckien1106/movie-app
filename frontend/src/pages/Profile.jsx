import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastContext";
import {
  updateProfile,
  changePassword,
  getActivity,
  getWatchlistStats,
} from "../api/movieApi";
import Navbar from "../components/Navbar";

/* ══════════════════════════════════════════════
   AVATAR PALETTE  — 5 categories
══════════════════════════════════════════════ */
const AVATAR_GROUPS = [
  { label: "Phim", items: ["🎬", "🎭", "🍿", "🎥", "🎞", "📽", "🎦", "🎪"] },
  {
    label: "Động vật",
    items: ["🦁", "🐺", "🦊", "🐸", "🐙", "🦋", "🦅", "🐯", "🦄", "🐉"],
  },
  {
    label: "Không gian",
    items: ["🚀", "🌙", "⭐", "🌌", "☄️", "🛸", "🌠", "🔭"],
  },
  { label: "Vui vẻ", items: ["🔥", "🌊", "🌸", "🍉", "🎮", "💎", "⚡", "🌈"] },
  { label: "Ký tự", items: ["👾", "🤖", "👻", "💀", "🎃", "🧙", "🦸", "🧝"] },
];
const ALL_AVATARS = AVATAR_GROUPS.flatMap((g) => g.items);

/* ── helpers ──────────────────────────────────── */
function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}
function pwdScore(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const PWD_LABELS = ["", "Yếu", "Trung bình", "Khá", "Tốt", "Mạnh"];
const PWD_COLORS = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];

/* ── activity config ──────────────────────────── */
const ACT = {
  added: {
    icon: "＋",
    bg: "rgba(59,130,246,0.18)",
    border: "rgba(59,130,246,0.4)",
    color: "#93c5fd",
    label: "Thêm vào watchlist",
  },
  watched: {
    icon: "✓",
    bg: "rgba(34,197,94,0.18)",
    border: "rgba(34,197,94,0.4)",
    color: "#86efac",
    label: "Đã xem",
  },
  collection_created: {
    icon: "▣",
    bg: "rgba(234,179,8,0.18)",
    border: "rgba(234,179,8,0.4)",
    color: "#fde047",
    label: "Tạo bộ sưu tập",
  },
  default: {
    icon: "•",
    bg: "rgba(148,163,184,0.15)",
    border: "rgba(148,163,184,0.3)",
    color: "#94a3b8",
    label: "Hoạt động",
  },
};

/* ── SVG icons ────────────────────────────────── */
const IconEye = ({ open }) =>
  open ? (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

const IconEdit = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

/* ── Trophy ring component ────────────────────── */
function TrophyRing({ value, max, label, sublabel, color, icon, delay = 0 }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), delay + 200);
    return () => clearTimeout(t);
  }, [delay]);

  const R = 30,
    SW = 4,
    C = R + SW + 2;
  const len = 2 * Math.PI * R;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const arc = animated ? pct * len : 0;

  return (
    <div style={t.ringCard}>
      <svg
        width={C * 2}
        height={C * 2}
        viewBox={`0 0 ${C * 2} ${C * 2}`}
        style={{
          display: "block",
          overflow: "visible",
          filter: `drop-shadow(0 0 6px ${color}55)`,
        }}
      >
        {/* track */}
        <circle
          cx={C}
          cy={C}
          r={R}
          fill="var(--bg-card2)"
          stroke="var(--border)"
          strokeWidth={SW}
        />
        {/* arc */}
        <circle
          cx={C}
          cy={C}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={SW}
          strokeDasharray={`${arc} ${len}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${C} ${C})`}
          style={{
            transition: animated
              ? `stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1) ${delay}ms`
              : "none",
          }}
        />
        {/* icon */}
        <text
          x={C}
          y={C - 5}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="16"
          fontFamily="sans-serif"
        >
          {icon}
        </text>
        {/* value */}
        <text
          x={C}
          y={C + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize="11"
          fontWeight="800"
          fontFamily="'DM Sans',system-ui,sans-serif"
        >
          {value}
        </text>
      </svg>
      <p style={t.ringLabel}>{label}</p>
      {sublabel && <p style={t.ringSublabel}>{sublabel}</p>}
    </div>
  );
}

/* ── Avatar Picker Modal ──────────────────────── */
function AvatarPickerModal({ current, onSelect, onClose }) {
  const [activeGroup, setActiveGroup] = useState(0);
  return (
    <div style={t.modalOverlay} onClick={onClose}>
      <div style={t.modal} onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div style={t.modalHeader}>
          <div style={t.modalTitleWrap}>
            <div style={t.modalAccent} />
            <h3 style={t.modalTitle}>Chọn Avatar</h3>
          </div>
          <button
            style={t.modalClose}
            onClick={onClose}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--red-dim)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--bg-card2)")
            }
          >
            ✕
          </button>
        </div>

        {/* group tabs */}
        <div style={t.groupTabs}>
          {AVATAR_GROUPS.map((g, i) => (
            <button
              key={i}
              style={{
                ...t.groupTab,
                ...(activeGroup === i ? t.groupTabActive : {}),
              }}
              onClick={() => setActiveGroup(i)}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* grid */}
        <div style={t.avatarGrid}>
          {AVATAR_GROUPS[activeGroup].items.map((emoji) => {
            const isActive = emoji === current;
            return (
              <button
                key={emoji}
                onClick={() => {
                  onSelect(emoji);
                  onClose();
                }}
                style={{
                  ...t.avatarGridBtn,
                  ...(isActive ? t.avatarGridBtnActive : {}),
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = "var(--bg-card2)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: 32, lineHeight: 1 }}>{emoji}</span>
                {isActive && <div style={t.avatarCheck}>✓</div>}
              </button>
            );
          })}
        </div>

        <p style={t.modalFooter}>Nhấn vào emoji để chọn làm avatar của bạn</p>
      </div>
    </div>
  );
}

/* ── Section title with red accent ───────────── */
function SectionHead({ children }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 20,
        paddingBottom: 14,
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          width: 3,
          height: 18,
          borderRadius: "var(--radius-full)",
          background: "var(--red)",
          boxShadow: "0 0 8px rgba(229,9,20,0.4)",
          flexShrink: 0,
        }}
      />
      <h2
        style={{
          margin: 0,
          fontSize: "var(--text-lg)",
          fontFamily: "var(--font-display)",
          fontWeight: 400,
          letterSpacing: "0.06em",
          color: "var(--text-primary)",
        }}
      >
        {children}
      </h2>
    </div>
  );
}

/* ── Form field wrapper ───────────────────────── */
function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <label
        style={{
          display: "block",
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--text-faint)",
          marginBottom: 8,
        }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <span
          style={{
            fontSize: 11,
            color: "var(--text-faint)",
            marginTop: 5,
            display: "block",
            lineHeight: 1.5,
          }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}

/* ── Styled input ─────────────────────────────── */
function StyledInput({
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
  extra = {},
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: "100%",
        padding: "11px 14px",
        background: disabled ? "rgba(255,255,255,0.03)" : "var(--bg-input)",
        border: `1px solid ${focused ? "var(--red-border)" : "var(--border-mid)"}`,
        borderRadius: "var(--radius-md)",
        color: disabled ? "var(--text-faint)" : "var(--text-primary)",
        fontSize: 14,
        fontFamily: "var(--font-body, sans-serif)",
        outline: "none",
        boxSizing: "border-box",
        cursor: disabled ? "not-allowed" : "text",
        boxShadow: focused ? "0 0 0 3px var(--red-dim)" : "none",
        transition: "border-color 0.18s ease, box-shadow 0.18s ease",
        opacity: disabled ? 0.5 : 1,
        ...extra,
      }}
    />
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function Profile() {
  const { user, isLoggedIn, saveSession, logout } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();

  const [tab, setTab] = useState("profile");
  const [activity, setActivity] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingAct, setLoadAct] = useState(false);
  const [entered, setEntered] = useState(false);

  /* profile */
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatar, setAvatar] = useState(user?.avatar || "🎬");
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false); // lock đồng bộ — tránh double-submit

  /* password */
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confPwd, setConfPwd] = useState("");
  const [showPwds, setShowPwds] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const savingPwdRef = useRef(false); // lock đồng bộ cho đổi mật khẩu

  useEffect(() => {
    if (!isLoggedIn) navigate("/login");
  }, [isLoggedIn]);
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(t);
  }, []);

  /* load data per tab */
  useEffect(() => {
    if (tab === "activity" && activity.length === 0) {
      setLoadAct(true);
      Promise.all([getActivity(40), getWatchlistStats()])
        .then(([a, s]) => {
          setActivity(a.data?.items || []);
          setStats(s.data);
        })
        .catch(() => showToast("Không tải được lịch sử.", "error"))
        .finally(() => setLoadAct(false));
    }
    if (tab === "profile" && !stats) {
      getWatchlistStats()
        .then((r) => setStats(r.data))
        .catch(() => {});
    }
  }, [tab]);

  if (!isLoggedIn || !user) return null;

  const displayName = user.username || user.email?.split("@")[0] || "User";
  const strength = pwdScore(newPwd);
  const completePct =
    stats?.total > 0 ? Math.round((stats.watched / stats.total) * 100) : 0;

  /* ── save profile ── */
  const handleSaveProfile = async () => {
    // useRef làm gate đồng bộ — chặn double-submit dù click liên tiếp nhanh
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const res = await updateProfile({
        username: username.trim() || null,
        bio: bio.trim() || null,
        avatar,
      });
      const token = localStorage.getItem("token");
      saveSession(token, { ...user, ...res.data });
      showToast("Đã lưu hồ sơ!", "success");
    } catch (err) {
      showToast(err.response?.data?.detail || "Lưu thất bại.", "error");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  /* ── change password ── */
  const handleChangePwd = async () => {
    if (newPwd !== confPwd) {
      showToast("Mật khẩu xác nhận không khớp.", "error");
      return;
    }
    if (newPwd.length < 6) {
      showToast("Mật khẩu mới cần ít nhất 6 ký tự.", "error");
      return;
    }
    if (savingPwdRef.current) return;
    savingPwdRef.current = true;
    setSavingPwd(true);
    try {
      await changePassword({ current_password: curPwd, new_password: newPwd });
      showToast("Đổi mật khẩu thành công! Đang đăng xuất…", "success");
      setCurPwd("");
      setNewPwd("");
      setConfPwd("");
      setTimeout(() => {
        logout();
        navigate("/login");
      }, 1500);
    } catch (err) {
      showToast(
        err.response?.data?.detail || "Đổi mật khẩu thất bại.",
        "error",
      );
    } finally {
      savingPwdRef.current = false;
      setSavingPwd(false);
    }
  };

  const TABS = [
    { key: "profile", label: "Hồ sơ", icon: "◈" },
    { key: "password", label: "Mật khẩu", icon: "🔒" },
    { key: "activity", label: "Lịch sử", icon: "◷" },
  ];

  return (
    <div style={t.page}>
      <Navbar />

      {/* ════════════════════════════════
          HERO BANNER
      ════════════════════════════════ */}
      <div style={t.heroBanner}>
        {/* Background layers */}
        <div style={t.heroBg} />
        <div style={t.heroGlow1} />
        <div style={t.heroGlow2} />
        <div style={t.heroGrid} />

        <div
          style={{
            ...t.heroContent,
            opacity: entered ? 1 : 0,
            transform: entered ? "translateY(0)" : "translateY(16px)",
            transition:
              "opacity 0.5s ease, transform 0.5s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              style={t.avatarBtn}
              onClick={() => setShowPicker(true)}
              title="Đổi avatar"
            >
              <span style={{ fontSize: 52, lineHeight: 1, userSelect: "none" }}>
                {avatar}
              </span>
            </button>
            <div style={t.avatarEditBadge} onClick={() => setShowPicker(true)}>
              <IconEdit />
            </div>
          </div>

          {/* Info */}
          <div style={t.heroInfo}>
            <div style={t.memberBadge}>✦ Thành viên Filmverse</div>
            <h1 style={t.heroName}>{displayName}</h1>
            <p style={t.heroEmail}>{user.email}</p>
            {user.bio && <p style={t.heroBio}>"{user.bio}"</p>}
          </div>

          {/* Quick stats */}
          {stats && (
            <div style={t.heroStats}>
              {[
                { v: stats.total, l: "Phim đã lưu" },
                { v: stats.watched, l: "Đã xem" },
                { v: completePct + "%", l: "Hoàn thành" },
              ].map(({ v, l }) => (
                <div key={l} style={t.heroStat}>
                  <span style={t.heroStatVal}>{v}</span>
                  <span style={t.heroStatLabel}>{l}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════
          TAB BAR
      ════════════════════════════════ */}
      <div style={t.tabBar}>
        <div style={t.tabBarInner}>
          {TABS.map(({ key, label, icon }) => {
            const active = tab === key;
            return (
              <button key={key} style={t.tabBtn} onClick={() => setTab(key)}>
                <span
                  style={{
                    ...t.tabBtnInner,
                    color: active ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <span>{label}</span>
                </span>
                <span
                  style={{
                    ...t.tabUnderline,
                    transform: active ? "scaleX(1)" : "scaleX(0)",
                    opacity: active ? 1 : 0,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════
          CONTENT PANELS
      ════════════════════════════════ */}
      <div style={t.body}>
        {/* ══ PROFILE TAB ══ */}
        {tab === "profile" && (
          <div style={t.twoCol}>
            {/* Left: form */}
            <div style={t.formCol}>
              <SectionHead>Thông tin cá nhân</SectionHead>

              <Field
                label="Tên hiển thị"
                hint="Tên này sẽ xuất hiện trên watchlist chia sẻ của bạn."
              >
                <StyledInput
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Đặt username của bạn..."
                />
              </Field>

              <Field label="Email" hint="Email không thể thay đổi.">
                <StyledInput value={user.email} disabled />
              </Field>

              <Field
                label="Giới thiệu bản thân"
                hint={`${bio.length}/200 ký tự`}
              >
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Một vài câu về sở thích phim ảnh của bạn..."
                  rows={3}
                  maxLength={200}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-mid)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: 14,
                    fontFamily: "var(--font-body, sans-serif)",
                    outline: "none",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--red-border)";
                    e.target.style.boxShadow = "0 0 0 3px var(--red-dim)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border-mid)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </Field>

              <Field label="Avatar">
                <button
                  onClick={() => setShowPicker(true)}
                  style={t.changeAvatarBtn}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-bright)";
                    e.currentTarget.style.background = "var(--bg-card2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-mid)";
                    e.currentTarget.style.background = "var(--bg-card)";
                  }}
                >
                  <span style={{ fontSize: 28 }}>{avatar}</span>
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      Avatar hiện tại
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: 11,
                        color: "var(--text-faint)",
                      }}
                    >
                      Nhấn để thay đổi →
                    </p>
                  </div>
                </button>
              </Field>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                style={{ ...t.btnPrimary, opacity: saving ? 0.7 : 1 }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    e.currentTarget.style.background = "var(--red-hover)";
                    e.currentTarget.style.boxShadow = "var(--red-glow)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--red)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 18px rgba(229,9,20,0.3)";
                }}
              >
                {saving ? "Đang lưu…" : "Lưu thay đổi"}
              </button>
            </div>

            {/* Right: trophy shelf */}
            {stats && (
              <div style={t.trophyCol}>
                <SectionHead>Thống kê</SectionHead>
                <div style={t.trophyGrid}>
                  <TrophyRing
                    value={stats.total}
                    max={100}
                    label="Phim đã lưu"
                    icon="🎬"
                    color="#3b82f6"
                    delay={0}
                  />
                  <TrophyRing
                    value={stats.watched}
                    max={stats.total || 1}
                    label="Đã xem"
                    icon="✓"
                    color="#22c55e"
                    sublabel={`${completePct}%`}
                    delay={120}
                  />
                  {stats.collections != null && (
                    <TrophyRing
                      value={stats.collections}
                      max={10}
                      label="Bộ sưu tập"
                      icon="▣"
                      color="#f5c518"
                      delay={240}
                    />
                  )}
                  {stats.avg_rating != null && (
                    <TrophyRing
                      value={parseFloat(stats.avg_rating).toFixed(1)}
                      max={10}
                      label="Điểm TB"
                      icon="★"
                      color="#eab308"
                      delay={360}
                    />
                  )}
                </div>

                {/* Favorite genres */}
                {stats.top_genres?.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <p style={t.trophySubhead}>Thể loại yêu thích</p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {stats.top_genres.slice(0, 4).map((g, i) => {
                        const pct = Math.round(
                          (g.count / (stats.top_genres[0]?.count || 1)) * 100,
                        );
                        const colors = [
                          "#e50914",
                          "#3b82f6",
                          "#22c55e",
                          "#f5c518",
                        ];
                        return (
                          <div key={g.genre_id || i}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 4,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-secondary)",
                                  fontWeight: 500,
                                }}
                              >
                                {g.genre_name}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "var(--text-faint)",
                                }}
                              >
                                {g.count} phim
                              </span>
                            </div>
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
                                  background: colors[i],
                                  borderRadius: "var(--radius-full)",
                                  transition: "width 1s ease",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ PASSWORD TAB ══ */}
        {tab === "password" && (
          <div style={{ maxWidth: 480 }}>
            <SectionHead>Đổi mật khẩu</SectionHead>

            {/* Security notice */}
            <div style={t.securityNote}>
              <span style={{ fontSize: 20 }}>🔒</span>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                Sau khi đổi mật khẩu thành công, bạn sẽ được đăng xuất tự động
                để bảo mật tài khoản.
              </p>
            </div>

            {[
              {
                label: "Mật khẩu hiện tại",
                val: curPwd,
                set: setCurPwd,
                ph: "Nhập mật khẩu hiện tại",
              },
              {
                label: "Mật khẩu mới",
                val: newPwd,
                set: setNewPwd,
                ph: "Ít nhất 6 ký tự",
                showStrength: true,
              },
              {
                label: "Xác nhận mật khẩu",
                val: confPwd,
                set: setConfPwd,
                ph: "Nhập lại mật khẩu mới",
                showMatch: true,
              },
            ].map(({ label, val, set, ph, showStrength, showMatch }) => (
              <Field key={label} label={label}>
                <div style={{ position: "relative" }}>
                  <StyledInput
                    type={showPwds ? "text" : "password"}
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    placeholder={ph}
                    extra={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwds((p) => !p)}
                    style={t.eyeBtn}
                  >
                    <IconEye open={showPwds} />
                  </button>
                </div>
                {showStrength && val && (
                  <div style={{ marginTop: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 3,
                        height: 3,
                        marginBottom: 5,
                      }}
                    >
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: 3,
                            borderRadius: "var(--radius-full)",
                            background:
                              i <= strength
                                ? PWD_COLORS[strength]
                                : "var(--border)",
                            opacity: i <= strength ? 1 : 0.3,
                            transition: "background 0.3s ease",
                          }}
                        />
                      ))}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color: PWD_COLORS[strength],
                        fontWeight: 600,
                      }}
                    >
                      {PWD_LABELS[strength]}
                    </span>
                  </div>
                )}
                {showMatch && confPwd && newPwd !== confPwd && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#ef4444",
                      marginTop: 5,
                      display: "block",
                    }}
                  >
                    Mật khẩu không khớp
                  </span>
                )}
                {showMatch &&
                  confPwd &&
                  newPwd === confPwd &&
                  confPwd.length > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "#22c55e",
                        marginTop: 5,
                        display: "block",
                      }}
                    >
                      ✓ Mật khẩu khớp
                    </span>
                  )}
              </Field>
            ))}

            <button
              onClick={handleChangePwd}
              disabled={savingPwd || !curPwd || !newPwd || newPwd !== confPwd}
              style={{
                ...t.btnPrimary,
                opacity:
                  savingPwd || !curPwd || !newPwd || newPwd !== confPwd
                    ? 0.45
                    : 1,
              }}
              onMouseEnter={(e) => {
                if (!savingPwd && curPwd && newPwd && newPwd === confPwd) {
                  e.currentTarget.style.background = "var(--red-hover)";
                  e.currentTarget.style.boxShadow = "var(--red-glow)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--red)";
                e.currentTarget.style.boxShadow =
                  "0 4px 18px rgba(229,9,20,0.3)";
              }}
            >
              {savingPwd ? "Đang xử lý…" : "Đổi mật khẩu"}
            </button>
          </div>
        )}

        {/* ══ ACTIVITY TAB ══ */}
        {tab === "activity" && (
          <div style={{ maxWidth: 640 }}>
            <SectionHead>Lịch sử hoạt động</SectionHead>

            {loadingAct ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "48px 0",
                }}
              >
                <div style={t.spinner} />
                <span style={{ color: "var(--text-faint)", fontSize: 14 }}>
                  Đang tải lịch sử…
                </span>
              </div>
            ) : activity.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 0" }}>
                <p style={{ fontSize: 48, marginBottom: 12 }}>📭</p>
                <p style={{ color: "var(--text-faint)", fontSize: 15 }}>
                  Chưa có hoạt động nào.
                </p>
                <Link
                  to="/"
                  style={{
                    ...t.btnPrimary,
                    display: "inline-flex",
                    marginTop: 20,
                    textDecoration: "none",
                  }}
                >
                  Khám phá phim
                </Link>
              </div>
            ) : (
              <div style={t.timeline}>
                {activity.map((item, i) => {
                  const meta = ACT[item.type] || ACT.default;
                  const isLast = i === activity.length - 1;
                  return (
                    <div key={i} style={t.timelineRow}>
                      {/* spine */}
                      <div style={t.spine}>
                        <div
                          style={{
                            ...t.spineDot,
                            background: meta.bg,
                            border: `1.5px solid ${meta.border}`,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              color: meta.color,
                              fontWeight: 700,
                              lineHeight: 1,
                            }}
                          >
                            {meta.icon}
                          </span>
                        </div>
                        {!isLast && <div style={t.spineConnector} />}
                      </div>

                      {/* card */}
                      <div
                        style={{ ...t.actCard, marginBottom: isLast ? 0 : 8 }}
                      >
                        {item.poster && (
                          <Link
                            to={`/movie/${item.movie_id}`}
                            style={{ flexShrink: 0, display: "block" }}
                          >
                            <img
                              src={item.poster}
                              alt={item.title || ""}
                              style={t.actPoster}
                              loading="lazy"
                              onError={(e) =>
                                (e.currentTarget.style.display = "none")
                              }
                            />
                          </Link>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: meta.color,
                            }}
                          >
                            {meta.label}
                          </span>
                          {item.movie_id ? (
                            <Link
                              to={`/movie/${item.movie_id}`}
                              style={{
                                display: "block",
                                color: "var(--text-primary)",
                                textDecoration: "none",
                                fontWeight: 600,
                                fontSize: 14,
                                marginTop: 2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.title}
                            </Link>
                          ) : (
                            <p
                              style={{
                                color: "var(--text-primary)",
                                fontWeight: 600,
                                fontSize: 14,
                                margin: "2px 0 0",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.title}
                            </p>
                          )}
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--text-faint)",
                              marginTop: 3,
                              display: "block",
                            }}
                          >
                            {timeAgo(item.at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Avatar picker modal ── */}
      {showPicker && (
        <AvatarPickerModal
          current={avatar}
          onSelect={setAvatar}
          onClose={() => setShowPicker(false)}
        />
      )}

      <style>{profileCSS}</style>
    </div>
  );
}

/* ── Global CSS ────────────────────────────────── */
const profileCSS = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes modalIn {
    from { opacity: 0; transform: scale(0.96) translateY(8px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
  }
`;

/* ── Styles ─────────────────────────────────────── */
const t = {
  page: {
    background: "var(--bg-page)",
    minHeight: "100vh",
    color: "var(--text-primary)",
    fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
    paddingTop: 60,
  },

  /* ── Hero banner ── */
  heroBanner: {
    position: "relative",
    overflow: "hidden",
    padding: "clamp(32px, 5vh, 56px) clamp(24px, 6vw, 72px)",
    display: "flex",
    alignItems: "center",
    borderBottom: "1px solid var(--border)",
    minHeight: 200,
  },
  heroBg: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(135deg, rgba(229,9,20,0.07) 0%, var(--bg-surface,#0e1218) 50%, rgba(59,130,246,0.04) 100%)",
  },
  heroGlow1: {
    position: "absolute",
    top: -80,
    left: -60,
    width: 400,
    height: 400,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(229,9,20,0.1) 0%, transparent 65%)",
    pointerEvents: "none",
  },
  heroGlow2: {
    position: "absolute",
    bottom: -100,
    right: -40,
    width: 350,
    height: 350,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 65%)",
    pointerEvents: "none",
  },
  heroGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)",
    backgroundSize: "60px 60px",
    pointerEvents: "none",
  },
  heroContent: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    gap: "clamp(20px, 3vw, 40px)",
    flexWrap: "wrap",
    width: "100%",
  },

  /* avatar in hero */
  avatarBtn: {
    width: 90,
    height: 90,
    borderRadius: "50%",
    background: "var(--bg-card2)",
    border: "3px solid var(--border-bright)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
    transition:
      "border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
    position: "relative",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "var(--red)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
    color: "#fff",
    border: "2px solid var(--bg-page)",
  },
  heroInfo: { flex: 1, minWidth: 180 },
  memberBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "var(--gold-text, #f5c518)",
    background: "var(--gold-dim, rgba(245,197,24,0.1))",
    border: "1px solid rgba(245,197,24,0.2)",
    borderRadius: "var(--radius-full)",
    padding: "3px 10px",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  heroName: {
    fontFamily: "var(--font-display, 'Bebas Neue', sans-serif)",
    fontSize: "clamp(28px, 4vw, 46px)",
    fontWeight: 400,
    letterSpacing: "0.04em",
    margin: "0 0 4px",
    lineHeight: 1.0,
  },
  heroEmail: { margin: "0 0 6px", fontSize: 13, color: "var(--text-faint)" },
  heroBio: {
    margin: 0,
    fontSize: 13,
    color: "var(--text-secondary)",
    fontStyle: "italic",
    lineHeight: 1.5,
  },
  heroStats: {
    display: "flex",
    gap: 24,
    marginLeft: "auto",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-xl)",
    padding: "16px 24px",
    flexWrap: "wrap",
  },
  heroStat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    minWidth: 60,
  },
  heroStatVal: {
    fontSize: 24,
    fontWeight: 800,
    color: "var(--text-primary)",
    lineHeight: 1,
    fontFamily: "var(--font-display)",
    letterSpacing: "0.02em",
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.08em",
    color: "var(--text-faint)",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },

  /* ── Tab bar ── */
  tabBar: {
    background: "var(--bg-surface, #0e1218)",
    borderBottom: "1px solid var(--border)",
    position: "sticky",
    top: 60,
    zIndex: 50,
    backdropFilter: "blur(14px)",
  },
  tabBarInner: {
    display: "flex",
    gap: 0,
    padding: "0 clamp(24px,6vw,72px)",
  },
  tabBtn: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "14px 20px 12px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    minWidth: 0,
  },
  tabBtnInner: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontSize: 13,
    fontWeight: 500,
    transition: "color 0.18s ease",
    whiteSpace: "nowrap",
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 12,
    right: 12,
    height: 2,
    background: "var(--red)",
    borderRadius: "var(--radius-full) var(--radius-full) 0 0",
    transformOrigin: "center",
    transition:
      "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease",
  },

  /* ── Body ── */
  body: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "40px clamp(24px,6vw,72px) 80px",
  },

  /* Two-col layout for profile tab */
  twoCol: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) minmax(0,380px)",
    gap: 48,
    alignItems: "start",
  },
  formCol: {},
  trophyCol: {},
  trophyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
    gap: 12,
    marginBottom: 24,
  },

  /* trophy ring card */
  ringCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    background: "var(--bg-surface, #0e1218)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "16px 12px",
    transition: "border-color 0.18s ease",
  },
  ringLabel: {
    margin: 0,
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-secondary)",
    textAlign: "center",
    letterSpacing: "0.03em",
  },
  ringSublabel: {
    margin: "-4px 0 0",
    fontSize: 10,
    color: "var(--text-faint)",
    textAlign: "center",
  },
  trophySubhead: {
    margin: "0 0 12px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--text-faint)",
  },

  /* change avatar btn in form */
  changeAvatarBtn: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    width: "100%",
    padding: "14px 18px",
    background: "var(--bg-card)",
    border: "1px solid var(--border-mid)",
    borderRadius: "var(--radius-lg)",
    cursor: "pointer",
    fontFamily: "var(--font-body)",
    textAlign: "left",
    transition: "border-color 0.18s ease, background 0.18s ease",
  },

  /* buttons */
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--red)",
    border: "none",
    color: "#fff",
    padding: "12px 28px",
    borderRadius: "var(--radius-md)",
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: "0.05em",
    cursor: "pointer",
    fontFamily: "var(--font-body, sans-serif)",
    boxShadow: "0 4px 18px rgba(229,9,20,0.3)",
    transition: "background 0.18s ease, box-shadow 0.18s ease",
  },

  /* password tab */
  securityNote: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    background: "rgba(59,130,246,0.08)",
    border: "1px solid rgba(59,130,246,0.2)",
    borderRadius: "var(--radius-lg)",
    padding: "14px 16px",
    marginBottom: 24,
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "var(--text-faint)",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    transition: "color 0.15s ease",
  },

  /* activity timeline */
  timeline: { display: "flex", flexDirection: "column" },
  timelineRow: { display: "flex", gap: 14, alignItems: "flex-start" },
  spine: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flexShrink: 0,
    width: 32,
  },
  spineDot: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spineConnector: {
    width: 2,
    flex: 1,
    minHeight: 16,
    background: "var(--border)",
    margin: "3px 0",
  },
  actCard: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "var(--bg-surface, #0e1218)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: "12px 14px",
    marginBottom: 8,
    transition: "border-color 0.15s ease",
  },
  actPoster: {
    width: 38,
    height: 54,
    objectFit: "cover",
    borderRadius: "var(--radius-sm)",
    flexShrink: 0,
    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
  },

  /* spinner */
  spinner: {
    width: 22,
    height: 22,
    border: "2px solid rgba(255,255,255,0.08)",
    borderTop: "2px solid var(--red)",
    borderRadius: "50%",
    animation: "spin 0.75s linear infinite",
    flexShrink: 0,
  },

  /* ── Avatar picker modal ── */
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.72)",
    backdropFilter: "blur(6px)",
    zIndex: "var(--z-modal, 2000)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  modal: {
    background: "var(--bg-overlay, #1a2030)",
    border: "1px solid var(--border-mid)",
    borderRadius: "var(--radius-xl)",
    padding: "24px",
    width: "100%",
    maxWidth: 440,
    boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 0 0 0.5px rgba(229,9,20,0.15)",
    animation: "modalIn 0.3s cubic-bezier(0.34,1.2,0.64,1) both",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  modalTitleWrap: { display: "flex", alignItems: "center", gap: 10 },
  modalAccent: {
    width: 3,
    height: 18,
    borderRadius: "var(--radius-full)",
    background: "var(--red)",
    flexShrink: 0,
  },
  modalTitle: {
    margin: 0,
    fontFamily: "var(--font-display)",
    fontSize: "var(--text-xl)",
    fontWeight: 400,
    letterSpacing: "0.06em",
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: "var(--radius-md)",
    background: "var(--bg-card2)",
    border: "1px solid var(--border-mid)",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.15s ease",
  },
  groupTabs: { display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" },
  groupTab: {
    padding: "5px 12px",
    background: "transparent",
    border: "1px solid var(--border-mid)",
    borderRadius: "var(--radius-full)",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.04em",
    fontFamily: "var(--font-body)",
    transition: "all 0.15s ease",
  },
  groupTabActive: {
    background: "var(--red-dim)",
    borderColor: "var(--red-border)",
    color: "var(--red-text)",
  },
  avatarGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5,1fr)",
    gap: 6,
    maxHeight: 260,
    overflowY: "auto",
    scrollbarWidth: "none",
  },
  avatarGridBtn: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    aspectRatio: "1/1",
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    padding: 0,
    transition: "background 0.12s ease",
  },
  avatarGridBtnActive: {
    background: "var(--red-dim)",
    border: "1.5px solid var(--red-border)",
  },
  avatarCheck: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: "var(--red)",
    color: "#fff",
    fontSize: 8,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalFooter: {
    margin: "14px 0 0",
    fontSize: 11,
    color: "var(--text-faint)",
    textAlign: "center",
    letterSpacing: "0.02em",
  },
};

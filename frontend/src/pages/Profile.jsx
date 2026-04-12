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
  {
    label: "Nhân vật",
    items: ["👾", "🤖", "👻", "💀", "🎃", "🧙", "🦸", "🧝"],
  },
];

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

function validateUsername(name) {
  if (!name) return null;
  if (name.length < 2) return "Tên cần ít nhất 2 ký tự.";
  if (name.length > 50) return "Tên không được quá 50 ký tự.";
  if (/[<>{}\[\]\\]/.test(name)) return "Tên chứa ký tự không hợp lệ.";
  return null;
}

const ACT = {
  added: {
    icon: "＋",
    bg: "rgba(59,130,246,0.15)",
    border: "rgba(59,130,246,0.35)",
    color: "#93c5fd",
    label: "Thêm vào watchlist",
  },
  watched: {
    icon: "✓",
    bg: "rgba(34,197,94,0.15)",
    border: "rgba(34,197,94,0.35)",
    color: "#86efac",
    label: "Đã xem",
  },
  collection_created: {
    icon: "▣",
    bg: "rgba(234,179,8,0.15)",
    border: "rgba(234,179,8,0.35)",
    color: "#fde047",
    label: "Tạo bộ sưu tập",
  },
  default: {
    icon: "•",
    bg: "rgba(148,163,184,0.12)",
    border: "rgba(148,163,184,0.25)",
    color: "#94a3b8",
    label: "Hoạt động",
  },
};

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
const IconCheck = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

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
    <div style={s.ringCard}>
      <svg
        width={C * 2}
        height={C * 2}
        viewBox={`0 0 ${C * 2} ${C * 2}`}
        style={{ display: "block", overflow: "visible" }}
      >
        <circle
          cx={C}
          cy={C}
          r={R}
          fill="var(--bg-card2)"
          stroke="var(--border)"
          strokeWidth={SW}
        />
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
      <p style={s.ringLabel}>{label}</p>
      {sublabel && <p style={s.ringSublabel}>{sublabel}</p>}
    </div>
  );
}

function AvatarPickerModal({ current, onSelect, onClose }) {
  const [activeGroup, setActiveGroup] = useState(0);
  return (
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 3,
                height: 18,
                borderRadius: 99,
                background: "var(--red)",
                flexShrink: 0,
              }}
            />
            <h3
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-xl)",
                fontWeight: 400,
                letterSpacing: "0.06em",
              }}
            >
              Chọn Avatar
            </h3>
          </div>
          <button style={s.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {AVATAR_GROUPS.map((g, i) => (
            <button
              key={i}
              onClick={() => setActiveGroup(i)}
              style={{
                ...s.groupTab,
                ...(activeGroup === i ? s.groupTabActive : {}),
              }}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div style={s.avatarGrid}>
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
                  ...s.avatarGridBtn,
                  ...(isActive ? s.avatarGridBtnActive : {}),
                }}
              >
                <span style={{ fontSize: 32, lineHeight: 1 }}>{emoji}</span>
                {isActive && <div style={s.avatarCheck}>✓</div>}
              </button>
            );
          })}
        </div>
        <p
          style={{
            margin: "14px 0 0",
            fontSize: 11,
            color: "var(--text-faint)",
            textAlign: "center",
          }}
        >
          Nhấn vào emoji để chọn làm avatar
        </p>
      </div>
    </div>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: error ? "#ef4444" : "var(--text-faint)",
          marginBottom: 8,
        }}
      >
        {label}
      </label>
      {children}
      {error && (
        <p style={{ margin: "5px 0 0", fontSize: 11, color: "#ef4444" }}>
          {error}
        </p>
      )}
      {!error && hint && (
        <p
          style={{
            margin: "5px 0 0",
            fontSize: 11,
            color: "var(--text-faint)",
            lineHeight: 1.5,
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function StyledInput({
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
  error,
  extra = {},
}) {
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? "#ef4444"
    : focused
      ? "var(--red-border)"
      : "var(--border-mid)";
  const shadow = error
    ? "0 0 0 3px rgba(239,68,68,0.15)"
    : focused
      ? "0 0 0 3px var(--red-dim)"
      : "none";
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
        border: `1px solid ${borderColor}`,
        borderRadius: "var(--radius-md)",
        color: disabled ? "var(--text-faint)" : "var(--text-primary)",
        fontSize: 14,
        fontFamily: "var(--font-body,sans-serif)",
        outline: "none",
        boxSizing: "border-box",
        cursor: disabled ? "not-allowed" : "text",
        boxShadow: shadow,
        opacity: disabled ? 0.5 : 1,
        transition: "border-color 0.18s,box-shadow 0.18s",
        ...extra,
      }}
    />
  );
}

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
          borderRadius: 99,
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

export default function Profile() {
  const { user, isLoggedIn, saveSession, logout } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();

  const [tab, setTab] = useState("profile");
  const [activity, setActivity] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingAct, setLoadAct] = useState(false);
  const [entered, setEntered] = useState(false);

  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatar, setAvatar] = useState(user?.avatar || "🎬");
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const savingRef = useRef(false);

  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confPwd, setConfPwd] = useState("");
  const [showPwds, setShowPwds] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const savingPwdRef = useRef(false);

  useEffect(() => {
    if (!isLoggedIn) navigate("/login");
  }, [isLoggedIn]);
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (tab === "activity" && activity.length === 0) {
      setLoadAct(true);
      Promise.all([getActivity(40), getWatchlistStats()])
        .then(([a, st]) => {
          setActivity(a.data?.items || []);
          setStats(st.data);
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

  const displayName =
    username.trim() || user.username || user.email?.split("@")[0] || "User";
  const strength = pwdScore(newPwd);
  const completePct =
    stats?.total > 0 ? Math.round((stats.watched / stats.total) * 100) : 0;

  const handleUsernameChange = (val) => {
    setUsername(val);
    setUsernameError(val.trim() ? validateUsername(val.trim()) || "" : "");
  };

  const handleSaveProfile = async () => {
    if (savingRef.current) return;
    const trimmedUsername = username.trim();
    const trimmedBio = bio.trim();
    const err = trimmedUsername ? validateUsername(trimmedUsername) : null;
    if (err) {
      setUsernameError(err);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const res = await updateProfile({
        username: trimmedUsername || null,
        bio: trimmedBio || null,
        avatar,
      });
      saveSession(localStorage.getItem("token"), { ...user, ...res.data });
      showToast("Đã lưu hồ sơ!", "success");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail))
        showToast(
          detail.map((d) => d.message || d.msg).join(", ") ||
            "Dữ liệu không hợp lệ.",
          "error",
        );
      else showToast(detail || "Lưu thất bại, vui lòng thử lại.", "error");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

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
    <div style={s.page}>
      <Navbar />

      {/* ═══ HERO ═══ */}
      <div style={s.heroBanner}>
        <div style={s.heroBg} />
        <div style={s.heroGlow1} />
        <div style={s.heroGlow2} />
        <div style={s.heroGrid} />
        <div
          style={{
            ...s.heroContent,
            opacity: entered ? 1 : 0,
            transform: entered ? "translateY(0)" : "translateY(16px)",
            transition:
              "opacity 0.5s ease,transform 0.5s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              style={s.avatarBtn}
              onClick={() => setShowPicker(true)}
              title="Đổi avatar"
            >
              <span style={{ fontSize: 52, lineHeight: 1, userSelect: "none" }}>
                {avatar}
              </span>
            </button>
            <div style={s.avatarEditBadge} onClick={() => setShowPicker(true)}>
              <IconEdit />
            </div>
          </div>
          <div style={s.heroInfo}>
            <div style={s.memberBadge}>✦ Thành viên Filmverse</div>
            <h1 style={s.heroName}>{displayName}</h1>
            <p style={s.heroEmail}>{user.email}</p>
            {(user.bio || bio.trim()) && (
              <p style={s.heroBio}>"{bio.trim() || user.bio}"</p>
            )}
          </div>
          {stats && (
            <div style={s.heroStats}>
              {[
                { v: stats.total, l: "Phim đã lưu" },
                { v: stats.watched, l: "Đã xem" },
                { v: completePct + "%", l: "Hoàn thành" },
              ].map(({ v, l }) => (
                <div key={l} style={s.heroStat}>
                  <span style={s.heroStatVal}>{v}</span>
                  <span style={s.heroStatLabel}>{l}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ TAB BAR ═══ */}
      <div style={s.tabBar}>
        <div style={s.tabBarInner}>
          {TABS.map(({ key, label, icon }) => {
            const active = tab === key;
            return (
              <button key={key} style={s.tabBtn} onClick={() => setTab(key)}>
                <span
                  style={{
                    ...s.tabBtnInner,
                    color: active ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <span>{label}</span>
                </span>
                <span
                  style={{
                    ...s.tabUnderline,
                    transform: active ? "scaleX(1)" : "scaleX(0)",
                    opacity: active ? 1 : 0,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={s.body}>
        {/* ── PROFILE TAB ── */}
        {tab === "profile" && (
          <div style={s.twoCol}>
            <div style={s.formCol}>
              <SectionHead>Thông tin cá nhân</SectionHead>

              <Field
                label="Tên hiển thị"
                error={usernameError}
                hint={
                  !usernameError
                    ? "Cho phép tiếng Việt có dấu, khoảng trắng, số, dấu _ . -"
                    : undefined
                }
              >
                <div>
                  <StyledInput
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    error={usernameError}
                  />
                  {username.trim() && !usernameError && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        marginTop: 7,
                        fontSize: 11,
                        color: "#22c55e",
                        fontWeight: 600,
                      }}
                    >
                      <IconCheck /> Tên hiển thị:{" "}
                      <strong>{username.trim()}</strong>
                    </div>
                  )}
                </div>
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
                  style={s.textarea}
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
                  style={s.changeAvatarBtn}
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
                disabled={saving || !!usernameError}
                style={{
                  ...s.btnPrimary,
                  opacity: saving || !!usernameError ? 0.55 : 1,
                  cursor: saving || !!usernameError ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!saving && !usernameError) {
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

            {stats && (
              <div style={s.trophyCol}>
                <SectionHead>Thống kê</SectionHead>
                <div style={s.trophyGrid}>
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
                      max={20}
                      label="Bộ sưu tập"
                      icon="▣"
                      color="#f5c518"
                      delay={240}
                    />
                  )}
                </div>
                {stats.top_genres?.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <p style={s.trophySubhead}>Thể loại yêu thích</p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
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
                                marginBottom: 5,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 13,
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
                                height: 5,
                                background: "var(--border)",
                                borderRadius: 99,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${pct}%`,
                                  background: colors[i],
                                  borderRadius: 99,
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

        {/* ── PASSWORD TAB ── */}
        {tab === "password" && (
          <div style={{ maxWidth: 480 }}>
            <SectionHead>Đổi mật khẩu</SectionHead>
            {user.is_google ? (
              <div style={s.infoNote}>
                <span style={{ fontSize: 20 }}>🔑</span>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  Tài khoản của bạn đăng nhập qua Google. Vui lòng đổi mật khẩu
                  trực tiếp trong tài khoản Google.
                </p>
              </div>
            ) : (
              <>
                <div style={{ ...s.infoNote, marginBottom: 24 }}>
                  <span style={{ fontSize: 20 }}>🔒</span>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    Sau khi đổi mật khẩu thành công, bạn sẽ được đăng xuất tự
                    động để bảo mật tài khoản.
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
                        style={s.eyeBtn}
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
                                borderRadius: 99,
                                background:
                                  i <= strength
                                    ? PWD_COLORS[strength]
                                    : "var(--border)",
                                opacity: i <= strength ? 1 : 0.3,
                                transition: "background 0.3s",
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
                  disabled={
                    savingPwd || !curPwd || !newPwd || newPwd !== confPwd
                  }
                  style={{
                    ...s.btnPrimary,
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
              </>
            )}
          </div>
        )}

        {/* ── ACTIVITY TAB ── */}
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
                <div style={s.spinner} />
                <span style={{ color: "var(--text-faint)", fontSize: 14 }}>
                  Đang tải lịch sử…
                </span>
              </div>
            ) : activity.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 0" }}>
                <p style={{ fontSize: 48, marginBottom: 12 }}>📭</p>
                <p
                  style={{
                    color: "var(--text-faint)",
                    fontSize: 15,
                    marginBottom: 20,
                  }}
                >
                  Chưa có hoạt động nào.
                </p>
                <Link
                  to="/"
                  style={{
                    ...s.btnPrimary,
                    display: "inline-flex",
                    textDecoration: "none",
                  }}
                >
                  Khám phá phim
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {activity.map((item, i) => {
                  const meta = ACT[item.type] || ACT.default;
                  const isLast = i === activity.length - 1;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 14,
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          flexShrink: 0,
                          width: 32,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
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
                        {!isLast && (
                          <div
                            style={{
                              width: 2,
                              flex: 1,
                              minHeight: 16,
                              background: "var(--border)",
                              margin: "3px 0",
                            }}
                          />
                        )}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          background: "var(--bg-surface,#0e1218)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-md)",
                          padding: "12px 14px",
                          marginBottom: isLast ? 0 : 8,
                        }}
                      >
                        {item.poster && (
                          <Link
                            to={`/movie/${item.movie_id}`}
                            style={{ flexShrink: 0, display: "block" }}
                          >
                            <img
                              src={item.poster}
                              alt={item.title || ""}
                              style={{
                                width: 38,
                                height: 54,
                                objectFit: "cover",
                                borderRadius: "var(--radius-sm)",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                              }}
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

      {showPicker && (
        <AvatarPickerModal
          current={avatar}
          onSelect={setAvatar}
          onClose={() => setShowPicker(false)}
        />
      )}

      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}

const s = {
  page: {
    background: "var(--bg-page)",
    minHeight: "100vh",
    color: "var(--text-primary)",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
    paddingTop: 60,
  },
  heroBanner: {
    position: "relative",
    overflow: "hidden",
    padding: "clamp(32px,5vh,56px) clamp(24px,6vw,72px)",
    display: "flex",
    alignItems: "center",
    borderBottom: "1px solid var(--border)",
    minHeight: 200,
  },
  heroBg: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(135deg,rgba(229,9,20,0.07) 0%,var(--bg-surface,#0e1218) 50%,rgba(59,130,246,0.04) 100%)",
  },
  heroGlow1: {
    position: "absolute",
    top: -80,
    left: -60,
    width: 400,
    height: 400,
    borderRadius: "50%",
    background: "radial-gradient(circle,rgba(229,9,20,0.1) 0%,transparent 65%)",
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
      "radial-gradient(circle,rgba(59,130,246,0.07) 0%,transparent 65%)",
    pointerEvents: "none",
  },
  heroGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)",
    backgroundSize: "60px 60px",
    pointerEvents: "none",
  },
  heroContent: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    gap: "clamp(20px,3vw,40px)",
    flexWrap: "wrap",
    width: "100%",
  },
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
    transition: "border-color 0.2s,transform 0.2s,box-shadow 0.2s",
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
    color: "var(--gold-text,#f5c518)",
    background: "var(--gold-dim,rgba(245,197,24,0.1))",
    border: "1px solid rgba(245,197,24,0.2)",
    borderRadius: 99,
    padding: "3px 10px",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  heroName: {
    fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
    fontSize: "clamp(28px,4vw,46px)",
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
  tabBar: {
    background: "var(--bg-surface,#0e1218)",
    borderBottom: "1px solid var(--border)",
    position: "sticky",
    top: 60,
    zIndex: 50,
    backdropFilter: "blur(14px)",
  },
  tabBarInner: { display: "flex", gap: 0, padding: "0 clamp(24px,6vw,72px)" },
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
    transition: "color 0.18s",
    whiteSpace: "nowrap",
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 12,
    right: 12,
    height: 2,
    background: "var(--red)",
    borderRadius: "99px 99px 0 0",
    transformOrigin: "center",
    transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1),opacity 0.2s",
  },
  body: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "40px clamp(24px,6vw,72px) 80px",
  },
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
    gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))",
    gap: 12,
    marginBottom: 24,
  },
  ringCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    background: "var(--bg-surface,#0e1218)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "16px 12px",
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
  textarea: {
    width: "100%",
    padding: "11px 14px",
    background: "var(--bg-input)",
    border: "1px solid var(--border-mid)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: 14,
    fontFamily: "var(--font-body,sans-serif)",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
    transition: "border-color 0.18s,box-shadow 0.18s",
  },
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
    transition: "border-color 0.18s,background 0.18s",
  },
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
    fontFamily: "var(--font-body,sans-serif)",
    boxShadow: "0 4px 18px rgba(229,9,20,0.3)",
    transition: "background 0.18s,box-shadow 0.18s",
  },
  infoNote: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    background: "rgba(59,130,246,0.08)",
    border: "1px solid rgba(59,130,246,0.2)",
    borderRadius: "var(--radius-lg)",
    padding: "14px 16px",
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
    transition: "color 0.15s",
  },
  spinner: {
    width: 22,
    height: 22,
    border: "2px solid rgba(255,255,255,0.08)",
    borderTop: "2px solid var(--red)",
    borderRadius: "50%",
    animation: "spin 0.75s linear infinite",
    flexShrink: 0,
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.72)",
    backdropFilter: "blur(6px)",
    zIndex: "var(--z-modal,2000)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    background: "var(--bg-overlay,#1a2030)",
    border: "1px solid var(--border-mid)",
    borderRadius: "var(--radius-xl)",
    padding: 24,
    width: "100%",
    maxWidth: 440,
    boxShadow: "0 32px 80px rgba(0,0,0,0.8),0 0 0 0.5px rgba(229,9,20,0.15)",
    animation: "modalIn 0.3s cubic-bezier(0.34,1.2,0.64,1) both",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
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
    transition: "background 0.15s",
  },
  groupTab: {
    padding: "5px 12px",
    background: "transparent",
    border: "1px solid var(--border-mid)",
    borderRadius: 99,
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.04em",
    fontFamily: "var(--font-body)",
    transition: "all 0.15s",
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
    transition: "background 0.12s",
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
};

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
import ThemeToggle from "../components/ThemeToggle";

/* ── Avatar emoji palette ── */
const AVATARS = [
  "🎬",
  "🎭",
  "🍿",
  "🎥",
  "🎞",
  "📽",
  "🦁",
  "🐺",
  "🦊",
  "🐸",
  "🐙",
  "🦋",
  "🌙",
  "⭐",
  "🔥",
  "🌊",
  "🌸",
  "🍉",
  "🎮",
  "🚀",
];

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

const ACTIVITY_META = {
  added: { icon: "➕", color: "#4a9eff", label: "Đã thêm vào watchlist" },
  watched: { icon: "✅", color: "var(--green)", label: "Đã xem" },
  collection_created: { icon: "📁", color: "#f1c40f", label: "Tạo bộ sưu tập" },
};

/* ══════════════════════════════════════════════
   PROFILE PAGE
══════════════════════════════════════════════ */
export default function Profile() {
  const { user, isLoggedIn, saveSession, logout } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();

  const [tab, setTab] = useState("profile"); // profile | password | activity
  const [activity, setActivity] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);

  /* profile form */
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatar, setAvatar] = useState(user?.avatar || "🎬");
  const [showPicker, setShowPicker] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  /* password form */
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwds, setShowPwds] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdStrength, setPwdStrength] = useState(0);

  const pickerRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn) navigate("/login");
  }, [isLoggedIn, navigate]);

  /* load stats + activity when tab changes */
  useEffect(() => {
    if (tab === "activity" && activity.length === 0) {
      setLoadingActivity(true);
      Promise.all([getActivity(40), getWatchlistStats()])
        .then(([actRes, statsRes]) => {
          setActivity(actRes.data?.items || []);
          setStats(statsRes.data);
        })
        .catch(() => showToast("Không tải được lịch sử.", "error"))
        .finally(() => setLoadingActivity(false));
    }
    if (tab === "profile" && !stats) {
      getWatchlistStats()
        .then((r) => setStats(r.data))
        .catch(() => {});
    }
  }, [tab]);

  /* close avatar picker on outside click */
  useEffect(() => {
    const h = (e) => {
      if (
        showPicker &&
        pickerRef.current &&
        !pickerRef.current.contains(e.target)
      )
        setShowPicker(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showPicker]);

  /* password strength */
  useEffect(() => {
    let s = 0;
    if (newPwd.length >= 6) s++;
    if (newPwd.length >= 10) s++;
    if (/[A-Z]/.test(newPwd)) s++;
    if (/[0-9]/.test(newPwd)) s++;
    if (/[^A-Za-z0-9]/.test(newPwd)) s++;
    setPwdStrength(s);
  }, [newPwd]);

  if (!isLoggedIn || !user) return null;

  /* ── save profile ── */
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await updateProfile({
        username: username.trim() || null,
        bio: bio.trim() || null,
        avatar,
      });
      // update localStorage session with new user data
      const token = localStorage.getItem("token");
      saveSession(token, { ...user, ...res.data });
      showToast("Đã lưu hồ sơ!", "success");
    } catch (err) {
      const msg = err.response?.data?.detail || "Lưu thất bại.";
      showToast(msg, "error");
    } finally {
      setSavingProfile(false);
    }
  };

  /* ── change password ── */
  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) {
      showToast("Mật khẩu xác nhận không khớp.", "error");
      return;
    }
    if (newPwd.length < 6) {
      showToast("Mật khẩu mới cần ít nhất 6 ký tự.", "error");
      return;
    }
    setSavingPwd(true);
    try {
      await changePassword({ current_password: curPwd, new_password: newPwd });
      showToast("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.", "success");
      setCurPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setTimeout(() => {
        logout();
        navigate("/login");
      }, 1500);
    } catch (err) {
      const msg = err.response?.data?.detail || "Đổi mật khẩu thất bại.";
      showToast(msg, "error");
    } finally {
      setSavingPwd(false);
    }
  };

  const strengthLabel = ["", "Yếu", "Trung bình", "Khá", "Tốt", "Mạnh"][
    pwdStrength
  ];
  const strengthColor = [
    "",
    "#e74c3c",
    "#f39c12",
    "#f1c40f",
    "var(--green)",
    "#27ae60",
  ][pwdStrength];
  const displayName = user.username || user.email?.split("@")[0] || "User";
  const initials = (user.username || user.email || "U")[0].toUpperCase();

  return (
    <div style={s.page}>
      {/* ── TOP NAV ── */}
      <div style={s.topBar}>
        <Link to="/" style={s.navBack}>
          ← Trang chủ
        </Link>
        <ThemeToggle />
        <Link to="/watchlist" style={s.navLink}>
          🎬 Watchlist
        </Link>
      </div>

      {/* ── HERO CARD ── */}
      <div style={s.heroCard}>
        {/* avatar */}
        <div style={{ position: "relative" }} ref={pickerRef}>
          <div style={s.avatarBig} onClick={() => setShowPicker((p) => !p)}>
            {user.avatar || avatar}
          </div>
          <div style={s.avatarEditHint}>✎</div>

          {showPicker && (
            <div style={s.emojiPicker}>
              <p style={s.pickerLabel}>Chọn avatar</p>
              <div style={s.emojiGrid}>
                {AVATARS.map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      setAvatar(e);
                      setShowPicker(false);
                    }}
                    style={{
                      ...s.emojiBtn,
                      ...(avatar === e ? s.emojiBtnActive : {}),
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* info */}
        <div style={s.heroInfo}>
          <h1 style={s.heroName}>{displayName}</h1>
          <p style={s.heroEmail}>{user.email}</p>
          {user.bio && <p style={s.heroBio}>{user.bio}</p>}
        </div>

        {/* mini stats */}
        {stats && (
          <div style={s.miniStats}>
            <MiniStat value={stats.total} label="Phim" />
            <MiniStat value={stats.watched} label="Đã xem" />
            <MiniStat
              value={
                stats.total > 0
                  ? Math.round((stats.watched / stats.total) * 100) + "%"
                  : "0%"
              }
              label="Hoàn thành"
            />
          </div>
        )}
      </div>

      {/* ── TABS ── */}
      <div style={s.tabRow}>
        {[
          { key: "profile", label: "Hồ sơ" },
          { key: "password", label: "Mật khẩu" },
          { key: "activity", label: "Lịch sử hoạt động" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{ ...s.tab, ...(tab === key ? s.tabActive : {}) }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={s.panel}>
        {/* ══ PROFILE TAB ══ */}
        {tab === "profile" && (
          <div>
            <SectionTitle>Thông tin cá nhân</SectionTitle>

            <Field label="Username">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Đặt username của bạn..."
                style={s.input}
              />
              <span style={s.hint}>
                Tên hiển thị trong app và link chia sẻ watchlist.
              </span>
            </Field>

            <Field label="Email">
              <input
                value={user.email}
                disabled
                style={{ ...s.input, opacity: 0.4, cursor: "not-allowed" }}
              />
              <span style={s.hint}>Email không thể thay đổi.</span>
            </Field>

            <Field label="Giới thiệu bản thân">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Một vài câu về sở thích phim ảnh của bạn..."
                rows={3}
                maxLength={200}
                style={s.textarea}
              />
              <span style={s.hint}>{bio.length}/200 ký tự</span>
            </Field>

            <Field label="Avatar">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {AVATARS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setAvatar(e)}
                    style={{
                      ...s.emojiBtn,
                      ...(avatar === e ? s.emojiBtnActive : {}),
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </Field>

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              style={{ ...s.btnPrimary, opacity: savingProfile ? 0.6 : 1 }}
            >
              {savingProfile ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        )}

        {/* ══ PASSWORD TAB ══ */}
        {tab === "password" && (
          <div>
            <SectionTitle>Đổi mật khẩu</SectionTitle>

            <Field label="Mật khẩu hiện tại">
              <div style={s.pwdWrap}>
                <input
                  type={showPwds ? "text" : "password"}
                  value={curPwd}
                  onChange={(e) => setCurPwd(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại"
                  style={{ ...s.input, paddingRight: 40 }}
                />
                <button onClick={() => setShowPwds((p) => !p)} style={s.eyeBtn}>
                  {showPwds ? "🙈" : "👁"}
                </button>
              </div>
            </Field>

            <Field label="Mật khẩu mới">
              <div style={s.pwdWrap}>
                <input
                  type={showPwds ? "text" : "password"}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Ít nhất 6 ký tự"
                  style={{ ...s.input, paddingRight: 40 }}
                />
                <button onClick={() => setShowPwds((p) => !p)} style={s.eyeBtn}>
                  {showPwds ? "🙈" : "👁"}
                </button>
              </div>
              {/* strength bar */}
              {newPwd && (
                <div style={{ marginTop: 8 }}>
                  <div style={s.strengthBg}>
                    <div
                      style={{
                        ...s.strengthFill,
                        width: `${(pwdStrength / 5) * 100}%`,
                        background: strengthColor,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 11, color: strengthColor }}>
                    {strengthLabel}
                  </span>
                </div>
              )}
            </Field>

            <Field label="Xác nhận mật khẩu mới">
              <div style={s.pwdWrap}>
                <input
                  type={showPwds ? "text" : "password"}
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  style={{ ...s.input, paddingRight: 40 }}
                />
                <button onClick={() => setShowPwds((p) => !p)} style={s.eyeBtn}>
                  {showPwds ? "🙈" : "👁"}
                </button>
              </div>
              {confirmPwd && newPwd !== confirmPwd && (
                <span
                  style={{
                    fontSize: 11,
                    color: "#e74c3c",
                    marginTop: 4,
                    display: "block",
                  }}
                >
                  Mật khẩu không khớp
                </span>
              )}
            </Field>

            <div style={s.pwdNote}>
              🔒 Sau khi đổi mật khẩu thành công, bạn sẽ được đăng xuất tự động.
            </div>

            <button
              onClick={handleChangePassword}
              disabled={
                savingPwd || !curPwd || !newPwd || newPwd !== confirmPwd
              }
              style={{
                ...s.btnPrimary,
                opacity:
                  savingPwd || !curPwd || !newPwd || newPwd !== confirmPwd
                    ? 0.5
                    : 1,
              }}
            >
              {savingPwd ? "Đang xử lý..." : "Đổi mật khẩu"}
            </button>
          </div>
        )}

        {/* ══ ACTIVITY TAB ══ */}
        {tab === "activity" && (
          <div>
            <SectionTitle>Lịch sử hoạt động</SectionTitle>

            {loadingActivity ? (
              <div style={s.loadingRow}>
                <div style={s.spinner} />
                <span style={{ color: "var(--text-faint)", fontSize: 14 }}>
                  Đang tải...
                </span>
              </div>
            ) : activity.length === 0 ? (
              <div style={s.empty}>
                <p style={{ fontSize: 36, margin: "0 0 10px" }}>📭</p>
                <p style={{ color: "var(--text-faint)" }}>
                  Chưa có hoạt động nào.
                </p>
              </div>
            ) : (
              <div style={s.timeline}>
                {activity.map((item, i) => {
                  const meta = ACTIVITY_META[item.type] || {
                    icon: "•",
                    color: "#888",
                    label: item.type,
                  };
                  return (
                    <div key={i} style={s.timelineItem}>
                      {/* connector line */}
                      <div style={s.timelineLine}>
                        <div
                          style={{ ...s.timelineDot, background: meta.color }}
                        >
                          <span style={{ fontSize: 12 }}>{meta.icon}</span>
                        </div>
                        {i < activity.length - 1 && (
                          <div style={s.timelineConnector} />
                        )}
                      </div>

                      {/* content */}
                      <div style={s.timelineContent}>
                        {item.poster && (
                          <Link to={`/movie/${item.movie_id}`}>
                            <img
                              src={item.poster}
                              alt={item.title}
                              style={s.activityPoster}
                              loading="lazy"
                            />
                          </Link>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: 11,
                              color: meta.color,
                              fontWeight: 600,
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
                              }}
                            >
                              {item.title}
                            </p>
                          )}
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--text-faint)",
                              marginTop: 2,
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

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Sub-components ─────────────────────────── */
function SectionTitle({ children }) {
  return (
    <h2
      style={{
        fontSize: 16,
        fontWeight: 600,
        color: "var(--text-primary)",
        margin: "0 0 20px",
        paddingBottom: 10,
        borderBottom: "1px solid var(--border)",
      }}
    >
      {children}
    </h2>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--text-faint)",
          marginBottom: 8,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function MiniStat({ value, label }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────── */
const s = {
  page: {
    background: "var(--bg-page)",
    minHeight: "100vh",
    color: "var(--text-primary)",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 24px",
    borderBottom: "1px solid var(--border)",
    position: "sticky",
    top: 0,
    zIndex: 100,
    backdropFilter: "blur(12px)",
    background: "rgba(15,15,15,0.92)",
  },
  navBack: {
    color: "var(--text-secondary)",
    textDecoration: "none",
    fontSize: 14,
  },
  navLink: {
    color: "var(--text-secondary)",
    textDecoration: "none",
    fontSize: 14,
  },

  /* hero */
  heroCard: {
    display: "flex",
    alignItems: "center",
    gap: 28,
    padding: "32px 32px 28px",
    background: "var(--bg-card)",
    borderBottom: "1px solid var(--border)",
    flexWrap: "wrap",
  },
  avatarBig: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    background: "var(--bg-input2)",
    border: "3px solid rgba(255,255,255,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 38,
    cursor: "pointer",
    flexShrink: 0,
    transition: "border-color 0.2s",
    userSelect: "none",
  },
  avatarEditHint: {
    position: "absolute",
    bottom: 0,
    right: 0,
    background: "var(--red)",
    color: "var(--text-primary)",
    borderRadius: "50%",
    width: 22,
    height: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    pointerEvents: "none",
  },
  heroInfo: { flex: 1, minWidth: 160 },
  heroName: { margin: "0 0 4px", fontSize: 24, fontWeight: 700 },
  heroEmail: { margin: "0 0 6px", fontSize: 13, color: "var(--text-faint)" },
  heroBio: {
    margin: 0,
    fontSize: 13,
    color: "var(--text-muted)",
    fontStyle: "italic",
  },
  miniStats: {
    display: "flex",
    gap: 24,
    background: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: "12px 20px",
    border: "1px solid var(--border)",
  },

  /* emoji picker */
  emojiPicker: {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    zIndex: 200,
    background: "var(--bg-overlay)",
    border: "1px solid var(--border-mid)",
    borderRadius: 14,
    padding: 16,
    width: 240,
    boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
  },
  pickerLabel: {
    margin: "0 0 10px",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text-faint)",
  },
  emojiGrid: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 },
  emojiBtn: {
    fontSize: 22,
    background: "var(--border)",
    border: "1px solid transparent",
    borderRadius: 8,
    cursor: "pointer",
    padding: "6px 0",
    lineHeight: 1,
    transition: "all 0.12s",
  },
  emojiBtnActive: {
    background: "var(--red-dim)",
    borderColor: "rgba(229,9,20,0.5)",
  },

  /* tabs */
  tabRow: {
    display: "flex",
    gap: 4,
    padding: "16px 24px 0",
    borderBottom: "1px solid var(--border)",
  },
  tab: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    padding: "8px 16px",
    borderRadius: "8px 8px 0 0",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    transition: "all 0.15s",
    borderBottom: "2px solid transparent",
  },
  tabActive: {
    color: "var(--red-text)",
    borderBottomColor: "var(--red)",
    background: "rgba(229,9,20,0.08)",
  },

  /* panel */
  panel: { padding: "28px 32px", maxWidth: 640 },

  /* form */
  input: {
    width: "100%",
    background: "var(--bg-input)",
    border: "1px solid var(--border-mid)",
    borderRadius: 10,
    padding: "11px 14px",
    color: "var(--text-primary)",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  textarea: {
    width: "100%",
    background: "var(--bg-input)",
    border: "1px solid var(--border-mid)",
    borderRadius: 10,
    padding: "11px 14px",
    color: "var(--text-primary)",
    fontSize: 14,
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
  },
  hint: {
    fontSize: 11,
    color: "var(--text-faint)",
    marginTop: 5,
    display: "block",
  },

  /* password */
  pwdWrap: { position: "relative" },
  eyeBtn: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 16,
    padding: 4,
  },
  strengthBg: {
    height: 4,
    background: "var(--border)",
    borderRadius: 2,
    overflow: "hidden",
  },
  strengthFill: {
    height: "100%",
    borderRadius: 2,
    transition: "width 0.3s, background 0.3s",
  },
  pwdNote: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "12px 14px",
    fontSize: 13,
    color: "var(--text-muted)",
    marginBottom: 20,
  },

  /* buttons */
  btnPrimary: {
    background: "var(--red)",
    border: "none",
    color: "var(--text-primary)",
    padding: "12px 28px",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity 0.15s",
  },

  /* activity */
  loadingRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "40px 0",
  },
  spinner: {
    width: 24,
    height: 24,
    border: "2px solid rgba(255,255,255,0.1)",
    borderTop: "2px solid #e50914",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  empty: { textAlign: "center", padding: "60px 0" },
  timeline: { display: "flex", flexDirection: "column" },
  timelineItem: { display: "flex", gap: 16, alignItems: "flex-start" },
  timelineLine: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flexShrink: 0,
    width: 36,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid rgba(255,255,255,0.1)",
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    minHeight: 20,
    background: "var(--border)",
    margin: "3px 0",
  },
  timelineContent: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    padding: "2px 0 20px",
    flex: 1,
    minWidth: 0,
  },
  activityPoster: {
    width: 38,
    height: 56,
    objectFit: "cover",
    borderRadius: 6,
    flexShrink: 0,
  },
};

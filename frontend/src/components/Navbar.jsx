import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";

/* ─── hook: detect mobile ─────────────────────── */
function useIsMobile(bp = 768) {
  const [mobile, setMobile] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < bp);
    window.addEventListener("resize", h, { passive: true });
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return mobile;
}

/* ─── TABS config ─────────────────────────────── */
const TABS = [
  { key: "all", label: "Khám phá", icon: "✦" },
  { key: "popular", label: "Phổ biến", icon: "↑" },
  { key: "top-rated", label: "Top Rated", icon: "★" },
  { key: "upcoming", label: "Sắp chiếu", icon: "◎", badge: "New" },
  { key: "trending", label: "Trending", icon: "⟡" },
];

/* ─── Brand Logo SVG ───────────────────────────── */
function Logo({ size = 32 }) {
  return (
    <svg
      width={size * 2.8}
      height={size}
      viewBox="0 0 90 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <rect
        x="1"
        y="4"
        width="3"
        height="24"
        rx="1.5"
        fill="var(--red)"
        opacity="0.9"
      />
      <rect x="1" y="6" width="3" height="4" rx="1" fill="var(--bg-page)" />
      <rect x="1" y="13" width="3" height="4" rx="1" fill="var(--bg-page)" />
      <rect x="1" y="20" width="3" height="4" rx="1" fill="var(--bg-page)" />
      <text
        x="9"
        y="23"
        fontFamily="'Bebas Neue', 'Arial Narrow', sans-serif"
        fontSize="22"
        letterSpacing="2"
        fill="var(--text-primary)"
      >
        FILMS
      </text>
      <circle cx="86" cy="22" r="2.5" fill="var(--red)" />
    </svg>
  );
}

/* ─── Page title helper ───────────────────────── */
function PageTitle({ path }) {
  const map = {
    "/watchlist": "My Watchlist",
    "/statistics": "Statistics",
    "/profile": "Hồ sơ",
    "/login": "Đăng nhập",
    "/mood": "Tâm trạng",
    "/reminders": "Nhắc nhở",
    "/recommendations": "Gợi ý cho bạn", // ← THÊM MỚI
  };
  if (path.startsWith("/movie/"))
    return <span style={s.pageTitle}>Chi tiết phim</span>;
  if (path.startsWith("/w/"))
    return <span style={s.pageTitle}>Watchlist công khai</span>;
  return <span style={s.pageTitle}>{map[path] ?? ""}</span>;
}

/* ══════════════════════════════════════════════════
   MAIN NAVBAR
══════════════════════════════════════════════════ */
export default function Navbar({ heroRef, activeTab, onTabChange }) {
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const [solid, setSolid] = useState(!heroRef);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [hoverTab, setHoverTab] = useState(null);
  const userMenuRef = useRef(null);

  const isHome = location.pathname === "/";
  const isMood = location.pathname === "/mood";
  const isRec = location.pathname === "/recommendations";
  const curTab = activeTab ?? "all";

  useEffect(() => {
    if (!heroRef?.current) {
      setSolid(true);
      return;
    }
    setSolid(false);
    const obs = new IntersectionObserver(
      ([entry]) => setSolid(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-60px 0px 0px 0px" },
    );
    obs.observe(heroRef.current);
    return () => obs.disconnect();
  }, [heroRef]);

  useEffect(() => {
    const h = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target))
        setShowUserMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = showDrawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showDrawer]);

  const handleTabClick = (key) => {
    onTabChange?.(key);
    if (!isHome) navigate("/");
    setShowDrawer(false);
  };

  const avatarChar =
    user?.avatar || (user?.username || user?.email || "U")[0].toUpperCase();
  const displayName = user?.username || user?.email?.split("@")[0] || "";

  /* ══ DESKTOP ════════════════════════════════════ */
  if (!isMobile) {
    return (
      <>
        <nav
          style={{
            ...s.navbar,
            ...(solid ? s.navbarSolid : s.navbarTransparent),
          }}
        >
          {/* ── Left: Logo ── */}
          <div style={s.navLeft}>
            <Link
              to="/"
              onClick={() => onTabChange?.("all")}
              style={{
                display: "flex",
                alignItems: "center",
                textDecoration: "none",
              }}
            >
              <Logo size={28} />
            </Link>
          </div>

          {/* ── Center: Tabs or Page Title ── */}
          <div style={s.navCenter}>
            {isHome ? (
              <div style={s.tabBar}>
                {TABS.map(({ key, label, icon, badge }) => {
                  const isActive = curTab === key;
                  const isHovered = hoverTab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleTabClick(key)}
                      onMouseEnter={() => setHoverTab(key)}
                      onMouseLeave={() => setHoverTab(null)}
                      style={s.tab}
                    >
                      <span
                        style={{
                          ...s.tabInner,
                          color: isActive
                            ? "var(--text-primary)"
                            : isHovered
                              ? "var(--text-secondary)"
                              : "var(--text-muted)",
                        }}
                      >
                        <span style={s.tabIcon}>{icon}</span>
                        <span style={s.tabLabel}>{label}</span>
                        {badge && <span style={s.newBadge}>{badge}</span>}
                      </span>
                      <span
                        style={{
                          ...s.tabUnderline,
                          transform: isActive
                            ? "scaleX(1)"
                            : isHovered
                              ? "scaleX(0.5)"
                              : "scaleX(0)",
                          opacity: isActive ? 1 : isHovered ? 0.5 : 0,
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            ) : (
              <PageTitle path={location.pathname} />
            )}
          </div>

          {/* ── Right: Controls ── */}
          <div style={s.navRight}>
            {/* ── Mood link ── */}
            <Link
              to="/mood"
              style={{ ...s.moodLink, ...(isMood ? s.moodLinkActive : {}) }}
            >
              <span style={{ fontSize: 14 }}>✦</span>
              <span>Tâm trạng</span>
            </Link>

            {/* ── Gợi ý link (chỉ hiện khi đã login) ── */}
            {isLoggedIn && (
              <Link
                to="/recommendations"
                style={{ ...s.recLink, ...(isRec ? s.recLinkActive : {}) }}
              >
                <span style={{ fontSize: 13 }}>◈</span>
                <span>Gợi ý</span>
              </Link>
            )}

            <NotificationBell />
            <ThemeToggle />

            {isLoggedIn ? (
              <div style={{ position: "relative" }} ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu((p) => !p)}
                  style={{
                    ...s.avatarBtn,
                    ...(showUserMenu ? s.avatarBtnOpen : {}),
                  }}
                >
                  <span style={s.avatarRing}>
                    <span style={s.avatar}>{avatarChar}</span>
                  </span>
                  <span style={s.avatarName}>{displayName}</span>
                  <span
                    style={{
                      ...s.chevron,
                      transform: showUserMenu
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                    }}
                  >
                    ▾
                  </span>
                </button>

                {showUserMenu && (
                  <div style={s.userMenu}>
                    <div style={s.menuHeader}>
                      <span style={s.menuHeaderName}>{displayName}</span>
                      <span style={s.menuHeaderEmail}>{user?.email}</span>
                    </div>
                    <div style={s.menuDivider} />
                    {[
                      { to: "/profile", icon: "◈", label: "Hồ sơ của tôi" },
                      { to: "/watchlist", icon: "▣", label: "My Watchlist" },
                      { to: "/statistics", icon: "📊", label: "Statistics" },
                      {
                        to: "/recommendations",
                        icon: "✦",
                        label: "Gợi ý cho bạn",
                      }, // ← THÊM
                      { to: "/mood", icon: "✦", label: "Tâm trạng" },
                      { to: "/reminders", icon: "◷", label: "Nhắc nhở" },
                    ].map(({ to, icon, label }) => (
                      <Link
                        key={to}
                        to={to}
                        style={s.menuItem}
                        onClick={() => setShowUserMenu(false)}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "var(--bg-card2)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <span style={s.menuIcon}>{icon}</span>
                        <span>{label}</span>
                      </Link>
                    ))}
                    <div style={s.menuDivider} />
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      style={{
                        ...s.menuItem,
                        color: "var(--red-text)",
                        width: "100%",
                        textAlign: "left",
                        fontFamily: "inherit",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--red-dim)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <span style={s.menuIcon}>↩</span>
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                style={s.loginBtn}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--red-hover)";
                  e.currentTarget.style.boxShadow = "var(--red-glow)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--red)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </nav>

        {solid && !heroRef && <div style={{ height: 60 }} />}
        <style>{navCSS}</style>
      </>
    );
  }

  /* ══ MOBILE ══════════════════════════════════════ */
  return (
    <>
      <nav
        style={{
          ...s.navbarMobile,
          ...(solid ? s.navbarSolid : s.navbarTransparent),
        }}
      >
        <Link
          to="/"
          onClick={() => onTabChange?.("all")}
          style={{
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
          }}
        >
          <Logo size={22} />
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <NotificationBell />
          <ThemeToggle />
          {isLoggedIn && (
            <button
              onClick={() => setShowDrawer(true)}
              style={s.avatarBtnMobile}
            >
              <span style={s.avatar}>{avatarChar}</span>
            </button>
          )}
          <button
            onClick={() => setShowDrawer((p) => !p)}
            style={s.hamburger}
            aria-label="Menu"
          >
            <span
              style={{
                ...s.hamburgerLine,
                transform: showDrawer
                  ? "rotate(45deg) translate(3px,3px)"
                  : "none",
              }}
            />
            <span
              style={{
                ...s.hamburgerLine,
                opacity: showDrawer ? 0 : 1,
                transform: showDrawer ? "scaleX(0)" : "none",
              }}
            />
            <span
              style={{
                ...s.hamburgerLine,
                transform: showDrawer
                  ? "rotate(-45deg) translate(3px,-3px)"
                  : "none",
              }}
            />
          </button>
        </div>
      </nav>

      {solid && <div style={{ height: 52 }} />}

      <div
        style={{
          ...s.drawerOverlay,
          opacity: showDrawer ? 1 : 0,
          pointerEvents: showDrawer ? "auto" : "none",
        }}
        onClick={() => setShowDrawer(false)}
      />

      <div
        style={{
          ...s.drawer,
          transform: showDrawer ? "translateX(0)" : "translateX(100%)",
        }}
      >
        <div style={s.drawerHeader}>
          <Logo size={22} />
          <button onClick={() => setShowDrawer(false)} style={s.drawerClose}>
            ✕
          </button>
        </div>

        {isLoggedIn ? (
          <div style={s.drawerUser}>
            <span style={{ ...s.avatar, width: 42, height: 42, fontSize: 18 }}>
              {avatarChar}
            </span>
            <div>
              <p style={s.drawerUserName}>{displayName}</p>
              <p style={s.drawerUserEmail}>{user?.email}</p>
            </div>
          </div>
        ) : (
          <Link
            to="/login"
            style={s.drawerLoginBtn}
            onClick={() => setShowDrawer(false)}
          >
            Đăng nhập / Đăng ký
          </Link>
        )}

        <div style={{ ...s.menuDivider, margin: "12px 0" }} />

        {isHome && (
          <>
            <p style={s.drawerSectionLabel}>Danh mục phim</p>
            {TABS.map(({ key, label, icon, badge }) => (
              <button
                key={key}
                onClick={() => handleTabClick(key)}
                style={{
                  ...s.drawerTab,
                  ...(curTab === key ? s.drawerTabActive : {}),
                }}
              >
                <span style={s.drawerTabIcon}>{icon}</span>
                <span style={s.drawerTabLabel}>{label}</span>
                {badge && (
                  <span style={{ ...s.newBadge, marginLeft: "auto" }}>
                    {badge}
                  </span>
                )}
                {curTab === key && <span style={s.drawerTabDot} />}
              </button>
            ))}
            <div style={{ ...s.menuDivider, margin: "12px 0" }} />
          </>
        )}

        <p style={s.drawerSectionLabel}>Trang</p>
        {[
          { to: "/mood", icon: "✦", label: "Tâm trạng" },
          { to: "/recommendations", icon: "◈", label: "Gợi ý cho bạn" }, // ← THÊM
          { to: "/watchlist", icon: "▣", label: "My Watchlist" },
          { to: "/reminders", icon: "◷", label: "Nhắc nhở" },
          { to: "/profile", icon: "◈", label: "Hồ sơ" },
        ].map(({ to, icon, label }) => (
          <Link
            key={to}
            to={to}
            style={s.drawerTab}
            onClick={() => setShowDrawer(false)}
          >
            <span style={s.drawerTabIcon}>{icon}</span>
            <span style={s.drawerTabLabel}>{label}</span>
          </Link>
        ))}

        {isLoggedIn && (
          <>
            <div style={{ ...s.menuDivider, margin: "12px 0" }} />
            <button
              onClick={() => {
                logout();
                setShowDrawer(false);
              }}
              style={{
                ...s.drawerTab,
                color: "var(--red-text)",
                width: "100%",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              <span style={s.drawerTabIcon}>↩</span>
              <span style={s.drawerTabLabel}>Đăng xuất</span>
            </button>
          </>
        )}
      </div>

      {isHome && (
        <div style={s.bottomNav}>
          {TABS.map(({ key, label, icon }) => {
            const isActive = curTab === key;
            return (
              <button
                key={key}
                onClick={() => handleTabClick(key)}
                style={s.bottomTab}
              >
                <span
                  style={{
                    ...s.bottomDot,
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? "scale(1)" : "scale(0)",
                  }}
                />
                <span
                  style={{
                    ...s.bottomIcon,
                    color: isActive ? "var(--red-text)" : "var(--text-muted)",
                    transform: isActive ? "scale(1.15)" : "scale(1)",
                  }}
                >
                  {icon}
                </span>
                <span
                  style={{
                    ...s.bottomLabel,
                    color: isActive
                      ? "var(--text-primary)"
                      : "var(--text-faint)",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
          <Link to="/mood" style={{ ...s.bottomTab, textDecoration: "none" }}>
            <span style={{ ...s.bottomDot, opacity: isMood ? 1 : 0 }} />
            <span
              style={{
                ...s.bottomIcon,
                color: isMood ? "#c39bd3" : "var(--text-muted)",
              }}
            >
              ✦
            </span>
            <span
              style={{
                ...s.bottomLabel,
                color: isMood ? "#c39bd3" : "var(--text-faint)",
              }}
            >
              Mood
            </span>
          </Link>
        </div>
      )}

      <style>{navCSS}</style>
    </>
  );
}

/* ── Shared CSS ─────────────────────────────────── */
const navCSS = `
  @keyframes menuSlideIn {
    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)    scale(1); }
  }
  @keyframes drawerIn {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }
`;

/* ── STYLES ─────────────────────────────────────── */
const s = {
  navbar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: "var(--z-navbar, 1000)",
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 16,
    padding: "0 28px",
    height: 60,
    transition:
      "background 0.35s ease, backdrop-filter 0.35s ease, border-color 0.35s ease",
  },
  navbarMobile: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: "var(--z-navbar, 1000)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    height: 52,
    transition:
      "background 0.35s ease, backdrop-filter 0.35s ease, border-color 0.35s ease",
  },
  navbarSolid: {
    background: "var(--navbar-bg)",
    backdropFilter: "blur(20px) saturate(1.8)",
    WebkitBackdropFilter: "blur(20px) saturate(1.8)",
    borderBottom: "1px solid var(--navbar-border)",
  },
  navbarTransparent: {
    background:
      "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)",
    backdropFilter: "none",
    borderBottom: "1px solid transparent",
  },
  navLeft: { display: "flex", alignItems: "center" },
  navCenter: { display: "flex", justifyContent: "center" },
  navRight: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  pageTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "var(--text-lg)",
    letterSpacing: "var(--tracking-wider)",
    color: "var(--text-primary)",
  },
  tabBar: { display: "flex", alignItems: "center", gap: 2 },
  tab: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "6px 14px 8px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    userSelect: "none",
  },
  tabInner: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    transition: "color 0.18s ease",
    whiteSpace: "nowrap",
  },
  tabIcon: { fontSize: 13, opacity: 0.8, lineHeight: 1 },
  tabLabel: { letterSpacing: "var(--tracking-normal)" },
  tabUnderline: {
    position: "absolute",
    bottom: 2,
    left: "12px",
    right: "12px",
    height: 2,
    background: "var(--red)",
    borderRadius: "var(--radius-full)",
    transformOrigin: "center",
    transition:
      "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease",
  },
  newBadge: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.07em",
    background: "var(--red)",
    color: "#fff",
    padding: "1px 5px",
    borderRadius: "var(--radius-sm)",
    lineHeight: 1.6,
    textTransform: "uppercase",
  },
  moodLink: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 12px",
    borderRadius: "var(--radius-full)",
    border: "1px solid var(--border-mid)",
    background: "transparent",
    color: "var(--text-muted)",
    textDecoration: "none",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    whiteSpace: "nowrap",
    transition: "all 0.15s",
  },
  moodLinkActive: {
    background: "rgba(155,89,182,0.15)",
    borderColor: "rgba(155,89,182,0.5)",
    color: "#c39bd3",
  },

  /* ── Gợi ý link ── */
  recLink: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 12px",
    borderRadius: "var(--radius-full)",
    border: "1px solid var(--border-mid)",
    background: "transparent",
    color: "var(--text-muted)",
    textDecoration: "none",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    whiteSpace: "nowrap",
    transition: "all 0.15s",
  },
  recLinkActive: {
    background: "rgba(245,197,24,0.12)",
    borderColor: "rgba(245,197,24,0.35)",
    color: "#f5c518",
  },

  loginBtn: {
    background: "var(--red)",
    color: "#fff",
    padding: "7px 18px",
    borderRadius: "var(--radius-full)",
    textDecoration: "none",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    letterSpacing: "var(--tracking-wide)",
  },
  avatarBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "var(--bg-card)",
    border: "1px solid var(--border-mid)",
    borderRadius: "var(--radius-full)",
    padding: "4px 10px 4px 4px",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: "var(--text-sm)",
  },
  avatarBtnOpen: {
    borderColor: "var(--border-bright)",
    background: "var(--bg-card2)",
  },
  avatarRing: {
    display: "flex",
    padding: 2,
    borderRadius: "50%",
    border: "2px solid var(--red-border)",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "var(--red)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
    color: "#fff",
    userSelect: "none",
  },
  avatarName: {
    fontWeight: 500,
    maxWidth: 90,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  chevron: { fontSize: 10, opacity: 0.5, transition: "transform 0.2s ease" },
  userMenu: {
    position: "absolute",
    right: 0,
    top: "calc(100% + 10px)",
    width: 220,
    background: "var(--bg-overlay)",
    border: "1px solid var(--border-mid)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
    zIndex: 100,
    boxShadow: "var(--shadow-menu)",
    animation: "menuSlideIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both",
  },
  menuHeader: { padding: "14px 16px 12px", background: "var(--bg-card)" },
  menuHeaderName: {
    display: "block",
    fontSize: "var(--text-base)",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 2,
  },
  menuHeaderEmail: {
    display: "block",
    fontSize: "var(--text-xs)",
    color: "var(--text-faint)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 16px",
    color: "var(--text-secondary)",
    textDecoration: "none",
    fontSize: "var(--text-sm)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontFamily: "var(--font-body)",
    width: "100%",
  },
  menuIcon: {
    width: 20,
    textAlign: "center",
    fontSize: 14,
    opacity: 0.65,
    flexShrink: 0,
  },
  menuDivider: { height: 1, background: "var(--border)", margin: "2px 0" },
  hamburger: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 5,
    width: 34,
    height: 34,
    borderRadius: "var(--radius-md)",
    background: "var(--bg-card)",
    border: "1px solid var(--border-mid)",
    cursor: "pointer",
    padding: "0 8px",
  },
  hamburgerLine: {
    display: "block",
    height: 1.5,
    background: "var(--text-secondary)",
    borderRadius: "var(--radius-full)",
    transition: "transform 0.25s ease, opacity 0.2s ease",
  },
  avatarBtnMobile: {
    display: "flex",
    background: "transparent",
    border: "none",
    padding: 0,
    cursor: "pointer",
  },
  drawerOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.65)",
    backdropFilter: "blur(4px)",
    zIndex: 999,
    transition: "opacity 0.3s ease",
  },
  drawer: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    width: 280,
    background: "var(--bg-overlay)",
    borderLeft: "1px solid var(--border-mid)",
    zIndex: 1001,
    overflowY: "auto",
    padding: "0 0 40px",
    transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
    boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
  },
  drawerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    borderBottom: "1px solid var(--border)",
    position: "sticky",
    top: 0,
    background: "var(--bg-overlay)",
    backdropFilter: "blur(12px)",
    zIndex: 1,
  },
  drawerClose: {
    width: 32,
    height: 32,
    borderRadius: "var(--radius-md)",
    background: "var(--bg-card)",
    border: "1px solid var(--border-mid)",
    color: "var(--text-muted)",
    fontSize: 14,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerUser: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "16px",
    background: "var(--bg-card)",
    margin: "12px",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border-mid)",
  },
  drawerUserName: {
    fontSize: "var(--text-base)",
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: 0,
  },
  drawerUserEmail: {
    fontSize: "var(--text-xs)",
    color: "var(--text-faint)",
    margin: "2px 0 0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 170,
  },
  drawerLoginBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "12px",
    padding: "12px",
    background: "var(--red)",
    color: "#fff",
    borderRadius: "var(--radius-md)",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "var(--text-base)",
  },
  drawerSectionLabel: {
    fontSize: "var(--text-xs)",
    fontWeight: 600,
    letterSpacing: "var(--tracking-wider)",
    color: "var(--text-faint)",
    textTransform: "uppercase",
    padding: "4px 16px 8px",
    margin: 0,
  },
  drawerTab: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    background: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    cursor: "pointer",
    textDecoration: "none",
    width: "100%",
    position: "relative",
    fontFamily: "var(--font-body)",
  },
  drawerTabActive: { background: "var(--red-dim)", color: "var(--red-text)" },
  drawerTabIcon: {
    width: 24,
    textAlign: "center",
    fontSize: 16,
    flexShrink: 0,
  },
  drawerTabLabel: { fontSize: "var(--text-base)", fontWeight: 500 },
  drawerTabDot: {
    marginLeft: "auto",
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--red)",
  },
  bottomNav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: "var(--z-navbar,1000)",
    display: "flex",
    background: "var(--navbar-bg)",
    backdropFilter: "blur(20px) saturate(1.8)",
    WebkitBackdropFilter: "blur(20px) saturate(1.8)",
    borderTop: "1px solid var(--border)",
    paddingBottom: "env(safe-area-inset-bottom,0px)",
  },
  bottomTab: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    padding: "10px 4px 8px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    position: "relative",
    minWidth: 0,
    textDecoration: "none",
  },
  bottomDot: {
    position: "absolute",
    top: 5,
    width: 4,
    height: 4,
    borderRadius: "50%",
    background: "var(--red)",
    transition:
      "opacity 0.2s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
  },
  bottomIcon: {
    fontSize: 18,
    lineHeight: 1,
    transition:
      "color 0.18s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
  },
  bottomLabel: {
    fontSize: 10,
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
    transition: "color 0.18s ease",
  },
};

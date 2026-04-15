import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";

/* ── Hook ── */
function useIsMobile(bp = 768) {
  const [mobile, setMobile] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < bp);
    window.addEventListener("resize", h, { passive: true });
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return mobile;
}

/* ── SVG Icons for tabs ── */
const TabIcons = {
  all: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  popular: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  ),
  "top-rated": () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  upcoming: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  trending: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
};

/* ── Nav link icons ── */
const MoodIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);
const StarIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

/* ── TABS config ── */
const TABS = [
  { key: "all", label: "Khám phá", badge: null },
  { key: "popular", label: "Phổ biến", badge: null },
  { key: "top-rated", label: "Top Rated", badge: null },
  { key: "upcoming", label: "Sắp chiếu", badge: "New" },
  { key: "trending", label: "Trending", badge: null },
];

/* ── Logo ── */
function Logo({ size = 28 }) {
  return (
    <svg
      width={size * 2.8}
      height={size}
      viewBox="0 0 90 32"
      fill="none"
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

/* ── Page title ── */
function PageTitle({ path }) {
  const map = {
    "/watchlist": "My Watchlist",
    "/statistics": "Statistics",
    "/profile": "Hồ sơ",
    "/login": "Đăng nhập",
    "/mood": "Tâm trạng",
    "/reminders": "Nhắc nhở",
    "/recommendations": "Gợi ý cho bạn",
  };
  if (path.startsWith("/movie/"))
    return <span style={s.pageTitle}>Chi tiết phim</span>;
  if (path.startsWith("/w/"))
    return <span style={s.pageTitle}>Watchlist công khai</span>;
  return <span style={s.pageTitle}>{map[path] ?? ""}</span>;
}

/* ── Menu item icons (inline SVG) ── */
const menuIcons = {
  profile: (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  watchlist: (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  stats: (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  rec: (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  mood: (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  ),
  reminder: (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  logout: (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

/* ════════════════════════════════════════════
   MAIN NAVBAR
════════════════════════════════════════════ */
export default function Navbar({ heroRef, activeTab, onTabChange }) {
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const [solid, setSolid] = useState(!heroRef);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
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

  /* ═══ DESKTOP ═══ */
  if (!isMobile) {
    return (
      <>
        <nav
          style={{
            ...s.navbar,
            ...(solid ? s.navbarSolid : s.navbarTransparent),
          }}
        >
          {/* Left: Logo */}
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

          {/* Center: Tabs or Page title */}
          <div style={s.navCenter}>
            {isHome ? (
              <div style={s.tabBar}>
                {TABS.map(({ key, label, badge }) => {
                  const isActive = curTab === key;
                  const Icon = TabIcons[key];
                  return (
                    <button
                      key={key}
                      onClick={() => handleTabClick(key)}
                      style={{
                        ...s.tab,
                        background: isActive
                          ? "rgba(229,9,20,0.14)"
                          : "transparent",
                        color: isActive
                          ? "var(--text-primary)"
                          : "var(--text-muted)",
                        border: isActive
                          ? "1px solid rgba(229,9,20,0.28)"
                          : "1px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background =
                            "rgba(255,255,255,0.05)";
                          e.currentTarget.style.color = "var(--text-secondary)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--text-muted)";
                        }
                      }}
                    >
                      <span
                        style={{
                          ...s.tabIcon,
                          color: isActive
                            ? "var(--red-text, #ff6b6b)"
                            : "inherit",
                        }}
                      >
                        {Icon && <Icon />}
                      </span>
                      <span style={s.tabLabel}>{label}</span>
                      {badge && <span style={s.newBadge}>{badge}</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <PageTitle path={location.pathname} />
            )}
          </div>

          {/* Right: Controls */}
          <div style={s.navRight}>
            {/* Mood link */}
            <Link
              to="/mood"
              style={{
                ...s.navLink,
                ...(isMood ? s.navLinkMoodActive : {}),
              }}
            >
              <MoodIcon />
              <span>Tâm trạng</span>
            </Link>

            {isLoggedIn && (
              <Link
                to="/recommendations"
                style={{
                  ...s.navLink,
                  ...(isRec ? s.navLinkRecActive : {}),
                }}
              >
                <StarIcon />
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
                  <div style={s.avatarRing}>
                    <div style={s.avatar}>{avatarChar}</div>
                  </div>
                  <span style={s.avatarName}>{displayName}</span>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    style={{
                      opacity: 0.5,
                      transition: "transform 0.2s ease",
                      transform: showUserMenu ? "rotate(180deg)" : "none",
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showUserMenu && (
                  <div style={s.userMenu}>
                    {/* User info header */}
                    <div style={s.menuUserInfo}>
                      <div
                        style={{
                          ...s.avatar,
                          width: 36,
                          height: 36,
                          fontSize: 15,
                          flexShrink: 0,
                        }}
                      >
                        {avatarChar}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={s.menuUserName}>{displayName}</p>
                        <p style={s.menuUserEmail}>{user?.email}</p>
                      </div>
                    </div>
                    <div style={s.menuDivider} />

                    {[
                      {
                        to: "/profile",
                        icon: menuIcons.profile,
                        label: "Hồ sơ của tôi",
                      },
                      {
                        to: "/watchlist",
                        icon: menuIcons.watchlist,
                        label: "My Watchlist",
                      },
                      {
                        to: "/statistics",
                        icon: menuIcons.stats,
                        label: "Statistics",
                      },
                      {
                        to: "/recommendations",
                        icon: menuIcons.rec,
                        label: "Gợi ý cho bạn",
                      },
                      { to: "/mood", icon: menuIcons.mood, label: "Tâm trạng" },
                      {
                        to: "/reminders",
                        icon: menuIcons.reminder,
                        label: "Nhắc nhở",
                      },
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
                        <span style={s.menuItemIcon}>{icon}</span>
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
                      <span style={s.menuItemIcon}>{menuIcons.logout}</span>
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

  /* ═══ MOBILE ═══ */
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
              <div style={{ ...s.avatar, width: 30, height: 30, fontSize: 13 }}>
                {avatarChar}
              </div>
            </button>
          )}
          {/* Hamburger */}
          <button
            onClick={() => setShowDrawer((p) => !p)}
            style={s.hamburger}
            aria-label="Menu"
          >
            <span
              style={{
                ...s.hLine,
                transform: showDrawer
                  ? "rotate(45deg) translate(3px,3px)"
                  : "none",
              }}
            />
            <span style={{ ...s.hLine, opacity: showDrawer ? 0 : 1 }} />
            <span
              style={{
                ...s.hLine,
                transform: showDrawer
                  ? "rotate(-45deg) translate(3px,-3px)"
                  : "none",
              }}
            />
          </button>
        </div>
      </nav>

      {solid && <div style={{ height: 52 }} />}

      {/* Overlay */}
      <div
        style={{
          ...s.drawerOverlay,
          opacity: showDrawer ? 1 : 0,
          pointerEvents: showDrawer ? "auto" : "none",
        }}
        onClick={() => setShowDrawer(false)}
      />

      {/* Drawer */}
      <div
        style={{
          ...s.drawer,
          transform: showDrawer ? "translateX(0)" : "translateX(100%)",
        }}
      >
        <div style={s.drawerHeader}>
          <Logo size={22} />
          <button onClick={() => setShowDrawer(false)} style={s.drawerClose}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {isLoggedIn ? (
          <div style={s.drawerUser}>
            <div style={{ ...s.avatar, width: 42, height: 42, fontSize: 18 }}>
              {avatarChar}
            </div>
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
            {TABS.map(({ key, label, badge }) => {
              const Icon = TabIcons[key];
              return (
                <button
                  key={key}
                  onClick={() => handleTabClick(key)}
                  style={{
                    ...s.drawerItem,
                    ...(curTab === key ? s.drawerItemActive : {}),
                  }}
                >
                  <span style={s.drawerItemIcon}>{Icon && <Icon />}</span>
                  <span style={s.drawerItemLabel}>{label}</span>
                  {badge && (
                    <span style={{ ...s.newBadge, marginLeft: "auto" }}>
                      {badge}
                    </span>
                  )}
                  {curTab === key && <span style={s.drawerActiveDot} />}
                </button>
              );
            })}
            <div style={{ ...s.menuDivider, margin: "12px 0" }} />
          </>
        )}

        <p style={s.drawerSectionLabel}>Trang</p>
        {[
          { to: "/mood", icon: menuIcons.mood, label: "Tâm trạng" },
          {
            to: "/recommendations",
            icon: menuIcons.rec,
            label: "Gợi ý cho bạn",
          },
          {
            to: "/watchlist",
            icon: menuIcons.watchlist,
            label: "My Watchlist",
          },
          { to: "/reminders", icon: menuIcons.reminder, label: "Nhắc nhở" },
          { to: "/profile", icon: menuIcons.profile, label: "Hồ sơ" },
        ].map(({ to, icon, label }) => (
          <Link
            key={to}
            to={to}
            style={s.drawerItem}
            onClick={() => setShowDrawer(false)}
          >
            <span style={s.drawerItemIcon}>{icon}</span>
            <span style={s.drawerItemLabel}>{label}</span>
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
                ...s.drawerItem,
                color: "var(--red-text)",
                width: "100%",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              <span style={s.drawerItemIcon}>{menuIcons.logout}</span>
              <span style={s.drawerItemLabel}>Đăng xuất</span>
            </button>
          </>
        )}
      </div>

      {/* Bottom tab bar */}
      {isHome && (
        <div style={s.bottomNav}>
          {TABS.map(({ key, label }) => {
            const isActive = curTab === key;
            const Icon = TabIcons[key];
            return (
              <button
                key={key}
                onClick={() => handleTabClick(key)}
                style={s.bottomTab}
              >
                {isActive && <span style={s.bottomActivePill} />}
                <span
                  style={{
                    ...s.bottomIcon,
                    color: isActive
                      ? "var(--red-text, #ff6b6b)"
                      : "var(--text-muted)",
                    transform: isActive ? "scale(1.1)" : "scale(1)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {Icon && <Icon />}
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
            {isMood && (
              <span
                style={{
                  ...s.bottomActivePill,
                  background: "rgba(195,155,211,0.25)",
                }}
              />
            )}
            <span
              style={{
                ...s.bottomIcon,
                color: isMood ? "#c39bd3" : "var(--text-muted)",
              }}
            >
              <MoodIcon />
            </span>
            <span
              style={{
                ...s.bottomLabel,
                color: isMood ? "#c39bd3" : "var(--text-faint)",
                fontWeight: isMood ? 600 : 400,
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

const navCSS = `
  @keyframes menuIn {
    from { opacity: 0; transform: translateY(-6px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
`;

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
    transition: "background 0.35s ease, backdrop-filter 0.35s ease",
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
    gap: 6,
  },

  pageTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "var(--text-lg)",
    letterSpacing: "var(--tracking-wider)",
    color: "var(--text-primary)",
  },

  /* Tab bar — pill style */
  tabBar: {
    display: "flex",
    alignItems: "center",
    gap: 3,
    padding: "4px",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    border: "1px solid rgba(100,120,180,0.08)",
  },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 8,
    cursor: "pointer",
    userSelect: "none",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    fontFamily: "var(--font-body, sans-serif)",
    whiteSpace: "nowrap",
    transition:
      "background 0.18s ease, color 0.18s ease, border-color 0.18s ease",
  },
  tabIcon: { display: "flex", alignItems: "center", flexShrink: 0 },
  tabLabel: { letterSpacing: "0.01em" },
  newBadge: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.07em",
    background: "var(--red)",
    color: "#fff",
    padding: "1px 5px",
    borderRadius: "var(--radius-sm)",
    textTransform: "uppercase",
    lineHeight: 1.6,
  },

  /* Nav pill links */
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 11px",
    borderRadius: "var(--radius-full)",
    border: "1px solid var(--border-mid)",
    background: "transparent",
    color: "var(--text-muted)",
    textDecoration: "none",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    whiteSpace: "nowrap",
    transition: "all 0.15s ease",
  },
  navLinkMoodActive: {
    background: "rgba(155,89,182,0.15)",
    borderColor: "rgba(155,89,182,0.5)",
    color: "#c39bd3",
  },
  navLinkRecActive: {
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
    transition: "all 0.15s ease",
  },

  /* Avatar button */
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
    transition: "all 0.15s ease",
  },
  avatarBtnOpen: {
    borderColor: "var(--border-bright)",
    background: "var(--bg-card2)",
  },
  avatarRing: {
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

  /* Dropdown menu */
  userMenu: {
    position: "absolute",
    right: 0,
    top: "calc(100% + 8px)",
    width: 230,
    background: "var(--bg-overlay)",
    border: "1px solid var(--border-mid)",
    borderRadius: 14,
    overflow: "hidden",
    zIndex: 100,
    boxShadow:
      "0 16px 48px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(100,120,180,0.12)",
    animation: "menuIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both",
  },
  menuUserInfo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 14px 12px",
    background:
      "linear-gradient(135deg, var(--bg-card2) 0%, var(--bg-card) 100%)",
    borderBottom: "1px solid var(--border)",
  },
  menuUserName: {
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  menuUserEmail: {
    margin: "2px 0 0",
    fontSize: 11,
    color: "var(--text-faint)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 150,
  },
  menuDivider: { height: 1, background: "var(--border)", margin: "2px 0" },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 14px",
    color: "var(--text-secondary)",
    textDecoration: "none",
    fontSize: "var(--text-sm)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontFamily: "var(--font-body)",
    width: "100%",
    transition: "background 0.13s ease",
  },
  menuItemIcon: {
    width: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    opacity: 0.7,
  },

  /* Mobile */
  avatarBtnMobile: {
    display: "flex",
    background: "transparent",
    border: "none",
    padding: 0,
    cursor: "pointer",
  },
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
  hLine: {
    display: "block",
    height: 1.5,
    background: "var(--text-secondary)",
    borderRadius: 99,
    transition: "transform 0.25s ease, opacity 0.2s ease",
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
    padding: "4px 16px 6px",
    margin: 0,
  },
  drawerItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "11px 16px",
    background: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    cursor: "pointer",
    textDecoration: "none",
    width: "100%",
    position: "relative",
    fontFamily: "var(--font-body)",
  },
  drawerItemActive: { background: "var(--red-dim)", color: "var(--red-text)" },
  drawerItemIcon: {
    width: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    opacity: 0.7,
  },
  drawerItemLabel: { fontSize: "var(--text-base)", fontWeight: 500 },
  drawerActiveDot: {
    marginLeft: "auto",
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--red)",
  },

  /* Bottom nav */
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
    gap: 3,
    padding: "10px 4px 8px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    position: "relative",
    minWidth: 0,
    textDecoration: "none",
  },
  bottomActivePill: {
    position: "absolute",
    top: 6,
    width: 20,
    height: 3,
    borderRadius: 99,
    background: "var(--red, #e50914)",
  },
  bottomIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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

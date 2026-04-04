import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

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
  { key: "all", path: "/", label: "Tất cả", icon: "🎬" },
  { key: "popular", path: "/?tab=popular", label: "Phổ biến", icon: "🔥" },
  { key: "top-rated", path: "/?tab=top-rated", label: "Top", icon: "⭐" },
  { key: "upcoming", path: "/?tab=upcoming", label: "Sắp chiếu", icon: "🗓" },
  { key: "trending", path: "/?tab=trending", label: "Trending", icon: "📈" },
];

/* ════════════════════════════════════════════════
   MAIN NAVBAR
   Props:
     heroRef?   — ref to hero element; when provided the navbar
                  starts transparent and becomes opaque once the
                  hero scrolls out of view (IntersectionObserver)
     activeTab? — currently selected tab key (Home page only)
     onTabChange? — (key) => void
════════════════════════════════════════════════ */
export default function Navbar({ heroRef, activeTab, onTabChange }) {
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const [solid, setSolid] = useState(!heroRef); // true = opaque bg
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const isHome = location.pathname === "/";

  /* IntersectionObserver — watch hero bottom edge */
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

  /* close user menu on outside click */
  useEffect(() => {
    const h = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target))
        setShowUserMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleTabClick = (tab) => {
    if (onTabChange) onTabChange(tab.key);
    if (!isHome) navigate("/");
  };

  /* ── DESKTOP NAVBAR ──────────────────────────── */
  if (!isMobile) {
    return (
      <>
        <nav
          style={{
            ...s.navbar,
            ...(solid ? s.navbarSolid : s.navbarTransparent),
          }}
        >
          {/* Logo */}
          <div style={s.navLeft}>
            <Link to="/" style={s.logo} onClick={() => onTabChange?.("all")}>
              Films
            </Link>
          </div>

          {/* Tab bar — only on home; other pages show page title */}
          <div style={s.navCenter}>
            {isHome ? (
              <div style={s.tabBar}>
                {TABS.map(({ key, label, icon }) => {
                  const isActive = activeTab
                    ? activeTab === key
                    : key === "all";
                  return (
                    <button
                      key={key}
                      onClick={() => handleTabClick({ key })}
                      style={{ ...s.tab, ...(isActive ? s.tabActive : {}) }}
                    >
                      <span style={s.tabIcon}>{icon}</span>
                      <span>{label}</span>
                      {key === "upcoming" && (
                        <span style={s.newBadge}>New</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <PageTitle path={location.pathname} />
            )}
          </div>

          {/* Right controls */}
          <div style={s.navRight}>
            <ThemeToggle />
            {isLoggedIn ? (
              <div style={{ position: "relative" }} ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu((p) => !p)}
                  style={s.avatarBtn}
                >
                  <span style={s.avatar}>
                    {user?.avatar ||
                      (user?.username || user?.email || "U")[0].toUpperCase()}
                  </span>
                  <span style={{ fontSize: 13 }}>
                    {user?.username || user?.email?.split("@")[0]}
                  </span>
                  <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>
                </button>

                {showUserMenu && (
                  <div style={s.userMenu}>
                    <Link
                      to="/profile"
                      style={s.menuItem}
                      onClick={() => setShowUserMenu(false)}
                    >
                      👤 Hồ sơ của tôi
                    </Link>
                    <Link
                      to="/watchlist"
                      style={s.menuItem}
                      onClick={() => setShowUserMenu(false)}
                    >
                      🎬 My Watchlist
                    </Link>
                    <div style={s.menuDivider} />
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      style={{ ...s.menuItem, ...s.menuItemLogout }}
                    >
                      🚪 Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" style={s.loginBtn}>
                Đăng nhập
              </Link>
            )}
          </div>
        </nav>

        {/* Spacer — only when navbar is NOT floating over hero */}
        {solid && !heroRef && <div style={{ height: 56 }} />}
      </>
    );
  }

  /* ── MOBILE: top bar (logo + controls) + bottom tab nav ─ */
  return (
    <>
      {/* Top bar */}
      <nav
        style={{
          ...s.navbarMobile,
          ...(solid ? s.navbarSolid : s.navbarTransparent),
        }}
      >
        <Link to="/" style={s.logo} onClick={() => onTabChange?.("all")}>
          Films
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ThemeToggle />
          {isLoggedIn ? (
            <div style={{ position: "relative" }} ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu((p) => !p)}
                style={s.avatarBtnMobile}
              >
                <span style={s.avatar}>
                  {user?.avatar ||
                    (user?.username || user?.email || "U")[0].toUpperCase()}
                </span>
              </button>
              {showUserMenu && (
                <div
                  style={{ ...s.userMenu, right: 0, top: "calc(100% + 8px)" }}
                >
                  <Link
                    to="/profile"
                    style={s.menuItem}
                    onClick={() => setShowUserMenu(false)}
                  >
                    👤 Hồ sơ
                  </Link>
                  <Link
                    to="/watchlist"
                    style={s.menuItem}
                    onClick={() => setShowUserMenu(false)}
                  >
                    🎬 Watchlist
                  </Link>
                  <div style={s.menuDivider} />
                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    style={{ ...s.menuItem, ...s.menuItemLogout }}
                  >
                    🚪 Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" style={s.loginBtnSm}>
              Đăng nhập
            </Link>
          )}
        </div>
      </nav>

      {/* Spacer under top bar on mobile (not over hero) */}
      {solid && <div style={{ height: 52 }} />}

      {/* Bottom tab bar — only on Home */}
      {isHome && (
        <div style={s.bottomNav}>
          {TABS.map(({ key, label, icon }) => {
            const isActive = (activeTab ?? "all") === key;
            return (
              <button
                key={key}
                onClick={() => handleTabClick({ key })}
                style={{
                  ...s.bottomTab,
                  ...(isActive ? s.bottomTabActive : {}),
                }}
              >
                <span style={s.bottomIcon}>{icon}</span>
                <span style={s.bottomLabel}>{label}</span>
                {key === "upcoming" && <span style={s.bottomBadge} />}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

/* tiny helper: shows a human page title in the center on non-home pages */
function PageTitle({ path }) {
  const map = {
    "/watchlist": "My Watchlist",
    "/profile": "Hồ sơ",
    "/login": "Đăng nhập",
  };
  if (path.startsWith("/movie/"))
    return <span style={s.pageTitle}>Chi tiết phim</span>;
  if (path.startsWith("/w/"))
    return <span style={s.pageTitle}>Watchlist công khai</span>;
  return <span style={s.pageTitle}>{map[path] ?? ""}</span>;
}

/* ─── STYLES ──────────────────────────────────── */
const s = {
  /* shared base */
  navbar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 12,
    padding: "0 24px",
    height: 56,
    transition:
      "background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease",
  },
  navbarMobile: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    height: 52,
    transition:
      "background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease",
  },
  navbarSolid: {
    background: "var(--navbar-bg)",
    backdropFilter: "blur(14px)",
    borderBottom: "1px solid var(--border)",
  },
  navbarTransparent: {
    background: "transparent",
    backdropFilter: "none",
    borderBottom: "1px solid transparent",
  },

  /* logo */
  logo: {
    color: "var(--red)",
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textDecoration: "none",
  },

  /* center */
  navCenter: { display: "flex", justifyContent: "center" },
  pageTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "var(--text-primary)",
  },

  /* tabs */
  tabBar: { display: "flex", gap: 2, alignItems: "center" },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    padding: "7px 13px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    transition: "all 0.15s",
    whiteSpace: "nowrap",
    position: "relative",
  },
  tabActive: {
    background: "var(--red-dim)",
    color: "var(--red-text)",
    fontWeight: 600,
  },
  tabIcon: { fontSize: 14 },
  newBadge: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.05em",
    background: "#e50914",
    color: "#fff",
    padding: "1px 5px",
    borderRadius: 4,
    marginLeft: 2,
    lineHeight: 1.6,
  },

  /* right controls */
  navRight: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
  },
  loginBtn: {
    background: "var(--red)",
    color: "#fff",
    padding: "7px 16px",
    borderRadius: 8,
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 600,
  },
  loginBtnSm: {
    background: "var(--red)",
    color: "#fff",
    padding: "5px 12px",
    borderRadius: 8,
    textDecoration: "none",
    fontSize: 12,
    fontWeight: 600,
  },
  avatarBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid var(--border-mid)",
    borderRadius: 8,
    padding: "5px 10px",
    color: "var(--text-primary)",
    cursor: "pointer",
    fontSize: 13,
  },
  avatarBtnMobile: {
    display: "flex",
    alignItems: "center",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid var(--border-mid)",
    borderRadius: "50%",
    padding: 0,
    cursor: "pointer",
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
  },

  /* user dropdown */
  userMenu: {
    position: "absolute",
    right: 0,
    top: "calc(100% + 8px)",
    background: "var(--bg-overlay)",
    border: "1px solid var(--border-mid)",
    borderRadius: 10,
    minWidth: 180,
    overflow: "hidden",
    zIndex: 100,
    boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
  },
  menuItem: {
    display: "block",
    padding: "11px 16px",
    color: "var(--text-secondary)",
    textDecoration: "none",
    fontSize: 14,
    background: "transparent",
    border: "none",
    width: "100%",
    textAlign: "left",
    cursor: "pointer",
    transition: "background 0.12s",
    fontFamily: "inherit",
  },
  menuItemLogout: { color: "rgba(255,100,100,0.85)" },
  menuDivider: {
    height: 1,
    background: "var(--border)",
    margin: "2px 0",
  },

  /* ── Mobile bottom nav ── */
  bottomNav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    display: "flex",
    background: "var(--navbar-bg)",
    backdropFilter: "blur(14px)",
    borderTop: "1px solid var(--border)",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
  },
  bottomTab: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    padding: "10px 4px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "var(--text-muted)",
    transition: "color 0.15s",
    position: "relative",
    minWidth: 0,
  },
  bottomTabActive: {
    color: "var(--red-text)",
  },
  bottomIcon: { fontSize: 18, lineHeight: 1 },
  bottomLabel: {
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
  },
  bottomBadge: {
    position: "absolute",
    top: 6,
    right: "calc(50% - 14px)",
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#e50914",
  },
};

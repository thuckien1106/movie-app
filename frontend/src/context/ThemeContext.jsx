import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext(null);

export function useTheme() {
  return useContext(ThemeContext);
}

/* ═══════════════════════════════════════════════════════════
   DESIGN SYSTEM — FILMVERSE
   Fonts: "Bebas Neue" (display) + "DM Sans" (body)
   Loaded via index.css @import Google Fonts
═══════════════════════════════════════════════════════════ */
const THEMES = {
  dark: {
    /* ── Backgrounds ── */
    "--bg-page": "#080b0f", // deepest void
    "--bg-surface": "#0e1218", // cards, panels
    "--bg-card": "#111620", // movie cards
    "--bg-card2": "#161b28", // elevated cards
    "--bg-overlay": "#1a2030", // dropdowns, menus
    "--bg-input": "#0e1218", // input fields
    "--bg-input2": "#161b28", // secondary inputs
    "--bg-glass": "rgba(14,18,24,0.75)", // glassmorphism

    /* ── Text ── */
    "--text-primary": "#f0f4ff", // near-white with slight blue tint
    "--text-secondary": "rgba(200,210,240,0.82)",
    "--text-muted": "rgba(160,175,210,0.52)",
    "--text-faint": "rgba(140,155,195,0.32)",
    "--text-dim": "rgba(120,135,175,0.22)",

    /* ── Borders ── */
    "--border": "rgba(100,120,180,0.09)",
    "--border-mid": "rgba(100,120,180,0.16)",
    "--border-bright": "rgba(120,145,210,0.28)",
    "--border-glow": "rgba(229,9,20,0.45)",

    /* ── Brand Red ── */
    "--red": "#e50914",
    "--red-hover": "#ff1a1a",
    "--red-dim": "rgba(229,9,20,0.14)",
    "--red-dim2": "rgba(229,9,20,0.22)",
    "--red-border": "rgba(229,9,20,0.40)",
    "--red-text": "#ff6b6b",
    "--red-glow": "0 0 20px rgba(229,9,20,0.35)",

    /* ── Accent Gold (unique twist vs Netflix) ── */
    "--gold": "#f5c518", // IMDb-inspired gold
    "--gold-dim": "rgba(245,197,24,0.14)",
    "--gold-text": "#f5c518",

    /* ── Semantic ── */
    "--green": "#22c55e",
    "--green-dim": "rgba(34,197,94,0.14)",
    "--yellow": "#eab308",
    "--blue-accent": "#3b82f6",
    "--blue-dim": "rgba(59,130,246,0.14)",

    /* ── Navbar ── */
    "--navbar-bg": "rgba(8,11,15,0.88)",
    "--navbar-border": "rgba(100,120,180,0.12)",

    /* ── Hero ── */
    "--hero-bg": "#05080c",
    "--hero-grad-left":
      "linear-gradient(to right, rgba(5,8,12,0.97) 0%, rgba(5,8,12,0.75) 38%, rgba(5,8,12,0.15) 65%, transparent 100%)",
    "--hero-grad-bottom":
      "linear-gradient(to top, #080b0f 0%, rgba(8,11,15,0.6) 35%, transparent 60%)",

    /* ── Shadows ── */
    "--shadow-sm": "0 2px 8px rgba(0,0,0,0.4)",
    "--shadow-card": "0 4px 20px rgba(0,0,0,0.6)",
    "--shadow-hover":
      "0 16px 48px rgba(0,0,0,0.9), 0 0 0 1px rgba(229,9,20,0.18)",
    "--shadow-menu":
      "0 12px 40px rgba(0,0,0,0.8), 0 0 0 0.5px rgba(100,120,180,0.15)",

    /* ── Scrollbar ── */
    "--scrollbar": "rgba(100,120,180,0.18)",

    /* ── Typography scale ── */
    "--font-display": "'Bebas Neue', 'Arial Narrow', sans-serif",
    "--font-body": "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    "--font-mono": "'JetBrains Mono', 'Fira Code', monospace",

    "--text-xs": "11px",
    "--text-sm": "13px",
    "--text-base": "15px",
    "--text-md": "17px",
    "--text-lg": "20px",
    "--text-xl": "24px",
    "--text-2xl": "30px",
    "--text-3xl": "38px",
    "--text-hero": "clamp(36px, 5.5vw, 72px)",

    "--leading-tight": "1.1",
    "--leading-snug": "1.3",
    "--leading-normal": "1.55",
    "--leading-loose": "1.75",

    "--tracking-tight": "-0.03em",
    "--tracking-normal": "0",
    "--tracking-wide": "0.06em",
    "--tracking-wider": "0.12em",
    "--tracking-widest": "0.2em",

    /* ── Spacing scale ── */
    "--space-1": "4px",
    "--space-2": "8px",
    "--space-3": "12px",
    "--space-4": "16px",
    "--space-5": "20px",
    "--space-6": "24px",
    "--space-8": "32px",
    "--space-10": "40px",
    "--space-12": "48px",
    "--space-16": "64px",

    /* ── Border radius ── */
    "--radius-sm": "6px",
    "--radius-md": "10px",
    "--radius-lg": "14px",
    "--radius-xl": "20px",
    "--radius-full": "9999px",

    /* ── Transitions ── */
    "--ease-fast": "0.15s cubic-bezier(0.4,0,0.2,1)",
    "--ease-normal": "0.25s cubic-bezier(0.4,0,0.2,1)",
    "--ease-slow": "0.4s cubic-bezier(0.4,0,0.2,1)",
    "--ease-spring": "0.35s cubic-bezier(0.34,1.56,0.64,1)",

    /* ── Z-index scale ── */
    "--z-base": "1",
    "--z-card": "10",
    "--z-overlay": "100",
    "--z-navbar": "1000",
    "--z-modal": "2000",
    "--z-toast": "3000",
  },

  light: {
    /* ── Backgrounds ── */
    "--bg-page": "#f5f6fa",
    "--bg-surface": "#ffffff",
    "--bg-card": "#ffffff",
    "--bg-card2": "#f0f2f8",
    "--bg-overlay": "#ffffff",
    "--bg-input": "#eef0f6",
    "--bg-input2": "#e5e8f0",
    "--bg-glass": "rgba(255,255,255,0.82)",

    /* ── Text ── */
    "--text-primary": "#0a0c14",
    "--text-secondary": "rgba(20,25,50,0.75)",
    "--text-muted": "rgba(30,40,80,0.48)",
    "--text-faint": "rgba(30,40,80,0.30)",
    "--text-dim": "rgba(30,40,80,0.18)",

    /* ── Borders ── */
    "--border": "rgba(20,30,80,0.08)",
    "--border-mid": "rgba(20,30,80,0.14)",
    "--border-bright": "rgba(20,30,80,0.24)",
    "--border-glow": "rgba(209,8,18,0.38)",

    /* ── Brand Red ── */
    "--red": "#d10812",
    "--red-hover": "#b5060f",
    "--red-dim": "rgba(209,8,18,0.08)",
    "--red-dim2": "rgba(209,8,18,0.14)",
    "--red-border": "rgba(209,8,18,0.32)",
    "--red-text": "#b5060f",
    "--red-glow": "0 0 20px rgba(209,8,18,0.25)",

    /* ── Accent Gold ── */
    "--gold": "#c49a04",
    "--gold-dim": "rgba(196,154,4,0.12)",
    "--gold-text": "#8a6c00",

    /* ── Semantic ── */
    "--green": "#16a34a",
    "--green-dim": "rgba(22,163,74,0.1)",
    "--yellow": "#ca8a04",
    "--blue-accent": "#2563eb",
    "--blue-dim": "rgba(37,99,235,0.1)",

    /* ── Navbar ── */
    "--navbar-bg": "rgba(245,246,250,0.92)",
    "--navbar-border": "rgba(20,30,80,0.10)",

    /* ── Hero ── */
    "--hero-bg": "#e8eaf2",
    "--hero-grad-left":
      "linear-gradient(to right, rgba(245,246,250,0.96) 0%, rgba(245,246,250,0.72) 38%, rgba(245,246,250,0.12) 65%, transparent 100%)",
    "--hero-grad-bottom":
      "linear-gradient(to top, #f5f6fa 0%, rgba(245,246,250,0.55) 35%, transparent 60%)",

    /* ── Shadows ── */
    "--shadow-sm": "0 2px 6px rgba(0,0,0,0.08)",
    "--shadow-card": "0 4px 16px rgba(0,0,0,0.1)",
    "--shadow-hover":
      "0 12px 36px rgba(0,0,0,0.18), 0 0 0 1px rgba(209,8,18,0.12)",
    "--shadow-menu":
      "0 8px 28px rgba(0,0,0,0.15), 0 0 0 0.5px rgba(20,30,80,0.1)",

    /* ── Scrollbar ── */
    "--scrollbar": "rgba(20,30,80,0.15)",

    /* ── Typography — same scale, different fonts for light ── */
    "--font-display": "'Bebas Neue', 'Arial Narrow', sans-serif",
    "--font-body": "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    "--font-mono": "'JetBrains Mono', 'Fira Code', monospace",

    "--text-xs": "11px",
    "--text-sm": "13px",
    "--text-base": "15px",
    "--text-md": "17px",
    "--text-lg": "20px",
    "--text-xl": "24px",
    "--text-2xl": "30px",
    "--text-3xl": "38px",
    "--text-hero": "clamp(36px, 5.5vw, 72px)",

    "--leading-tight": "1.1",
    "--leading-snug": "1.3",
    "--leading-normal": "1.55",
    "--leading-loose": "1.75",

    "--tracking-tight": "-0.03em",
    "--tracking-normal": "0",
    "--tracking-wide": "0.06em",
    "--tracking-wider": "0.12em",
    "--tracking-widest": "0.2em",

    /* ── Spacing scale ── */
    "--space-1": "4px",
    "--space-2": "8px",
    "--space-3": "12px",
    "--space-4": "16px",
    "--space-5": "20px",
    "--space-6": "24px",
    "--space-8": "32px",
    "--space-10": "40px",
    "--space-12": "48px",
    "--space-16": "64px",

    /* ── Border radius ── */
    "--radius-sm": "6px",
    "--radius-md": "10px",
    "--radius-lg": "14px",
    "--radius-xl": "20px",
    "--radius-full": "9999px",

    /* ── Transitions ── */
    "--ease-fast": "0.15s cubic-bezier(0.4,0,0.2,1)",
    "--ease-normal": "0.25s cubic-bezier(0.4,0,0.2,1)",
    "--ease-slow": "0.4s cubic-bezier(0.4,0,0.2,1)",
    "--ease-spring": "0.35s cubic-bezier(0.34,1.56,0.64,1)",

    /* ── Z-index scale ── */
    "--z-base": "1",
    "--z-card": "10",
    "--z-overlay": "100",
    "--z-navbar": "1000",
    "--z-modal": "2000",
    "--z-toast": "3000",
  },
};

function applyTheme(theme) {
  const vars = THEMES[theme];
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute("data-theme", theme);
  document.body.style.background = vars["--bg-page"];
  document.body.style.fontFamily = vars["--font-body"];
  document.body.style.color = vars["--text-primary"];
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("filmverse-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("filmverse-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggle, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext(null);

export function useTheme() {
  return useContext(ThemeContext);
}

/* ── CSS variable tokens injected into <html> ── */
const THEMES = {
  dark: {
    "--bg-page": "#0f0f0f",
    "--bg-card": "#181818",
    "--bg-card2": "#1c1c1c",
    "--bg-overlay": "#1e1e1e",
    "--bg-input": "#1c1c1c",
    "--bg-input2": "#222",
    "--text-primary": "#ffffff",
    "--text-secondary": "rgba(255,255,255,0.75)",
    "--text-muted": "rgba(255,255,255,0.45)",
    "--text-faint": "rgba(255,255,255,0.25)",
    "--border": "rgba(255,255,255,0.08)",
    "--border-mid": "rgba(255,255,255,0.14)",
    "--border-bright": "rgba(255,255,255,0.22)",
    "--red": "#e50914",
    "--red-dim": "rgba(229,9,20,0.16)",
    "--red-border": "rgba(229,9,20,0.38)",
    "--red-text": "#ff6b6b",
    "--green": "#2ecc71",
    "--green-dim": "rgba(46,204,113,0.15)",
    "--yellow": "#f1c40f",
    "--navbar-bg": "rgba(15,15,15,0.92)",
    "--hero-page-bg": "#0a0a0a",
    "--shadow-card": "0 6px 20px rgba(0,0,0,0.55)",
    "--shadow-hover": "0 20px 50px rgba(0,0,0,0.85)",
    "--scrollbar": "rgba(255,255,255,0.1)",
  },
  light: {
    "--bg-page": "#f2f2f2",
    "--bg-card": "#ffffff",
    "--bg-card2": "#f7f7f7",
    "--bg-overlay": "#ffffff",
    "--bg-input": "#f0f0f0",
    "--bg-input2": "#e8e8e8",
    "--text-primary": "#111111",
    "--text-secondary": "rgba(0,0,0,0.72)",
    "--text-muted": "rgba(0,0,0,0.45)",
    "--text-faint": "rgba(0,0,0,0.28)",
    "--border": "rgba(0,0,0,0.1)",
    "--border-mid": "rgba(0,0,0,0.16)",
    "--border-bright": "rgba(0,0,0,0.25)",
    "--red": "#d10812",
    "--red-dim": "rgba(209,8,18,0.1)",
    "--red-border": "rgba(209,8,18,0.3)",
    "--red-text": "#c0060f",
    "--green": "#1a9e55",
    "--green-dim": "rgba(26,158,85,0.12)",
    "--yellow": "#c69400",
    "--navbar-bg": "rgba(255,255,255,0.92)",
    "--hero-page-bg": "#e0e0e0",
    "--shadow-card": "0 4px 14px rgba(0,0,0,0.12)",
    "--shadow-hover": "0 16px 40px rgba(0,0,0,0.22)",
    "--scrollbar": "rgba(0,0,0,0.15)",
  },
};

function applyTheme(theme) {
  const vars = THEMES[theme];
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute("data-theme", theme);
  // override index.css body bg
  document.body.style.background = vars["--bg-page"];
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("films-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("films-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggle, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

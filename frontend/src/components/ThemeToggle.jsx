import { useTheme } from "../context/ThemeContext";

/* ══════════════════════════════════════════════
   THEME TOGGLE
   - Pill with SVG sun/moon icons
   - Thumb slides + icon rotates on switch
   - Gold glow for dark mode, red for light
══════════════════════════════════════════════ */

function SunIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

export default function ThemeToggle({ style: styleProp = {} }) {
  const { isDark, toggle } = useTheme();

  const thumbColor = isDark ? "#f5c518" : "#e50914";
  const thumbShadow = isDark
    ? "0 0 8px rgba(245,197,24,0.7), 0 1px 4px rgba(0,0,0,0.3)"
    : "0 0 8px rgba(229,9,20,0.6), 0 1px 4px rgba(0,0,0,0.3)";

  return (
    <button
      onClick={toggle}
      title={isDark ? "Chuyển sang Light mode" : "Chuyển sang Dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        width: 48,
        height: 26,
        borderRadius: "var(--radius-full, 999px)",
        border: "1px solid var(--border-mid)",
        background: isDark ? "rgba(245,197,24,0.12)" : "rgba(229,9,20,0.1)",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
        transition: "background 0.25s ease, border-color 0.25s ease",
        ...styleProp,
      }}
    >
      {/* Sliding thumb */}
      <span
        style={{
          position: "absolute",
          top: 3,
          left: isDark ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: thumbColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isDark ? "#0a0c0e" : "#fff",
          transition:
            "left 0.28s cubic-bezier(0.34,1.56,0.64,1), background 0.25s ease, box-shadow 0.25s ease",
          boxShadow: thumbShadow,
          transform: "rotate(0deg)",
        }}
      >
        {isDark ? <MoonIcon /> : <SunIcon />}
      </span>

      {/* Background icons (fixed positions) */}
      <span
        style={{
          position: "absolute",
          left: 5,
          color: isDark ? "rgba(245,197,24,0.3)" : "transparent",
          display: "flex",
          alignItems: "center",
          transition: "color 0.25s ease, opacity 0.25s ease",
          fontSize: 10,
          pointerEvents: "none",
        }}
      >
        <MoonIcon />
      </span>
      <span
        style={{
          position: "absolute",
          right: 5,
          color: !isDark ? "rgba(229,9,20,0.3)" : "transparent",
          display: "flex",
          alignItems: "center",
          transition: "color 0.25s ease",
          fontSize: 10,
          pointerEvents: "none",
        }}
      >
        <SunIcon />
      </span>
    </button>
  );
}

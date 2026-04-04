import { useTheme } from "../context/ThemeContext";

/**
 * Animated sun/moon toggle pill.
 * Drop anywhere — reads theme from context.
 */
export default function ThemeToggle({ style = {} }) {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={isDark ? "Chuyển sang Light mode" : "Chuyển sang Dark mode"}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        width: 48,
        height: 26,
        borderRadius: 13,
        border: "1px solid var(--border-mid)",
        background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
        transition: "background 0.25s, border-color 0.25s",
        ...style,
      }}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* sliding thumb */}
      <span
        style={{
          position: "absolute",
          top: 2,
          left: isDark ? 24 : 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: isDark ? "#f1c40f" : "#e50914",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          transition:
            "left 0.22s cubic-bezier(.34,1.4,.64,1), background 0.25s",
          boxShadow: isDark
            ? "0 1px 6px rgba(241,196,15,0.5)"
            : "0 1px 6px rgba(229,9,20,0.4)",
        }}
      >
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}

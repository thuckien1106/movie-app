import { useEffect, useState } from "react";

/* ══════════════════════════════════════════════
   SCROLL TO TOP
   - Appears after 400px scroll
   - Shows scroll-progress ring around button
   - Morphs in/out with spring animation
   - Positioned to avoid toast collision
══════════════════════════════════════════════ */
export default function ScrollToTop() {
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      const pct = maxScroll > 0 ? scrollY / maxScroll : 0;
      setProgress(pct);
      setShow(scrollY > 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = () => {
    setPressed(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setPressed(false), 600);
  };

  /* SVG ring constants */
  const R = 19;
  const C = 22;
  const len = 2 * Math.PI * R;
  const arc = progress * len;

  return (
    <button
      onClick={handleClick}
      aria-label="Lên đầu trang"
      style={{
        position: "fixed",
        bottom: "clamp(16px, 3vh, 32px)",
        left: "clamp(12px, 3vw, 28px)" /* left side — toasts are right */,
        zIndex: "var(--z-toast, 3000)",
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: "var(--bg-overlay, #1a2030)",
        border: "1px solid var(--border-mid)",
        color: "var(--text-primary)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
        /* spring in/out */
        opacity: show ? 1 : 0,
        transform: show
          ? pressed
            ? "scale(0.9)"
            : "scale(1)"
          : "scale(0.6) translateY(8px)",
        pointerEvents: show ? "all" : "none",
        transition: show
          ? "opacity 0.35s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)"
          : "opacity 0.25s ease, transform 0.25s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--red-border)";
        e.currentTarget.style.background = "var(--bg-card2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-mid)";
        e.currentTarget.style.background = "var(--bg-overlay)";
      }}
    >
      {/* Progress ring SVG */}
      <svg
        width={44}
        height={44}
        viewBox={`0 0 ${C * 2} ${C * 2}`}
        style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
      >
        {/* Track */}
        <circle
          cx={C}
          cy={C}
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="2"
        />
        {/* Progress arc */}
        <circle
          cx={C}
          cy={C}
          r={R}
          fill="none"
          stroke="var(--red)"
          strokeWidth="2.5"
          strokeDasharray={`${arc} ${len}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.15s ease" }}
        />
      </svg>

      {/* Arrow icon */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ position: "relative", zIndex: 1 }}
      >
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </svg>
    </button>
  );
}

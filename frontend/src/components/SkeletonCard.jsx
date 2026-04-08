import { useEffect, useState } from "react";

/* ══════════════════════════════════════════════
   SKELETON CARD
   Matches MovieCard 2/3 aspect ratio exactly.
   Wave shimmer at 105° — feels alive.
══════════════════════════════════════════════ */
export default function SkeletonCard({ delay = 0 }) {
  const [visible, setVisible] = useState(delay === 0);
  useEffect(() => {
    if (delay > 0) {
      const t = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(t);
    }
  }, [delay]);

  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "2/3",
        borderRadius: "var(--radius-lg, 14px)",
        background: "var(--bg-card, #111620)",
        overflow: "hidden",
        contain: "layout style",
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.97)",
        transition:
          delay > 0
            ? `opacity 0.3s ease ${delay}ms, transform 0.3s ease ${delay}ms`
            : "none",
      }}
    >
      {/* Shimmer sweep */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.042) 48%, rgba(255,255,255,0.055) 52%, transparent 70%)",
          backgroundSize: "260% 100%",
          animation: "skeletonWave 2s ease-in-out infinite",
        }}
      />

      {/* Rating ring placeholder — top-left */}
      <div
        style={{ position: "absolute", top: 8, left: 8, width: 40, height: 40 }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "2.5px solid rgba(255,255,255,0.06)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 4,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.03)",
          }}
        />
      </div>

      {/* Bottom info block */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "42%",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "0 10px 11px",
          }}
        >
          <div
            style={{
              height: 9,
              width: "82%",
              borderRadius: "var(--radius-sm, 6px)",
              background: "rgba(255,255,255,0.09)",
              marginBottom: 5,
            }}
          />
          <div
            style={{
              height: 9,
              width: "58%",
              borderRadius: "var(--radius-sm, 6px)",
              background: "rgba(255,255,255,0.06)",
              marginBottom: 7,
            }}
          />
          <div
            style={{
              height: 7,
              width: 28,
              borderRadius: "var(--radius-sm, 6px)",
              background: "rgba(255,255,255,0.04)",
            }}
          />
        </div>
      </div>

      <style>{`@keyframes skeletonWave { 0%{background-position:240% 0} 100%{background-position:-240% 0} }`}</style>
    </div>
  );
}

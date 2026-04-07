/* ══════════════════════════════════════════════
   SKELETON CARD — matches MovieCard 2/3 aspect ratio
   Uses shimmer wave + fake content silhouettes
══════════════════════════════════════════════ */
function SkeletonCard() {
  return (
    <div style={s.root}>
      {/* shimmer sweep */}
      <div style={s.shimmer} />

      {/* fake rating ring — top-left */}
      <div style={s.fakeRing} />

      {/* fake bottom info */}
      <div style={s.fakeBottom}>
        <div style={s.fakeTitleLine1} />
        <div style={s.fakeTitleLine2} />
        <div style={s.fakeYear} />
      </div>

      <style>{skeletonCSS}</style>
    </div>
  );
}

const s = {
  root: {
    position: "relative",
    aspectRatio: "2/3",
    borderRadius: "var(--radius-lg, 14px)",
    background: "var(--bg-card, #111620)",
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.045) 50%, transparent 65%)",
    backgroundSize: "250% 100%",
    animation: "skeletonWave 1.9s ease-in-out infinite",
  },

  /* fake rating ring */
  fakeRing: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.05)",
    border: "2.5px solid rgba(255,255,255,0.07)",
  },

  /* bottom info */
  fakeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "0 10px 12px",
    background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
  },
  fakeTitleLine1: {
    height: 10,
    width: "85%",
    borderRadius: 5,
    background: "rgba(255,255,255,0.09)",
    marginBottom: 6,
  },
  fakeTitleLine2: {
    height: 10,
    width: "60%",
    borderRadius: 5,
    background: "rgba(255,255,255,0.06)",
    marginBottom: 8,
  },
  fakeYear: {
    height: 8,
    width: 32,
    borderRadius: 4,
    background: "rgba(255,255,255,0.04)",
  },
};

const skeletonCSS = `
  @keyframes skeletonWave {
    0%   { background-position:  220% 0; }
    100% { background-position: -220% 0; }
  }
`;

export default SkeletonCard;

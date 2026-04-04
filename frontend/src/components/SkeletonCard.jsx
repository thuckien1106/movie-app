function SkeletonCard() {
  return (
    <div
      style={{
        height: "270px",
        borderRadius: "10px",
        background:
          "linear-gradient(90deg, var(--bg-card) 25%, var(--bg-card2) 50%, var(--bg-card) 75%)",
        backgroundSize: "200% 100%",
        animation: "loading 1.5s infinite",
      }}
    />
  );
}

export default SkeletonCard;

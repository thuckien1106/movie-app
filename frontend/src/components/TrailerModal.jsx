import { useEffect, useState } from "react";
import { getTrailer } from "../api/movieApi";

function TrailerModal({ movie, onClose }) {
  const [youtubeKey, setYoutubeKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!movie) return;

    setLoading(true);
    setError(false);
    setYoutubeKey(null);

    getTrailer(movie.id)
      .then((res) => {
        const key = res.data?.youtube_key;
        if (key) {
          setYoutubeKey(key);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [movie]);

  // Đóng modal khi bấm ESC
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!movie) return null;

  return (
    // Backdrop — click ra ngoài để đóng
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "fadeIn 0.2s ease",
      }}
    >
      {/* Modal box — ngăn click lan ra backdrop */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "860px",
          background: "#141414",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,0.9)",
          animation: "slideUp 0.25s cubic-bezier(0.34,1.2,0.64,1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "17px",
              fontWeight: "600",
              color: "white",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "calc(100% - 48px)",
            }}
          >
            {movie.title}
          </h2>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: "50%",
              width: "34px",
              height: "34px",
              cursor: "pointer",
              color: "white",
              fontSize: "18px",
              lineHeight: "34px",
              textAlign: "center",
              flexShrink: 0,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
            }
          >
            ✕
          </button>
        </div>

        {/* Video area — tỉ lệ 16:9 */}
        <div
          style={{
            position: "relative",
            paddingTop: "56.25%",
            background: "#000",
          }}
        >
          {loading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "14px",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  border: "3px solid rgba(255,255,255,0.15)",
                  borderTop: "3px solid #e50914",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <span style={{ fontSize: "14px" }}>Đang tải trailer...</span>
            </div>
          )}

          {!loading && error && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              <span style={{ fontSize: "40px" }}>🎬</span>
              <span style={{ fontSize: "15px" }}>
                Không tìm thấy trailer cho phim này
              </span>
            </div>
          )}

          {!loading && youtubeKey && (
            <iframe
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: "none",
              }}
              src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1&rel=0`}
              title={`Trailer: ${movie.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes spin    { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}

export default TrailerModal;

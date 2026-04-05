import { useState, useEffect } from "react";
import { getMoods } from "../api/moodApi";

/**
 * MoodPicker
 * Props:
 *   selectedMood  — mood đang chọn (object hoặc null)
 *   onSelect(mood) — callback khi user chọn mood
 *   onClose()      — callback đóng picker
 */
function MoodPicker({ selectedMood, onSelect, onClose }) {
  const [moods, setMoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    getMoods()
      .then((res) => setMoods(res.data))
      .catch(() =>
        // fallback tĩnh nếu API lỗi
        setMoods([
          {
            id: "vui",
            label: "Vui vẻ",
            emoji: "😄",
            description: "Cần cười thả ga",
            color: "#f1c40f",
          },
          {
            id: "buon",
            label: "Muốn khóc",
            emoji: "😢",
            description: "Phim chạm đến trái tim",
            color: "#3498db",
          },
          {
            id: "hoi_hop",
            label: "Hồi hộp",
            emoji: "😰",
            description: "Tim đập nhanh",
            color: "#e74c3c",
          },
          {
            id: "kinh_di",
            label: "Muốn sợ",
            emoji: "👻",
            description: "Tắt đèn, xem một mình",
            color: "#8e44ad",
          },
          {
            id: "thu_gian",
            label: "Thư giãn",
            emoji: "🛋️",
            description: "Nhẹ nhàng, không suy nghĩ",
            color: "#2ecc71",
          },
          {
            id: "phieu_luu",
            label: "Phiêu lưu",
            emoji: "🌍",
            description: "Khám phá thế giới mới",
            color: "#e67e22",
          },
          {
            id: "lang_man",
            label: "Lãng mạn",
            emoji: "💕",
            description: "Ngọt ngào và ấm áp",
            color: "#e91e8c",
          },
          {
            id: "suy_ngam",
            label: "Suy ngẫm",
            emoji: "🤔",
            description: "Phim nhiều tầng ý nghĩa",
            color: "#34495e",
          },
        ]),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <p style={s.headerSub}>Hôm nay bạn đang cảm thấy thế nào?</p>
            <h2 style={s.headerTitle}>Chọn tâm trạng</h2>
          </div>
          <button style={s.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Grid moods */}
        {loading ? (
          <div style={s.loadingRow}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={s.skeleton} />
            ))}
          </div>
        ) : (
          <div style={s.grid}>
            {moods.map((mood) => {
              const isSelected = selectedMood?.id === mood.id;
              const isHovered = hovered === mood.id;
              return (
                <button
                  key={mood.id}
                  style={{
                    ...s.moodCard,
                    ...(isSelected
                      ? { ...s.moodCardActive, borderColor: mood.color }
                      : {}),
                    ...(isHovered && !isSelected ? s.moodCardHover : {}),
                  }}
                  onMouseEnter={() => setHovered(mood.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSelect(mood)}
                >
                  {/* glow dot khi selected */}
                  {isSelected && (
                    <div style={{ ...s.activeDot, background: mood.color }} />
                  )}

                  {/* color bar top */}
                  <div style={{ ...s.colorBar, background: mood.color }} />

                  <span style={s.moodEmoji}>{mood.emoji}</span>
                  <span style={s.moodLabel}>{mood.label}</span>
                  <span style={s.moodDesc}>{mood.description}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* CTA nếu đã chọn */}
        {selectedMood && (
          <div style={s.ctaRow}>
            <button
              style={{ ...s.ctaBtn, background: selectedMood.color }}
              onClick={onClose}
            >
              Xem phim "{selectedMood.label}" {selectedMood.emoji}
            </button>
          </div>
        )}
      </div>

      <style>{css}</style>
    </div>
  );
}

/* ── styles ──────────────────────────────── */
const s = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(4px)",
    zIndex: 9000,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  sheet: {
    width: "100%",
    maxWidth: 680,
    background: "var(--bg-primary, #141414)",
    borderRadius: "20px 20px 0 0",
    padding: "28px 24px 32px",
    maxHeight: "90vh",
    overflowY: "auto",
    animation: "slideUp 0.3s cubic-bezier(.25,.46,.45,.94)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  headerSub: {
    margin: 0,
    fontSize: 13,
    color: "var(--text-muted, #888)",
    marginBottom: 4,
  },
  headerTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: "var(--text-primary, #fff)",
  },
  closeBtn: {
    background: "var(--bg-card, #1e1e1e)",
    border: "1px solid var(--border-mid, #333)",
    color: "var(--text-muted, #888)",
    borderRadius: 8,
    width: 34,
    height: 34,
    cursor: "pointer",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: 12,
  },
  loadingRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: 12,
  },
  skeleton: {
    height: 110,
    borderRadius: 12,
    background: "var(--bg-card, #1e1e1e)",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  moodCard: {
    position: "relative",
    background: "var(--bg-card, #1a1a1a)",
    border: "1.5px solid var(--border-mid, #2a2a2a)",
    borderRadius: 12,
    padding: "14px 12px 12px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    transition: "transform 0.18s, border-color 0.18s, background 0.18s",
    overflow: "hidden",
    textAlign: "center",
  },
  moodCardHover: {
    transform: "translateY(-3px)",
    background: "var(--bg-hover, #222)",
  },
  moodCardActive: {
    background: "var(--bg-hover, #222)",
    borderWidth: 2,
  },
  activeDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: "50%",
  },
  colorBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: "12px 12px 0 0",
  },
  moodEmoji: {
    fontSize: 28,
    lineHeight: 1,
    marginTop: 6,
  },
  moodLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "var(--text-primary, #fff)",
  },
  moodDesc: {
    fontSize: 11,
    color: "var(--text-muted, #888)",
    lineHeight: 1.4,
  },
  ctaRow: {
    marginTop: 20,
    display: "flex",
    justifyContent: "center",
  },
  ctaBtn: {
    border: "none",
    borderRadius: 10,
    padding: "12px 28px",
    fontSize: 15,
    fontWeight: 700,
    color: "#fff",
    cursor: "pointer",
    transition: "opacity 0.15s, transform 0.15s",
  },
};

const css = `
  @keyframes slideUp {
    from { transform: translateY(100%); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
`;

export default MoodPicker;

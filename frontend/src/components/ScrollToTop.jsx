import { useEffect, useState } from "react";

function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShow(true);
      } else {
        setShow(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!show) return null;

  return (
    <button
      onClick={scrollTop}
      style={{
        position: "fixed",
        bottom: "30px",
        right: "30px",
        padding: "12px 16px",
        borderRadius: "50%",
        border: "none",
        background: "#e50914",
        color: "white",
        fontSize: "18px",
        cursor: "pointer",
        boxShadow: "0 5px 20px rgba(0,0,0,0.5)",

        zIndex: 9999, // 🔥 THÊM DÒNG NÀY
      }}
    >
      ↑
    </button>
  );
}

export default ScrollToTop;

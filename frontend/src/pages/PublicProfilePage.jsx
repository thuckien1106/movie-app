// src/pages/PublicProfilePage.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getPublicProfile } from "../api/publicProfileApi";
import {
  toggleFollow,
  getFollowStatus,
  getFollowers,
  getFollowing,
  getSocialFeed,
} from "../api/publicProfileApi";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const GENRE_COLORS = ["#e50914", "#f5c518", "#60a5fa", "#4ade80", "#c084fc"];

function fmtPct(watched, total) {
  if (!total) return "0%";
  return Math.round((watched / total) * 100) + "%";
}

/* ── Avatar — ưu tiên avatar_url (Google), fallback emoji, fallback chữ cái ── */
function Avatar({ profile, size = 96 }) {
  const [imgErr, setImgErr] = useState(false);

  // Google user có avatar_url
  if (profile.avatar_url && !imgErr) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.username}
        onError={() => setImgErr(true)}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
        }}
      />
    );
  }

  // User thường có emoji avatar
  if (profile.avatar) {
    return (
      <span style={{ fontSize: size * 0.5, lineHeight: 1, userSelect: "none" }}>
        {profile.avatar}
      </span>
    );
  }

  // Fallback chữ cái đầu
  return (
    <span
      style={{
        fontSize: size * 0.38,
        fontWeight: 800,
        color: "#fff",
        fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
        letterSpacing: "0.05em",
      }}
    >
      {(profile.username || "?")[0].toUpperCase()}
    </span>
  );
}

/* ── Stat card ── */
function StatCard({ value, label, color, icon }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 90,
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${color}22`,
        borderTop: `2px solid ${color}`,
        borderRadius: "0 0 12px 12px",
        padding: "18px 16px 16px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at top, ${color}10 0%, transparent 60%)`,
          pointerEvents: "none",
        }}
      />
      <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color,
          lineHeight: 1,
          fontFamily: "var(--font-display,'Bebas Neue',sans-serif)",
          letterSpacing: "0.04em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "rgba(140,155,195,0.45)",
          marginTop: 5,
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ── Movie poster card — đồng đều kích thước ── */
function MovieCard({ movie }) {
  const [imgErr, setImgErr] = useState(false);
  const [hov, setHov] = useState(false);

  return (
    <Link
      to={`/movie/${movie.movie_id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          position: "relative",
          width: "100%",
          paddingBottom: "150%" /* aspect-ratio 2:3 — đồng đều mọi card */,
          borderRadius: 10,
          overflow: "hidden",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(100,120,175,0.12)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          transform: hov ? "translateY(-4px) scale(1.02)" : "none",
          boxShadow: hov
            ? "0 16px 40px rgba(0,0,0,0.7)"
            : "0 4px 16px rgba(0,0,0,0.4)",
          cursor: "pointer",
        }}
      >
        {/* Poster */}
        <div style={{ position: "absolute", inset: 0 }}>
          {movie.poster && !imgErr ? (
            <img
              src={movie.poster}
              alt={movie.title}
              onError={() => setImgErr(true)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
              loading="lazy"
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                background: "rgba(255,255,255,0.03)",
              }}
            >
              🎬
            </div>
          )}
        </div>

        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "55%",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)",
          }}
        />

        {/* Title */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "8px 8px 7px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 10.5,
              fontWeight: 600,
              lineHeight: 1.3,
              color: "#f0f4ff",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              opacity: hov ? 1 : 0.85,
              transition: "opacity 0.2s",
            }}
          >
            {movie.title}
          </p>
        </div>

        {/* Watched badge */}
        {movie.is_watched && (
          <div
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "rgba(34,197,94,0.92)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 800,
              color: "#fff",
              boxShadow: "0 2px 8px rgba(34,197,94,0.5)",
            }}
          >
            ✓
          </div>
        )}
      </div>
    </Link>
  );
}

/* ── Follow Button ───────────────────────────────────────────── */
function FollowButton({ username, isOwnProfile }) {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null); // null = loading
  const [busy, setBusy] = useState(false);
  const [hov, setHov] = useState(false);

  useEffect(() => {
    if (!username) return;
    getFollowStatus(username)
      .then((r) => setStatus(r.data))
      .catch(() =>
        setStatus({ following: false, followers: 0, following_count: 0 }),
      );
  }, [username]);

  if (isOwnProfile || !status) return null;

  const handleClick = async () => {
    if (!isLoggedIn) return navigate("/login");
    setBusy(true);
    try {
      const r = await toggleFollow(username);
      setStatus((prev) => ({
        ...prev,
        following: r.data.following,
        followers: r.data.following
          ? (prev?.followers ?? 0) + 1
          : Math.max(0, (prev?.followers ?? 1) - 1),
      }));
    } catch {
      /* silent */
    } finally {
      setBusy(false);
    }
  };

  const isFollowing = status.following;
  const label = busy
    ? "…"
    : isFollowing
      ? hov
        ? "Bỏ theo dõi"
        : "Đang theo dõi"
      : "Theo dõi";

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      disabled={busy}
      style={{
        padding: "9px 22px",
        borderRadius: 10,
        border: isFollowing ? "1.5px solid rgba(229,9,20,0.35)" : "none",
        background: isFollowing
          ? hov
            ? "rgba(229,9,20,0.12)"
            : "rgba(229,9,20,0.07)"
          : "var(--red,#e50914)",
        color: isFollowing ? "rgba(255,100,100,0.9)" : "#fff",
        fontSize: 13,
        fontWeight: 700,
        cursor: busy ? "default" : "pointer",
        fontFamily: "var(--font-body,'DM Sans',sans-serif)",
        transition: "all 0.18s ease",
        opacity: busy ? 0.6 : 1,
        minWidth: 120,
        letterSpacing: "0.01em",
      }}
    >
      {label}
    </button>
  );
}

/* ── Follower / Following counts ─────────────────────────────── */
function FollowStats({ username, onOpenList }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!username) return;
    getFollowStatus(username)
      .then((r) => setStatus(r.data))
      .catch(() => {});
  }, [username]);

  if (!status) return null;

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
      <button onClick={() => onOpenList("followers")} style={fsStat}>
        <span style={fsNum}>{status.followers}</span>
        <span style={fsLabel}>Người theo dõi</span>
      </button>
      <button onClick={() => onOpenList("following")} style={fsStat}>
        <span style={fsNum}>{status.following_count}</span>
        <span style={fsLabel}>Đang theo dõi</span>
      </button>
    </div>
  );
}
const fsStat = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
  textAlign: "left",
  display: "flex",
  flexDirection: "column",
  gap: 1,
};
const fsNum = {
  fontSize: 18,
  fontWeight: 800,
  color: "var(--text-primary,#f0f4ff)",
  lineHeight: 1.1,
};
const fsLabel = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "rgba(130,145,185,0.45)",
};

/* ── UserList Modal (followers / following) ──────────────────── */
function UserListModal({ username, mode, onClose }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchFn = mode === "followers" ? getFollowers : getFollowing;

  useEffect(() => {
    setLoading(true);
    fetchFn(username, page)
      .then((r) => {
        setUsers((prev) =>
          page === 1 ? r.data.users : [...prev, ...r.data.users],
        );
        setTotal(r.data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username, mode, page]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 360,
          maxHeight: 520,
          background: "rgba(10,14,22,0.99)",
          border: "1px solid rgba(100,120,175,0.2)",
          borderRadius: 18,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
          animation: "modalIn 0.2s cubic-bezier(0.34,1.3,0.64,1) both",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(100,120,175,0.1)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary,#f0f4ff)",
            }}
          >
            {mode === "followers"
              ? `${total} Người theo dõi`
              : `${total} Đang theo dõi`}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "rgba(130,145,185,0.5)",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                onClose();
                navigate(`/u/${u.username}`);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 20px",
                background: "none",
                border: "none",
                cursor: "pointer",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.04)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(229,9,20,0.15)",
                  border: "1px solid rgba(229,9,20,0.2)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {u.avatar_url ? (
                  <img
                    src={u.avatar_url}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 16 }}>
                    {u.avatar || (u.username?.[0]?.toUpperCase() ?? "?")}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "var(--text-primary,#f0f4ff)",
                }}
              >
                @{u.username}
              </span>
            </button>
          ))}
          {!loading && users.length < total && (
            <button
              onClick={() => setPage((p) => p + 1)}
              style={{
                width: "100%",
                padding: "10px 0",
                background: "none",
                border: "none",
                color: "rgba(130,145,185,0.5)",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Xem thêm
            </button>
          )}
          {loading && (
            <div
              style={{ display: "flex", justifyContent: "center", padding: 24 }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  border: "2px solid rgba(255,255,255,0.1)",
                  borderTop: "2px solid var(--red,#e50914)",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }}
              />
            </div>
          )}
          {!loading && users.length === 0 && (
            <p
              style={{
                textAlign: "center",
                fontSize: 13,
                color: "rgba(130,145,185,0.4)",
                padding: "28px 0",
              }}
            >
              {mode === "followers"
                ? "Chưa có người theo dõi"
                : "Chưa theo dõi ai"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Social Feed Card ────────────────────────────────────────── */
function FeedCard({ item }) {
  const [hov, setHov] = useState(false);
  function timeAgo(iso) {
    if (!iso) return "";
    const d = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (d < 60) return "vừa xong";
    if (d < 3600) return `${Math.floor(d / 60)} phút trước`;
    if (d < 86400) return `${Math.floor(d / 3600)} giờ trước`;
    return `${Math.floor(d / 86400)} ngày trước`;
  }
  return (
    <Link to={`/movie/${item.movie_id}`} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          padding: "12px 16px",
          borderRadius: 12,
          background: hov
            ? "rgba(255,255,255,0.04)"
            : "rgba(255,255,255,0.016)",
          border: "1px solid rgba(100,120,175,0.1)",
          marginBottom: 8,
          transition: "background 0.15s",
          cursor: "pointer",
        }}
      >
        {/* Poster */}
        <div
          style={{
            width: 44,
            height: 62,
            borderRadius: 7,
            overflow: "hidden",
            flexShrink: 0,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(100,120,175,0.1)",
          }}
        >
          {item.poster ? (
            <img
              src={item.poster}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              loading="lazy"
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              🎬
            </div>
          )}
        </div>
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary,#f0f4ff)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.title}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link
              to={`/u/${item.user.username}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "rgba(229,9,20,0.8)",
                textDecoration: "none",
              }}
            >
              @{item.user.username}
            </Link>
            <span style={{ fontSize: 11, color: "rgba(130,145,185,0.45)" }}>
              {item.is_watched ? "đã xem" : "muốn xem"}
            </span>
          </div>
          <p
            style={{
              margin: "3px 0 0",
              fontSize: 10.5,
              color: "rgba(130,145,185,0.35)",
            }}
          >
            {timeAgo(item.added_at)}
          </p>
        </div>
        {/* Status badge */}
        <div style={{ fontSize: 16, flexShrink: 0 }}>
          {item.is_watched ? "✅" : "🔖"}
        </div>
      </div>
    </Link>
  );
}

/* ── Social Feed Section ─────────────────────────────────────── */
function SocialFeedSection() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSocialFeed(1)
      .then((r) => {
        setItems(r.data.items);
        setHasMore(r.data.has_more);
        setPage(1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadMore = async () => {
    const next = page + 1;
    setLoading(true);
    try {
      const r = await getSocialFeed(next);
      setItems((prev) => [...prev, ...r.data.items]);
      setHasMore(r.data.has_more);
      setPage(next);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  if (!loading && items.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <p style={{ fontSize: 32, margin: "0 0 10px" }}>👥</p>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "rgba(140,155,195,0.5)",
            margin: "0 0 6px",
          }}
        >
          Feed trống
        </p>
        <p style={{ fontSize: 12, color: "rgba(130,145,185,0.35)", margin: 0 }}>
          Theo dõi bạn bè để xem phim họ đang thêm vào đây
        </p>
      </div>
    );
  }

  return (
    <div>
      {items.map((item, i) => (
        <FeedCard key={`${item.user.id}-${item.movie_id}-${i}`} item={item} />
      ))}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px 0",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(100,120,175,0.12)",
            borderRadius: 10,
            color: "rgba(160,175,210,0.6)",
            fontSize: 12,
            cursor: "pointer",
            marginTop: 4,
            fontFamily: "var(--font-body,'DM Sans',sans-serif)",
          }}
        >
          {loading ? "Đang tải..." : "Xem thêm"}
        </button>
      )}
      {loading && items.length === 0 && (
        <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
          <div
            style={{
              width: 24,
              height: 24,
              border: "2px solid rgba(255,255,255,0.08)",
              borderTop: "2px solid var(--red,#e50914)",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN
════════════════════════════════════════════ */
export default function PublicProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [entered, setEntered] = useState(false);
  const [listMode, setListMode] = useState(null); // "followers" | "following" | null
  const [activeTab, setActiveTab] = useState("watchlist"); // "watchlist" | "feed"

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setEntered(false);
    getPublicProfile(username)
      .then((r) => {
        setProfile(r.data);
        setTimeout(() => setEntered(true), 60);
      })
      .catch((err) => {
        if (err?.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [username]);

  /* ── Loading skeleton ── */
  if (loading)
    return (
      <div style={s.page}>
        <Navbar />
        <div style={{ ...s.center, gap: 16 }}>
          <div style={s.spinner} />
          <span style={{ color: "rgba(140,155,195,0.4)", fontSize: 13 }}>
            Đang tải...
          </span>
        </div>
        <style>{css}</style>
      </div>
    );

  /* ── 404 ── */
  if (notFound || !profile)
    return (
      <div style={s.page}>
        <Navbar />
        <div style={s.center}>
          <div
            style={{ fontSize: 64, marginBottom: 20, filter: "grayscale(0.3)" }}
          >
            🎬
          </div>
          <h2
            style={{
              color: "var(--text-primary,#f0f4ff)",
              margin: "0 0 10px",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            Không tìm thấy người dùng
          </h2>
          <p
            style={{
              color: "rgba(140,155,195,0.45)",
              fontSize: 14,
              margin: "0 0 28px",
            }}
          >
            <strong style={{ color: "rgba(229,9,20,0.7)" }}>@{username}</strong>{" "}
            không tồn tại hoặc đã bị xoá.
          </p>
          <button onClick={() => navigate(-1)} style={s.backBtn}>
            ← Quay lại
          </button>
        </div>
        <style>{css}</style>
      </div>
    );

  const { stats, recent_movies } = profile;
  const completePct = fmtPct(stats.watched, stats.total);

  return (
    <div style={s.page}>
      <Navbar />

      {/* ════ HERO ════ */}
      <div style={s.hero}>
        {/* Backgrounds */}
        <div style={s.heroBg} />
        <div
          style={{
            ...s.heroGlow,
            opacity: entered ? 1 : 0,
            transition: "opacity 1s ease 0.3s",
          }}
        />
        {/* Subtle grid */}
        <div style={s.heroGrid} />

        <div
          style={{
            ...s.heroInner,
            opacity: entered ? 1 : 0,
            transform: entered ? "translateY(0)" : "translateY(20px)",
            transition:
              "opacity 0.5s ease, transform 0.55s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* Avatar ring */}
          <div style={s.avatarRing}>
            <div style={s.avatarCircle}>
              <Avatar profile={profile} size={90} />
            </div>
          </div>

          {/* Info */}
          <div style={s.heroInfo}>
            <div style={s.badge}>✦ Thành viên Filmverse</div>
            <h1 style={s.heroName}>{profile.username}</h1>
            {profile.bio && (
              <p style={s.heroBio}>
                <span style={{ opacity: 0.4 }}>"</span>
                {profile.bio}
                <span style={{ opacity: 0.4 }}>"</span>
              </p>
            )}
            {/* Follow stats + button */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                marginTop: 14,
                flexWrap: "wrap",
              }}
            >
              <FollowStats
                username={username}
                onOpenList={(mode) => setListMode(mode)}
              />
              <FollowButton username={username} isOwnProfile={isOwnProfile} />
            </div>
          </div>

          {/* Stats inline (desktop) */}
          <div style={s.heroStats}>
            {[
              { v: stats.total, label: "Đã lưu", color: "#60a5fa", icon: "🎬" },
              {
                v: stats.watched,
                label: "Đã xem",
                color: "#4ade80",
                icon: "✓",
              },
              {
                v: completePct,
                label: "Hoàn thành",
                color: "#f5c518",
                icon: "%",
              },
            ].map(({ v, label, color, icon }) => (
              <StatCard
                key={label}
                value={v}
                label={label}
                color={color}
                icon={icon}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ════ BODY ════ */}
      <div
        style={{
          ...s.body,
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.5s ease 0.15s, transform 0.5s ease 0.15s",
        }}
      >
        {/* ── Tab bar ── */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 28,
            borderBottom: "1px solid rgba(100,120,175,0.1)",
            paddingBottom: 0,
          }}
        >
          {[
            { key: "watchlist", label: "📽 Watchlist" },
            { key: "feed", label: "👥 Feed bạn bè" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "9px 18px",
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === tab.key
                    ? "2px solid var(--red,#e50914)"
                    : "2px solid transparent",
                color:
                  activeTab === tab.key
                    ? "var(--text-primary,#f0f4ff)"
                    : "rgba(130,145,185,0.5)",
                fontSize: 13,
                fontWeight: activeTab === tab.key ? 700 : 500,
                cursor: "pointer",
                fontFamily: "var(--font-body,'DM Sans',sans-serif)",
                transition: "all 0.15s",
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Watchlist ── */}
        {activeTab === "watchlist" && (
          <div>
            <div style={s.grid}>
              {/* ── Thể loại yêu thích ── */}
              {stats.top_genres?.length > 0 && (
                <section style={s.card}>
                  <h2 style={s.sectionTitle}>
                    <span style={s.sectionDot} />
                    Thể loại yêu thích
                  </h2>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    {stats.top_genres.map((g, i) => {
                      const pct = Math.round(
                        (g.count / (stats.top_genres[0]?.count || 1)) * 100,
                      );
                      const color = GENRE_COLORS[i] || "#60a5fa";
                      return (
                        <div key={g.genre_id}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 7,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background: color,
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "rgba(210,220,245,0.85)",
                                }}
                              >
                                {g.genre_name}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: 11,
                                color: "rgba(130,145,185,0.45)",
                                fontWeight: 500,
                              }}
                            >
                              {g.count} phim
                            </span>
                          </div>
                          <div
                            style={{
                              height: 5,
                              background: "rgba(255,255,255,0.05)",
                              borderRadius: 99,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                borderRadius: 99,
                                background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                                width: entered ? `${pct}%` : "0%",
                                transition: `width 1.1s cubic-bezier(0.4,0,0.2,1) ${0.3 + i * 0.08}s`,
                                boxShadow: `0 0 10px ${color}55`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ── Phim gần nhất ── */}
              {recent_movies?.length > 0 && (
                <section style={s.card}>
                  <h2 style={s.sectionTitle}>
                    <span style={s.sectionDot} />
                    Xem gần đây
                  </h2>
                  {/* Grid đồng đều — mỗi card tự giữ aspect-ratio 2:3 */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 10,
                    }}
                  >
                    {recent_movies.map((m, i) => (
                      <div
                        key={m.movie_id}
                        style={{
                          opacity: entered ? 1 : 0,
                          transform: entered
                            ? "translateY(0)"
                            : "translateY(10px)",
                          transition: `opacity 0.4s ease ${0.2 + i * 0.06}s, transform 0.4s ease ${0.2 + i * 0.06}s`,
                        }}
                      >
                        <MovieCard movie={m} />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Watchlist link */}
            <div style={{ marginTop: 32, textAlign: "center" }}>
              <p
                style={{
                  fontSize: 12,
                  color: "rgba(130,145,185,0.35)",
                  marginBottom: 8,
                }}
              >
                Muốn xem toàn bộ watchlist?
              </p>
            </div>
          </div>
        )}

        {/* ── Tab: Feed bạn bè ── */}
        {activeTab === "feed" && <SocialFeedSection />}
      </div>

      {/* ── Modal followers/following ── */}
      {listMode && (
        <UserListModal
          username={username}
          mode={listMode}
          onClose={() => setListMode(null)}
        />
      )}

      <style>{css}</style>
    </div>
  );
}

/* ── Styles ── */
const s = {
  page: {
    background: "var(--bg-page,#080b0f)",
    minHeight: "100vh",
    color: "var(--text-primary,#f0f4ff)",
    fontFamily: "var(--font-body,'DM Sans',sans-serif)",
    paddingTop: 60,
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: 12,
    padding: 24,
  },

  /* Hero */
  hero: {
    position: "relative",
    overflow: "hidden",
    padding: "clamp(32px,5vh,64px) clamp(20px,6vw,72px)",
    borderBottom: "1px solid rgba(100,120,175,0.1)",
    minHeight: 200,
  },
  heroBg: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(140deg,rgba(229,9,20,0.09) 0%,rgba(6,9,16,0.97) 45%,rgba(30,50,120,0.06) 100%)",
  },
  heroGlow: {
    position: "absolute",
    top: -120,
    left: -80,
    width: 560,
    height: 560,
    borderRadius: "50%",
    pointerEvents: "none",
    background: "radial-gradient(circle,rgba(229,9,20,0.1) 0%,transparent 60%)",
  },
  heroGrid: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)",
    backgroundSize: "60px 60px",
  },
  heroInner: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    gap: "clamp(16px,3vw,40px)",
    flexWrap: "wrap",
  },
  avatarRing: {
    width: 108,
    height: 108,
    flexShrink: 0,
    borderRadius: "50%",
    padding: 3,
    background:
      "linear-gradient(135deg,rgba(229,9,20,0.8) 0%,rgba(80,100,240,0.4) 100%)",
    boxShadow: "0 0 0 1px rgba(229,9,20,0.2), 0 12px 40px rgba(229,9,20,0.25)",
  },
  avatarCircle: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background: "rgba(10,14,24,0.98)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroInfo: { flex: 1, minWidth: 180 },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.16em",
    color: "rgba(245,197,24,0.75)",
    textTransform: "uppercase",
    background: "rgba(245,197,24,0.06)",
    border: "1px solid rgba(245,197,24,0.15)",
    borderRadius: 99,
    padding: "3px 10px",
    marginBottom: 10,
  },
  heroName: {
    margin: "0 0 7px",
    fontSize: "clamp(24px,4vw,46px)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "var(--text-primary,#f0f4ff)",
    lineHeight: 1.05,
  },
  heroBio: {
    margin: 0,
    fontSize: 13.5,
    lineHeight: 1.65,
    color: "rgba(175,190,225,0.6)",
    fontStyle: "italic",
    maxWidth: 400,
  },
  heroStats: {
    display: "flex",
    gap: 8,
    marginLeft: "auto",
    flexWrap: "wrap",
    alignSelf: "flex-end",
  },

  /* Body */
  body: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "36px clamp(20px,5vw,64px) 80px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 24,
    alignItems: "start",
  },
  card: {
    background: "rgba(255,255,255,0.016)",
    border: "1px solid rgba(100,120,175,0.1)",
    borderRadius: 18,
    padding: "24px 26px",
  },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "0 0 20px",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "rgba(140,155,195,0.5)",
  },
  sectionDot: {
    display: "inline-block",
    width: 3,
    height: 16,
    borderRadius: 2,
    background: "var(--red,#e50914)",
    flexShrink: 0,
  },

  backBtn: {
    padding: "11px 26px",
    borderRadius: 10,
    border: "1px solid rgba(100,120,175,0.2)",
    background: "rgba(255,255,255,0.03)",
    color: "rgba(160,175,210,0.7)",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s",
  },
  spinner: {
    width: 30,
    height: 30,
    border: "2px solid rgba(255,255,255,0.06)",
    borderTop: "2px solid var(--red,#e50914)",
    borderRadius: "50%",
    animation: "spin 0.75s linear infinite",
  },
};

const css = `
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
  @media (max-width: 640px) {
    .hero-stats { display: none !important; }
  }
`;

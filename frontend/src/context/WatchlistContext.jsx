import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { getWatchlist } from "../api/movieApi";
import { useAuth } from "./AuthContext";

const WatchlistContext = createContext({
  savedIds: new Set(),
  addToSaved: () => {},
  removeFromSaved: () => {},
  refresh: () => {},
});

export function WatchlistProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const [savedIds, setSavedIds] = useState(new Set());

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setSavedIds(new Set());
      return;
    }
    try {
      const r = await getWatchlist();
      const ids = new Set((r.data || []).map((m) => m.movie_id));
      setSavedIds(ids);
    } catch {
      /* silent */
    }
  }, [isLoggedIn]);

  // Load khi login/logout
  useEffect(() => {
    refresh();
  }, [refresh]);

  const addToSaved = useCallback(
    (id) => setSavedIds((prev) => new Set([...prev, id])),
    [],
  );
  const removeFromSaved = useCallback(
    (id) =>
      setSavedIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      }),
    [],
  );

  return (
    <WatchlistContext.Provider
      value={{ savedIds, addToSaved, removeFromSaved, refresh }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}

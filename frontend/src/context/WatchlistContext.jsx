import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { getWatchlist, getCollections } from "../api/movieApi";
import { useAuth } from "./AuthContext";

const WatchlistContext = createContext({
  savedIds: new Set(),
  collections: [],
  addToSaved: () => {},
  removeFromSaved: () => {},
  refresh: () => {},
});

export function WatchlistProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const [savedIds, setSavedIds] = useState(new Set());
  const [collections, setCollections] = useState([]);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setSavedIds(new Set());
      setCollections([]);
      return;
    }
    try {
      const [wlRes, colRes] = await Promise.all([
        getWatchlist(),
        getCollections(),
      ]);
      const ids = new Set((wlRes.data || []).map((m) => m.movie_id));
      setSavedIds(ids);
      setCollections(colRes.data || []);
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
      value={{ savedIds, collections, addToSaved, removeFromSaved, refresh }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}

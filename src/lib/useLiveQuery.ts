import { useEffect, useState } from "react";
import { onSnapshot, Query, DocumentData } from "firebase/firestore";

/**
 * Subscribes to a Firestore query and keeps React state in sync in realtime.
 *
 * `factory` returns the query (or null to subscribe to nothing). It is
 * re-run whenever `deps` change, which avoids the classic bug of building a
 * new query object on every render and re-subscribing in a loop.
 *
 * Results are sorted in JS rather than with orderBy() so that the app does
 * not need composite Firestore indexes for the where + orderBy combinations.
 */
export function useLiveQuery<T extends { id: string }>(
  factory: () => Query<DocumentData> | null,
  deps: unknown[],
  sort?: (a: T, b: T) => number
): { data: T[]; loading: boolean; error: string | null } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = factory();
    if (!q) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
        setData(sort ? [...rows].sort(sort) : rows);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Firestore subscription failed:", err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}

/** Newest first. */
export const byNewest = (a: { createdAt?: number }, b: { createdAt?: number }) =>
  (b.createdAt || 0) - (a.createdAt || 0);

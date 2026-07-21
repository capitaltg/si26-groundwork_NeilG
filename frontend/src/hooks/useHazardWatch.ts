import { useEffect, useState } from "react";
import type { HazardWatchRow } from "../types";

export function useHazardWatch(stateAbbr: string) {
  const [rows, setRows] = useState<HazardWatchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stateAbbr) return;
    setLoading(true);
    setError(null);
    fetch(`http://127.0.0.1:8000/api/state/${stateAbbr}/hazard-watch`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((data) => setRows(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [stateAbbr]);

  return { rows, loading, error };
}

import { useEffect, useState } from "react";
import type { GhgEmitter } from "../types";

export function useGhgEmitters(stateAbbr: string) {
  const [emitters, setEmitters] = useState<GhgEmitter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stateAbbr) return;
    setLoading(true);
    setError(null);
    fetch(`http://127.0.0.1:8000/api/state/${stateAbbr}/ghg-emitters`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((data) => setEmitters(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [stateAbbr]);

  return { emitters, loading, error };
}

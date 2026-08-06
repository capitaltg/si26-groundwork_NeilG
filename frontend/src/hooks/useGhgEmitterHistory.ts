import { useEffect, useState } from "react";
import type { GhgEmitterHistory } from "../types";

export function useGhgEmitterHistory(facilityId: number | null) {
  const [data, setData] = useState<GhgEmitterHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (facilityId === null) return;
    setLoading(true);
    setError(null);
    fetch(`http://127.0.0.1:8000/api/ghg-emitter/${facilityId}/history`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [facilityId]);

  return { data, loading, error };
}

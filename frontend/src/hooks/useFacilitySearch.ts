import { useEffect, useState } from "react";
import type { FacilitySearchResult } from "../types";

export function useFacilitySearch(stateAbbr: string) {
  const [facilities, setFacilities] = useState<FacilitySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stateAbbr) return;
    setLoading(true);
    setError(null);
    fetch(`http://127.0.0.1:8000/api/state/${stateAbbr}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((data) => setFacilities(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [stateAbbr]);

  return { facilities, loading, error };
}

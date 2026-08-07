import { useState } from "react";
import type { PropertyOverviewResult } from "../types";

export function usePropertyOverview() {
  const [result, setResult] = useState<PropertyOverviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  function search(address: string, radius: number) {
    setLoading(true);
    setError(null);
    setSearched(true);
    const params = new URLSearchParams({ address, radius: String(radius) });
    fetch(`http://127.0.0.1:8000/api/property-overview?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((data) => setResult(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  return { result, loading, error, searched, search };
}

import { useState } from "react";
import type { SiteSearchFacility } from "../types";

interface SiteSearchParams {
  address?: string;
  state?: string;
  radius: number;
  limit: number;
}

export function useSiteSearch() {
  const [facilities, setFacilities] = useState<SiteSearchFacility[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  function search({ address, state, radius, limit }: SiteSearchParams) {
    setLoading(true);
    setError(null);
    setSearched(true);
    const params = new URLSearchParams({ radius: String(radius), limit: String(limit) });
    if (address) params.set("address", address);
    if (state) params.set("state", state);
    fetch(`http://127.0.0.1:8000/api/site-search?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((data) => setFacilities(data.facilities))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  return { facilities, loading, error, searched, search };
}

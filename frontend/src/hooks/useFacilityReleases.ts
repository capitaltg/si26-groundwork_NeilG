import { useEffect, useState } from "react";
import type { Facility, Release } from "../types";

export function useFacilityReleases(facilityId: string) {
  const [facility, setFacility] = useState<Facility | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`http://127.0.0.1:8000/api/facility/${facilityId}/releases`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setFacility(data.facility);
        setReleases(data.releases);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [facilityId]);

  return { facility, releases, loading, error };
}

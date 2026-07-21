import { useEffect, useState } from "react";
import type { FacilityCompliance } from "../types";

export function useFacilityCompliance(facilityId: string) {
  const [compliance, setCompliance] = useState<FacilityCompliance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`http://127.0.0.1:8000/api/facility/${facilityId}/compliance`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((data) => setCompliance(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [facilityId]);

  return { compliance, loading, error };
}

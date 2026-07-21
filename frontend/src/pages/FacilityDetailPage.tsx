import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import FacilityCard from "../components/FacilityCard";
import ReleaseTable from "../components/ReleaseTable";
import ReleaseChart from "../components/ReleaseChart";
import ComplianceSummary from "../components/ComplianceSummary";
import { useFacilityReleases } from "../hooks/useFacilityReleases";

function FacilityDetailPage() {
  const { id } = useParams();
  const { facility, releases, loading, error } = useFacilityReleases(id ?? "");
  const [selectedChemical, setSelectedChemical] = useState<string | null>(null);

  useEffect(() => {
    if (selectedChemical || releases.length === 0) return;

    const totalsByChemical: Record<string, number> = {};
    for (const release of releases) {
      const total = release.air_release + release.water_release + release.land_release;
      totalsByChemical[release.chemical] = (totalsByChemical[release.chemical] || 0) + total;
    }

    const defaultChemical = Object.keys(totalsByChemical).reduce((best, chemical) =>
      totalsByChemical[chemical] > totalsByChemical[best] ? chemical : best
    );

    setSelectedChemical(defaultChemical);
  }, [releases, selectedChemical]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p className="text-danger">Error loading facility: {error}</p>;
  }

  if (!facility || !facility.name) {
    return <p>Facility not found.</p>;
  }

  const chemicals = Array.from(new Set(releases.map((release) => release.chemical))).sort();

  return (
    <div>
      <FacilityCard facility={facility} />
      <ComplianceSummary facilityId={id ?? ""} />
      {selectedChemical && (
        <>
          <div className="mb-2">
            <label>
              Pollutant:{" "}
              <select
                className="form-select d-inline-block w-auto"
                value={selectedChemical}
                onChange={(e) => setSelectedChemical(e.target.value)}
              >
                {chemicals.map((chemical) => (
                  <option key={chemical} value={chemical}>
                    {chemical}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ReleaseChart releases={releases} selectedChemical={selectedChemical} />
        </>
      )}
      <ReleaseTable releases={releases} />
    </div>
  );
}

export default FacilityDetailPage;

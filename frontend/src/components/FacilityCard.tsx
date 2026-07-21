import type { Facility } from "../types";

interface FacilityCardProps {
  facility: Facility;
}

function FacilityCard({ facility }: FacilityCardProps) {
  return (
    <div className="card mb-3" style={{ maxWidth: "18rem" }}>
      <div className="card-body">
        <h5 className="card-title">{facility.name}</h5>
        <p className="card-text">
          {facility.address}, {facility.city}, {facility.state} {facility.zip}
        </p>
        <p className="card-text">
          County: {facility.county} · Parent company: {facility.parent_company}
        </p>
        <p className="card-text">
          Lat/Long: {facility.latitude}, {facility.longitude}
        </p>
      </div>
    </div>
  );
}

export default FacilityCard;

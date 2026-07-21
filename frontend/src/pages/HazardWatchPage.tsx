import { useState } from "react";
import { Link } from "react-router-dom";
import { useHazardWatch } from "../hooks/useHazardWatch";

function HazardWatchPage() {
  const [inputValue, setInputValue] = useState("MD");
  const [submittedState, setSubmittedState] = useState("MD");
  const { rows, loading, error } = useHazardWatch(submittedState);

  return (
    <div>
      <h1>Hazard Watch</h1>
      <div className="d-flex gap-2 mb-3">
        <input
          className="form-control"
          style={{ maxWidth: "6rem" }}
          value={inputValue}
          maxLength={2}
          onChange={(e) => setInputValue(e.target.value.toUpperCase())}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setSubmittedState(inputValue)}
        >
          Search hazardous releases
        </button>
      </div>
      {loading && <p>Loading hazardous releases...</p>}
      {error && <p className="text-danger">Error loading hazardous releases: {error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p>No hazardous releases found for "{submittedState}".</p>
      )}
      {!loading && !error && rows.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Facility</th>
              <th>Chemical</th>
              <th>Year</th>
              <th>Total Release (lbs)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.facility_id}-${row.chem_id}-${row.year}`}>
                <td>
                  <Link to={`/facility/${row.facility_id}`}>{row.facility_name}</Link>
                </td>
                <td>{row.chemical}</td>
                <td>{row.year}</td>
                <td>{row.total_release}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default HazardWatchPage;

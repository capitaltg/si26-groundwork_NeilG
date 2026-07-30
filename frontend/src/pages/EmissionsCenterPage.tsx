import { useState } from "react";
import { useGhgEmitters } from "../hooks/useGhgEmitters";

function EmissionsCenterPage() {
  const [inputValue, setInputValue] = useState("MD");
  const [submittedState, setSubmittedState] = useState("MD");
  const { emitters, loading, error } = useGhgEmitters(submittedState);

  return (
    <div>
      <h1>Emissions Center</h1>
      <p>
        Top greenhouse gas emitters by state, from EPA's Greenhouse Gas Reporting
        Program (GHGRP) — total CO2-equivalent emissions across all reported gas
        types, for the most recent year each state has data for.
      </p>
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
          Search top emitters
        </button>
      </div>
      {loading && <p>Loading emissions data...</p>}
      {error && <p className="text-danger">Error loading emissions data: {error}</p>}
      {!loading && !error && emitters.length === 0 && (
        <p>No GHG emissions data found for "{submittedState}".</p>
      )}
      {!loading && !error && emitters.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Facility</th>
              <th>City</th>
              <th>Year</th>
              <th>Total CO2e (metric tons)</th>
            </tr>
          </thead>
          <tbody>
            {emitters.map((emitter) => (
              <tr key={emitter.facility_id}>
                <td>{emitter.facility_name}</td>
                <td>{emitter.city}</td>
                <td>{emitter.year}</td>
                <td>{emitter.total_co2e.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default EmissionsCenterPage;

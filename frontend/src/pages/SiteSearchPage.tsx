import { useState } from "react";
import type { FormEvent } from "react";
import { useSiteSearch } from "../hooks/useSiteSearch";

const PROGRAM_LABELS: Record<string, string> = {
  TRI: "Toxic Releases",
  RCRA: "Hazardous Waste",
  CAA: "Air Quality",
  CWA: "Water Discharge",
  SDWA: "Drinking Water",
  SUPERFUND: "Superfund Site",
  BROWNFIELD: "Brownfields Property",
};

const PROGRAM_TOOLTIPS: Record<string, string> = {
  TRI: "Toxics Release Inventory — self-reported chemical releases",
  RCRA: "Resource Conservation and Recovery Act — hazardous waste handling",
  CAA: "Clean Air Act — air emissions permitting and compliance",
  CWA: "Clean Water Act — water discharge permitting and compliance",
  SDWA: "Safe Drinking Water Act — public drinking water systems",
  SUPERFUND: "EPA Superfund program — a known, serious hazardous waste contamination site",
  BROWNFIELD: "Brownfields program — a property being assessed or redeveloped after past contamination",
};

function ComplianceBadge({
  status,
  significantViolation,
}: {
  status: string | null;
  significantViolation: boolean;
}) {
  if (significantViolation) {
    return <span className="badge bg-danger">⚠ Significant Violation</span>;
  }
  if (status && status !== "No Violation Identified") {
    return <span className="badge bg-warning text-dark">{status}</span>;
  }
  return <span className="badge bg-success">{status ?? "No Violation Identified"}</span>;
}

function SiteSearchPage() {
  const [address, setAddress] = useState("");
  const [state, setState] = useState("");
  const [radius, setRadius] = useState(1);
  const [limit, setLimit] = useState(100);
  const { facilities, loading, error, searched, search } = useSiteSearch();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!address.trim() && !state.trim()) return;
    search({ address: address.trim(), state: state.trim().toUpperCase(), radius, limit });
  }

  return (
    <div>
      <h1>Site Search</h1>
      <p>
        Find EPA-regulated facilities near a property — or across a whole state —
        spanning every environmental program, not just TRI reporters.
      </p>
      <form onSubmit={handleSubmit} className="d-flex gap-2 mb-2 flex-wrap align-items-center">
        <input
          className="form-control"
          style={{ maxWidth: "20rem" }}
          placeholder="Street address, city, state, zip"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <select
          className="form-select"
          style={{ maxWidth: "10rem" }}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
        >
          <option value={0.25}>0.25 miles</option>
          <option value={0.5}>0.5 miles</option>
          <option value={1}>1 mile</option>
          <option value={3}>3 miles</option>
          <option value={5}>5 miles</option>
        </select>
        <span>or</span>
        <input
          className="form-control"
          style={{ maxWidth: "6rem" }}
          placeholder="State (e.g. MD)"
          maxLength={2}
          value={state}
          onChange={(e) => setState(e.target.value.toUpperCase())}
        />
        <span>Show up to</span>
        <select
          className="form-select"
          style={{ maxWidth: "8rem" }}
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
        >
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={250}>250</option>
          <option value={500}>500</option>
        </select>
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>
      <p className="text-muted" style={{ fontSize: "0.9rem" }}>
        Enter an address to search a specific radius, or just a state to search broadly
        (no radius needed).
      </p>
      {loading && <p>Searching...</p>}
      {error && <p className="text-danger">Error: {error}</p>}
      {!loading && !error && searched && facilities.length === 0 && (
        <p>No regulated facilities found for that search.</p>
      )}
      {!loading && !error && facilities.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Facility</th>
              <th>City</th>
              <th>State</th>
              <th>Programs</th>
              <th>Compliance Status</th>
            </tr>
          </thead>
          <tbody>
            {facilities.map((facility) => (
              <tr key={facility.registry_id}>
                <td>{facility.name}</td>
                <td>{facility.city}</td>
                <td>{facility.state}</td>
                <td>
                  {facility.programs.map((program) => (
                    <span
                      key={program}
                      className="badge bg-secondary me-1"
                      title={PROGRAM_TOOLTIPS[program] ?? program}
                    >
                      {PROGRAM_LABELS[program] ?? program}
                    </span>
                  ))}
                </td>
                <td>
                  <ComplianceBadge
                    status={facility.compliance_status}
                    significantViolation={facility.significant_violation}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default SiteSearchPage;

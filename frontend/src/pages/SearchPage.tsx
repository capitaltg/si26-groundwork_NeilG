import { useState } from "react";
import { Link } from "react-router-dom";
import { useFacilitySearch } from "../hooks/useFacilitySearch";

function SearchPage() {
  const [inputValue, setInputValue] = useState("MD");
  const [submittedState, setSubmittedState] = useState("MD");
  const { facilities, loading, error } = useFacilitySearch(submittedState);

  return (
    <div>
      <h1>TRI Facility Explorer</h1>
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
          Search facilities
        </button>
      </div>
      {loading && <p>Loading facilities...</p>}
      {error && <p className="text-danger">Error loading facilities: {error}</p>}
      {!loading && !error && facilities.length === 0 && (
        <p>No facilities found for "{submittedState}".</p>
      )}
      {!loading && !error && facilities.length > 0 && (
        <ul className="list-group">
          {facilities.map((facility) => (
            <li key={facility.tri_facility_id} className="list-group-item list-group-item-action">
              <Link to={`/facility/${facility.tri_facility_id}`}>
                {facility.facility_name} — {facility.city_name}, {facility.state_abbr}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SearchPage;

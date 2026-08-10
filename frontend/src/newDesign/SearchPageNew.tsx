import { useState } from "react";
import { Link } from "react-router-dom";
import { useFacilitySearch } from "../hooks/useFacilitySearch";
import { colors, fonts } from "./theme";
import Spinner from "./Spinner";

function SearchPageNew() {
  const [inputValue, setInputValue] = useState("MD");
  const [submittedState, setSubmittedState] = useState("MD");
  const { facilities, loading, error } = useFacilitySearch(submittedState);

  return (
    <div style={{ fontFamily: fonts.body, background: colors.background, minHeight: "100vh", padding: "28px" }}>
      <h1 style={{ fontFamily: fonts.heading, fontSize: "36px", fontWeight: 800, color: colors.darkGreen }}>
        TRI Facilities
      </h1>
      <p style={{ fontSize: "16px", color: "#4A574D", margin: "12px 0 22px", maxWidth: "54ch" }}>
        Browse Toxics Release Inventory reporters by state. Select a facility for its full release
        history and compliance record.
      </p>
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "26px" }}>
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.toUpperCase().slice(0, 2))}
          maxLength={2}
          style={{
            width: "88px",
            padding: "12px 16px",
            border: "1.5px solid #E1E4D8",
            borderRadius: "14px",
            fontSize: "16px",
            fontWeight: 700,
            textAlign: "center",
            background: colors.cardBackground,
            color: colors.darkGreen,
            outline: "none",
            letterSpacing: "0.1em",
          }}
        />
        <button
          type="button"
          onClick={() => setSubmittedState(inputValue)}
          style={{
            padding: "12px 24px",
            border: "none",
            borderRadius: "14px",
            background: colors.darkGreen,
            color: colors.background,
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Search facilities
        </button>
        <span style={{ fontSize: "14px", color: colors.mutedText }}>
          state code · showing {facilities.length} facilities
        </span>
      </div>

      {loading && <Spinner />}
      {error && <p style={{ color: colors.dangerText }}>Error loading facilities: {error}</p>}
      {!loading && !error && facilities.length === 0 && (
        <p>No facilities found for "{submittedState}".</p>
      )}
      {!loading && !error && facilities.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: "16px" }}>
          {facilities.map((facility) => (
            <Link
              key={facility.tri_facility_id}
              to={`/facility/${facility.tri_facility_id}`}
              style={{
                display: "block",
                background: colors.cardBackground,
                border: `1.5px solid ${colors.cardBorder}`,
                borderRadius: "20px",
                padding: "18px 20px",
                textDecoration: "none",
              }}
            >
              <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: "18px", color: colors.darkGreen }}>
                {facility.facility_name}
              </div>
              <div style={{ fontSize: "13px", color: colors.mutedText, marginTop: "3px" }}>
                {facility.city_name}, {facility.state_abbr}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchPageNew;

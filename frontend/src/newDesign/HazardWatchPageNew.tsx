import { useState } from "react";
import { Link } from "react-router-dom";
import { useHazardWatch } from "../hooks/useHazardWatch";
import { colors, fonts } from "./theme";

function HazardWatchPageNew() {
  const [inputValue, setInputValue] = useState("MD");
  const [submittedState, setSubmittedState] = useState("MD");
  const { rows, loading, error } = useHazardWatch(submittedState);

  const maxRelease = Math.max(...rows.map((r) => r.total_release), 1);

  return (
    <div style={{ fontFamily: fonts.body, background: colors.background, minHeight: "100vh", padding: "28px" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: colors.dangerBg,
          color: colors.dangerText,
          padding: "6px 14px",
          borderRadius: "999px",
          fontSize: "12.5px",
          fontWeight: 700,
          marginBottom: "14px",
        }}
      >
        ⚠ Persistent Bioaccumulative Toxics
      </div>
      <h1 style={{ fontFamily: fonts.heading, fontSize: "36px", fontWeight: 800, color: colors.darkGreen }}>
        Hazard Watch
      </h1>
      <p style={{ fontSize: "16px", color: "#4A574D", margin: "12px 0 26px", maxWidth: "56ch" }}>
        Every release of an EPA-designated PBT chemical in {submittedState} — the substances that
        don't break down and accumulate up the food chain. Worst offenders first.
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
          Search hazardous releases
        </button>
      </div>

      {loading && <p>Loading hazardous releases...</p>}
      {error && <p style={{ color: colors.dangerText }}>Error loading hazardous releases: {error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p>No hazardous releases found for "{submittedState}".</p>
      )}
      {!loading && !error && rows.length > 0 && (
        <div style={{ background: colors.cardBackground, border: `1px solid ${colors.cardBorder}`, borderRadius: "24px", overflow: "hidden" }}>
          {rows.map((row, i) => (
            <div
              key={`${row.facility_id}-${row.chem_id}-${row.year}`}
              style={{
                display: "grid",
                gridTemplateColumns: "44px 1.4fr 1fr 1.4fr",
                gap: "16px",
                alignItems: "center",
                padding: "18px 22px",
                borderBottom: i === rows.length - 1 ? "none" : "1px solid #EEF0E7",
              }}
            >
              <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: "22px", color: colors.dangerDot }}>
                {i + 1}
              </div>
              <div>
                <Link
                  to={`/facility/${row.facility_id}`}
                  style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: "16px", color: colors.darkGreen, textDecoration: "none" }}
                >
                  {row.facility_name}
                </Link>
                <div
                  style={{
                    fontSize: "12.5px",
                    color: colors.warningText,
                    background: colors.warningBg,
                    display: "inline-block",
                    padding: "2px 9px",
                    borderRadius: "99px",
                    marginTop: "5px",
                    fontWeight: 600,
                  }}
                >
                  {row.chemical}
                </div>
              </div>
              <div style={{ fontSize: "13px", color: colors.mutedText }}>
                Reporting year
                <br />
                <b style={{ color: colors.bodyText, fontSize: "15px" }}>{row.year}</b>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: colors.mutedText, marginBottom: "6px" }}>
                  total release
                  <b style={{ color: colors.darkGreen, fontSize: "14px" }}>{row.total_release.toLocaleString()} lbs</b>
                </div>
                <div style={{ height: "9px", background: "#F0E3E1", borderRadius: "99px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.round((row.total_release / maxRelease) * 100)}%`,
                      height: "100%",
                      background: `linear-gradient(90deg, #E7A08F, ${colors.dangerDot})`,
                      borderRadius: "99px",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HazardWatchPageNew;

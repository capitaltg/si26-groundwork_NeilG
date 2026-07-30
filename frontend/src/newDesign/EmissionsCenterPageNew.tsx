import { useState } from "react";
import { useGhgEmitters } from "../hooks/useGhgEmitters";
import { colors, fonts } from "./theme";

function EmissionsCenterPageNew() {
  const [inputValue, setInputValue] = useState("MD");
  const [submittedState, setSubmittedState] = useState("MD");
  const { emitters, loading, error } = useGhgEmitters(submittedState);

  return (
    <div style={{ fontFamily: fonts.body, background: colors.background, minHeight: "100vh", padding: "28px" }}>
      <h1 style={{ fontFamily: fonts.heading, fontSize: "36px", fontWeight: 800, color: colors.darkGreen }}>
        Emissions Center
      </h1>
      <p style={{ fontSize: "16px", color: "#4A574D", margin: "12px 0 26px", maxWidth: "56ch" }}>
        Top greenhouse gas emitters by state, from EPA's Greenhouse Gas Reporting Program
        (GHGRP) — total CO2-equivalent emissions across all reported gas types, for the most
        recent year each state has data for.
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
          Search top emitters
        </button>
      </div>

      {loading && <p>Loading emissions data...</p>}
      {error && <p style={{ color: colors.dangerText }}>Error loading emissions data: {error}</p>}
      {!loading && !error && emitters.length === 0 && (
        <p>No GHG emissions data found for "{submittedState}".</p>
      )}
      {!loading && !error && emitters.length > 0 && (
        <div style={{ background: colors.cardBackground, border: `1px solid ${colors.cardBorder}`, borderRadius: "24px", overflow: "hidden" }}>
          {emitters.map((emitter, i) => (
            <div
              key={emitter.facility_id}
              style={{
                display: "grid",
                gridTemplateColumns: "44px 1.6fr 1fr 1fr 1.2fr",
                gap: "16px",
                alignItems: "center",
                padding: "18px 22px",
                borderBottom: i === emitters.length - 1 ? "none" : "1px solid #EEF0E7",
              }}
            >
              <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: "22px", color: colors.midGreen }}>
                {i + 1}
              </div>
              <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: "16px", color: colors.darkGreen }}>
                {emitter.facility_name}
              </div>
              <div style={{ fontSize: "14px", color: colors.mutedText }}>{emitter.city}</div>
              <div style={{ fontSize: "14px", color: colors.mutedText }}>{emitter.year}</div>
              <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: "15px", color: colors.darkGreen, textAlign: "right" }}>
                {emitter.total_co2e.toLocaleString()} t CO2e
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default EmissionsCenterPageNew;

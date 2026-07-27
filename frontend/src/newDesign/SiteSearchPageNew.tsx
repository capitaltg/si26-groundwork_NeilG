import { useState } from "react";
import type { FormEvent } from "react";
import { useSiteSearch } from "../hooks/useSiteSearch";
import { PROGRAM_LABELS, PROGRAM_TOOLTIPS } from "../constants/programLabels";
import SiteSearchMapNew from "./SiteSearchMapNew";
import { badgeStyle, tierForFacility, labelForFacility } from "./badge";
import { colors, fonts } from "./theme";

type Mode = "address" | "state";

function SiteSearchPageNew() {
  const [mode, setMode] = useState<Mode>("address");
  const [address, setAddress] = useState("");
  const [state, setState] = useState("");
  const [radius, setRadius] = useState(1);
  const [limit, setLimit] = useState(100);
  const { facilities, latitude, longitude, loading, error, searched, lastSearch, search } =
    useSiteSearch();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === "address" && !address.trim()) return;
    if (mode === "state" && !state.trim()) return;
    search({
      address: mode === "address" ? address.trim() : "",
      state: mode === "state" ? state.trim().toUpperCase() : "",
      radius,
      limit,
    });
  }

  const flaggedCount = facilities.filter((f) => f.significant_violation).length;

  return (
    <div style={{ fontFamily: fonts.body, background: colors.background, minHeight: "100vh", padding: "28px" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "#DCEAD3",
          color: "#256B3A",
          padding: "6px 14px",
          borderRadius: "999px",
          fontSize: "12.5px",
          fontWeight: 600,
          marginBottom: "16px",
        }}
      >
        <span style={{ width: "7px", height: "7px", borderRadius: "99px", background: "#2FB673", display: "inline-block" }} />
        ASTM Phase I radius search · live EPA data
      </div>
      <h1 style={{ fontFamily: fonts.heading, fontSize: "40px", fontWeight: 800, color: colors.darkGreen, maxWidth: "18ch" }}>
        Know what's in the ground before you break it.
      </h1>
      <p style={{ fontSize: "16px", color: "#4A574D", maxWidth: "56ch", margin: "14px 0 24px" }}>
        Search every EPA-regulated facility near a property — across TRI, RCRA, Clean Air &amp;
        Water, Superfund and Brownfields — in one look.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          background: colors.cardBackground,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "26px",
          padding: "20px",
        }}
      >
        <div style={{ display: "inline-flex", gap: "4px", background: "#EDF1E7", padding: "4px", borderRadius: "999px", marginBottom: "16px" }}>
          {(["address", "state"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                border: "none",
                cursor: "pointer",
                padding: "8px 16px",
                borderRadius: "999px",
                fontSize: "13.5px",
                fontWeight: 700,
                background: mode === m ? "#FFFFFF" : "transparent",
                color: mode === m ? colors.darkGreen : colors.mutedText,
              }}
            >
              {m === "address" ? "Near an address" : "Across a state"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
          {mode === "address" ? (
            <>
              <div style={{ flex: 1, minWidth: "280px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: colors.mutedText, marginBottom: "7px" }}>
                  PROPERTY ADDRESS
                </label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, city, state, zip"
                  style={{ width: "100%", padding: "13px 16px", border: "1.5px solid #E1E4D8", borderRadius: "14px", fontSize: "15px", background: "#FAFAF6", color: colors.bodyText, outline: "none" }}
                />
              </div>
              <div style={{ width: "150px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: colors.mutedText, marginBottom: "7px" }}>
                  RADIUS
                </label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  style={{ width: "100%", padding: "13px 14px", border: "1.5px solid #E1E4D8", borderRadius: "14px", fontSize: "15px", background: "#FAFAF6", color: colors.bodyText, outline: "none", cursor: "pointer" }}
                >
                  <option value={0.25}>0.25 miles</option>
                  <option value={0.5}>0.5 miles</option>
                  <option value={1}>1 mile</option>
                  <option value={3}>3 miles</option>
                  <option value={5}>5 miles</option>
                </select>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, minWidth: "280px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: colors.mutedText, marginBottom: "7px" }}>
                STATE CODE
              </label>
              <input
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
                placeholder="MD"
                style={{ width: "110px", padding: "13px 16px", border: "1.5px solid #E1E4D8", borderRadius: "14px", fontSize: "17px", fontWeight: 700, textAlign: "center", letterSpacing: "0.14em", background: "#FAFAF6", color: colors.darkGreen, outline: "none" }}
              />
              <span style={{ fontSize: "13px", color: colors.mutedText, marginLeft: "12px" }}>
                two-letter code · try MD, VA or PA
              </span>
            </div>
          )}
          <div style={{ minWidth: "140px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: colors.mutedText, marginBottom: "7px" }}>
              SHOW UP TO
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={{ width: "100%", padding: "13px 14px", border: "1.5px solid #E1E4D8", borderRadius: "14px", fontSize: "15px", background: "#FAFAF6", color: colors.bodyText, outline: "none", cursor: "pointer" }}
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
            </select>
          </div>
          <button
            type="submit"
            style={{ padding: "13px 30px", border: "none", borderRadius: "14px", background: colors.darkGreen, color: colors.background, fontSize: "15px", fontWeight: 700, cursor: "pointer" }}
          >
            Search
          </button>
        </div>
      </form>

      {loading && <p style={{ marginTop: "20px" }}>Searching...</p>}
      {error && <p style={{ marginTop: "20px", color: colors.dangerText }}>Error: {error}</p>}
      {!loading && !error && searched && facilities.length === 0 && (
        <div style={{ background: colors.cardBackground, border: "1px dashed #CBD4C2", borderRadius: "20px", padding: "32px 24px", textAlign: "center", marginTop: "24px" }}>
          <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: "17px", color: colors.darkGreen }}>
            No regulated sites found
          </div>
          <div style={{ fontSize: "14px", color: colors.mutedText, marginTop: "7px" }}>
            Widen the radius or try another state code.
          </div>
        </div>
      )}

      {!loading && !error && facilities.length > 0 && lastSearch && (
        <>
          <div style={{ display: "flex", gap: "22px", flexWrap: "wrap", alignItems: "center", margin: "30px 0 22px" }}>
            <div style={{ fontSize: "15px", color: "#4A574D" }}>
              <span style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: "26px", color: colors.darkGreen }}>
                {facilities.length}
              </span>{" "}
              regulated sites {lastSearch.address ? `within ${lastSearch.radius} mi` : `in ${lastSearch.state}`}
            </div>
            <div style={{ height: "26px", width: "1px", background: "#D8DCCE" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "14px", color: "#4A574D" }}>
              <span style={{ width: "11px", height: "11px", borderRadius: "99px", background: colors.dangerDot, display: "inline-block" }} />
              <b style={{ color: colors.dangerText }}>{flaggedCount} flagged</b> for violations or contamination
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: "22px", alignItems: "start" }}>
            <SiteSearchMapNew
              latitude={latitude}
              longitude={longitude}
              radius={lastSearch.radius}
              facilities={facilities}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "520px", overflow: "auto", paddingRight: "4px" }}>
              {facilities.map((facility) => {
                const style = badgeStyle(tierForFacility(facility));
                return (
                  <div
                    key={facility.registry_id}
                    style={{ background: colors.cardBackground, border: `1.5px solid ${colors.cardBorder}`, borderRadius: "20px", padding: "18px 20px" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                      <div>
                        <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: "17px", color: colors.darkGreen }}>
                          {facility.name}
                        </div>
                        <div style={{ fontSize: "13px", color: colors.mutedText, marginTop: "2px" }}>
                          {facility.city}, {facility.state}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          background: style.bg,
                          color: style.color,
                          padding: "6px 13px",
                          borderRadius: "999px",
                          fontSize: "12.5px",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span style={{ width: "8px", height: "8px", borderRadius: "99px", background: style.dot, display: "inline-block" }} />
                        {labelForFacility(facility)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "12px" }}>
                      {facility.programs.map((program) => (
                        <span
                          key={program}
                          title={PROGRAM_TOOLTIPS[program] ?? program}
                          style={{ background: "#EDF1E7", color: "#3C5142", padding: "4px 11px", borderRadius: "99px", fontSize: "11.5px", fontWeight: 600 }}
                        >
                          {PROGRAM_LABELS[program] ?? program}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SiteSearchPageNew;

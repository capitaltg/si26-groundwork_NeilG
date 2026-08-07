import { useState } from "react";
import type { FormEvent } from "react";
import { usePropertyOverview } from "../hooks/usePropertyOverview";
import SiteSearchMapNew from "./SiteSearchMapNew";
import { colors, fonts } from "./theme";
import { DetailSection } from "./chipList";
import type { PropertyOverviewResult } from "../types";

function buildNarrative(result: PropertyOverviewResult, radius: number): string[] {
  const sentences: string[] = [];

  const sigCount = result.facilities.filter((f) => f.significant_violation).length;
  const siteCount = result.facilities.filter((f) => f.programs.includes("SUPERFUND") || f.programs.includes("BROWNFIELD")).length;

  sentences.push(
    `Within ${radius} mile${radius === 1 ? "" : "s"} of this address, there ${result.facilities.length === 1 ? "is" : "are"} ${result.facilities.length} EPA-regulated facilit${result.facilities.length === 1 ? "y" : "ies"} on file` +
      (sigCount > 0 ? `, including ${sigCount} with significant compliance violations` : "") +
      (siteCount > 0 ? `${sigCount > 0 ? " and" : ","} ${siteCount} Superfund or Brownfields site${siteCount === 1 ? "" : "s"}` : "") +
      "."
  );

  if (result.water_bodies.length > 0) {
    const names = result.water_bodies.slice(0, 3).map((w) => w.name);
    sentences.push(
      `Nearby, the EPA lists ${result.water_bodies.length} water body${result.water_bodies.length === 1 ? "" : "ies"} as impaired or threatened, including ${names.join(", ")}${result.water_bodies.length > 3 ? ", among others" : ""}.`
    );
  } else {
    sentences.push("No impaired or threatened water bodies are on file within this radius.");
  }

  if (result.critical_habitats.length > 0) {
    const names = result.critical_habitats.slice(0, 3).map((c) => c.common_name);
    sentences.push(
      `This area overlaps designated critical habitat for ${result.critical_habitats.length} threatened or endangered species, including ${names.join(", ")}${result.critical_habitats.length > 3 ? ", among others" : ""}.`
    );
  } else {
    sentences.push("No designated critical habitat for threatened or endangered species overlaps this area.");
  }

  return sentences;
}

function PropertyOverviewPageNew() {
  const [address, setAddress] = useState("");
  const [radius, setRadius] = useState(2);
  const { result, loading, error, searched, search } = usePropertyOverview();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    search(address.trim(), radius);
  }

  return (
    <div style={{ fontFamily: fonts.body, background: colors.background, minHeight: "100vh", padding: "28px" }}>
      <h1 style={{ fontFamily: fonts.heading, fontSize: "36px", fontWeight: 800, color: colors.darkGreen }}>
        Property Overview
      </h1>
      <p style={{ fontSize: "16px", color: "#4A574D", margin: "12px 0 26px", maxWidth: "62ch" }}>
        Enter a home address to see nearby EPA-regulated facilities, impaired or threatened water
        bodies (EPA's Clean Water Act 303(d) list), and any overlapping critical habitat for
        threatened or endangered species.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ background: colors.cardBackground, border: `1px solid ${colors.cardBorder}`, borderRadius: "20px", padding: "18px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "26px" }}
      >
        <div style={{ flex: "1 1 320px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: colors.mutedText, marginBottom: "6px" }}>
            Address
          </label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 1400 Key Highway, Baltimore, MD"
            style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #E1E4D8", borderRadius: "12px", fontSize: "14px", outline: "none" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: colors.mutedText, marginBottom: "6px" }}>
            Radius (miles)
          </label>
          <input
            type="number"
            min={0.5}
            max={10}
            step={0.5}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            style={{ width: "90px", padding: "12px 14px", border: "1.5px solid #E1E4D8", borderRadius: "12px", fontSize: "14px", outline: "none" }}
          />
        </div>
        <button
          type="submit"
          style={{ padding: "12px 24px", border: "none", borderRadius: "12px", background: colors.darkGreen, color: colors.background, fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
        >
          Check property
        </button>
      </form>

      {loading && (
        <p>
          Looking up nearby facilities, water quality, and critical habitat data — this queries
          several live EPA/USFWS sources and can take 10-20 seconds.
        </p>
      )}
      {error && <p style={{ color: colors.dangerText }}>Error loading property overview: {error}</p>}
      {searched && !loading && !error && result && result.latitude === null && (
        <p>Couldn't find that address. Try including city and state.</p>
      )}

      {result && !loading && !error && result.latitude !== null && (
        <>
          <div style={{ background: colors.cardBackground, border: `1px solid ${colors.cardBorder}`, borderRadius: "24px", padding: "24px 26px", marginBottom: "18px" }}>
            <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: colors.bodyText, margin: 0 }}>
              {buildNarrative(result, radius).join(" ")}
            </p>
          </div>

          <div style={{ marginBottom: "18px" }}>
            <SiteSearchMapNew latitude={result.latitude} longitude={result.longitude} radius={radius} facilities={result.facilities} />
          </div>

          <div style={{ background: colors.cardBackground, border: `1px solid ${colors.cardBorder}`, borderRadius: "24px", padding: "24px 26px" }}>
            <DetailSection
              title="Facilities with significant violations"
              count={result.facilities.filter((f) => f.significant_violation).length}
              items={result.facilities.filter((f) => f.significant_violation).map((f) => ({ label: f.name }))}
            />
            <DetailSection
              title="Superfund/Brownfields sites"
              count={result.facilities.filter((f) => f.programs.includes("SUPERFUND") || f.programs.includes("BROWNFIELD")).length}
              items={result.facilities
                .filter((f) => f.programs.includes("SUPERFUND") || f.programs.includes("BROWNFIELD"))
                .map((f) => ({ label: f.name }))}
            />
            <DetailSection
              title="Impaired or threatened water bodies"
              count={result.water_bodies.length}
              items={result.water_bodies.map((w) => ({
                label: `${w.name}${w.on_303d_list ? " · 303(d)" : ""}${w.has_tmdl ? " · TMDL" : ""}`,
              }))}
            />
            <DetailSection
              title="Critical habitat species"
              count={result.critical_habitats.length}
              items={result.critical_habitats.map((c) => ({
                label: c.scientific_name ? `${c.common_name} (${c.scientific_name})` : c.common_name,
              }))}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default PropertyOverviewPageNew;

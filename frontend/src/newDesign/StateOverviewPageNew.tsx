import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useFacilitySearch } from "../hooks/useFacilitySearch";
import { useHazardWatch } from "../hooks/useHazardWatch";
import { useGhgEmitters } from "../hooks/useGhgEmitters";
import { useSiteSearch } from "../hooks/useSiteSearch";
import { colors, fonts } from "./theme";
import { badgeStyle } from "./badge";
import type { BadgeTier } from "./badge";
import { computeTownRiskScore } from "./townRiskScore";
import type { RiskGrade, TownRiskFactors } from "./townRiskScore";
import { DetailSection } from "./chipList";
import Spinner from "./Spinner";

interface TownEntry extends TownRiskFactors {
  triFacilityIds: string[];
}

function normalizeCity(city: string): string {
  return city.trim().toUpperCase();
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function gradeTier(grade: RiskGrade): BadgeTier {
  if (grade === "A" || grade === "B") return "clean";
  if (grade === "C") return "warning";
  return "critical";
}

function dedupePush(list: string[], value: string) {
  if (!list.includes(value)) list.push(value);
}

function ScoreBadge({ grade, score }: { grade: RiskGrade; score: number }) {
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const badge = badgeStyle(gradeTier(grade));

  function handleEnter(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ top: rect.bottom + 8, left: Math.max(8, rect.right - 280) });
  }

  return (
    <div
      onMouseEnter={handleEnter}
      onMouseLeave={() => setTooltipPos(null)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        background: badge.bg,
        color: badge.color,
        padding: "6px 14px",
        borderRadius: "999px",
        fontSize: "13px",
        fontWeight: 800,
        cursor: "help",
      }}
    >
      {grade} · {score}
      {tooltipPos &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: tooltipPos.top,
              left: tooltipPos.left,
              width: "280px",
              background: colors.cardBackground,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "14px",
              padding: "14px 16px",
              fontSize: "12px",
              lineHeight: "1.6",
              color: colors.bodyText,
              textAlign: "left",
              boxShadow: "0 12px 28px -10px rgba(0,0,0,0.3)",
              zIndex: 1000,
            }}
          >
            <b style={{ color: colors.darkGreen }}>How this score works</b>
            <div style={{ marginTop: "6px" }}>Starts at 100 points, then loses:</div>
            <ul style={{ margin: "4px 0 6px", paddingLeft: "18px" }}>
              <li>3 pts per TRI facility (max 21)</li>
              <li>10 pts per PBT/hazardous chemical (max 40)</li>
              <li>20 pts per Superfund/Brownfields site (max 40)</li>
              <li>15 pts per significant violation (max 30)</li>
              <li>10 pts per major GHG emitter (max 20)</li>
            </ul>
            <div>Grades: A ≥90 · B ≥75 · C ≥60 · D ≥40 · F below that.</div>
            <div style={{ marginTop: "6px", color: colors.mutedText }}>
              Towns are ranked worst-first — #1 is the riskiest, not the safest.
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function StateOverviewPageNew() {
  const [inputValue, setInputValue] = useState("MD");
  const [submittedState, setSubmittedState] = useState("MD");
  const [expandedCity, setExpandedCity] = useState<string | null>(null);

  const { facilities: triFacilities, loading: triLoading, error: triError } = useFacilitySearch(submittedState, 750);
  const { rows: hazardRows, loading: hazardLoading, error: hazardError } = useHazardWatch(submittedState);
  const { emitters: ghgEmitters, loading: ghgLoading, error: ghgError } = useGhgEmitters(submittedState);
  const {
    facilities: siteFacilities,
    loading: siteLoading,
    error: siteError,
    search: runSiteSearch,
  } = useSiteSearch();

  useEffect(() => {
    if (!submittedState) return;
    runSiteSearch({ state: submittedState, radius: 1, limit: 300 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittedState]);

  const loading = triLoading || hazardLoading || ghgLoading || siteLoading;
  const error = triError || hazardError || ghgError || siteError;

  const towns = useMemo(() => {
    if (loading || triFacilities.length === 0) return [];

    const map = new Map<string, TownEntry>();

    function getOrCreate(cityRaw: string): TownEntry {
      const key = normalizeCity(cityRaw);
      let entry = map.get(key);
      if (!entry) {
        entry = {
          displayCity: /[a-z]/.test(cityRaw) ? cityRaw.trim() : titleCase(cityRaw),
          triFacilityIds: [],
          triFacilityNames: [],
          pbtChemicals: [],
          pbtTotalRelease: 0,
          superfundBrownfieldNames: [],
          significantViolationNames: [],
          ghgEmitterNames: [],
        };
        map.set(key, entry);
      } else if (/[a-z]/.test(cityRaw) && !/[a-z]/.test(entry.displayCity)) {
        entry.displayCity = cityRaw.trim();
      }
      return entry;
    }

    const facilityIdToCity: Record<string, string> = {};

    for (const f of triFacilities) {
      if (!f.city_name) continue;
      facilityIdToCity[f.tri_facility_id] = f.city_name;
      const entry = getOrCreate(f.city_name);
      entry.triFacilityIds.push(f.tri_facility_id);
      dedupePush(entry.triFacilityNames, f.facility_name);
    }

    for (const row of hazardRows) {
      const city = facilityIdToCity[row.facility_id];
      if (!city) continue;
      const entry = getOrCreate(city);
      dedupePush(entry.pbtChemicals, row.chemical);
      entry.pbtTotalRelease += row.total_release || 0;
    }

    for (const f of siteFacilities) {
      if (!f.city) continue;
      const entry = getOrCreate(f.city);
      if (f.programs.includes("SUPERFUND") || f.programs.includes("BROWNFIELD")) {
        dedupePush(entry.superfundBrownfieldNames, f.name);
      }
      if (f.significant_violation) {
        dedupePush(entry.significantViolationNames, f.name);
      }
    }

    for (const e of ghgEmitters) {
      if (!e.city) continue;
      dedupePush(getOrCreate(e.city).ghgEmitterNames, e.facility_name);
    }

    return Array.from(map.values())
      .map((entry) => ({ entry, score: computeTownRiskScore(entry) }))
      .sort((a, b) => a.score.score - b.score.score);
  }, [triFacilities, hazardRows, siteFacilities, ghgEmitters, loading]);

  return (
    <div style={{ fontFamily: fonts.body, background: colors.background, minHeight: "100vh", padding: "28px" }}>
      <h1 style={{ fontFamily: fonts.heading, fontSize: "36px", fontWeight: 800, color: colors.darkGreen }}>
        State Overview
      </h1>
      <p style={{ fontSize: "16px", color: "#4A574D", margin: "12px 0 26px", maxWidth: "62ch" }}>
        Every town in a state, ranked by a composite environmental risk score built from TRI chemical
        releases, EPA-flagged PBT/hazardous chemicals, Superfund and Brownfields sites, significant
        compliance violations, and major greenhouse gas emitters. Click a town for its full report card.
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
          Rank towns
        </button>
      </div>

      {loading && <Spinner />}
      {error && <p style={{ color: colors.dangerText }}>Error loading data: {error}</p>}
      {!loading && !error && towns.length === 0 && <p>No town-level data found for "{submittedState}".</p>}

      {!loading && !error && towns.length > 0 && (
        <div style={{ background: colors.cardBackground, border: `1px solid ${colors.cardBorder}`, borderRadius: "24px", overflow: "hidden" }}>
          {towns.map(({ entry, score }, i) => {
            const isExpanded = expandedCity === entry.displayCity;
            return (
              <div key={entry.displayCity} style={{ borderBottom: i === towns.length - 1 ? "none" : "1px solid #EEF0E7" }}>
                <div
                  onClick={() => setExpandedCity(isExpanded ? null : entry.displayCity)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 2fr 90px",
                    gap: "16px",
                    alignItems: "center",
                    padding: "18px 22px",
                    cursor: "pointer",
                    background: isExpanded ? "#F5F8F1" : "transparent",
                  }}
                >
                  <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: "22px", color: colors.midGreen }}>
                    {i + 1}
                  </div>
                  <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: "16px", color: colors.darkGreen }}>
                    {entry.displayCity}, {submittedState}
                  </div>
                  <ScoreBadge grade={score.grade} score={score.score} />
                </div>
                {isExpanded && (
                  <div style={{ padding: "6px 22px 22px", background: "#F5F8F1" }}>
                    {score.deductions.length === 0 ? (
                      <p style={{ fontSize: "13px", color: colors.mutedText }}>
                        No significant risk factors on file for this town.
                      </p>
                    ) : (
                      <div style={{ marginBottom: "14px" }}>
                        {score.deductions.map((d) => (
                          <div
                            key={d.label}
                            style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", padding: "5px 0", color: colors.bodyText }}
                          >
                            <span>{d.label}</span>
                            <span style={{ fontWeight: 700, color: colors.dangerText }}>-{d.amount}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <DetailSection
                      title="TRI facilities"
                      count={entry.triFacilityNames.length}
                      items={entry.triFacilityIds.map((id, idx) => ({ label: entry.triFacilityNames[idx], to: `/facility/${id}` }))}
                    />
                    <DetailSection
                      title="PBT/hazardous chemicals"
                      count={entry.pbtChemicals.length}
                      extra={`${Math.round(entry.pbtTotalRelease).toLocaleString()} lbs flagged`}
                      items={entry.pbtChemicals.map((c) => ({ label: c }))}
                    />
                    <DetailSection
                      title="Superfund/Brownfields sites"
                      count={entry.superfundBrownfieldNames.length}
                      items={entry.superfundBrownfieldNames.map((n) => ({ label: n }))}
                    />
                    <DetailSection
                      title="Significant violations"
                      count={entry.significantViolationNames.length}
                      items={entry.significantViolationNames.map((n) => ({ label: n }))}
                    />
                    <DetailSection
                      title="Major GHG emitters"
                      count={entry.ghgEmitterNames.length}
                      items={entry.ghgEmitterNames.map((n) => ({ label: n }))}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default StateOverviewPageNew;

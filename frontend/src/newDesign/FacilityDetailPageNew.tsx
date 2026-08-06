import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useFacilityReleases } from "../hooks/useFacilityReleases";
import { useFacilityCompliance } from "../hooks/useFacilityCompliance";
import { colors, fonts } from "./theme";
import { deriveBadge } from "./badge";
import { computeReleaseKpis } from "./releaseKpis";
import { formatRcraLine } from "./rcra";
import FacilitySummaryPrint from "./FacilitySummaryPrint";

const SPIKE_THRESHOLD = 0.5;

function FacilityDetailPageNew() {
  const { id } = useParams();
  const facilityId = id ?? "";
  const { facility, releases, loading: releasesLoading, error: releasesError } = useFacilityReleases(facilityId);
  const { compliance, loading: complianceLoading, error: complianceError } = useFacilityCompliance(facilityId);
  const [selectedChemical, setSelectedChemical] = useState<string | null>(null);

  const chemicals = useMemo(
    () => Array.from(new Set(releases.map((r) => r.chemical))).sort(),
    [releases]
  );

  const activeChemical = useMemo(() => {
    if (selectedChemical) return selectedChemical;
    if (releases.length === 0) return null;
    const totals: Record<string, number> = {};
    for (const r of releases) {
      totals[r.chemical] = (totals[r.chemical] || 0) + r.air_release + r.water_release + r.land_release;
    }
    return Object.keys(totals).reduce((best, c) => (totals[c] > totals[best] ? c : best));
  }, [releases, selectedChemical]);

  const chartBars = useMemo(() => {
    if (!activeChemical) return [];
    const totalsByYear: Record<number, number> = {};
    for (const r of releases) {
      if (r.chemical !== activeChemical) continue;
      const total = r.air_release + r.water_release + r.land_release;
      totalsByYear[r.year] = (totalsByYear[r.year] || 0) + total;
    }
    const years = Object.keys(totalsByYear)
      .map(Number)
      .sort((a, b) => a - b);
    const max = Math.max(...years.map((year) => totalsByYear[year]), 1);
    return years.map((year, i) => {
      const total = totalsByYear[year];
      const prev = i > 0 ? totalsByYear[years[i - 1]] : 0;
      const percentChange = prev > 0 ? (total - prev) / prev : 0;
      const isSpike = percentChange > SPIKE_THRESHOLD;
      return {
        year,
        total,
        heightPx: Math.max(8, Math.round((total / max) * 200)),
        isSpike,
        tag: isSpike ? `+${Math.round(percentChange * 100)}%` : "",
      };
    });
  }, [releases, activeChemical]);

  const latestYearKpis = useMemo(() => computeReleaseKpis(releases), [releases]);

  if (releasesLoading || complianceLoading) {
    return <p style={{ fontFamily: fonts.body, padding: "24px" }}>Loading...</p>;
  }

  if (releasesError) {
    return (
      <p style={{ fontFamily: fonts.body, color: colors.dangerText, padding: "24px" }}>
        Error loading facility: {releasesError}
      </p>
    );
  }

  if (!facility || !facility.name) {
    return <p style={{ fontFamily: fonts.body, padding: "24px" }}>Facility not found.</p>;
  }

  const programs = compliance?.programs ?? [];
  const badge = deriveBadge(programs);
  const rcraLine = formatRcraLine(compliance?.rcra_generator_status ?? null);

  return (
    <div style={{ fontFamily: fonts.body, background: colors.background, minHeight: "100vh", padding: "28px" }}>
      <div
        style={{
          background: `linear-gradient(150deg, ${colors.midGreen}, ${colors.darkGreen})`,
          borderRadius: "28px",
          padding: "30px 34px",
          color: "#EAF1E6",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px", flexWrap: "wrap" }}>
          <div>
            {compliance?.industry && (
              <div style={{ fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#9FC7AE", fontWeight: 600 }}>
                {compliance.industry}
              </div>
            )}
            <h1 style={{ fontFamily: fonts.heading, fontSize: "34px", fontWeight: 800, marginTop: "8px", color: "#FFFFFF" }}>
              {facility.name}
            </h1>
            <div style={{ fontSize: "15px", color: "#B8CFBE", marginTop: "10px" }}>
              {facility.address} · {facility.city}, {facility.state} {facility.zip}
            </div>
            <div style={{ fontSize: "13.5px", color: "#8FB49B", marginTop: "6px" }}>
              Parent company · {facility.parent_company} &nbsp;|&nbsp; {facility.county} &nbsp;|&nbsp; {facility.latitude}, {facility.longitude}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                background: badge.bg,
                color: badge.color,
                padding: "8px 16px",
                borderRadius: "999px",
                fontSize: "13px",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ width: "8px", height: "8px", borderRadius: "99px", background: badge.dot, display: "inline-block" }} />
              {badge.label}
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                border: "1px solid rgba(255,255,255,0.4)",
                background: "transparent",
                color: "#EAF1E6",
                padding: "7px 14px",
                borderRadius: "999px",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Download summary
            </button>
          </div>
        </div>
      </div>

      {latestYearKpis && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "14px", marginTop: "18px" }}>
          {[
            { label: "Air", value: latestYearKpis.air, sub: `lbs · ${latestYearKpis.year}`, peak: latestYearKpis.peakAir },
            { label: "Water", value: latestYearKpis.water, sub: `lbs · ${latestYearKpis.year}`, peak: latestYearKpis.peakWater },
            { label: "Land", value: latestYearKpis.land, sub: `lbs · ${latestYearKpis.year}`, peak: latestYearKpis.peakLand },
            {
              label: "PBT chemicals",
              value: latestYearKpis.hazardousChemicals.length,
              sub: latestYearKpis.hazardousChemicals.length > 0 ? "flagged hazardous, all-time" : "none reported",
              peak: null,
            },
          ].map((kpi) => (
            <div key={kpi.label} style={{ background: colors.cardBackground, border: `1px solid ${colors.cardBorder}`, borderRadius: "20px", padding: "18px 20px" }}>
              <div style={{ fontSize: "12px", color: colors.mutedText, fontWeight: 600 }}>{kpi.label}</div>
              <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: "27px", color: colors.darkGreen, marginTop: "8px" }}>
                {kpi.value.toLocaleString()}
              </div>
              <div style={{ fontSize: "12px", color: colors.mutedText, marginTop: "2px" }}>{kpi.sub}</div>
              {kpi.peak && kpi.peak.value > 0 && kpi.peak.year !== latestYearKpis.year && (
                <div style={{ fontSize: "11px", color: colors.warningText, marginTop: "6px", fontWeight: 600 }}>
                  Peak: {kpi.peak.value.toLocaleString()} lbs in {kpi.peak.year}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeChemical && (
        <div style={{ background: colors.cardBackground, border: `1px solid ${colors.cardBorder}`, borderRadius: "24px", padding: "26px 28px", marginTop: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
            <h3 style={{ fontFamily: fonts.heading, fontSize: "21px", fontWeight: 700, color: colors.darkGreen }}>Release history</h3>
            <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
              {chemicals.map((chem) => (
                <button
                  key={chem}
                  onClick={() => setSelectedChemical(chem)}
                  style={{
                    border: "none",
                    cursor: "pointer",
                    padding: "8px 15px",
                    borderRadius: "999px",
                    fontSize: "13px",
                    fontWeight: 600,
                    background: chem === activeChemical ? colors.darkGreen : "#EDF1E7",
                    color: chem === activeChemical ? colors.background : "#3C5142",
                  }}
                >
                  {chem}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "14px", height: "270px", marginTop: "26px" }}>
            {chartBars.map((bar) => (
              <div key={bar.year} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: "4px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: bar.isSpike ? "#7A591A" : "transparent", background: bar.isSpike ? colors.warningBg : "transparent", padding: "2px 7px", borderRadius: "99px" }}>
                  {bar.tag}
                </div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: colors.darkGreen }}>
                  {bar.total.toLocaleString()} lbs
                </div>
                <div
                  style={{
                    width: "100%",
                    height: `${bar.heightPx}px`,
                    borderRadius: "12px 12px 6px 6px",
                    background: bar.isSpike
                      ? `linear-gradient(180deg, ${colors.accentLime}, #A9CE2E)`
                      : `linear-gradient(180deg, #3FC77F, ${colors.midGreen})`,
                  }}
                />
                <div style={{ fontSize: "12px", color: colors.mutedText, fontWeight: 600 }}>{bar.year}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: "12.5px", color: "#8A9488", marginTop: "14px" }}>
            Total on-site releases (air + water + land), lbs per reporting year. Highlighted bars mark year-over-year spikes above 50%.
          </div>
        </div>
      )}

      {releases.length > 0 && (
        <div style={{ background: colors.cardBackground, border: `1px solid ${colors.cardBorder}`, borderRadius: "24px", overflow: "hidden", marginTop: "18px" }}>
          <div style={{ padding: "24px 28px 6px" }}>
            <h3 style={{ fontFamily: fonts.heading, fontSize: "21px", fontWeight: 700, color: colors.darkGreen }}>Release records</h3>
            <p style={{ fontSize: "13px", color: "#8A9488", margin: "6px 0 0" }}>
              All reported quantities, in pounds, across every chemical and year on file.
            </p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: "760px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "62px 2fr 1fr 1fr 1fr 1fr 1fr 1.2fr", gap: "10px", padding: "14px 20px", background: "#F5F8F1", fontSize: "11px", fontWeight: 700, color: colors.mutedText }}>
                <div>YEAR</div>
                <div>CHEMICAL</div>
                <div>AIR</div>
                <div>WATER</div>
                <div>LAND</div>
                <div>RECYCLED</div>
                <div>TREATED</div>
                <div>OFF-SITE</div>
              </div>
              {releases
                .slice()
                .sort((a, b) => b.year - a.year || a.chemical.localeCompare(b.chemical))
                .map((r, i) => (
                  <div
                    key={`${r.chem_id}-${r.year}-${i}`}
                    style={{ display: "grid", gridTemplateColumns: "62px 2fr 1fr 1fr 1fr 1fr 1fr 1.2fr", gap: "10px", padding: "13px 20px", borderTop: "1px solid #EEF0E7", fontSize: "13.5px", background: r.is_hazardous ? "#FCF6F4" : "transparent" }}
                  >
                    <div style={{ fontWeight: 700, color: colors.darkGreen }}>{r.year}</div>
                    <div style={{ color: colors.bodyText }}>
                      {r.chemical}
                      {r.is_hazardous && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: colors.dangerBg, color: colors.dangerText, padding: "2px 8px", borderRadius: "99px", fontSize: "10.5px", fontWeight: 700, marginLeft: "8px" }}>
                          ⚠ PBT
                        </span>
                      )}
                    </div>
                    <div style={{ color: "#4A574D" }}>{r.air_release.toLocaleString()}</div>
                    <div style={{ color: "#4A574D" }}>{r.water_release.toLocaleString()}</div>
                    <div style={{ color: "#4A574D" }}>{r.land_release.toLocaleString()}</div>
                    <div style={{ color: "#8A9488" }}>{r.recycled.toLocaleString()}</div>
                    <div style={{ color: "#8A9488" }}>{r.treated.toLocaleString()}</div>
                    <div style={{ color: "#8A9488" }}>{r.transferred_offsite.toLocaleString()}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {complianceError && (
        <p style={{ color: colors.dangerText, marginTop: "18px" }}>Error loading compliance data: {complianceError}</p>
      )}

      {compliance && (
        <div style={{ background: colors.cardBackground, border: `1px solid ${colors.cardBorder}`, borderRadius: "24px", padding: "26px 28px", marginTop: "18px" }}>
          <h3 style={{ fontFamily: fonts.heading, fontSize: "21px", fontWeight: 700, color: colors.darkGreen }}>Regulatory compliance</h3>
          {rcraLine && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: colors.warningBg, borderRadius: "14px", padding: "11px 16px", marginTop: "14px", fontSize: "13.5px", color: "#7C6220" }}>
              <b style={{ color: colors.warningText }}>Hazardous Waste ·</b> {rcraLine}
            </div>
          )}
          {programs.length === 0 ? (
            <p style={{ marginTop: "14px", color: colors.mutedText }}>No compliance program data found for this facility.</p>
          ) : (
            <div style={{ marginTop: "18px", border: "1px solid #EEF0E7", borderRadius: "18px", overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1.3fr .8fr .8fr 1fr", gap: "12px", padding: "13px 20px", background: "#F5F8F1", fontSize: "11.5px", fontWeight: 700, color: colors.mutedText }}>
                <div>PROGRAM</div>
                <div>STATUS</div>
                <div>INSPECTIONS</div>
                <div>ACTIONS</div>
                <div>PENALTIES</div>
              </div>
              {programs.map((p) => (
                <div key={p.statute} style={{ display: "grid", gridTemplateColumns: "1.6fr 1.3fr .8fr .8fr 1fr", gap: "12px", padding: "15px 20px", borderTop: "1px solid #EEF0E7", alignItems: "center", fontSize: "14px" }}>
                  <div style={{ fontWeight: 600, color: colors.darkGreen }}>{p.statute}</div>
                  <div>{p.status ?? "—"}</div>
                  <div style={{ color: "#4A574D" }}>{p.inspection_count ?? "—"}</div>
                  <div style={{ color: "#4A574D" }}>{p.formal_actions_count ?? "—"}</div>
                  <div style={{ fontWeight: 600, color: colors.darkGreen }}>{p.total_penalties ?? "—"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {releases.length === 0 && !compliance?.programs.length && (
        <div style={{ background: colors.cardBackground, border: "1px dashed #CBD4C2", borderRadius: "24px", padding: "40px", marginTop: "18px", textAlign: "center", color: colors.mutedText }}>
          <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: "18px", color: colors.darkGreen }}>No TRI release data reported</div>
          <div style={{ fontSize: "14px", marginTop: "8px" }}>
            This facility is regulated under other EPA programs but has not filed Toxics Release Inventory reports.
          </div>
        </div>
      )}

      <FacilitySummaryPrint facility={facility} releases={releases} compliance={compliance} />
    </div>
  );
}

export default FacilityDetailPageNew;

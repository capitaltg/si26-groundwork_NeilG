import type { Facility, FacilityCompliance, Release } from "../types";
import type { Badge } from "./badge";
import { deriveBadge } from "./badge";
import type { ReleaseKpis } from "./releaseKpis";
import { computeReleaseKpis } from "./releaseKpis";
import { formatRcraLine } from "./rcra";

interface FacilitySummaryPrintProps {
  facility: Facility;
  releases: Release[];
  compliance: FacilityCompliance | null;
}

const printStyles = `
  @media screen {
    #facility-print-summary { display: none; }
  }
  @media print {
    nav { display: none !important; }
    #facility-detail-content > *:not(#facility-print-summary) { display: none !important; }
    #facility-print-summary { display: block !important; }
  }
`;

function buildNarrative(facility: Facility, kpis: ReleaseKpis | null, badge: Badge, rcraLine: string | null): string[] {
  const sentences: string[] = [];

  sentences.push(
    `${facility.name} is located in ${facility.city}, ${facility.state}, and currently carries an overall compliance status of "${badge.label}."`
  );

  if (kpis) {
    const totalLatest = kpis.air + kpis.water + kpis.land;
    if (totalLatest > 0) {
      const parts = [
        kpis.air > 0 ? `${kpis.air.toLocaleString()} lbs into the air` : null,
        kpis.water > 0 ? `${kpis.water.toLocaleString()} lbs into water` : null,
        kpis.land > 0 ? `${kpis.land.toLocaleString()} lbs onto land` : null,
      ].filter((p): p is string => p !== null);
      sentences.push(`In its most recently reported year (${kpis.year}), the facility released ${parts.join(", ")}.`);
    } else {
      sentences.push(`In its most recently reported year (${kpis.year}), the facility reported no on-site air, water, or land releases.`);
    }

    const peaks = [
      { pathway: "air", ...kpis.peakAir },
      { pathway: "water", ...kpis.peakWater },
      { pathway: "land", ...kpis.peakLand },
    ];
    const biggestPeak = peaks.reduce((best, p) => (p.value > best.value ? p : best), peaks[0]);
    if (biggestPeak.value > 0) {
      sentences.push(
        `Its largest single-year release on record was ${biggestPeak.value.toLocaleString()} lbs to ${biggestPeak.pathway}, reported in ${biggestPeak.year}.`
      );
    }

    if (kpis.hazardousChemicals.length > 0) {
      sentences.push(
        `Across its full reporting history, the facility has reported ${kpis.hazardousChemicals.length} chemical(s) designated by the EPA as Persistent, Bioaccumulative, and Toxic (PBT): ${kpis.hazardousChemicals.join(", ")}.`
      );
    } else {
      sentences.push("The facility has not reported any EPA-designated PBT (Persistent, Bioaccumulative, and Toxic) chemicals.");
    }
  } else {
    sentences.push("This facility has no Toxics Release Inventory (TRI) release data on file.");
  }

  if (rcraLine) {
    sentences.push(`Under RCRA hazardous waste rules, it is classified as: ${rcraLine}.`);
  }

  return sentences;
}

function FacilitySummaryPrint({ facility, releases, compliance }: FacilitySummaryPrintProps) {
  const kpis = computeReleaseKpis(releases);
  const programs = compliance?.programs ?? [];
  const badge = deriveBadge(programs);
  const rcraLine = formatRcraLine(compliance?.rcra_generator_status ?? null);
  const generatedOn = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const sortedReleases = releases
    .slice()
    .sort((a, b) => b.year - a.year || a.chemical.localeCompare(b.chemical));

  const narrative = buildNarrative(facility, kpis, badge, rcraLine);

  return (
    <div id="facility-print-summary" style={{ fontFamily: "Georgia, serif", color: "#1A231D", fontSize: "12px" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "2px" }}>{facility.name}</h1>
      <div>
        {facility.address} · {facility.city}, {facility.state} {facility.zip}
      </div>
      <div>Parent company: {facility.parent_company || "—"}</div>

      <p style={{ marginTop: "14px", lineHeight: "1.6" }}>{narrative.join(" ")}</p>

      {kpis && (
        <div style={{ marginTop: "16px" }}>
          <h2 style={{ fontSize: "15px" }}>Releases — latest reported year ({kpis.year})</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #999", padding: "4px 0" }}>Pathway</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #999", padding: "4px 0" }}>
                  {kpis.year} (lbs)
                </th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #999", padding: "4px 0" }}>All-time peak</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Air", value: kpis.air, peak: kpis.peakAir },
                { label: "Water", value: kpis.water, peak: kpis.peakWater },
                { label: "Land", value: kpis.land, peak: kpis.peakLand },
              ].map((row) => (
                <tr key={row.label}>
                  <td style={{ padding: "4px 0" }}>{row.label}</td>
                  <td style={{ textAlign: "right", padding: "4px 0" }}>{row.value.toLocaleString()}</td>
                  <td style={{ textAlign: "right", padding: "4px 0" }}>
                    {row.peak.value > 0 ? `${row.peak.value.toLocaleString()} lbs (${row.peak.year})` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "10px" }}>
            <b>PBT / hazardous chemicals reported (all-time):</b>{" "}
            {kpis.hazardousChemicals.length > 0 ? kpis.hazardousChemicals.join(", ") : "none reported"}
          </div>
        </div>
      )}

      {sortedReleases.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <h2 style={{ fontSize: "15px" }}>Full release history</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr>
                {["Year", "Chemical", "Air", "Water", "Land", "Recycled", "Treated", "Off-site"].map((h) => (
                  <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #999", padding: "3px 6px" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedReleases.map((r, i) => (
                <tr key={`${r.chem_id}-${r.year}-${i}`}>
                  <td style={{ padding: "3px 6px" }}>{r.year}</td>
                  <td style={{ padding: "3px 6px" }}>{r.chemical}</td>
                  <td style={{ padding: "3px 6px" }}>{r.air_release.toLocaleString()}</td>
                  <td style={{ padding: "3px 6px" }}>{r.water_release.toLocaleString()}</td>
                  <td style={{ padding: "3px 6px" }}>{r.land_release.toLocaleString()}</td>
                  <td style={{ padding: "3px 6px" }}>{r.recycled.toLocaleString()}</td>
                  <td style={{ padding: "3px 6px" }}>{r.treated.toLocaleString()}</td>
                  <td style={{ padding: "3px 6px" }}>{r.transferred_offsite.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {programs.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <h2 style={{ fontSize: "15px" }}>Regulatory compliance programs</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Program", "Status", "Inspections", "Actions", "Penalties"].map((h) => (
                  <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #999", padding: "4px 6px" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => (
                <tr key={p.statute}>
                  <td style={{ padding: "4px 6px" }}>{p.statute}</td>
                  <td style={{ padding: "4px 6px" }}>{p.status ?? "—"}</td>
                  <td style={{ padding: "4px 6px" }}>{p.inspection_count ?? "—"}</td>
                  <td style={{ padding: "4px 6px" }}>{p.formal_actions_count ?? "—"}</td>
                  <td style={{ padding: "4px 6px" }}>{p.total_penalties ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: "20px", fontSize: "10px", color: "#5E6B60", borderTop: "1px solid #ccc", paddingTop: "6px" }}>
        Data source: EPA Toxics Release Inventory (TRI) Program · Generated {generatedOn}
      </div>

      <style>{printStyles}</style>
    </div>
  );
}

export default FacilitySummaryPrint;

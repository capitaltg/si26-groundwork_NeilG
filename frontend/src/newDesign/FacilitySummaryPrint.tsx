import type { Facility, FacilityCompliance, Release } from "../types";
import { deriveBadge } from "./badge";
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
    body * { visibility: hidden; }
    #facility-print-summary, #facility-print-summary * { visibility: visible; }
    #facility-print-summary {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      padding: 0;
    }
  }
`;

function FacilitySummaryPrint({ facility, releases, compliance }: FacilitySummaryPrintProps) {
  const kpis = computeReleaseKpis(releases);
  const programs = compliance?.programs ?? [];
  const badge = deriveBadge(programs);
  const rcraLine = formatRcraLine(compliance?.rcra_generator_status ?? null);
  const generatedOn = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const sortedReleases = releases
    .slice()
    .sort((a, b) => b.year - a.year || a.chemical.localeCompare(b.chemical));

  return (
    <div id="facility-print-summary" style={{ fontFamily: "Georgia, serif", color: "#1A231D", fontSize: "12px" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "2px" }}>{facility.name}</h1>
      <div>
        {facility.address} · {facility.city}, {facility.state} {facility.zip}
      </div>
      <div>Parent company: {facility.parent_company || "—"}</div>
      <div style={{ marginTop: "10px", fontWeight: "bold" }}>
        Compliance status: {badge.label}
      </div>
      {rcraLine && <div>Hazardous waste (RCRA): {rcraLine}</div>}

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

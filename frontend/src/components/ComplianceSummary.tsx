import { useFacilityCompliance } from "../hooks/useFacilityCompliance";
import type { ComplianceProgram } from "../types";

const GENERATOR_STATUS_LABELS: Record<string, string> = {
  VSQG: "Very Small Quantity Generator",
  SQG: "Small Quantity Generator",
  LQG: "Large Quantity Generator",
  TSDF: "Treatment, Storage, and Disposal Facility",
};

// EPA's "current status" reflects a broader compliance determination, while
// inspection/enforcement counts are scoped to a recent window (roughly the
// last 3-5 years) -- so a violation status can appear with zero recent
// activity behind it. That's a real gap in EPA's own data, not a bug here,
// but worth flagging rather than letting it look self-contradictory.
function isStaleStatus(program: ComplianceProgram) {
  const hasViolationStatus = program.status && program.status !== "No Violation Identified";
  const hasRecentActivity =
    (program.inspection_count && program.inspection_count !== "0") ||
    (program.formal_actions_count && program.formal_actions_count !== "0");
  return Boolean(hasViolationStatus) && !hasRecentActivity;
}

interface ComplianceSummaryProps {
  facilityId: string;
}

function ComplianceSummary({ facilityId }: ComplianceSummaryProps) {
  const { compliance, loading, error } = useFacilityCompliance(facilityId);

  if (loading) {
    return <p>Loading regulatory compliance data...</p>;
  }

  if (error) {
    return <p className="text-danger">Error loading compliance data: {error}</p>;
  }

  if (!compliance) {
    return null;
  }

  return (
    <div className="mb-3">
      <h5>Regulatory Compliance</h5>
      {compliance.industry && <p>Industry: {compliance.industry}</p>}
      {compliance.rcra_generator_status && (
        <p>
          Hazardous Waste:{" "}
          {GENERATOR_STATUS_LABELS[compliance.rcra_generator_status.generator_status ?? ""] ??
            compliance.rcra_generator_status.generator_status}{" "}
          — {compliance.rcra_generator_status.active_status ?? "Unknown status"} —{" "}
          {compliance.rcra_generator_status.compliance_status ?? "No compliance data"}
        </p>
      )}
      {compliance.programs.length === 0 ? (
        <p>No compliance program data found for this facility.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Program</th>
              <th>Status</th>
              <th>Inspections</th>
              <th>Formal Actions</th>
              <th>Total Penalties</th>
            </tr>
          </thead>
          <tbody>
            {compliance.programs.map((program) => (
              <tr key={program.statute}>
                <td>{program.statute}</td>
                <td>
                  {program.status ?? "—"}
                  {isStaleStatus(program) && (
                    <span
                      className="text-muted"
                      style={{ fontSize: "0.8rem" }}
                      title="This status reflects a broader compliance determination than the recent inspection/enforcement window shown here — EPA's own data doesn't always keep the two in sync."
                    >
                      {" "}
                      *
                    </span>
                  )}
                </td>
                <td>{program.inspection_count ?? "—"}</td>
                <td>{program.formal_actions_count ?? "—"}</td>
                <td>{program.total_penalties ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ComplianceSummary;

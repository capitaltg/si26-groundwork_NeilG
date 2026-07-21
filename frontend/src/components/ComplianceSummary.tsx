import { useFacilityCompliance } from "../hooks/useFacilityCompliance";

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
                <td>{program.status ?? "—"}</td>
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

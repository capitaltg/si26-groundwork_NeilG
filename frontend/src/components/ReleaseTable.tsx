import type { Release } from "../types";

interface ReleaseTableProps {
  releases: Release[];
}

function ReleaseTable({ releases }: ReleaseTableProps) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Year</th>
          <th>Chemical</th>
          <th>Air (lbs)</th>
          <th>Water (lbs)</th>
          <th>Land (lbs)</th>
          <th>Recycled (lbs)</th>
          <th>Treated (lbs)</th>
          <th>Transferred Offsite (lbs)</th>
        </tr>
      </thead>
      <tbody>
        {releases.map((release) => (
          <tr key={`${release.chem_id}-${release.year}`}>
            <td>{release.year}</td>
            <td>
              {release.chemical}
              {release.is_hazardous && (
                <span className="badge bg-danger ms-2">Hazardous</span>
              )}
            </td>
            <td>{release.air_release}</td>
            <td>{release.water_release}</td>
            <td>{release.land_release}</td>
            <td>{release.recycled}</td>
            <td>{release.treated}</td>
            <td>{release.transferred_offsite}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default ReleaseTable;

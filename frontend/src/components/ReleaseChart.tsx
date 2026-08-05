import type { Release } from "../types";

interface ReleaseChartProps {
  releases: Release[];
  selectedChemical: string;
}

const SPIKE_THRESHOLD = 0.5;

function ReleaseChart({ releases, selectedChemical }: ReleaseChartProps) {
  const totalsByYear: Record<number, number> = {};

  for (const release of releases) {
    if (release.chemical !== selectedChemical) continue;
    const total = release.air_release + release.water_release + release.land_release;
    totalsByYear[release.year] = (totalsByYear[release.year] || 0) + total;
  }

  const years = Object.keys(totalsByYear)
    .map(Number)
    .sort((a, b) => a - b);
  const maxValue = Math.max(...years.map((year) => totalsByYear[year]), 1);

  const width = 600;
  const height = 220;
  // Separate top/bottom reservations (rather than one symmetric "padding")
  // so there's always room for both the value label and, when present, the
  // spike percentage tag above even the tallest bar.
  const topSpace = 34;
  const bottomSpace = 24;
  const barWidth = years.length > 0 ? width / years.length : width;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "220px" }}>
      <defs>
        <linearGradient id="release-bar-normal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3FC77F" />
          <stop offset="100%" stopColor="#1E7A46" />
        </linearGradient>
        <linearGradient id="release-bar-spike" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C6F24E" />
          <stop offset="100%" stopColor="#A9CE2E" />
        </linearGradient>
      </defs>
      {years.map((year, index) => {
        const value = totalsByYear[year];
        const barHeight = (value / maxValue) * (height - topSpace - bottomSpace);
        const x = index * barWidth + 2;
        const y = height - bottomSpace - barHeight;

        const previousYear = years[index - 1];
        const previousValue = previousYear !== undefined ? totalsByYear[previousYear] : 0;
        const percentChange = previousValue > 0 ? (value - previousValue) / previousValue : 0;
        const isSpike = percentChange > SPIKE_THRESHOLD;

        return (
          <g key={year}>
            <rect
              x={x}
              y={y}
              width={barWidth - 4}
              height={barHeight}
              rx="3"
              fill={isSpike ? "url(#release-bar-spike)" : "url(#release-bar-normal)"}
            />
            <text
              x={x + (barWidth - 4) / 2}
              y={isSpike ? y - 18 : y - 6}
              textAnchor="middle"
              fontSize="9"
              fontWeight="600"
              fill="#16382B"
            >
              {value.toLocaleString()} lbs
            </text>
            {isSpike && (
              <text
                x={x + (barWidth - 4) / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#8A6414"
              >
                +{Math.round(percentChange * 100)}%
              </text>
            )}
            <text
              x={x + (barWidth - 4) / 2}
              y={height - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#5E6B60"
            >
              {year}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default ReleaseChart;

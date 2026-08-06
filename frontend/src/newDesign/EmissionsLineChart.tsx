import type { GhgEmitterYear } from "../types";
import { colors } from "./theme";
import { markSpikes } from "./emissionsTrend";

interface EmissionsLineChartProps {
  data: GhgEmitterYear[];
}

function EmissionsLineChart({ data }: EmissionsLineChartProps) {
  if (data.length === 0) {
    return <p style={{ fontSize: "13px", color: colors.mutedText }}>No historical data available.</p>;
  }

  const width = 640;
  const height = 220;
  const sidePad = 24;
  const topSpace = 34;
  const bottomSpace = 24;

  const spikeMarked = markSpikes(data);
  const maxValue = Math.max(...data.map((d) => d.total_co2e), 1);
  const plotWidth = width - sidePad * 2;
  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0;

  const points = spikeMarked.map((d, i) => ({
    ...d,
    x: sidePad + i * stepX,
    y: height - bottomSpace - (d.total_co2e / maxValue) * (height - topSpace - bottomSpace),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "220px" }}>
      <path d={linePath} fill="none" stroke={colors.midGreen} strokeWidth="2.5" />
      {points.map((p) => (
        <g key={p.year}>
          <circle cx={p.x} cy={p.y} r={p.isSpike ? 5 : 3.5} fill={p.isSpike ? colors.warningDot : colors.darkGreen} />
          {p.isSpike && (
            <text x={p.x} y={p.y - 20} textAnchor="middle" fontSize="10" fontWeight="700" fill={colors.warningText}>
              +{Math.round((p.pctChange ?? 0) * 100)}%
            </text>
          )}
          <text
            x={p.x}
            y={p.y - 8}
            textAnchor="middle"
            fontSize="9"
            fontWeight="600"
            fill={p.isSpike ? colors.warningText : colors.darkGreen}
          >
            {Math.round(p.total_co2e).toLocaleString()}
          </text>
          <text x={p.x} y={height - 6} textAnchor="middle" fontSize="10" fill={colors.mutedText}>
            {p.year}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default EmissionsLineChart;

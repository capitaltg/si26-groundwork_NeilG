import { useState } from "react";
import { Link } from "react-router-dom";
import { colors } from "./theme";

export const CHIP_DISPLAY_LIMIT = 12;

export interface ChipItem {
  label: string;
  to?: string;
}

function Chip({ label, to }: ChipItem) {
  const style = {
    display: "inline-block",
    fontSize: "12.5px",
    fontWeight: 600,
    color: to ? colors.midGreen : colors.bodyText,
    background: colors.cardBackground,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: "8px",
    padding: "4px 10px",
    textDecoration: "none",
  } as const;
  return to ? (
    <Link to={to} style={style}>
      {label}
    </Link>
  ) : (
    <span style={style}>{label}</span>
  );
}

const chipToggleButtonStyle = {
  fontSize: "12.5px",
  fontWeight: 700,
  color: colors.midGreen,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: "4px 6px",
  textDecoration: "underline",
} as const;

export function ChipRow({ items }: { items: ChipItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const canCollapse = items.length > CHIP_DISPLAY_LIMIT;
  const visible = expanded ? items : items.slice(0, CHIP_DISPLAY_LIMIT);
  const remaining = items.length - visible.length;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
      {visible.map((item, i) => (
        <Chip key={item.to ?? `${item.label}-${i}`} label={item.label} to={item.to} />
      ))}
      {remaining > 0 && (
        <button type="button" onClick={() => setExpanded(true)} style={chipToggleButtonStyle}>
          +{remaining} more
        </button>
      )}
      {expanded && canCollapse && (
        <button type="button" onClick={() => setExpanded(false)} style={{ ...chipToggleButtonStyle, color: colors.mutedText }}>
          Show less
        </button>
      )}
    </div>
  );
}

export function DetailSection({ title, count, extra, items }: { title: string; count: number; extra?: string; items: ChipItem[] }) {
  if (count === 0) return null;
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ fontSize: "13px", fontWeight: 700, color: colors.darkGreen, marginBottom: "6px" }}>
        {title} ({count}){extra ? ` · ${extra}` : ""}
      </div>
      <ChipRow items={items} />
    </div>
  );
}

import { useEffect, useState } from "react";
import { colors, fonts } from "./theme";

interface SpinnerProps {
  size?: number;
  inline?: boolean;
  hintDelayMs?: number;
}

const DEFAULT_HINT_DELAY_MS = 4000;

function Spinner({ size = 32, inline = false, hintDelayMs = DEFAULT_HINT_DELAY_MS }: SpinnerProps) {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(true), hintDelayMs);
    return () => clearTimeout(timer);
  }, [hintDelayMs]);

  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      style={inline ? { display: "inline-block", verticalAlign: "middle" } : { display: "block", margin: "0 auto" }}
      role="status"
      aria-label="Loading"
    >
      <circle cx="25" cy="25" r="20" fill="none" stroke={colors.cardBorder} strokeWidth="5" />
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke={colors.midGreen}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="90 125"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 25 25"
          to="360 25 25"
          dur="0.9s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );

  if (inline) return icon;

  return (
    <div style={{ textAlign: "center", margin: "40px auto" }}>
      {icon}
      {showHint && (
        <div style={{ marginTop: "10px", fontSize: "12.5px", color: colors.mutedText, fontFamily: fonts.body }}>
          Working — calls to live government data sources may take some time.
        </div>
      )}
    </div>
  );
}

export default Spinner;

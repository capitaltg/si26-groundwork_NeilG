import { colors } from "./theme";

interface SpinnerProps {
  size?: number;
  inline?: boolean;
}

function Spinner({ size = 32, inline = false }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      style={inline ? { display: "inline-block", verticalAlign: "middle" } : { display: "block", margin: "40px auto" }}
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
}

export default Spinner;

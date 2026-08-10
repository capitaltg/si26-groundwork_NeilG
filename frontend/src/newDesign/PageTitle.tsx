import type { ReactNode } from "react";
import { colors, fonts } from "./theme";

interface PageTitleProps {
  icon: string;
  children: ReactNode;
  fontSize?: string;
  maxWidth?: string;
}

function PageTitle({ icon, children, fontSize = "36px", maxWidth }: PageTitleProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
      <img
        src={icon}
        alt=""
        width={44}
        height={44}
        style={{ display: "block", flexShrink: 0 }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <h1 style={{ fontFamily: fonts.heading, fontSize, fontWeight: 800, color: colors.darkGreen, margin: 0, maxWidth }}>
        {children}
      </h1>
    </div>
  );
}

export default PageTitle;

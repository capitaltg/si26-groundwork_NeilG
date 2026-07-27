import { colors } from "./theme";
import type { SiteSearchFacility } from "../types";

export type BadgeTier = "critical" | "warning" | "clean" | "unknown";

export interface BadgeColors {
  bg: string;
  color: string;
  dot: string;
}

export function badgeStyle(tier: BadgeTier): BadgeColors {
  switch (tier) {
    case "critical":
      return { bg: colors.dangerBg, color: colors.dangerText, dot: colors.dangerDot };
    case "warning":
      return { bg: colors.warningBg, color: colors.warningText, dot: colors.warningDot };
    case "unknown":
      return { bg: colors.neutralBg, color: colors.neutralText, dot: colors.mutedText };
    case "clean":
      return { bg: colors.neutralBg, color: colors.neutralText, dot: colors.successGreen };
  }
}

export function tierForFacility(facility: SiteSearchFacility): BadgeTier {
  if (facility.significant_violation) return "critical";
  if (facility.compliance_status && facility.compliance_status !== "No Violation Identified") return "warning";
  return "clean";
}

export function labelForFacility(facility: SiteSearchFacility): string {
  if (facility.significant_violation) return "Significant Violation";
  if (facility.compliance_status && facility.compliance_status !== "No Violation Identified") {
    return facility.compliance_status;
  }
  return "No Violation Identified";
}

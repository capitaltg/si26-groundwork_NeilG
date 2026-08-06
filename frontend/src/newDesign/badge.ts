import { colors } from "./theme";
import type { ComplianceProgram, SiteSearchFacility } from "../types";

export type BadgeTier = "critical" | "warning" | "clean" | "unknown";

export interface BadgeColors {
  bg: string;
  color: string;
  dot: string;
}

export interface Badge extends BadgeColors {
  label: string;
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

export function deriveBadge(programs: ComplianceProgram[]): Badge {
  let tier: BadgeTier;
  let label: string;

  if (programs.length === 0) {
    tier = "unknown";
    label = "No Compliance Data";
  } else if (programs.some((p) => p.status === "Significant Violation")) {
    tier = "critical";
    label = "Significant Violation";
  } else {
    const nonClean = programs.find((p) => p.status !== "No Violation Identified");
    if (nonClean) {
      tier = "warning";
      label = nonClean.status ?? "Status Unknown";
    } else {
      tier = "clean";
      label = "No Violation Identified";
    }
  }

  return { label, ...badgeStyle(tier) };
}

export function tierForFacility(facility: SiteSearchFacility): BadgeTier {
  if (
    facility.significant_violation ||
    facility.programs.includes("SUPERFUND") ||
    facility.programs.includes("BROWNFIELD")
  ) {
    return "critical";
  }
  if (facility.compliance_status && facility.compliance_status !== "No Violation Identified") return "warning";
  return "clean";
}

export function labelForFacility(facility: SiteSearchFacility): string {
  if (
    facility.significant_violation ||
    facility.programs.includes("SUPERFUND") ||
    facility.programs.includes("BROWNFIELD")
  ) {
    return facility.compliance_status && facility.compliance_status !== "No Violation Identified"
      ? facility.compliance_status
      : "Significant Violation";
  }
  if (facility.compliance_status && facility.compliance_status !== "No Violation Identified") {
    return facility.compliance_status;
  }
  return "No Violation Identified";
}

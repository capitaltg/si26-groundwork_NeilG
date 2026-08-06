import type { RCRAGeneratorStatus } from "../types";

export const GENERATOR_STATUS_LABELS: Record<string, string> = {
  VSQG: "Very Small Quantity Generator",
  SQG: "Small Quantity Generator",
  LQG: "Large Quantity Generator",
  TSDF: "Treatment, Storage, and Disposal Facility",
};

export function formatRcraLine(rcra: RCRAGeneratorStatus | null): string | null {
  if (!rcra) return null;
  return `${GENERATOR_STATUS_LABELS[rcra.generator_status ?? ""] ?? rcra.generator_status} — ${
    rcra.active_status ?? "Unknown status"
  } — ${rcra.compliance_status ?? "No compliance data"}`;
}

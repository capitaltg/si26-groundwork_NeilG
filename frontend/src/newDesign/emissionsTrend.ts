import type { GhgEmitterYear } from "../types";

// A year-over-year (or vs.-baseline) increase counts as "substantial" only when
// it clears BOTH bars below -- relative growth alone can flag a tiny facility's
// noisy percentage swing, and absolute growth alone can flag a huge facility's
// normal year-to-year variance.
export const RELATIVE_INCREASE_THRESHOLD = 0.2; // >20% growth

// EPA's mandatory GHGRP reporting threshold for a stationary source (40 CFR
// Part 98.2) -- a new source emitting this much per year must register with
// GHGRP. Using it here means: the increase alone is as large as what would
// force a brand-new facility to start reporting.
export const SUBSTANTIAL_ABS_TONS_CO2E = 25_000;

const TREND_BASELINE_YEARS = 3;

export interface YearSpike extends GhgEmitterYear {
  isSpike: boolean;
  pctChange: number | null;
}

export function markSpikes(history: GhgEmitterYear[]): YearSpike[] {
  return history.map((row, i) => {
    if (i === 0) return { ...row, isSpike: false, pctChange: null };
    const prev = history[i - 1].total_co2e;
    const absChange = row.total_co2e - prev;
    const pctChange = prev > 0 ? absChange / prev : 0;
    const isSpike = pctChange > RELATIVE_INCREASE_THRESHOLD && absChange >= SUBSTANTIAL_ABS_TONS_CO2E;
    return { ...row, isSpike, pctChange };
  });
}

export interface TrendFlag {
  pctChange: number;
  absChange: number;
  baselineYears: number[];
  latestYear: number;
}

export function computeTrendFlag(history: GhgEmitterYear[]): TrendFlag | null {
  if (history.length < 2) return null;

  const latest = history[history.length - 1];
  const priorYears = history.slice(Math.max(0, history.length - 1 - TREND_BASELINE_YEARS), history.length - 1);
  if (priorYears.length === 0) return null;

  const baseline = priorYears.reduce((s, r) => s + r.total_co2e, 0) / priorYears.length;
  if (baseline <= 0) return null;

  const absChange = latest.total_co2e - baseline;
  const pctChange = absChange / baseline;

  if (pctChange > RELATIVE_INCREASE_THRESHOLD && absChange >= SUBSTANTIAL_ABS_TONS_CO2E) {
    return { pctChange, absChange, baselineYears: priorYears.map((r) => r.year), latestYear: latest.year };
  }
  return null;
}

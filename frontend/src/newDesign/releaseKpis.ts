import type { Release } from "../types";

type ReleaseKey = "air_release" | "water_release" | "land_release";

export interface YearValue {
  year: number;
  value: number;
}

export interface ReleaseKpis {
  year: number;
  air: number;
  water: number;
  land: number;
  peakAir: YearValue;
  peakWater: YearValue;
  peakLand: YearValue;
  hazardousChemicals: string[];
}

export function computeReleaseKpis(releases: Release[]): ReleaseKpis | null {
  if (releases.length === 0) return null;

  const latestYear = Math.max(...releases.map((r) => r.year));
  const years = Array.from(new Set(releases.map((r) => r.year)));

  const sumForYear = (year: number, key: ReleaseKey) =>
    releases.filter((r) => r.year === year).reduce((s, r) => s + (r[key] || 0), 0);

  const peakFor = (key: ReleaseKey): YearValue =>
    years.reduce(
      (best, year) => {
        const value = sumForYear(year, key);
        return value > best.value ? { year, value } : best;
      },
      { year: latestYear, value: 0 }
    );

  const hazardousChemicals = Array.from(
    new Set(releases.filter((r) => r.is_hazardous).map((r) => r.chemical))
  ).sort();

  return {
    year: latestYear,
    air: sumForYear(latestYear, "air_release"),
    water: sumForYear(latestYear, "water_release"),
    land: sumForYear(latestYear, "land_release"),
    peakAir: peakFor("air_release"),
    peakWater: peakFor("water_release"),
    peakLand: peakFor("land_release"),
    hazardousChemicals,
  };
}

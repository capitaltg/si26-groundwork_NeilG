export interface TownRiskFactors {
  displayCity: string;
  triFacilityNames: string[];
  pbtChemicals: string[];
  pbtTotalRelease: number;
  superfundBrownfieldNames: string[];
  significantViolationNames: string[];
  ghgEmitterNames: string[];
}

export interface RiskDeduction {
  label: string;
  amount: number;
}

export type RiskGrade = "A" | "B" | "C" | "D" | "F";

export interface TownRiskScore {
  score: number;
  grade: RiskGrade;
  deductions: RiskDeduction[];
}

function capDeduction(count: number, perItem: number, cap: number): number {
  return Math.min(count * perItem, cap);
}

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

export function computeTownRiskScore(factors: TownRiskFactors): TownRiskScore {
  const deductions: RiskDeduction[] = [];

  const triCount = factors.triFacilityNames.length;
  const triDeduction = capDeduction(triCount, 3, 21);
  if (triDeduction > 0) {
    deductions.push({ label: `${triCount} TRI-registered ${plural(triCount, "facility", "facilities")}`, amount: triDeduction });
  }

  const pbtCount = factors.pbtChemicals.length;
  const pbtDeduction = capDeduction(pbtCount, 10, 40);
  if (pbtDeduction > 0) {
    deductions.push({ label: `${pbtCount} PBT/hazardous ${plural(pbtCount, "chemical", "chemicals")} flagged`, amount: pbtDeduction });
  }

  const superfundCount = factors.superfundBrownfieldNames.length;
  const superfundDeduction = capDeduction(superfundCount, 20, 40);
  if (superfundDeduction > 0) {
    deductions.push({ label: `${superfundCount} Superfund/Brownfields ${plural(superfundCount, "site", "sites")}`, amount: superfundDeduction });
  }

  const violationCount = factors.significantViolationNames.length;
  const violationDeduction = capDeduction(violationCount, 15, 30);
  if (violationDeduction > 0) {
    deductions.push({ label: `${violationCount} significant compliance ${plural(violationCount, "violation", "violations")}`, amount: violationDeduction });
  }

  const ghgCount = factors.ghgEmitterNames.length;
  const ghgDeduction = capDeduction(ghgCount, 10, 20);
  if (ghgDeduction > 0) {
    deductions.push({ label: `${ghgCount} major GHG ${plural(ghgCount, "emitter", "emitters")}`, amount: ghgDeduction });
  }

  const totalDeduction = deductions.reduce((s, d) => s + d.amount, 0);
  const score = Math.max(0, Math.round(100 - totalDeduction));

  let grade: RiskGrade;
  if (score >= 90) grade = "A";
  else if (score >= 75) grade = "B";
  else if (score >= 60) grade = "C";
  else if (score >= 40) grade = "D";
  else grade = "F";

  return { score, grade, deductions };
}

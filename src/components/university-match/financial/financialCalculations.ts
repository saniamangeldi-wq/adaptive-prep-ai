import { FINANCIAL_CONFIG, IntakeData, UniversityCosts, FinancialCalculations } from "./types";

export function calculateFinancials(
  intake: IntakeData,
  costs: UniversityCosts
): FinancialCalculations {
  const now = new Date();
  const enrollmentDate = new Date(intake.enrollmentYear, intake.enrollmentMonth - 1, 1);
  const monthsUntilEnrollment = Math.max(
    1,
    (enrollmentDate.getFullYear() - now.getFullYear()) * 12 +
      (enrollmentDate.getMonth() - now.getMonth())
  );

  const firstYearTuition = costs.annualTuition ?? 0;
  const monthlyLivingCosts =
    (costs.monthlyRent ?? 0) + (costs.monthlyFood ?? 0) + (costs.monthlyTransport ?? 0);
  const emergencyBuffer = monthlyLivingCosts * FINANCIAL_CONFIG.emergencyBufferMonths;
  const totalNeeded = firstYearTuition + monthlyLivingCosts * 12 + emergencyBuffer;

  const monthlyFamilyContribution = intake.familyContribution / FINANCIAL_CONFIG.tengeToUSD;
  const currentSavingsUSD = intake.currentSavings / FINANCIAL_CONFIG.tengeToUSD;
  const projectedSavings =
    currentSavingsUSD + monthlyFamilyContribution * monthsUntilEnrollment;

  const gap = projectedSavings - totalNeeded;
  const confidenceScore =
    totalNeeded > 0
      ? Math.min(100, Math.round((projectedSavings / totalNeeded) * 100))
      : 100;

  let verdict: FinancialCalculations["verdict"];
  if (confidenceScore >= FINANCIAL_CONFIG.verdictThresholds.onTrack) {
    verdict = "on_track";
  } else if (confidenceScore >= FINANCIAL_CONFIG.verdictThresholds.needsAdjustment) {
    verdict = "needs_adjustment";
  } else {
    verdict = "significant_gap";
  }

  return {
    monthsUntilEnrollment,
    firstYearTuition,
    monthlyLivingCosts,
    emergencyBuffer,
    totalNeeded,
    monthlyFamilyContribution,
    currentSavingsUSD,
    projectedSavings,
    gap,
    confidenceScore,
    verdict,
  };
}

export function usdToTenge(usd: number): number {
  return usd * FINANCIAL_CONFIG.tengeToUSD;
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTenge(amount: number): string {
  return `₸${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`;
}

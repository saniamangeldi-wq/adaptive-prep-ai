export const FINANCIAL_CONFIG = {
  tengeToUSD: 500,
  emergencyBufferMonths: 3,
  partTimeHoursPerWeekMin: 15,
  partTimeHoursPerWeekMax: 20,
  currentYear: new Date().getFullYear(),
  expenseCategories: [
    { key: "food", label: "Food & Groceries", classification: "Necessary" as const },
    { key: "transport", label: "Transport", classification: "Necessary" as const },
    { key: "entertainment", label: "Entertainment", classification: "Reducible" as const },
    { key: "clothing", label: "Clothing", classification: "Reducible" as const },
    { key: "phone", label: "Phone & Internet", classification: "Necessary" as const },
    { key: "other", label: "Other", classification: "Reducible" as const },
  ],
  verdictThresholds: {
    onTrack: 90,
    needsAdjustment: 60,
  },
} as const;

export interface IntakeData {
  universityName: string;
  city: string;
  country: string;
  enrollmentMonth: number;
  enrollmentYear: number;
  expenses: Record<string, number>;
  familyContribution: number;
  currentSavings: number;
}

export interface UniversityCosts {
  annualTuition: number | null;
  monthlyRent: number | null;
  monthlyFood: number | null;
  monthlyTransport: number | null;
}

export interface JobListing {
  title: string;
  hourlyPay: number;
}

export interface FinancialReport {
  costs: UniversityCosts;
  jobs: JobListing[];
  calculations: FinancialCalculations;
  intake: IntakeData;
}

export interface FinancialCalculations {
  monthsUntilEnrollment: number;
  firstYearTuition: number;
  monthlyLivingCosts: number;
  emergencyBuffer: number;
  totalNeeded: number;
  monthlyFamilyContribution: number;
  currentSavingsUSD: number;
  projectedSavings: number;
  gap: number;
  confidenceScore: number;
  verdict: "on_track" | "needs_adjustment" | "significant_gap";
}

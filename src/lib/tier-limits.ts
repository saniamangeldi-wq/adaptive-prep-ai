// Tier limits configuration
export type PricingTier = "tier_0" | "tier_1" | "tier_2" | "tier_3";

export interface TierLimits {
  name: string;
  displayName: string;
  price: number;
  creditsPerDay: number;
  questionsPerDay: number; // For tier 0 only, others get unlimited via tests_remaining
  testsPerMonth: number | "unlimited";
  flashcardsPerDay: number;
  hasVoiceChat: boolean;
  hasUniversityMatch: boolean;
  aiModel: "gemini-flash-lite" | "gpt-5-mini" | "gpt-5" | "gpt-5.2";
  aiProvider: "gemini" | "openai" | "perplexity";
  features: string[];
}

export const TIER_LIMITS: Record<PricingTier, TierLimits> = {
  tier_0: {
    name: "tier_0",
    displayName: "Free",
    price: 0,
    creditsPerDay: 20,
    questionsPerDay: 10,
    testsPerMonth: 0,
    flashcardsPerDay: 5,
    hasVoiceChat: false,
    hasUniversityMatch: false,
    aiModel: "gemini-flash-lite",
    aiProvider: "gemini",
    features: [
      "20 AI credits/day",
      "10 SAT questions/day",
      "Adaptive learning enabled",
      "Basic AI Coach (Gemini Flash)",
      "Progress dashboard",
      "5 flashcards/day",
    ],
  },
  tier_1: {
    name: "tier_1",
    displayName: "Starter",
    price: 7,
    creditsPerDay: 50,
    questionsPerDay: -1, // Unlimited
    testsPerMonth: 2,
    flashcardsPerDay: 20,
    hasVoiceChat: false,
    hasUniversityMatch: false,
    aiModel: "gpt-5-mini",
    aiProvider: "openai",
    features: [
      "50 AI credits/day",
      "2 practice tests/month",
      "Unlimited SAT questions",
      "AI Study Coach included",
      "Basic AI assistance (GPT-4o-mini)",
      "Study planner access",
      "Progress dashboard",
      "Full feedback on tests",
      "20 flashcards/day",
    ],
  },
  tier_2: {
    name: "tier_2",
    displayName: "Pro",
    price: 10,
    creditsPerDay: 150,
    questionsPerDay: -1,
    testsPerMonth: 4,
    flashcardsPerDay: 50,
    hasVoiceChat: false,
    hasUniversityMatch: false,
    aiModel: "gpt-5",
    aiProvider: "openai",
    features: [
      "150 AI credits/day",
      "4 practice tests/month",
      "Everything in Starter",
      "Enhanced AI with better reasoning",
      "Enhanced feedback quality",
      "Priority support",
      "50 flashcards/day",
    ],
  },
  tier_3: {
    name: "tier_3",
    displayName: "Elite",
    price: 21,
    creditsPerDay: 300,
    questionsPerDay: -1,
    testsPerMonth: 12,
    flashcardsPerDay: -1, // Unlimited
    hasVoiceChat: true,
    hasUniversityMatch: true,
    aiModel: "gpt-5.2",
    aiProvider: "openai",
    features: [
      "300 AI credits/day",
      "12 practice tests/month",
      "Everything in Pro",
      "Premium AI with voice chat",
      "Premium feedback quality",
      "Best AI quality (GPT-4o)",
      "Unlimited flashcards",
      "1-on-1 coaching session",
    ],
  },
};

export const TRIAL_LIMITS = {
  creditsPerDay: 100,
  testsTotal: 2,
  questionsPerDay: 50,
  flashcardsPerDay: 10,
  durationDays: 7,
};

export function getTierLimits(tier: PricingTier | undefined): TierLimits {
  return TIER_LIMITS[tier || "tier_0"];
}

export function getDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const endDate = new Date(trialEndsAt);
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function isTrialExpired(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return true;
  return new Date(trialEndsAt) < new Date();
}

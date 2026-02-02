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
  aiModel: "gpt-4o-mini" | "gpt-4o";
  features: string[];
}

export const TIER_LIMITS: Record<PricingTier, TierLimits> = {
  tier_0: {
    name: "tier_0",
    displayName: "Free",
    price: 0,
    creditsPerDay: 20,
    questionsPerDay: 10,
    testsPerMonth: 0, // No full tests
    flashcardsPerDay: 5,
    hasVoiceChat: false,
    hasUniversityMatch: false,
    aiModel: "gpt-4o-mini",
    features: [
      "20 AI credits/day",
      "10 SAT questions/day",
      "Adaptive learning",
      "Basic AI Coach",
      "Progress dashboard",
      "5 flashcards/day",
    ],
  },
  tier_1: {
    name: "tier_1",
    displayName: "Starter",
    price: 7,
    creditsPerDay: 50,
    questionsPerDay: -1, // Unlimited (uses tests_remaining)
    testsPerMonth: 2,
    flashcardsPerDay: 20,
    hasVoiceChat: false,
    hasUniversityMatch: false,
    aiModel: "gpt-4o-mini",
    features: [
      "50 AI credits/day",
      "2 practice tests/month",
      "Unlimited SAT questions",
      "Full test feedback",
      "20 flashcards/day",
      "Priority support",
    ],
  },
  tier_2: {
    name: "tier_2",
    displayName: "Pro",
    price: 10,
    creditsPerDay: 150,
    questionsPerDay: -1,
    testsPerMonth: 5,
    flashcardsPerDay: 50,
    hasVoiceChat: true,
    hasUniversityMatch: false,
    aiModel: "gpt-4o",
    features: [
      "150 AI credits/day",
      "5 practice tests/month",
      "Voice chat with AI",
      "GPT-4o model",
      "50 flashcards/day",
      "Detailed analytics",
    ],
  },
  tier_3: {
    name: "tier_3",
    displayName: "Elite",
    price: 21,
    creditsPerDay: 300,
    questionsPerDay: -1,
    testsPerMonth: "unlimited",
    flashcardsPerDay: -1, // Unlimited
    hasVoiceChat: true,
    hasUniversityMatch: true,
    aiModel: "gpt-4o",
    features: [
      "300 AI credits/day",
      "Unlimited practice tests",
      "University Match feature",
      "Voice chat with AI",
      "GPT-4o model",
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

// Tier limits configuration
export type PricingTier = "tier_0" | "tier_1" | "tier_2" | "tier_3";

export interface TierLimits {
  name: string;
  displayName: string;
  price: number;
  creditsPerDay: number;
  questionsPerDay: number; // For tier 0 only, others get unlimited via tests_remaining
  questionsPerMonth: number; // Monthly question quota for practice tests
  flashcardsPerDay: number;
  hasVoiceChat: boolean;
  hasUniversityMatch: boolean;
  aiModel: "gemini-flash-lite" | "gpt-4o" | "gpt-5" | "gpt-5-all";
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
    questionsPerMonth: 0,
    flashcardsPerDay: 5,
    hasVoiceChat: false,
    hasUniversityMatch: false,
    aiModel: "gemini-flash-lite",
    aiProvider: "gemini",
    features: [
      "20 AI credits/day",
      "10 SAT questions/day",
      "No practice tests",
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
    questionsPerMonth: 200,
    flashcardsPerDay: 20,
    hasVoiceChat: false,
    hasUniversityMatch: false,
    aiModel: "gpt-4o",
    aiProvider: "openai",
    features: [
      "50 AI credits/day",
      "200 practice questions/month",
      "Unlimited SAT questions",
      "AI Study Coach included",
      "GPT-4o AI assistance",
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
    questionsPerMonth: 400,
    flashcardsPerDay: 50,
    hasVoiceChat: false,
    hasUniversityMatch: true, // University Match unlocks at Tier 2 for schools
    aiModel: "gpt-5",
    aiProvider: "perplexity",
    features: [
      "150 AI credits/day",
      "400 practice questions/month",
      "Everything in Starter",
      "Perplexity Pro AI models",
      "University Match (schools)",
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
    questionsPerMonth: 1200,
    flashcardsPerDay: -1, // Unlimited
    hasVoiceChat: true,
    hasUniversityMatch: true,
    aiModel: "gpt-5-all",
    aiProvider: "perplexity",
    features: [
      "300 AI credits/day",
      "1200 practice questions/month",
      "Everything in Pro",
      "All Perplexity Pro models",
      "Deep Research + Reasoning Pro",
      "Premium AI with voice chat",
      "Unlimited flashcards",
      "1-on-1 coaching session",
    ],
  },
};

export const TRIAL_LIMITS = {
  creditsPerDay: 100,
  testsTotal: 2,
  questionsPerDay: 50,
  flashcardsPerDay: 20,
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
  // Use floor to show accurate remaining full days (5.8 days = "5 days left")
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function isTrialExpired(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return true;
  return new Date(trialEndsAt) < new Date();
}

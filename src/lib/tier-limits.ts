import { TIER_DAILY_CREDITS, TRIAL_DAILY_CREDITS } from "@ielts/credits";
import { PLANS, type TierId } from "@/lib/pricing-config";

/**
 * What a tier gives in this product: daily AI credits, nothing else.
 * (The old app's question quotas, flashcard limits, AI-model tiers, voice and
 * university-match flags were removed with those features.)
 * Names and prices come from pricing-config.ts, credits from the server's credits.ts.
 */
export type PricingTier = TierId;

export interface TierLimits {
  name: PricingTier;
  displayName: string;
  /** List price in USD per month (monthly billing). */
  price: number;
  creditsPerDay: number;
}

export const TIER_LIMITS = Object.fromEntries(
  PLANS.map((p) => [
    p.tierId,
    { name: p.tierId, displayName: p.name, price: p.monthlyPriceUSD, creditsPerDay: TIER_DAILY_CREDITS[p.tierId] },
  ])
) as Record<PricingTier, TierLimits>;

export const TRIAL_LIMITS = {
  creditsPerDay: TRIAL_DAILY_CREDITS,
} as const;

export function getTierLimits(tier: string | null | undefined): TierLimits {
  return TIER_LIMITS[(tier as PricingTier) ?? "tier_0"] ?? TIER_LIMITS.tier_0;
}

export function isTrialExpired(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return true;
  return new Date(trialEndsAt) < new Date();
}

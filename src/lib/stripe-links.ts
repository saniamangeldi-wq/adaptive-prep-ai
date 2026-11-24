import type { BillingCycle } from "./pricing-config";

/**
 * Stripe Payment Links for the plans we still sell (relaunch: Free / Pro / Tutor).
 * Legacy tiers (student Basic & Elite, tutor Professional & Business) are no longer
 * sold; existing subscribers keep their tier in the database and their Stripe subscription.
 * Note: KZ families mostly pay with Kaspi; see salvage/90-DAY-PLAN.md.
 */
export const STRIPE_LINKS = {
  student: {
    tier_2: {
      monthly: "https://buy.stripe.com/28EcN4bEgaPSdE5fN74wM05",
      term: "https://buy.stripe.com/9B6aEWeQs7DGbvX58t4wM0j",
      yearly: "https://buy.stripe.com/9B65kC9w8bTWdE51Wh4wM0q",
    },
  },
  tutor: {
    tier_1: {
      monthly: "https://buy.stripe.com/7sY4gy0ZCgac0Rj0Sd4wM07",
      term: "https://buy.stripe.com/9B64gybEgcY0cA17gB4wM0m",
      yearly: "https://buy.stripe.com/7sYdR88s47DGcA1cAV4wM0s",
    },
  },
} as const;

export type PricingTierKey = "tier_1" | "tier_2" | "tier_3";
type RoleKey = keyof typeof STRIPE_LINKS;

export function getStripeLink(role: RoleKey, tier: PricingTierKey, cycle: BillingCycle): string | null {
  const byTier = STRIPE_LINKS[role] as Partial<Record<PricingTierKey, Record<BillingCycle, string>>>;
  return byTier[tier]?.[cycle] ?? null;
}

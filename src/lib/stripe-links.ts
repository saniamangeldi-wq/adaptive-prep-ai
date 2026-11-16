import type { BillingCycle } from "./pricing-config";

/**
 * Stripe Payment Links for the plans, by plan → billing cycle.
 * These are direct Stripe Checkout links (not session-based).
 * The links are unchanged from the old app; tutor links were removed with the tutor plans.
 */

export const STRIPE_LINKS = {
  student: {
    tier_1: {
      monthly: "https://buy.stripe.com/3cIdR89w83nqgQhbwR4wM04",
      term: "https://buy.stripe.com/4gM00i5fS8HK2Zr30l4wM0k",
      yearly: "https://buy.stripe.com/4gM3cu23G2jm2Zr6cx4wM0p",
    },
    tier_2: {
      monthly: "https://buy.stripe.com/28EcN4bEgaPSdE5fN74wM05",
      term: "https://buy.stripe.com/9B6aEWeQs7DGbvX58t4wM0j",
      yearly: "https://buy.stripe.com/9B65kC9w8bTWdE51Wh4wM0q",
    },
    tier_3: {
      monthly: "https://buy.stripe.com/7sY9AS7o03nq2Zr9oJ4wM06",
      term: "https://buy.stripe.com/3cI3cudMo6zCeI9bwR4wM0l",
      yearly: "https://buy.stripe.com/7sY00ieQs9LO57zdEZ4wM0r",
    },
  },
} as const;

type PricingTierKey = "tier_1" | "tier_2" | "tier_3";

export function getStripeLink(
  tier: PricingTierKey,
  cycle: BillingCycle
): string | null {
  return STRIPE_LINKS.student?.[tier]?.[cycle] ?? null;
}

import type { BillingCycle } from "./pricing-config";

/**
 * Stripe Payment Links for all plans, organized by role → plan → billing cycle.
 * These are direct Stripe Checkout links (not session-based).
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
  tutor: {
    tier_1: {
      monthly: "https://buy.stripe.com/7sY4gy0ZCgac0Rj0Sd4wM07",
      term: "https://buy.stripe.com/9B64gybEgcY0cA17gB4wM0m",
      yearly: "https://buy.stripe.com/7sYdR88s47DGcA1cAV4wM0s",
    },
    tier_2: {
      monthly: "https://buy.stripe.com/fZu00ibEg7DG43v9oJ4wM08",
      term: "https://buy.stripe.com/cNi28qcIk4rugQhcAV4wM0n",
      yearly: "https://buy.stripe.com/9B67sKaAc6zC57zdEZ4wM0t",
    },
    tier_3: {
      monthly: "https://buy.stripe.com/3cIcN45fS6zCfMd58t4wM09",
      term: "https://buy.stripe.com/8x28wO23G6zC7fH1Wh4wM0o",
      yearly: "https://buy.stripe.com/cNi5kC0ZC8HK9nPcAV4wM0u",
    },
  },
} as const;

type PricingTierKey = "tier_1" | "tier_2" | "tier_3";
type RoleKey = "student" | "tutor";

export function getStripeLink(
  role: RoleKey,
  tier: PricingTierKey,
  cycle: BillingCycle
): string | null {
  return STRIPE_LINKS[role]?.[tier]?.[cycle] ?? null;
}

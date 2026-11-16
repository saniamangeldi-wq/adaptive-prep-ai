/**
 * Plans, prices and billing cycles as they were sold in the old app.
 * Prices, names and tier ids here must not change: real customers may hold
 * these subscriptions (see src/test/app/stripeLinks.test.ts for the snapshot).
 *
 * What a plan GIVES is not written here. It is derived from the server's
 * constants in src/lib/plan-features.ts so the page cannot drift from them.
 */

export const BILLING_MULTIPLIERS = {
  monthly: 1,
  term: 0.9,
  yearly: 0.8,
} as const;

export const BILLING_PERIOD_MONTHS = {
  monthly: 1,
  term: 3,
  yearly: 12,
} as const;

export type BillingCycle = keyof typeof BILLING_MULTIPLIERS;

export function calcPrice(base: number, cycle: BillingCycle): number {
  return Math.round(base * BILLING_MULTIPLIERS[cycle]);
}

export function fmtKZT(amount: number): string {
  return `₸${amount.toLocaleString("ru-RU")}`;
}

export function fmtUSD(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

export type TierId = "tier_0" | "tier_1" | "tier_2" | "tier_3";

export interface Plan {
  /** Plan id from the old pricing config. */
  id: string;
  /** Database tier id stored in profiles.tier. */
  tierId: TierId;
  /** Marketing name customers already saw. */
  name: string;
  badge: string | null;
  monthlyPriceKZT: number;
  monthlyPriceUSD: number;
  mostPopular: boolean;
}

export const PLANS: readonly Plan[] = [
  { id: "student-free", tierId: "tier_0", name: "Free", badge: null, monthlyPriceKZT: 0, monthlyPriceUSD: 0, mostPopular: false },
  { id: "student-basic", tierId: "tier_1", name: "Basic", badge: null, monthlyPriceKZT: 2500, monthlyPriceUSD: 5, mostPopular: false },
  { id: "student-pro", tierId: "tier_2", name: "Pro", badge: "Most Popular", monthlyPriceKZT: 4990, monthlyPriceUSD: 10, mostPopular: true },
  { id: "student-elite", tierId: "tier_3", name: "Elite", badge: null, monthlyPriceKZT: 9900, monthlyPriceUSD: 21, mostPopular: false },
];

export function getPlan(tierId: string | null | undefined): Plan {
  return PLANS.find((p) => p.tierId === tierId) ?? PLANS[0];
}

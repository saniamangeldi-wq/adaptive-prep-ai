import { PLANS, type TierId } from "@/lib/pricing-config";

/**
 * What the billing page shows and offers, as pure functions so it can be tested.
 *
 *  - free:       tier_0, no trial.
 *  - trial:      is_trial = true. A trial is not a paid subscription and has no card on file.
 *  - paid:       tier_1..tier_3 with a subscription.
 *  - cancelling: paid, and the user has cancelled (access runs to the end of the paid period).
 */
export type BillingState = "free" | "trial" | "paid" | "cancelling";

export interface CancellationRow {
  created_at: string;
  access_until: string | null;
}

export interface BillingInput {
  tierId: string;
  isTrial: boolean;
  subscriptionEndsAt: string | null;
  /** The user's most recent row in subscription_cancellations, if any. */
  latestCancellation: CancellationRow | null;
  now?: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The webhook does not mirror Stripe's "cancel at period end" onto the profile, so a
 * cancellation is read from the user's own subscription_cancellations row. It counts only
 * while it is still current: access_until is in the future and the subscription has not
 * been renewed past it since (a renewal moves subscription_ends_at forward).
 */
export function isCancelling(input: BillingInput): boolean {
  const { latestCancellation: c, subscriptionEndsAt, now = new Date() } = input;
  if (!c || !c.access_until) return false;
  const until = new Date(c.access_until).getTime();
  if (Number.isNaN(until) || until < now.getTime()) return false;
  if (subscriptionEndsAt) {
    const ends = new Date(subscriptionEndsAt).getTime();
    if (!Number.isNaN(ends) && ends > until + 2 * DAY_MS) return false;
  }
  return true;
}

export function billingState(input: BillingInput): BillingState {
  if (input.isTrial) return "trial";
  if (input.tierId === "tier_0") return "free";
  return isCancelling(input) ? "cancelling" : "paid";
}

export type PlanAction =
  | "current" // this is the user's plan
  | "free_forever" // the free card when the user is on a paid plan or trial: no purchase, shown as info
  | "subscribe" // free or trial user buys the plan
  | "upgrade" // paid user, plan above the current one
  | "downgrade" // paid user, paid plan below the current one
  | "resubscribe"; // cancelling user, same plan as before

const ORDER: TierId[] = ["tier_0", "tier_1", "tier_2", "tier_3"];

export function actionForPlan(state: BillingState, currentTier: string, planTier: TierId): PlanAction {
  if (planTier === "tier_0") return state === "free" ? "current" : "free_forever";
  if (state === "free" || state === "trial") return "subscribe";
  if (planTier === currentTier) return state === "cancelling" ? "resubscribe" : "current";
  return ORDER.indexOf(planTier) > ORDER.indexOf(currentTier as TierId) ? "upgrade" : "downgrade";
}

export interface BillingActions {
  plans: { tierId: TierId; action: PlanAction }[];
  /** Whether the cancel button is shown. Only a live paid subscription can be cancelled. */
  canCancel: boolean;
}

export function billingActions(state: BillingState, currentTier: string): BillingActions {
  return {
    plans: PLANS.map((p) => ({ tierId: p.tierId, action: actionForPlan(state, currentTier, p.tierId) })),
    canCancel: state === "paid",
  };
}

export function daysUntil(iso: string | null, now: Date = new Date()): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.ceil((t - now.getTime()) / DAY_MS));
}

/**
 * Daily credits, reproducing the old student-chat behaviour exactly:
 *   - each profile has credits_remaining and credits_reset_at;
 *   - on the first paid call of a new (UTC) day, credits_remaining is SET to
 *     the daily allowance for the tier (trial users get the trial allowance);
 *   - then `consume_ai_credits(_user_id, _cost)` atomically subtracts the cost
 *     and returns the remaining balance, or -1 if the balance is too low.
 *
 * The old function only did the reset inside student-chat; here every paid
 * function does it (via spendCredits), so limits reset each day for everyone
 * no matter which feature they use first.
 *
 * Refunds: `consume_ai_credits` raises an exception for a negative cost, so it
 * cannot give credits back. refundCredits() instead does a compare-and-swap
 * UPDATE on profiles.credits_remaining with the service role (no schema change):
 * read the balance, write balance + cost only if the balance is unchanged,
 * retry up to 3 times. Lost-update safe; if every try races, the refund is
 * skipped and logged (the student loses at most one call's credits).
 */

/** Same numbers as the old student-chat. */
export const TIER_DAILY_CREDITS: Record<string, number> = {
  tier_0: 15,
  tier_1: 40,
  tier_2: 100,
  tier_3: 200,
};
export const TRIAL_DAILY_CREDITS = 75;

export function dailyCreditLimit(tier: string | null | undefined, isTrial: boolean | null | undefined): number {
  if (isTrial) return TRIAL_DAILY_CREDITS;
  return TIER_DAILY_CREDITS[tier ?? ""] ?? TIER_DAILY_CREDITS.tier_0;
}

/**
 * True when the last reset was on a different calendar day. The old code used
 * Date#toDateString(), i.e. the runtime's local day; edge functions run in UTC,
 * so this compares UTC days explicitly (same result on the server).
 */
export function shouldResetCredits(creditsResetAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!creditsResetAt) return true;
  const last = new Date(creditsResetAt);
  if (Number.isNaN(last.getTime())) return true;
  return (
    last.getUTCFullYear() !== now.getUTCFullYear() ||
    last.getUTCMonth() !== now.getUTCMonth() ||
    last.getUTCDate() !== now.getUTCDate()
  );
}

// ───────────────────────── DB helpers (service-role client injected) ─────────────────────────

// The Supabase client is passed in untyped so this file needs no npm/URL import.
// deno-lint-ignore no-explicit-any
type Db = any;

export type SpendResult =
  | { ok: true; remaining: number }
  | { ok: false; reason: "no_credits" | "error"; detail?: string };

/** Daily reset (if due) then atomic spend. `admin` must be a service-role client. */
export async function spendCredits(admin: Db, userId: string, cost: number, now: Date = new Date()): Promise<SpendResult> {
  const { data: profile, error } = await admin
    .from("profiles")
    .select("tier, is_trial, credits_reset_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { ok: false, reason: "error", detail: String(error.message ?? error) };
  if (!profile) return { ok: false, reason: "error", detail: "profile not found" };

  if (shouldResetCredits(profile.credits_reset_at, now)) {
    const limit = dailyCreditLimit(profile.tier, profile.is_trial);
    // Compare-and-swap on the old reset timestamp so two concurrent first calls reset only once.
    let q = admin.from("profiles").update({ credits_remaining: limit, credits_reset_at: now.toISOString() }).eq("user_id", userId);
    q = profile.credits_reset_at ? q.eq("credits_reset_at", profile.credits_reset_at) : q.is("credits_reset_at", null);
    const { error: resetError } = await q;
    if (resetError) console.error("credits: daily reset failed", resetError);
  }

  const { data: remaining, error: rpcError } = await admin.rpc("consume_ai_credits", { _user_id: userId, _cost: cost });
  if (rpcError) return { ok: false, reason: "error", detail: String(rpcError.message ?? rpcError) };
  if (typeof remaining !== "number" || remaining < 0) return { ok: false, reason: "no_credits" };
  return { ok: true, remaining };
}

/** Give credits back after a failed paid call. Returns the new balance, or null if it could not be done. */
export async function refundCredits(admin: Db, userId: string, cost: number): Promise<number | null> {
  if (!(cost > 0)) return null;
  for (let i = 0; i < 3; i++) {
    const { data: row, error } = await admin.from("profiles").select("credits_remaining").eq("user_id", userId).maybeSingle();
    if (error || !row || typeof row.credits_remaining !== "number") break;
    const current = row.credits_remaining;
    const { data: updated, error: updError } = await admin
      .from("profiles")
      .update({ credits_remaining: current + cost })
      .eq("user_id", userId)
      .eq("credits_remaining", current)
      .select("credits_remaining");
    if (updError) break;
    if (Array.isArray(updated) && updated.length === 1) return updated[0].credits_remaining as number;
  }
  console.error("credits: refund failed", { userId, cost });
  return null;
}

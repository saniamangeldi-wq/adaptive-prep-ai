import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TIER_DAILY_CREDITS, TRIAL_DAILY_CREDITS, shouldResetCredits } from "@ielts/credits";
import { getPlan } from "@/lib/pricing-config";

export interface PlanState {
  tierId: string;
  planName: string;
  isTrial: boolean;
  dailyCredits: number;
  creditsRemaining: number | null;
  subscriptionEndsAt: string | null;
  /** Extra to the agreed shape: when the trial ends, if on a trial. */
  trialEndsAt: string | null;
  loading: boolean;
}

interface PlanRow {
  tier: string | null;
  is_trial: boolean | null;
  trial_ends_at: string | null;
  credits_remaining: number | null;
  credits_reset_at?: string | null;
  subscription_ends_at: string | null;
}

/** Pure mapping from a profiles row to the plan state (unit-tested). */
export function planFromRow(row: PlanRow | null, loading = false, now: Date = new Date()): PlanState {
  const tierId = row?.tier && row.tier in TIER_DAILY_CREDITS ? row.tier : "tier_0";
  const isTrial = row?.is_trial === true;
  const dailyCredits = isTrial ? TRIAL_DAILY_CREDITS : TIER_DAILY_CREDITS[tierId];
  // The server tops credits up lazily, on the first paid call of a new UTC day. Until
  // then the stored balance is yesterday's, so show what the next call will start from.
  const creditsRemaining =
    row && shouldResetCredits(row.credits_reset_at, now) ? dailyCredits : row?.credits_remaining ?? null;
  return {
    tierId,
    planName: getPlan(tierId).name,
    isTrial,
    // Same rule as dailyCreditLimit() on the server.
    dailyCredits,
    creditsRemaining,
    subscriptionEndsAt: row?.subscription_ends_at ?? null,
    trialEndsAt: isTrial ? row?.trial_ends_at ?? null : null,
    loading,
  };
}

/** The signed-in user's plan, read from their `profiles` row. */
export function usePlan(): PlanState {
  const { user } = useAuth();
  const [state, setState] = useState<PlanState>(() => planFromRow(null, true));

  useEffect(() => {
    if (!user) {
      setState(planFromRow(null, false));
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("tier, is_trial, trial_ends_at, credits_remaining, credits_reset_at, subscription_ends_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) console.error("usePlan: could not read profile", error);
      setState(planFromRow((data as PlanRow | null) ?? null, false));
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return state;
}

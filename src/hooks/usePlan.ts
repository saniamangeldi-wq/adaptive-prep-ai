import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TIER_DAILY_CREDITS, TRIAL_DAILY_CREDITS } from "@ielts/credits";
import { getPlan } from "@/lib/pricing-config";

export interface PlanState {
  tierId: string;
  planName: string;
  isTrial: boolean;
  dailyCredits: number;
  creditsRemaining: number | null;
  subscriptionEndsAt: string | null;
  loading: boolean;
}

interface PlanRow {
  tier: string | null;
  is_trial: boolean | null;
  trial_ends_at: string | null;
  credits_remaining: number | null;
  subscription_ends_at: string | null;
}

/** Pure mapping from a profiles row to the plan state (unit-tested). */
export function planFromRow(row: PlanRow | null, loading = false): PlanState {
  const tierId = row?.tier && row.tier in TIER_DAILY_CREDITS ? row.tier : "tier_0";
  const isTrial = row?.is_trial === true;
  return {
    tierId,
    planName: getPlan(tierId).name,
    isTrial,
    // Same rule as dailyCreditLimit() on the server.
    dailyCredits: isTrial ? TRIAL_DAILY_CREDITS : TIER_DAILY_CREDITS[tierId],
    creditsRemaining: row?.credits_remaining ?? null,
    subscriptionEndsAt: row?.subscription_ends_at ?? null,
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
        .select("tier, is_trial, trial_ends_at, credits_remaining, subscription_ends_at")
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

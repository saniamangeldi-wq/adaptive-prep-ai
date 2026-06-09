import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PaywallVariant = "coach" | "tests" | "universities";

const COOLDOWN_HOURS = 48;

/**
 * Returns:
 *  - isOpen: whether the modal should be visible right now
 *  - trigger(): call this when the user just hit a value moment
 *  - close(reason): dismiss the modal and record a cooldown
 */
export function useUpgradeModal(variant: PaywallVariant) {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [canTrigger, setCanTrigger] = useState(false);

  // Free-tier (tier_0) and non-trial only. Trial / paid users never see it.
  const eligible =
    !!profile &&
    profile.tier === "tier_0" &&
    !profile.is_trial;

  useEffect(() => {
    if (!eligible || !profile?.user_id) {
      setCanTrigger(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const cutoff = new Date(Date.now() - COOLDOWN_HOURS * 3600 * 1000).toISOString();
      const { data } = await supabase
        .from("paywall_dismissals")
        .select("id")
        .eq("user_id", profile.user_id)
        .eq("variant", variant)
        .gte("dismissed_at", cutoff)
        .limit(1);
      if (cancelled) return;
      setCanTrigger(!data || data.length === 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [eligible, profile?.user_id, variant]);

  const trigger = useCallback(() => {
    if (eligible && canTrigger && !isOpen) {
      setIsOpen(true);
    }
  }, [eligible, canTrigger, isOpen]);

  const close = useCallback(async () => {
    setIsOpen(false);
    if (!profile?.user_id) return;
    await supabase.from("paywall_dismissals").insert({
      user_id: profile.user_id,
      variant,
    });
    setCanTrigger(false);
  }, [profile?.user_id, variant]);

  return { isOpen, trigger, close, eligible };
}

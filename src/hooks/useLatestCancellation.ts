import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { CancellationRow } from "@/lib/billing-state";

/**
 * The user's most recent cancellation request (own rows only, RLS allows SELECT).
 * Needed because the webhook does not copy Stripe's "cancel at period end" onto the profile.
 */
export function useLatestCancellation(refreshKey = 0) {
  const { user } = useAuth();
  const [row, setRow] = useState<CancellationRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRow(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("subscription_cancellations")
        .select("created_at, access_until")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) console.error("Could not read cancellations", error);
      setRow((data as CancellationRow | null) ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, refreshKey]);

  return { latestCancellation: row, loading };
}

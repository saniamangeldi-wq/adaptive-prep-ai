import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface IeltsTrial {
  started_at: string;
  ends_at: string;
  converted: boolean;
}

/**
 * Hidden-feature gate. Access is granted by a per-account flag or by the
 * student's school having IELTS switched on. Everything stays invisible
 * otherwise — the routes 404 rather than showing a locked screen.
 */
export function useIeltsAccess() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [trial, setTrial] = useState<IeltsTrial | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setHasAccess(false);
      setTrial(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: access }, { data: trialRow }] = await Promise.all([
      supabase.rpc("has_ielts_access", { _user_id: user.id }),
      supabase
        .from("ielts_trials")
        .select("started_at, ends_at, converted")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    setHasAccess(Boolean(access));
    setTrial(trialRow ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const startTrial = useCallback(async () => {
    if (!user || trial) return;
    const { data } = await supabase
      .from("ielts_trials")
      .insert({ user_id: user.id })
      .select("started_at, ends_at, converted")
      .maybeSingle();
    if (data) setTrial(data);
  }, [user, trial]);

  const daysLeft = trial
    ? Math.max(0, Math.ceil((new Date(trial.ends_at).getTime() - Date.now()) / 86400000))
    : null;
  const trialExpired = Boolean(trial && !trial.converted && new Date(trial.ends_at) < new Date());

  return { loading, hasAccess, trial, daysLeft, trialExpired, startTrial, refresh: load };
}

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface VoicePlanLimits {
  minutesPerMonth: number;
  planLabel: string;
}

export function getVoiceMinutesLimit(tier: string | undefined, role?: string): VoicePlanLimits {
  // School-level limits are handled separately via aggregation
  switch (tier) {
    case "tier_0":
      return { minutesPerMonth: 0, planLabel: "Free" };
    case "tier_1":
      return { minutesPerMonth: 0, planLabel: "Basic" };
    case "tier_2":
      return { minutesPerMonth: 30, planLabel: "Pro" };
    case "tier_3":
      return { minutesPerMonth: 200, planLabel: "Elite" };
    default:
      return { minutesPerMonth: 0, planLabel: "Free" };
  }
}

export function useVoiceMinutes() {
  const { user, profile } = useAuth();
  const [minutesUsed, setMinutesUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const limits = getVoiceMinutesLimit(profile?.tier);
  const monthYear = new Date().toISOString().slice(0, 7); // YYYY-MM

  const fetchUsage = useCallback(async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from("voice_usage")
      .select("seconds_used")
      .eq("user_id", user.id)
      .eq("month_year", monthYear)
      .maybeSingle();

    setMinutesUsed(data ? Math.ceil(data.seconds_used / 60) : 0);
    setIsLoading(false);
  }, [user?.id, monthYear]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const addUsage = useCallback(async (seconds: number) => {
    if (!user?.id) return;

    const { data: existing } = await supabase
      .from("voice_usage")
      .select("id, seconds_used")
      .eq("user_id", user.id)
      .eq("month_year", monthYear)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("voice_usage")
        .update({ 
          seconds_used: existing.seconds_used + seconds,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("voice_usage")
        .insert({
          user_id: user.id,
          seconds_used: seconds,
          month_year: monthYear,
        });
    }

    await fetchUsage();
  }, [user?.id, monthYear, fetchUsage]);

  const percentUsed = limits.minutesPerMonth > 0 
    ? Math.min(100, Math.round((minutesUsed / limits.minutesPerMonth) * 100)) 
    : 0;

  const isWarning = percentUsed >= 80 && percentUsed < 100;
  const isExhausted = limits.minutesPerMonth > 0 && minutesUsed >= limits.minutesPerMonth;
  const hasVoiceAccess = limits.minutesPerMonth > 0;

  // Reset date = 1st of next month
  const now = new Date();
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const resetDateStr = resetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return {
    minutesUsed,
    minutesLimit: limits.minutesPerMonth,
    percentUsed,
    isWarning,
    isExhausted,
    hasVoiceAccess,
    resetDateStr,
    planLabel: limits.planLabel,
    addUsage,
    isLoading,
  };
}

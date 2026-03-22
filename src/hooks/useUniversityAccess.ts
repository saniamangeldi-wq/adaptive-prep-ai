import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function useUniversityAccess() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [hasActiveAccess, setHasActiveAccess] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const isElite = profile?.tier === "tier_3";

  const checkAccess = useCallback(async () => {
    if (!user) {
      setHasActiveAccess(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("university_access_grants")
        .select("expires_at")
        .eq("user_id", user.id)
        .gte("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const exp = new Date(data[0].expires_at);
        setExpiresAt(exp);
        setHasActiveAccess(true);
        setRemainingSeconds(Math.max(0, Math.floor((exp.getTime() - Date.now()) / 1000)));
      } else {
        setHasActiveAccess(false);
        setExpiresAt(null);
        setRemainingSeconds(0);
      }
    } catch (err) {
      console.error("Error checking university access:", err);
      setHasActiveAccess(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  // Countdown timer
  useEffect(() => {
    if (!hasActiveAccess || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setHasActiveAccess(false);
          setExpiresAt(null);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [hasActiveAccess, remainingSeconds]);

  const purchaseAccess = useCallback(async (currency: "usd" | "kzt" = "usd") => {
    if (!user) return;
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-university-payment", {
        body: { currency },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Error creating payment:", err);
    } finally {
      setPurchasing(false);
    }
  }, [user]);

  const verifyPayment = useCallback(async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-university-payment", {
        body: { session_id: sessionId },
      });
      if (error) throw error;
      if (data?.granted) {
        if (data.type === "credits") {
          toast({
            title: "Bonus credits added!",
            description: `+${data.credits_added} credits added to your account. New total: ${data.new_total}`,
          });
        } else {
          await checkAccess();
          toast({
            title: "Access granted!",
            description: "You have 10 minutes of University Match access.",
          });
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error verifying payment:", err);
      return false;
    }
  }, [checkAccess, toast]);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  return {
    hasActiveAccess,
    expiresAt,
    remainingSeconds,
    formattedTime: formatTime(remainingSeconds),
    loading,
    purchasing,
    purchaseAccess,
    verifyPayment,
    checkAccess,
    isElite,
  };
}

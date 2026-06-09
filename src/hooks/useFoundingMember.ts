import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const FOUNDING_MEMBER_CAP = 100;
export const FOUNDING_PRICE_USD = 5;
export const FOUNDING_PRICE_KZT = 2500;

export function useFoundingMemberCount() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_founding_member_count");
      if (cancelled) return;
      if (error) {
        console.error("[useFoundingMemberCount]", error);
        setCount(0);
      } else {
        setCount((data as number) ?? 0);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const spotsLeft = count === null ? null : Math.max(0, FOUNDING_MEMBER_CAP - count);
  const isAvailable = spotsLeft !== null && spotsLeft > 0;

  return { count, spotsLeft, isAvailable, loading };
}

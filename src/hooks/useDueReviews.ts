import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * How many spaced-repetition cards are due for review today for the current user.
 * Powers the "Due for review today" dashboard badge.
 */
export function useDueReviews() {
  const { user } = useAuth();
  const [dueCount, setDueCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setDueCount(0);
      setLoading(false);
      return;
    }
    try {
      const { count, error } = await supabase
        .from("flashcard_card_state" as never)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .lte("next_review_at", new Date().toISOString());
      if (error) throw error;
      setDueCount(count ?? 0);
    } catch (err) {
      console.error("useDueReviews failed", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { dueCount, loading, refresh };
}

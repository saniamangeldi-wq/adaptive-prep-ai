import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { schedule, initialState, RATING_TO_QUALITY, DEFAULT_EASE } from "@/lib/sm2";

export type Rating = "again" | "hard" | "good" | "easy";

interface CardStateRow {
  card_index: number;
  ease: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string;
}

/**
 * Loads spaced-repetition state for every card in a deck and provides a
 * `rateCard` function that persists the new schedule via SM-2.
 */
export function useCardSchedule(deckId: string | undefined) {
  const { user } = useAuth();
  const [states, setStates] = useState<Record<number, CardStateRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !deckId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("flashcard_card_state" as never)
        .select("card_index, ease, interval_days, repetitions, next_review_at")
        .eq("user_id", user.id)
        .eq("deck_id", deckId);
      if (cancelled) return;
      if (error) {
        console.error("useCardSchedule load failed", error);
      } else {
        const map: Record<number, CardStateRow> = {};
        (data as CardStateRow[] | null)?.forEach((r) => { map[r.card_index] = r; });
        setStates(map);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, deckId]);

  const rateCard = useCallback(async (cardIndex: number, rating: Rating) => {
    if (!user || !deckId) return;
    const prev = states[cardIndex] ?? {
      card_index: cardIndex,
      ease: DEFAULT_EASE,
      interval_days: initialState().intervalDays,
      repetitions: initialState().repetitions,
      next_review_at: new Date().toISOString(),
    };
    const next = schedule(
      { ease: prev.ease, intervalDays: prev.interval_days, repetitions: prev.repetitions },
      RATING_TO_QUALITY[rating],
    );
    const row = {
      user_id: user.id,
      deck_id: deckId,
      card_index: cardIndex,
      ease: next.ease,
      interval_days: next.intervalDays,
      repetitions: next.repetitions,
      next_review_at: next.nextReviewAt.toISOString(),
      last_reviewed_at: next.lastReviewedAt.toISOString(),
      last_quality: next.lastQuality,
    };
    setStates((s) => ({
      ...s,
      [cardIndex]: {
        card_index: cardIndex,
        ease: row.ease,
        interval_days: row.interval_days,
        repetitions: row.repetitions,
        next_review_at: row.next_review_at,
      },
    }));
    const { error } = await supabase
      .from("flashcard_card_state" as never)
      .upsert(row, { onConflict: "user_id,deck_id,card_index" });
    if (error) console.error("useCardSchedule upsert failed", error);
    return next;
  }, [user, deckId, states]);

  const dueCount = Object.values(states).filter(
    (s) => new Date(s.next_review_at).getTime() <= Date.now()
  ).length;

  return { states, rateCard, loading, dueCount };
}

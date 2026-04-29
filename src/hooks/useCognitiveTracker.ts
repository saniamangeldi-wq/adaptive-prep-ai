import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type LogPayload = {
  event_type: "practice_answer" | "lesson_checkpoint" | "test_question";
  subject?: string;
  difficulty?: string;
  response_time_ms?: number;
  was_correct?: boolean;
  used_hint?: boolean;
  retry_count?: number;
  metadata?: Record<string, any>;
};

/**
 * Passive cognitive signal tracker.
 * Call `start()` when a question/checkpoint appears, then `log({...})` on submit.
 */
export function useCognitiveTracker() {
  const { user } = useAuth();
  const startRef = useRef<number | null>(null);

  const start = useCallback(() => {
    startRef.current = performance.now();
  }, []);

  const log = useCallback(
    async (payload: LogPayload) => {
      if (!user) return;
      const responseMs =
        payload.response_time_ms ??
        (startRef.current ? Math.round(performance.now() - startRef.current) : undefined);
      startRef.current = null;

      await supabase.from("cognitive_events" as any).insert({
        user_id: user.id,
        ...payload,
        response_time_ms: responseMs,
      });

      // Lightweight rolling refinement: every ~10 events, recompute deltas client-side.
      // (A scheduled edge function can do heavier aggregation later.)
    },
    [user]
  );

  return { start, log };
}

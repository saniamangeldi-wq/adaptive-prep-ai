import { supabase } from "@/integrations/supabase/client";
import type { Question } from "@/lib/test-generator";
import { validateQuestion } from "@/lib/sat-content";

export type VisualHealthEventType =
  | "validated"
  | "fallback_rendered"
  | "quarantined"
  | "delivery_blocked";

/**
 * Fire-and-forget audit log for visual health problems. Never throws and never
 * blocks rendering — a failed log must not break a test in progress.
 */
export function logVisualHealthEvent(
  question: Question,
  event_type: VisualHealthEventType,
  visual_status: "ok" | "missing" | "unreachable" | "invalid",
  practice_set_id?: string
): void {
  try {
    const result = validateQuestion(question);
    void supabase.from("visual_health_events").insert({
      question_id: question.id,
      practice_set_id: practice_set_id ?? null,
      event_type,
      visual_requirement: result.visual_requirement,
      media_type: result.media_type ?? null,
      visual_status,
      fallback_used: result.fallback_used ?? null,
      failure_reasons: result.failure_reasons,
    });
  } catch {
    /* audit logging is best-effort */
  }
}

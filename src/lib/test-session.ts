import { supabase } from "@/integrations/supabase/client";
import type { GeneratedTest, Question } from "@/lib/test-generator";
import type { TestFlowState } from "@/lib/sat-test-config";

export interface PersistedModule {
  questions: Question[];
  answers: Record<string, string>;
  flagged: string[];
  score?: number;
  timeSpent?: number;
}

export interface PersistedSession {
  version: 1;
  test: GeneratedTest;
  flowState: TestFlowState;
  currentIndex: number;
  reading_writing: { module1: PersistedModule; module2: PersistedModule };
  math: { module1: PersistedModule; module2: PersistedModule };
}

export interface ResumePayload {
  attemptId: string;
  session: PersistedSession;
  /** Seconds left on the current module, derived from the server-side deadline. */
  remainingSeconds: number | null;
}

/**
 * Writes a snapshot of the live test session onto the attempt row.
 * The module deadline lives server-side so refreshing (or clearing browser
 * storage) can never hand the student extra time.
 */
export async function saveSession(
  attemptId: string,
  session: PersistedSession,
  deadlineAt: string | null
): Promise<void> {
  const patch: Record<string, unknown> = {
    session_state: session as unknown as Record<string, unknown>,
    session_saved_at: new Date().toISOString(),
  };
  if (deadlineAt) patch.module_deadline_at = deadlineAt;
  await supabase.from("test_attempts").update(patch).eq("id", attemptId);
}

/** Clears the snapshot once the test is submitted. */
export async function clearSession(attemptId: string): Promise<void> {
  await supabase
    .from("test_attempts")
    .update({ session_state: null, module_deadline_at: null })
    .eq("id", attemptId);
}

/** Finds the most recent resumable attempt for the signed-in user. */
export async function loadResumableSession(userId: string, attemptId?: string): Promise<ResumePayload | null> {
  let query = supabase
    .from("test_attempts")
    .select("id, session_state, module_deadline_at")
    .eq("user_id", userId)
    .is("completed_at", null)
    .not("session_state", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (attemptId) query = query.eq("id", attemptId);

  const { data, error } = await query.maybeSingle();
  if (error || !data?.session_state) return null;

  const row = data as { id: string; session_state: unknown; module_deadline_at: string | null };
  const session = row.session_state as PersistedSession;
  if (!session || session.version !== 1 || !session.test) return null;

  let remainingSeconds: number | null = null;
  if (row.module_deadline_at) {
    remainingSeconds = Math.max(
      0,
      Math.round((new Date(row.module_deadline_at).getTime() - Date.now()) / 1000)
    );
  }

  return { attemptId: row.id, session, remainingSeconds };
}

/** Deadline timestamp for a module that starts now. */
export function deadlineFromNow(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

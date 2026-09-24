import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const QUEUE_KEY = "adaptiveprep:quiz-queue";

export type QuizEventType =
  | "quiz_rendered"
  | "hint_requested"
  | "quiz_submitted"
  | "explanation_opened"
  | "question_skipped"
  | "try_again_started";

export interface QuizAttempt {
  question_id: string;
  session_id: string;
  selected_answer: string | null;
  correct_answer: string | null;
  is_correct: boolean | null;
  status: "submitted" | "skipped" | "unanswered";
  score: number | null;
  evaluation: string | null;
  hint_used: boolean;
  explanation_opened: boolean;
  response_time_seconds: number | null;
  explanation?: string | null;
  created_at: string;
}

export interface QuizSetState {
  session: { id: string; topic: string; subject: string; total_questions: number; status: string };
  registered: number;
  completed: number;
  current_sequence: number;
  is_complete: boolean;
  progress: {
    answered: number;
    correct_first_attempt: number;
    skipped: number;
    accuracy_percentage: number;
  };
}

export async function callQuizTracker<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not signed in");
  const res = await fetch(`${SUPABASE_URL}/functions/v1/quiz-tracker`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `Quiz tracker failed (${res.status})`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

/** Deterministic UUID so a widget re-rendered after refresh keeps the same id. */
export async function stableQuestionId(seed: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed));
  const h = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/* ─── Offline queue: writes retried when the connection is back ─── */
type Queued = { action: string; payload: Record<string, unknown>; at: number };

function readQueue(): Queued[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
}
function writeQueue(q: Queued[]) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-100))); } catch { /* storage full */ }
}

export async function trackOrQueue<T = any>(action: string, payload: Record<string, unknown>): Promise<T | null> {
  try {
    return await callQuizTracker<T>(action, payload);
  } catch (e) {
    const status = (e as { status?: number }).status;
    // Only queue network / server failures — not validation errors.
    if (!status || status >= 500) {
      writeQueue([...readQueue(), { action, payload, at: Date.now() }]);
      return null;
    }
    throw e;
  }
}

let flushing = false;
export async function flushQuizQueue() {
  if (flushing) return;
  const queue = readQueue();
  if (!queue.length) return;
  flushing = true;
  const remaining: Queued[] = [];
  for (const item of queue) {
    try { await callQuizTracker(item.action, item.payload); }
    catch (e) {
      const status = (e as { status?: number }).status;
      if (!status || status >= 500) remaining.push(item);
    }
  }
  writeQueue(remaining);
  flushing = false;
  if (queue.length !== remaining.length) window.dispatchEvent(new CustomEvent("adaptiveprep:quiz-changed"));
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { flushQuizQueue(); });
}

export function trackEvent(question_id: string, event_type: QuizEventType) {
  return trackOrQueue("event", { question_id, event_type }).catch(() => null);
}

/** Hidden context attached to the next AI request. */
export async function fetchQuizContext(conversationId: string | null | undefined) {
  try {
    await flushQuizQueue();
    const r = await callQuizTracker<{ context: unknown }>("context", { conversation_id: conversationId || null });
    return r.context ?? null;
  } catch {
    return null;
  }
}

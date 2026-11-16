import { supabase } from "@/integrations/supabase/client";
import type {
  DraftRecord,
  DraftRequest,
  DraftResponse,
  GetTaskRequest,
  GetTaskResponse,
  GradeRequest,
  GradeResponse,
  WritingTask,
} from "@ielts/contract.ts";
import { errorFromResponse, IeltsApiError, networkError, toApiError } from "./apiErrors";

export { IeltsApiError, describeApiError, toApiError } from "./apiErrors";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const DEFAULT_TIMEOUT_MS = 25_000;
// Grading usually takes under a minute; the server may use up to 140 s (GRADER_TOTAL_BUDGET_MS),
// so the browser waits a little longer than that rather than giving up on a grading that will succeed.
const GRADE_TIMEOUT_MS = 150_000;

async function callFunction<Res>(name: string, body: unknown, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Res> {
  let token: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
  } catch {
    // fall through: treated as not signed in below
  }
  if (!token) {
    throw new IeltsApiError({ error: "You are not signed in.", code: "unauthorized", status: 401 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(PUBLISHABLE_KEY ? { apikey: PUBLISHABLE_KEY } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    throw e instanceof Error && e.name === "AbortError" ? networkError("The request took too long.") : networkError();
  } finally {
    clearTimeout(timer);
  }

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    // empty or non-JSON body
  }

  if (!response.ok) throw errorFromResponse(response.status, json);
  if (json === null || typeof json !== "object") {
    throw new IeltsApiError({ error: "The server sent an unexpected reply.", code: "upstream_error", status: response.status });
  }
  return json as Res;
}

export async function getWritingTask(req: GetTaskRequest): Promise<GetTaskResponse> {
  try {
    const res = await callFunction<GetTaskResponse>("ielts-generate-writing-task", req);
    if (!res?.task || typeof res.task.prompt !== "string") {
      throw new IeltsApiError({ error: "The server sent an unexpected reply.", code: "upstream_error" });
    }
    return res;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function gradeWriting(req: GradeRequest): Promise<GradeResponse> {
  try {
    const res = await callFunction<GradeResponse>("ielts-grade-writing", req, GRADE_TIMEOUT_MS);
    if (!res?.report || typeof res.report !== "object") {
      throw new IeltsApiError({ error: "The server sent an unexpected reply.", code: "upstream_error" });
    }
    return res;
  } catch (e) {
    throw toApiError(e);
  }
}

async function draftCall(req: DraftRequest): Promise<DraftResponse> {
  try {
    return await callFunction<DraftResponse>("ielts-draft", req);
  } catch (e) {
    throw toApiError(e);
  }
}

export async function saveDraft(input: {
  sessionId?: string;
  task: WritingTask;
  script: string;
  secondsUsed: number;
}): Promise<{ sessionId: string; updatedAt: string }> {
  const res = await draftCall({ action: "save", ...input });
  if (res.action !== "save" || !res.sessionId) {
    throw new IeltsApiError({ error: "The server sent an unexpected reply.", code: "upstream_error" });
  }
  return { sessionId: res.sessionId, updatedAt: res.updatedAt };
}

export async function getDraft(sessionId: string): Promise<DraftRecord | null> {
  const res = await draftCall({ action: "get", sessionId });
  return res.action === "get" ? res.draft ?? null : null;
}

export async function listDrafts(): Promise<DraftRecord[]> {
  const res = await draftCall({ action: "list" });
  return res.action === "list" && Array.isArray(res.drafts) ? res.drafts : [];
}

export async function discardDraft(sessionId: string): Promise<void> {
  await draftCall({ action: "discard", sessionId });
}

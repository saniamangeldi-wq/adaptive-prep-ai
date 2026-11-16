/**
 * Input validation for the four edge functions, and draft row mapping. Pure.
 * Every check here runs BEFORE any credit is spent.
 */

import type {
  ApiError,
  CustomVisualInput,
  DraftRecord,
  DraftRequest,
  FeedbackLang,
  GetTaskRequest,
  GradeRequest,
  TaskType,
  TaskVariant,
  WritingTask,
} from "./contract.ts";
import { LIMITS, VARIANTS_BY_TASK } from "./contract.ts";
import { countWords } from "./text.ts";
import { getBankTask } from "./taskBank.ts";
import { validateWritingTask, withServerRules } from "./visuals.ts";

export type Failed = { ok: false; status: number; error: ApiError };
export type Checked<T> = { ok: true; value: T } | Failed;

const bad = (error: string, code: ApiError["code"] = "bad_request", status = 400): Failed => ({
  ok: false,
  status,
  error: { error, code },
});

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const LANGS: readonly FeedbackLang[] = ["en", "ru", "kk"];
export const isFeedbackLang = (v: unknown): v is FeedbackLang => typeof v === "string" && (LANGS as readonly string[]).includes(v);
const TASK_TYPES: readonly TaskType[] = ["task1_academic", "task1_general", "task2"];

/** Hard cap on script size in characters, independent of words (defends against one 50k-char "word"). */
export const MAX_SCRIPT_CHARS = 8_000;
export const MAX_VISUAL_DESCRIPTION_CHARS = 2_000;

const IMAGE_DATA_URL = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)$/;

/** Decoded byte size of a base64 payload. */
export function base64DecodedBytes(b64: string): number {
  const s = b64.replace(/\s/g, "");
  const padding = s.endsWith("==") ? 2 : s.endsWith("=") ? 1 : 0;
  return Math.floor((s.length * 3) / 4) - padding;
}

function checkCustomVisual(v: unknown): Checked<CustomVisualInput | undefined> {
  if (v === undefined || v === null) return { ok: true, value: undefined };
  if (!isObj(v)) return bad("customVisual must be an object.");
  const out: CustomVisualInput = {};
  if (v.imageDataUrl !== undefined && v.imageDataUrl !== null && v.imageDataUrl !== "") {
    if (typeof v.imageDataUrl !== "string") return bad("customVisual.imageDataUrl must be a string.");
    const m = v.imageDataUrl.match(IMAGE_DATA_URL);
    if (!m) return bad("The image must be a PNG, JPEG or WebP data URL.");
    if (base64DecodedBytes(m[2]) > LIMITS.maxImageBytes)
      return bad(`The image is too large (max ${(LIMITS.maxImageBytes / 1_000_000).toFixed(1)} MB).`, "too_long", 413);
    out.imageDataUrl = v.imageDataUrl.replace(/\s/g, "");
  }
  if (v.description !== undefined && v.description !== null && v.description !== "") {
    if (typeof v.description !== "string") return bad("customVisual.description must be a string.");
    if (v.description.length > MAX_VISUAL_DESCRIPTION_CHARS) return bad(`The visual description is too long (max ${MAX_VISUAL_DESCRIPTION_CHARS} characters).`, "too_long");
    out.description = v.description.trim();
  }
  return { ok: true, value: out.imageDataUrl || out.description ? out : undefined };
}

/**
 * Resolve the task the student answered. Bank tasks are replaced by the
 * server's own copy (the client cannot alter wording or data); generated and
 * custom tasks are validated, and server-owned fields are reset.
 */
export function resolveTask(raw: unknown): Checked<WritingTask> {
  if (!isObj(raw)) return bad("The task is missing.");
  if (raw.source === "bank") {
    if (typeof raw.id !== "string") return bad("Bank task id is missing.");
    const t = getBankTask(raw.id);
    if (!t) return bad("Unknown task id.", "not_found", 404);
    return { ok: true, value: t };
  }
  const errors = validateWritingTask(raw);
  if (errors.length) return bad(`Invalid task: ${errors.slice(0, 5).join("; ")}`);
  const t = raw as unknown as WritingTask;
  const clean: WritingTask = withServerRules({
    id: t.source === "custom" ? "custom" : t.id,
    source: t.source,
    taskType: t.taskType,
    variant: t.variant,
    prompt: t.prompt.trim(),
    bullets: t.bullets.map((b) => b.trim()).filter(Boolean),
    visuals: t.visuals,
    ...(typeof t.topic === "string" && t.topic.trim() ? { topic: t.topic.trim().slice(0, 120) } : {}),
    minWords: t.minWords,
    timeMinutes: t.timeMinutes,
  });
  return { ok: true, value: clean };
}

export interface ValidGradeRequest {
  task: WritingTask;
  script: string;
  feedbackLang: FeedbackLang;
  sessionId: string | null;
  customVisual?: CustomVisualInput;
  includeModelAnswer: boolean;
}

export function validateGradeRequest(body: unknown): Checked<ValidGradeRequest> {
  if (!isObj(body)) return bad("Request body must be a JSON object.");
  const task = resolveTask(body.task);
  if (task.ok === false) return task as Failed;

  if (typeof body.script !== "string") return bad("The answer is missing.");
  const script = body.script.replace(/\u0000/g, "").trim();
  if (script.length < LIMITS.minScriptChars) return bad("Write a longer answer before submitting.", "too_short");
  if (script.length > MAX_SCRIPT_CHARS || countWords(script) > LIMITS.maxScriptWords)
    return bad(`That answer is too long to mark (max ${LIMITS.maxScriptWords} words).`, "too_long", 413);

  let feedbackLang: FeedbackLang = "en";
  if (body.feedbackLang !== undefined && body.feedbackLang !== null) {
    if (!isFeedbackLang(body.feedbackLang)) return bad('feedbackLang must be "en", "ru" or "kk".');
    feedbackLang = body.feedbackLang;
  }

  let sessionId: string | null = null;
  if (body.sessionId !== undefined && body.sessionId !== null && body.sessionId !== "") {
    if (!isUuid(body.sessionId)) return bad("sessionId must be a UUID.");
    sessionId = body.sessionId;
  }

  const cv = checkCustomVisual(body.customVisual);
  if (cv.ok === false) return cv as Failed;
  // A custom visual only means something for an Academic Task 1 question without bank data.
  const customVisual = task.value.taskType === "task1_academic" && task.value.visuals.length === 0 ? cv.value : undefined;

  if (body.includeModelAnswer !== undefined && typeof body.includeModelAnswer !== "boolean") return bad("includeModelAnswer must be true or false.");
  return {
    ok: true,
    value: { task: task.value, script, feedbackLang, sessionId, customVisual, includeModelAnswer: body.includeModelAnswer === true },
  };
}

export function validateGetTaskRequest(body: unknown): Checked<GetTaskRequest & { source: "bank" | "generated" }> {
  if (!isObj(body)) return bad("Request body must be a JSON object.");
  if (typeof body.taskType !== "string" || !(TASK_TYPES as readonly string[]).includes(body.taskType)) return bad("taskType must be task1_academic, task1_general or task2.");
  const taskType = body.taskType as TaskType;
  let variant: TaskVariant | undefined;
  if (body.variant !== undefined && body.variant !== null && body.variant !== "") {
    if (typeof body.variant !== "string" || !VARIANTS_BY_TASK[taskType].includes(body.variant as TaskVariant))
      return bad(`variant must be one of ${VARIANTS_BY_TASK[taskType].join(", ")}.`);
    variant = body.variant as TaskVariant;
  }
  const source = body.source === undefined || body.source === null ? "bank" : body.source;
  if (source !== "bank" && source !== "generated") return bad('source must be "bank" or "generated".');
  let topic: string | undefined;
  if (body.topic !== undefined && body.topic !== null && body.topic !== "") {
    if (typeof body.topic !== "string") return bad("topic must be a string.");
    topic = body.topic.replace(/[\r\n]+/g, " ").trim().slice(0, 120);
  }
  let excludeIds: string[] | undefined;
  if (body.excludeIds !== undefined && body.excludeIds !== null) {
    if (!Array.isArray(body.excludeIds) || !body.excludeIds.every((x) => typeof x === "string")) return bad("excludeIds must be an array of strings.");
    excludeIds = (body.excludeIds as string[]).slice(0, 500);
  }
  return { ok: true, value: { taskType, variant, source, topic, excludeIds } };
}

/** Max seconds recorded for a draft (a day). */
const MAX_SECONDS = 86_400;

export function validateDraftRequest(body: unknown): Checked<DraftRequest> {
  if (!isObj(body)) return bad("Request body must be a JSON object.");
  switch (body.action) {
    case "list":
      return { ok: true, value: { action: "list" } };
    case "get":
    case "discard":
      if (!isUuid(body.sessionId)) return bad("sessionId must be a UUID.");
      return { ok: true, value: { action: body.action, sessionId: body.sessionId } };
    case "save": {
      if (body.sessionId !== undefined && body.sessionId !== null && !isUuid(body.sessionId)) return bad("sessionId must be a UUID.");
      const errors = validateWritingTask(body.task, { lenient: true });
      if (errors.length) return bad(`Invalid task: ${errors.slice(0, 5).join("; ")}`);
      if (typeof body.script !== "string") return bad("script must be a string.");
      if (body.script.length > MAX_SCRIPT_CHARS * 2) return bad("The draft is too long.", "too_long", 413);
      const secondsUsed = body.secondsUsed;
      if (typeof secondsUsed !== "number" || !Number.isFinite(secondsUsed) || secondsUsed < 0) return bad("secondsUsed must be a non-negative number.");
      return {
        ok: true,
        value: {
          action: "save",
          ...(body.sessionId ? { sessionId: body.sessionId as string } : {}),
          task: body.task as WritingTask,
          script: body.script,
          secondsUsed: Math.min(MAX_SECONDS, Math.round(secondsUsed)),
        },
      };
    }
    default:
      return bad('action must be "save", "get", "list" or "discard".');
  }
}

// ───────────────────────── ielts_sessions rows ↔ drafts ─────────────────────────

/** Columns written for a draft (insert/update), apart from user_id and status. */
export function draftColumns(d: { task: WritingTask; script: string; secondsUsed: number }) {
  return {
    skill: "writing",
    variant: d.task.taskType === "task1_general" ? "general" : "academic",
    mode: "practice",
    config: { kind: "writing_draft_v1", taskType: d.task.taskType, taskVariant: d.task.variant, taskId: d.task.id, source: d.task.source },
    content: { task: d.task },
    answers: { script: d.script, secondsUsed: d.secondsUsed },
  };
}

/**
 * Map an ielts_sessions row back to a DraftRecord. Returns null for rows that
 * are not drafts in our format (the old app also stored writing sessions in
 * this table with a different content shape).
 */
export function draftFromRow(row: unknown): DraftRecord | null {
  if (!isObj(row)) return null;
  if (typeof row.id !== "string") return null;
  const content = row.content;
  const answers = row.answers;
  if (!isObj(content) || !isObj(answers)) return null;
  if (validateWritingTask(content.task, { lenient: true }).length) return null;
  if (typeof answers.script !== "string") return null;
  const secondsUsed = typeof answers.secondsUsed === "number" && Number.isFinite(answers.secondsUsed) ? answers.secondsUsed : 0;
  const updatedAt = typeof row.updated_at === "string" ? row.updated_at : typeof row.created_at === "string" ? row.created_at : new Date(0).toISOString();
  return { sessionId: row.id, task: content.task as WritingTask, script: answers.script, secondsUsed, updatedAt };
}

/**
 * Grading orchestration without I/O of its own: the gateway call is injected,
 * so the retry / fallback logic is unit-tested.
 *
 *   1. tool-calling request at temperature 0;
 *   2. if the gateway rejects tools with a 400, switch once to json_object mode
 *      (not counted as an attempt: nothing was generated);
 *   3. extract + validate; on invalid output retry ONCE, telling the model the
 *      validator errors (a plain resend at temperature 0 would repeat itself);
 *   4. still invalid → { kind: "invalid" } → the caller answers
 *      grader_invalid_output. There is no default band anywhere.
 */

import type { CustomVisualInput, FeedbackLang, TaskVariant, WritingTask } from "./contract.ts";
import { GRADER_MIN_MS_FOR_RETRY, GRADER_SETTINGS, GRADER_TOTAL_BUDGET_MS, GRADER_WITH_MODEL_ANSWER_SETTINGS } from "./models.ts";
import { buildGraderMessages, buildRetryMessage, type ChatMessage, type ScriptStats } from "./prompt.ts";
import { GRADER_TOOL_NAME, graderTool, validateGraderOutput, type GraderOutput } from "./schema.ts";
import { buildChatBody, extractStructured, looksLikeToolsUnsupported, type ExtractResult, type GatewayCallResult } from "./gateway.ts";

export interface GradeModelInput {
  task: WritingTask;
  variant: TaskVariant;
  script: string;
  feedbackLang: FeedbackLang;
  includeModelAnswer: boolean;
  customVisual?: CustomVisualInput;
  stats: ScriptStats;
}

export interface GradeModelDeps {
  call: (body: Record<string, unknown>, timeoutMs: number) => Promise<GatewayCallResult>;
  now: () => number;
  log?: (msg: string, data?: unknown) => void;
}

export type GradeModelResult =
  | { ok: true; output: GraderOutput; model: string; attempts: number; mode: "tool" | "json" }
  | { ok: false; kind: "invalid"; errors: string[]; attempts: number }
  | { ok: false; kind: "upstream"; status: number; detail: string; attempts: number };

export async function gradeWithModel(input: GradeModelInput, deps: GradeModelDeps): Promise<GradeModelResult> {
  const settings = input.includeModelAnswer ? GRADER_WITH_MODEL_ANSWER_SETTINGS : GRADER_SETTINGS;
  const schemaCtx = { taskType: input.task.taskType, variant: input.variant, includeModelAnswer: input.includeModelAnswer };
  const tool = graderTool(schemaCtx).function;
  const start = deps.now();
  let mode: "tool" | "json" = "tool";
  let switched = false;
  let attempts = 0;
  let lastErrors: string[] = [];

  const baseMessages = (m: "tool" | "json") => buildGraderMessages({ ...input, mode: m });
  let messages: ChatMessage[] = baseMessages(mode);

  while (attempts < 2) {
    const elapsed = deps.now() - start;
    const remaining = GRADER_TOTAL_BUDGET_MS - elapsed;
    if (attempts > 0 && remaining < GRADER_MIN_MS_FOR_RETRY) break;
    const timeoutMs = Math.max(10_000, Math.min(settings.timeoutMs, remaining - 5_000));
    const body = buildChatBody({ settings, messages, structured: { mode, tool } });
    const res = await deps.call(body, timeoutMs);

    if (res.ok === false) {
      const failure = res as Extract<GatewayCallResult, { ok: false }>;
      if (mode === "tool" && !switched && looksLikeToolsUnsupported(failure.status, failure.detail)) {
        deps.log?.("grader: tools rejected by gateway, switching to json_object", { status: failure.status });
        mode = "json";
        switched = true;
        messages = baseMessages(mode);
        continue; // nothing was generated; not an attempt
      }
      return { ok: false, kind: "upstream", status: failure.status, detail: failure.detail, attempts: attempts + 1 };
    }
    attempts++;
    if (!("json" in res)) return { ok: false, kind: "upstream", status: 502, detail: "unexpected stream", attempts };

    const extracted = extractStructured(res.json, GRADER_TOOL_NAME);
    if (extracted.ok === false) {
      lastErrors = [(extracted as Extract<ExtractResult, { ok: false }>).error];
    } else {
      const v = validateGraderOutput(extracted.value, schemaCtx);
      if (v.ok === true) return { ok: true, output: v.value, model: settings.model, attempts, mode };
      lastErrors = (v as Extract<typeof v, { ok: false }>).errors;
    }
    deps.log?.("grader: invalid output", { attempt: attempts, errors: lastErrors.slice(0, 10) });
    messages = [...baseMessages(mode), buildRetryMessage(lastErrors)];
  }
  return { ok: false, kind: "invalid", errors: lastErrors, attempts };
}

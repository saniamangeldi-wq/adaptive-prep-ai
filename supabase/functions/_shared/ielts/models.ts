/**
 * The ONLY place model ids and generation settings live.
 *
 * Both ids already ran in the old codebase through the Lovable AI Gateway:
 *   - google/gemini-3.1-pro-preview  (old ielts-grade-writing)
 *   - google/gemini-3.8-flash        (old ielts-generate-writing-task, ielts-generate-reading)
 *
 * Changing the grader model, its temperature or its token cap changes the
 * grades, so it must bump GRADER_VERSION (prompt.ts) and be re-run through
 * calibration/ before it merges.
 */

export const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export const MODELS = {
  /** Strong model: one call per grading. */
  grader: "google/gemini-3.1-pro-preview",
  /** Cheap model: chat coach and generated tasks. */
  cheap: "google/gemini-3.8-flash",
} as const;

export interface GenerationSettings {
  model: string;
  temperature: number;
  /**
   * Upper bound on output tokens. Gemini 3 models count their hidden
   * "thinking" tokens against this cap, so it is set well above the size of
   * the visible JSON (about 2.5–4k tokens for a full report). A cap that is
   * too low truncates the JSON and wastes the call; a high cap costs nothing
   * unless the model actually uses it.
   */
  maxTokens: number;
  /**
   * Optional `reasoning_effort` sent to the gateway. Left undefined until it
   * is verified that the gateway maps it for Gemini models (it could cut
   * grading cost a lot). Do not set it without a calibration run.
   */
  reasoningEffort?: "low" | "medium" | "high";
  /** Abort a single upstream call after this long. */
  timeoutMs: number;
}

/** Grading: deterministic (temperature 0), generous cap, one call (+1 retry on invalid output). */
export const GRADER_SETTINGS: GenerationSettings = {
  model: MODELS.grader,
  temperature: 0,
  maxTokens: 12_000,
  timeoutMs: 100_000,
};

/** Grading with a model answer: same, with room for ~300 extra words. */
export const GRADER_WITH_MODEL_ANSWER_SETTINGS: GenerationSettings = {
  ...GRADER_SETTINGS,
  maxTokens: 15_000,
};

/** Task generation: some variety is wanted, output is small. */
export const TASK_GEN_SETTINGS: GenerationSettings = {
  model: MODELS.cheap,
  temperature: 0.8,
  maxTokens: 4_000,
  timeoutMs: 45_000,
};

/** Chat coach: short, focused replies. */
export const CHAT_SETTINGS: GenerationSettings = {
  model: MODELS.cheap,
  temperature: 0.4,
  maxTokens: 1_500,
  timeoutMs: 60_000,
};

/**
 * Edge functions have a wall-clock limit (150 s on the free plan). The grader
 * only retries when at least this much of its budget is left.
 */
export const GRADER_TOTAL_BUDGET_MS = 140_000;
export const GRADER_MIN_MS_FOR_RETRY = 45_000;

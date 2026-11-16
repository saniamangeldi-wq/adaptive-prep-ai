/**
 * IELTS Writing — shared contract between edge functions and the web app.
 *
 * CANONICAL FILE. The web app imports it through the `@ielts/*` alias; edge
 * functions import it relatively. Rules for this file:
 *   - no imports, no Deno or browser APIs, types and plain constants only
 *   - additive changes are fine; a breaking change must bump CONTRACT_VERSION
 *     and be noted in HANDOVER.md
 */

export const CONTRACT_VERSION = 1;

// ───────────────────────── Task taxonomy ─────────────────────────

export type TaskType = "task1_academic" | "task1_general" | "task2";

export type Task1AcademicVariant =
  | "line_graph"
  | "bar_chart"
  | "pie_chart"
  | "table"
  | "mixed" // two visuals of different kinds
  | "process" // how something is made / a natural cycle
  | "map"; // a place at two points in time, or two proposed layouts

export type Task1GeneralVariant = "letter_formal" | "letter_semi_formal" | "letter_informal";

export type Task2Variant =
  | "opinion" // to what extent do you agree or disagree
  | "discussion" // discuss both views and give your own opinion
  | "advantages_disadvantages" // incl. "do the advantages outweigh the disadvantages"
  | "problem_solution" // incl. causes + solutions, causes + effects
  | "two_part" // two direct questions
  | "positive_negative"; // is this a positive or negative development

export type TaskVariant = Task1AcademicVariant | Task1GeneralVariant | Task2Variant;

export const VARIANTS_BY_TASK: Record<TaskType, readonly TaskVariant[]> = {
  task1_academic: ["line_graph", "bar_chart", "pie_chart", "table", "mixed", "process", "map"],
  task1_general: ["letter_formal", "letter_semi_formal", "letter_informal"],
  task2: ["opinion", "discussion", "advantages_disadvantages", "problem_solution", "two_part", "positive_negative"],
};

export const TASK_RULES: Record<TaskType, { minWords: number; timeMinutes: number; taskCriterionLabel: string }> = {
  task1_academic: { minWords: 150, timeMinutes: 20, taskCriterionLabel: "Task Achievement" },
  task1_general: { minWords: 150, timeMinutes: 20, taskCriterionLabel: "Task Achievement" },
  task2: { minWords: 250, timeMinutes: 40, taskCriterionLabel: "Task Response" },
};

export type FeedbackLang = "en" | "ru" | "kk";

// ───────────────────────── Task 1 Academic visuals ─────────────────────────

/** Line, bar, pie or table. Same row shape the existing ChartWidget already draws. */
export interface DataVisual {
  kind: "line" | "bar" | "pie" | "table";
  title: string;
  unit?: string;
  /** Name of the key in each row that holds the category / x label. */
  categoryKey: string;
  series: string[];
  data: Array<Record<string, string | number>>;
}

export interface ProcessVisual {
  kind: "process";
  title: string;
  /** True for a natural cycle that returns to step 1. */
  cyclic: boolean;
  steps: Array<{ id: string; label: string; detail?: string }>;
  /** Omit for a straight run (step n → step n+1). Give only when the process branches or merges. */
  links?: Array<{ from: string; to: string; label?: string }>;
}

export type MapFeatureType =
  | "building"
  | "housing"
  | "road"
  | "path"
  | "water"
  | "green"
  | "farmland"
  | "parking"
  | "industry"
  | "other";

export interface MapVisual {
  kind: "map";
  title: string;
  /** Usually two panels, e.g. "1995" and "Today". Coordinates are on a 0–100 grid, origin top-left. */
  panels: Array<{
    label: string;
    features: Array<{ id: string; label: string; type: MapFeatureType; x: number; y: number; w: number; h: number }>;
  }>;
}

export type TaskVisual = DataVisual | ProcessVisual | MapVisual;

// ───────────────────────── The task a student answers ─────────────────────────

export interface WritingTask {
  /** Bank id (e.g. "t2-opinion-03"), or "custom" when the student supplied the question. */
  id: string;
  source: "bank" | "generated" | "custom";
  taskType: TaskType;
  variant: TaskVariant;
  /** Full task wording exactly as the student sees it. */
  prompt: string;
  /** General Training letters: the bullet points to cover. Empty otherwise. */
  bullets: string[];
  /** Task 1 Academic: one visual, or two for `mixed`. Empty otherwise. */
  visuals: TaskVisual[];
  topic?: string;
  minWords: number;
  timeMinutes: number;
}

// ───────────────────────── Grading ─────────────────────────

export type CriterionKey = "task" | "coherence" | "lexical" | "grammar";

export const CRITERION_LABELS: Record<Exclude<CriterionKey, "task">, string> = {
  coherence: "Coherence and Cohesion",
  lexical: "Lexical Resource",
  grammar: "Grammatical Range and Accuracy",
};

export const ERROR_TAGS = [
  // grammar
  "articles",
  "subject_verb_agreement",
  "verb_tense",
  "prepositions",
  "plural_countability",
  "sentence_structure",
  "run_on_or_fragment",
  "punctuation",
  // lexical
  "word_choice",
  "word_form",
  "collocation",
  "spelling",
  "repetition",
  "register_tone",
  // coherence and cohesion
  "linking_words",
  "paragraphing",
  "referencing",
  "progression",
  // task
  "task_coverage",
  "overview_missing",
  "data_accuracy",
  "position_unclear",
  "idea_development",
  "off_topic",
  "letter_purpose_or_tone",
  "other",
] as const;

export type ErrorTag = (typeof ERROR_TAGS)[number];

export interface CriterionResult {
  key: CriterionKey;
  /** "Task Achievement" for Task 1, "Task Response" for Task 2, fixed labels otherwise. */
  label: string;
  /** 0–9 in 0.5 steps. Always an estimate. */
  band: number;
  /** Why this band: which descriptor features the script shows. In the feedback language. */
  rationale: string;
  /** Short exact quotes from the script that support the band. */
  evidence: string[];
  /** The one or two changes that would move this criterion up half a band. In the feedback language. */
  toNextBand: string;
}

export interface InlineIssue {
  /** Exact substring of the script. */
  quote: string;
  /** Character offsets into the script, filled in by the server; null when the quote could not be located. */
  start: number | null;
  end: number | null;
  criterion: CriterionKey;
  tag: ErrorTag;
  /** In the feedback language. */
  explanation: string;
  /** Corrected or improved wording, always in English. */
  suggestion: string;
}

export interface ChecklistItem {
  /** Stable id per variant, e.g. "overview", "bullet_2", "both_views", "own_opinion". */
  id: string;
  label: string;
  met: "yes" | "partly" | "no";
  note: string;
}

export type ReportFlag =
  | "under_length"
  | "severely_under_length"
  | "off_topic"
  | "not_english"
  | "copied_from_prompt"
  | "memorised_or_template"
  | "wrong_task_variant"
  | "visual_not_available";

export interface GradeReport {
  id: string | null;
  contractVersion: number;
  /** Bumped whenever rubric text, prompt or post-processing changes. */
  graderVersion: string;
  model: string;
  createdAt: string;

  task: WritingTask;
  /** Set when the grader judged the question to be a different variant from the one requested. */
  variantDetected: TaskVariant | null;
  feedbackLang: FeedbackLang;

  script: string;
  wordCount: number;
  paragraphCount: number;

  criteria: Record<CriterionKey, CriterionResult>;
  /** Mean of the four criteria, before rounding. Computed by the server, never by the model. */
  overallRaw: number;
  /** `overallRaw` rounded DOWN to the half band below (6.75 → 6.5). See bandMath.ts for why. */
  overall: number;

  /** Variant-specific requirements, e.g. overview present, all bullets covered, both views discussed. */
  checklist: ChecklistItem[];
  flags: ReportFlag[];
  /** How far to trust this estimate. Low when the script is very short, off-topic, or the visual was missing. */
  confidence: "high" | "medium" | "low";

  /** 2–3 sentences. In the feedback language. */
  summary: string;
  strengths: string[];
  /** At most three, most valuable first. */
  priorities: Array<{ title: string; why: string; how: string }>;
  issues: InlineIssue[];
  /** Count of issues per tag. Computed by the server. */
  errorTagCounts: Partial<Record<ErrorTag, number>>;
  /** One paragraph from the script rewritten about one band higher. English. */
  rewrite: { original: string; improved: string; changes: string[] } | null;
  /** Only present when requested: costs extra tokens. */
  modelAnswer: string | null;
  /**
   * ADDED (additive, optional). Ceilings the server applied after the model
   * proposed its bands, e.g. "no overview → Task Achievement at most 5". The
   * criterion `band` already holds the capped value and `rationale` is the
   * model's text, so the UI should show these next to the band to explain
   * why it is lower than the rationale suggests. `reason` is English.
   */
  adjustments?: Array<{ criterion: CriterionKey; from: number; to: number; rule: string; reason: string }>;
}

// ───────────────────────── Edge function I/O ─────────────────────────

/** POST ielts-generate-writing-task */
export interface GetTaskRequest {
  taskType: TaskType;
  /** Omit for a random variant of that task type. */
  variant?: TaskVariant;
  /** "bank" is free and instant; "generated" calls the model and costs credits. Default "bank". */
  source?: "bank" | "generated";
  topic?: string;
  /** Bank ids the student has already seen, so they get a fresh one. */
  excludeIds?: string[];
}
export interface GetTaskResponse {
  task: WritingTask;
  creditsRemaining: number | null;
}

/** A visual the student supplies for their own Task 1 Academic question. */
export interface CustomVisualInput {
  /** data:image/png|jpeg|webp;base64,… — at most ~1.5 MB. Sent to the model, not stored. */
  imageDataUrl?: string;
  /** Or a plain-text description of the chart / diagram. */
  description?: string;
}

/** POST ielts-grade-writing */
export interface GradeRequest {
  task: WritingTask;
  script: string;
  feedbackLang?: FeedbackLang;
  /** Draft session to mark as completed. */
  sessionId?: string;
  customVisual?: CustomVisualInput;
  includeModelAnswer?: boolean;
}
export interface GradeResponse {
  report: GradeReport;
  creditsRemaining: number | null;
}

/** POST ielts-draft — autosave without needing extra database policies. */
export type DraftRequest =
  | { action: "save"; sessionId?: string; task: WritingTask; script: string; secondsUsed: number }
  | { action: "get"; sessionId: string }
  | { action: "list" }
  | { action: "discard"; sessionId: string };

export interface DraftRecord {
  sessionId: string;
  task: WritingTask;
  script: string;
  secondsUsed: number;
  updatedAt: string;
}
export type DraftResponse =
  | { action: "save"; sessionId: string; updatedAt: string }
  | { action: "get"; draft: DraftRecord | null }
  | { action: "list"; drafts: DraftRecord[] }
  | { action: "discard"; ok: true };

/** POST student-chat (slimmed). Streams or returns the assistant reply. */
export interface ChatRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  conversationId?: string;
  /** When set, the server loads this report (owner-checked) and gives the coach the script and feedback. */
  reportId?: string;
  lang?: FeedbackLang;
}

/** Every function returns this shape on failure, with a non-2xx status. */
export interface ApiError {
  error: string;
  code?:
    | "unauthorized"
    | "bad_request"
    | "too_short"
    | "too_long"
    | "no_credits"
    | "rate_limited"
    | "grader_invalid_output"
    | "upstream_error"
    | "not_found";
}

/** Credit cost per call. One place, so pricing changes are one edit. */
export const CREDIT_COST = { grade: 5, gradeWithModelAnswer: 7, generateTask: 2, chat: 1 } as const;

/** Hard limits enforced on the server. */
export const LIMITS = { minScriptChars: 40, maxScriptWords: 600, maxPromptChars: 4000, maxImageBytes: 1_500_000 } as const;

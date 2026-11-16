import {
  CRITERION_LABELS,
  TASK_RULES,
  type CriterionKey,
  type ErrorTag,
  type ReportFlag,
  type TaskType,
  type TaskVariant,
  type MapFeatureType,
} from "@ielts/contract.ts";

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  task1_academic: "Academic Task 1",
  task1_general: "General Training Task 1 (letter)",
  task2: "Task 2 (essay)",
};

export const TASK_TYPE_HINTS: Record<TaskType, string> = {
  task1_academic: "Describe a chart, table, process or map. At least 150 words.",
  task1_general: "Write a letter. At least 150 words.",
  task2: "Write an essay. At least 250 words.",
};

export const VARIANT_LABELS: Record<TaskVariant, string> = {
  line_graph: "Line graph",
  bar_chart: "Bar chart",
  pie_chart: "Pie chart",
  table: "Table",
  mixed: "Two visuals (mixed)",
  process: "Process or cycle",
  map: "Map",
  letter_formal: "Formal letter",
  letter_semi_formal: "Semi-formal letter",
  letter_informal: "Informal letter",
  opinion: "Opinion essay",
  discussion: "Discussion essay",
  advantages_disadvantages: "Advantages and disadvantages",
  problem_solution: "Problem and solution",
  two_part: "Two-question essay",
  positive_negative: "Positive or negative development",
};

export const ERROR_TAG_LABELS: Record<ErrorTag, string> = {
  articles: "Articles (a, an, the)",
  subject_verb_agreement: "Subject-verb agreement",
  verb_tense: "Verb tense",
  prepositions: "Prepositions",
  plural_countability: "Plurals and countable nouns",
  sentence_structure: "Sentence structure",
  run_on_or_fragment: "Run-on sentences and fragments",
  punctuation: "Punctuation",
  word_choice: "Word choice",
  word_form: "Word form",
  collocation: "Collocation",
  spelling: "Spelling",
  repetition: "Repetition",
  register_tone: "Register and tone",
  linking_words: "Linking words",
  paragraphing: "Paragraphing",
  referencing: "Referencing (this, it, they)",
  progression: "Progression of ideas",
  task_coverage: "Task coverage",
  overview_missing: "Overview missing",
  data_accuracy: "Accuracy of data",
  position_unclear: "Position unclear",
  idea_development: "Idea development",
  off_topic: "Off topic",
  letter_purpose_or_tone: "Letter purpose or tone",
  other: "Other",
};

/** One plain sentence per flag, written to the student. */
export const FLAG_TEXT: Record<ReportFlag, string> = {
  under_length:
    "Your answer is below the minimum word count, which can lower the estimate for the task criterion.",
  severely_under_length:
    "Your answer is far below the minimum word count, so this estimate is less reliable and probably lower than a full answer would get.",
  off_topic: "Parts of your answer do not address the question, which limits the task criterion.",
  not_english: "Much of the answer does not appear to be in English, so it could not be assessed properly.",
  copied_from_prompt:
    "A large part of your answer repeats the wording of the question. Copied words are not credited.",
  memorised_or_template:
    "The answer reads like a memorised or generic template rather than a response to this question, which limits the estimate.",
  wrong_task_variant:
    "The question looks like a different type from the one you chose, so the checklist follows the type we detected.",
  visual_not_available:
    "We could not see the chart or diagram for this question, so we could not check your description against the data.",
};

export const CONFIDENCE_TEXT: Record<"high" | "medium" | "low", string> = {
  high: "Confidence: high. The answer was complete enough to estimate reliably.",
  medium: "Confidence: medium. Treat the band as a rough guide.",
  low: "Confidence: low. Something about this answer makes the estimate less reliable.",
};

export const MET_LABELS: Record<"yes" | "partly" | "no", string> = {
  yes: "Yes",
  partly: "Partly",
  no: "No",
};

export const FEEDBACK_LANGUAGES: Array<{ value: "en" | "ru" | "kk"; label: string }> = [
  { value: "en", label: "English" },
  { value: "ru", label: "Русский" },
  { value: "kk", label: "Қазақша" },
];

export const MAP_FEATURE_LABELS: Record<MapFeatureType, string> = {
  building: "Building",
  housing: "Housing",
  road: "Road",
  path: "Path",
  water: "Water",
  green: "Green space",
  farmland: "Farmland",
  parking: "Parking",
  industry: "Industry",
  other: "Other",
};

function humanize(key: string): string {
  const text = String(key).replace(/_/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Other";
}

export function taskTypeLabel(type: string): string {
  return (TASK_TYPE_LABELS as Record<string, string>)[type] ?? humanize(type);
}

export function variantLabel(variant: string): string {
  return (VARIANT_LABELS as Record<string, string>)[variant] ?? humanize(variant);
}

export function errorTagLabel(tag: string): string {
  return (ERROR_TAG_LABELS as Record<string, string>)[tag] ?? humanize(tag);
}

export function flagText(flag: string): string {
  return (FLAG_TEXT as Record<string, string>)[flag] ?? humanize(flag);
}

/** Short description such as "Task 2, opinion essay" or "Academic Task 1, line graph". */
export function describeTask(taskType: string, variant?: string | null): string {
  const base =
    taskType === "task2"
      ? "Task 2"
      : taskType === "task1_academic"
        ? "Academic Task 1"
        : taskType === "task1_general"
          ? "General Task 1"
          : humanize(taskType);
  if (!variant) return base;
  return `${base}, ${variantLabel(variant).toLowerCase()}`;
}

export function criterionLabel(key: CriterionKey, taskType?: string): string {
  if (key === "task") {
    const rules = (TASK_RULES as Record<string, { taskCriterionLabel: string }>)[taskType ?? ""];
    return rules?.taskCriterionLabel ?? "Task Achievement or Response";
  }
  return CRITERION_LABELS[key];
}

/** "6.0" for 6, "6.5" for 6.5. */
export function formatBand(band: number | null | undefined): string {
  return typeof band === "number" && Number.isFinite(band) ? band.toFixed(1) : "n/a";
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

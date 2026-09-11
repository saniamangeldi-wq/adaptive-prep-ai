/** Shared IELTS types and scoring helpers. */

export type IeltsVariant = "academic" | "general";
export type IeltsWritingTask = "task1_academic" | "task1_general" | "task2";

export interface IeltsReadingQuestion {
  id: string;
  type: string;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
  evidence?: string;
}

export interface IeltsReadingPassage {
  number: number;
  title: string;
  text: string;
  questions: IeltsReadingQuestion[];
}

export interface IeltsReadingSet {
  title: string;
  variant: IeltsVariant;
  passages: IeltsReadingPassage[];
}

export interface IeltsChart {
  kind?: "bar" | "line" | "pie" | "table";
  title?: string;
  unit?: string;
  categoryKey?: string;
  series?: string[];
  data?: Array<Record<string, string | number>>;
}

export interface IeltsWritingTaskData {
  taskType: IeltsWritingTask;
  prompt: string;
  bullets: string[];
  minWords: number;
  timeMinutes: number;
  chart: IeltsChart | null;
}

export interface IeltsCriterion {
  band: number;
  comment: string;
  label: string;
}

export interface IeltsWritingReport {
  id: string | null;
  taskType: IeltsWritingTask;
  wordCount: number;
  overall: number;
  criteria: {
    task: IeltsCriterion;
    coherence: IeltsCriterion;
    lexical: IeltsCriterion;
    grammar: IeltsCriterion;
  };
  comments: {
    summary: string;
    strengths: string[];
    improvements: string[];
    corrections: Array<{ original: string; suggestion: string; reason: string }>;
  };
  modelAnswer: string;
}

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Multiple choice",
  true_false_not_given: "True / False / Not Given",
  yes_no_not_given: "Yes / No / Not Given",
  matching_headings: "Matching headings",
  matching_information: "Matching information",
  sentence_completion: "Sentence completion",
  summary_completion: "Summary completion",
  short_answer: "Short answer",
};

/**
 * Published IELTS Academic Reading raw-score to band conversion (out of 40).
 * General Training uses a stricter scale.
 */
const ACADEMIC_BANDS: Array<[number, number]> = [
  [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5],
  [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3],
];

const GENERAL_BANDS: Array<[number, number]> = [
  [40, 9], [39, 8.5], [37, 8], [36, 7.5], [34, 7], [32, 6.5],
  [30, 6], [27, 5.5], [23, 5], [19, 4.5], [15, 4], [12, 3.5], [9, 3],
];

/** Converts a raw reading score to an estimated band, scaled when the set is shorter than 40 questions. */
export function readingBand(correct: number, total: number, variant: IeltsVariant): number {
  if (total <= 0) return 0;
  const scaled = Math.round((correct / total) * 40);
  const table = variant === "general" ? GENERAL_BANDS : ACADEMIC_BANDS;
  for (const [threshold, band] of table) {
    if (scaled >= threshold) return band;
  }
  return 2.5;
}

/** IELTS answers are marked case-insensitively, ignoring articles and extra spacing. */
export function isReadingAnswerCorrect(given: string | undefined, expected: string): boolean {
  if (!given) return false;
  const clean = (s: string) =>
    s.toLowerCase().replace(/[.,;:!?"']/g, "").replace(/^(a|an|the)\s+/, "").replace(/\s+/g, " ").trim();
  const g = clean(given);
  return expected
    .split("/")
    .map(clean)
    .some((variantAnswer) => variantAnswer === g);
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export const IELTS_TRIAL_DAYS = 7;

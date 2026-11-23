import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { classifySkill, type SkillKey } from "@/lib/sat-skills";

export interface Question {
  id: string;
  type: "multiple_choice" | "grid_in";
  section: "math" | "reading_writing";
  difficulty: "easy" | "normal" | "hard";
  topic: string;
  text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  /** Optional figure/diagram URL (https or data:image/...). Rendered above the question text. */
  image_url?: string;
  /** Optional alt text for the figure. */
  image_alt?: string;
  /** Digital SAT skill domain (see sat-skills.ts). Classified from the text when missing. */
  skill?: SkillKey;
}

export type ModuleRoute = "harder" | "easier";

/** Full Digital SAT: Module 2 is chosen after Module 1, like the real test. */
export interface AdaptiveSectionModules {
  module1: Question[];
  harder: Question[];
  easier: Question[];
}

export type SortOrder = "mixed" | "hard_to_easy" | "easy_to_hard";

export interface TestConfig {
  testType: "math" | "reading_writing" | "combined";
  length: "quick" | "short" | "full";
  difficulty: "easy" | "normal" | "hard";
  timerEnabled: boolean;
  sortOrder?: SortOrder;
}

export interface GeneratedTest {
  id: string;
  questions: Question[];
  timeLimit: number | null;
  config: TestConfig;
  /** How many of the selected questions the user has already seen before. */
  repeatedCount: number;
  /** Total unique questions available in the matching bank. */
  poolSize: number;
  /** User-facing warning when the bank is too small to deliver a full test. */
  poolWarning?: string;
  /** Present for full-length combined tests: Module 2 is routed on Module 1 accuracy. */
  adaptiveModules?: {
    reading_writing: AdaptiveSectionModules;
    math: AdaptiveSectionModules;
  };
}

/** Module 1 accuracy at or above this routes to the harder Module 2. */
export const ROUTING_THRESHOLD = 0.6;

type DifficultyMix = Record<"easy" | "normal" | "hard", number>;
const MIX_MODULE1: DifficultyMix = { easy: 0.34, normal: 0.33, hard: 0.33 };
const MIX_HARDER: DifficultyMix = { easy: 0.1, normal: 0.4, hard: 0.5 };
const MIX_EASIER: DifficultyMix = { easy: 0.5, normal: 0.4, hard: 0.1 };

/**
 * Pick `count` questions from `pool` (already ordered by preference: unseen
 * first) to match a difficulty mix, skipping `exclude`. Tops up from whatever
 * is left if one difficulty runs short.
 */
function pickByDifficulty(pool: Question[], count: number, mix: DifficultyMix, exclude: Set<string>): Question[] {
  const available = pool.filter((q) => !exclude.has(q.id));
  const picked: Question[] = [];
  const used = new Set<string>();
  for (const level of ["hard", "normal", "easy"] as const) {
    let need = Math.round(count * mix[level]);
    for (const q of available) {
      if (need <= 0 || picked.length >= count) break;
      if (q.difficulty === level) {
        picked.push(q);
        used.add(q.id);
        need--;
      }
    }
  }
  for (const q of available) {
    if (picked.length >= count) break;
    if (!used.has(q.id)) {
      picked.push(q);
      used.add(q.id);
    }
  }
  return shuffle(picked);
}

function buildSectionModules(pool: Question[], perModule: number): AdaptiveSectionModules {
  const module1 = pickByDifficulty(pool, perModule, MIX_MODULE1, new Set());
  const exclude = new Set(module1.map((q) => q.id));
  return {
    module1,
    harder: pickByDifficulty(pool, perModule, MIX_HARDER, exclude),
    easier: pickByDifficulty(pool, perModule, MIX_EASIER, exclude),
  };
}

/**
 * Practice tests lean toward the student's weaker skills: weighted random
 * order (Efraimidis–Spirakis) with weight = 1.15 − mastery, so weak skills come
 * up more often but strong ones never disappear.
 */
async function weightByWeakSkills(userId: string, questions: Question[]): Promise<Question[]> {
  const { data } = await supabase.from("skill_mastery").select("skill, rating").eq("user_id", userId);
  if (!data || data.length === 0) return questions;
  const mastery = new Map<string, number>(data.map((r) => [r.skill, 1 / (1 + Math.exp(-r.rating))]));
  return questions
    .map((q) => {
      const weight = 1.15 - (mastery.get(q.skill ?? "") ?? 0.5);
      return { q, key: Math.pow(Math.random(), 1 / weight) };
    })
    .sort((a, b) => b.key - a.key)
    .map((x) => x.q);
}

// Unbiased Fisher-Yates shuffle (replaces the biased `.sort(() => Math.random() - 0.5)` pattern).
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getTargetQuestions(config: TestConfig): number {
  if (config.length === "quick") return 10;
  if (config.length === "short") return 25;
  // full: section-aware
  if (config.testType === "math") return 44;
  if (config.testType === "reading_writing") return 54;
  return 98; // combined full SAT
}

function getTimeMinutes(config: TestConfig): number {
  if (config.length === "quick") return 10;
  if (config.length === "short") return 25;
  // full
  if (config.testType === "math") return 70;
  if (config.testType === "reading_writing") return 64;
  return 180;
}

type DifficultyLevel = "easy" | "normal" | "hard";

/**
 * Top up `candidates` to `target` by pulling from `overflow` (which should be
 * sorted least-recently-seen first). Does NOT clone questions — if the bank
 * is genuinely too small, returns a shorter list and logs a warning.
 */
function fillToTarget(
  candidates: Question[],
  target: number,
  overflow: Question[]
): Question[] {
  if (candidates.length >= target) {
    return candidates.slice(0, target);
  }
  const needed = target - candidates.length;
  const usedIds = new Set(candidates.map((q) => q.id));
  const recycled = overflow
    .filter((q) => !usedIds.has(q.id))
    .slice(0, needed);
  const result = [...candidates, ...recycled];
  if (result.length < target) {
    console.warn(
      `[generateTest] Question bank too small: need ${target}, ` +
      `have ${result.length}. Returning shorter test.`
    );
  }
  return result;
}

export async function generateTest(config: TestConfig, userId: string): Promise<GeneratedTest | null> {
  const targetQuestions = getTargetQuestions(config);

  // Respect the user's explicit difficulty choice. Adaptive override is disabled
  // because users expect the difficulty they picked.
  const adaptedDifficulty = config.difficulty;

  let testTypes: string[] = [];
  if (config.testType === "combined") {
    testTypes = ["math", "reading_writing"];
  } else {
    testTypes = [config.testType];
  }

  const { data: rawTests, error } = await supabase
    .from("sat_tests")
    .select("id, questions, difficulty, test_type")
    .in("test_type", testTypes)
    .eq("is_official", true);

  if (error || !rawTests || rawTests.length === 0) {
    console.error("Error fetching tests:", error);
    return null;
  }

  // CHANGE 1: Dedup by question id when flattening across sat_tests rows.
  const seenIds = new Set<string>();
  const allQuestions: Question[] = rawTests
    .flatMap((t) => {
      const qs = t.questions as unknown as Question[];
      return qs.map((q) => ({
        ...q,
        difficulty: q.difficulty || (t.difficulty as DifficultyLevel),
        skill: classifySkill(q),
      }));
    })
    .filter((q) => {
      if (seenIds.has(q.id)) return false;
      seenIds.add(q.id);
      return true;
    });

  // Build the "already seen" set across recent attempts (kept as-is — strips __repN
  // so legacy padded ids still map back to their base id for cross-session tracking).
  const { data: recentAttempts } = await supabase
    .from("test_attempts")
    .select("answers, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);

  const seenQuestionIds = new Set<string>();
  // Track most-recent-seen timestamp per question id so we can sort least-recently-seen first.
  const lastSeenAt = new Map<string, number>();
  if (recentAttempts) {
    for (const attempt of recentAttempts) {
      const answers = attempt.answers as Record<string, string> | unknown[] | null;
      const ts = attempt.created_at ? new Date(attempt.created_at).getTime() : 0;
      if (answers && typeof answers === "object" && !Array.isArray(answers)) {
        Object.keys(answers).forEach((id) => {
          const base = id.replace(/__rep\d+$/, "");
          seenQuestionIds.add(base);
          // Keep the most recent timestamp (recentAttempts is ordered desc, so first write wins).
          if (!lastSeenAt.has(base)) lastSeenAt.set(base, ts);
        });
      }
    }
  }

  const difficultyRank: Record<string, number> = { easy: 0, normal: 1, hard: 2 };
  const preferredRank = difficultyRank[adaptedDifficulty] ?? 1;

  // STRICT difficulty matching: questions of the chosen difficulty come first,
  // then unseen-vs-seen, then distance from preferred difficulty as a last-resort fallback.
  const rankQuestion = (q: Question) => {
    const qRank = difficultyRank[q.difficulty] ?? 1;
    const mismatchPenalty = qRank === preferredRank ? 0 : 10_000;
    const seenPenalty = seenQuestionIds.has(q.id) ? 1_000 : 0;
    const diffDistance = Math.abs(qRank - preferredRank);
    return mismatchPenalty + seenPenalty + diffDistance;
  };

  // Helper: split a list into (matching difficulty, other) preserving each group's order.
  const splitByDifficulty = (qs: Question[]) => {
    const match: Question[] = [];
    const other: Question[] = [];
    for (const q of qs) {
      if ((difficultyRank[q.difficulty] ?? 1) === preferredRank) match.push(q);
      else other.push(q);
    }
    return { match, other };
  };

  // CHANGE 3: Fisher-Yates instead of biased Math.random()-0.5 sort.
  const unseenAll = shuffle(allQuestions.filter((q) => !seenQuestionIds.has(q.id)));
  const seenAll = allQuestions
    .filter((q) => seenQuestionIds.has(q.id))
    .sort((a, b) => (lastSeenAt.get(a.id) ?? 0) - (lastSeenAt.get(b.id) ?? 0));

  // Strict priority order: matching+unseen → matching+seen → other+unseen → other+seen.
  const { match: unseenMatchRaw, other: unseenOther } = splitByDifficulty(unseenAll);
  const unseenMatch = config.length === "full" ? unseenMatchRaw : await weightByWeakSkills(userId, unseenMatchRaw);
  const { match: seenMatch, other: seenOther } = splitByDifficulty(seenAll);
  // Sort the "other" buckets by distance so we drift toward the chosen difficulty.
  const distSort = (a: Question, b: Question) =>
    Math.abs((difficultyRank[a.difficulty] ?? 1) - preferredRank) -
    Math.abs((difficultyRank[b.difficulty] ?? 1) - preferredRank);
  unseenOther.sort(distSort);
  seenOther.sort(distSort);

  const unseenQuestions = [...unseenMatch, ...unseenOther];
  const seenQuestions = [...seenMatch, ...seenOther];

  let selectedQuestions: Question[];
  let adaptiveModules: GeneratedTest["adaptiveModules"];
  if (config.testType === "combined" && config.length === "full") {
    // Real Digital SAT structure: Module 1 is a balanced mix; Module 2 is
    // harder or easier depending on Module 1. The difficulty picker doesn't
    // apply here (the test sets difficulty itself).
    const ordered = [...unseenAll, ...seenAll];
    adaptiveModules = {
      reading_writing: buildSectionModules(ordered.filter((q) => q.section === "reading_writing"), 27),
      math: buildSectionModules(ordered.filter((q) => q.section === "math"), 22),
    };
    selectedQuestions = [
      ...adaptiveModules.reading_writing.module1,
      ...adaptiveModules.reading_writing.harder,
      ...adaptiveModules.math.module1,
      ...adaptiveModules.math.harder,
    ];
  } else if (config.testType === "combined") {
    const isFullOfficial = config.length === "full";
    const rwTarget = isFullOfficial ? 54 : Math.floor(targetQuestions / 2);
    const mathTarget = isFullOfficial ? 44 : targetQuestions - rwTarget;

    const unseenMath = unseenQuestions.filter((q) => q.section === "math");
    const unseenRW = unseenQuestions.filter((q) => q.section === "reading_writing");
    const seenMath = seenQuestions.filter((q) => q.section === "math");
    const seenRW = seenQuestions.filter((q) => q.section === "reading_writing");

    if (isFullOfficial) {
      selectedQuestions = [
        ...fillToTarget(unseenRW, rwTarget, seenRW),
        ...fillToTarget(unseenMath, mathTarget, seenMath),
      ];
    } else {
      selectedQuestions = [
        ...[...unseenRW, ...seenRW].slice(0, rwTarget),
        ...[...unseenMath, ...seenMath].slice(0, mathTarget),
      ];
    }
  } else {
    const prioritized = [...unseenQuestions, ...seenQuestions];
    if (config.length === "full") {
      selectedQuestions = fillToTarget(unseenQuestions, targetQuestions, seenQuestions);
    } else {
      selectedQuestions = prioritized.slice(0, Math.min(targetQuestions, prioritized.length));
    }
  }


  // CHANGE 4: surface a warning when the bank couldn't fill the target or the
  // chosen difficulty pool was too small and we had to fall back to other levels.
  let poolWarning: string | undefined;
  const mismatchedCount = selectedQuestions.filter(
    (q) => (difficultyRank[q.difficulty] ?? 1) !== preferredRank
  ).length;
  if (selectedQuestions.length < targetQuestions) {
    poolWarning =
      "Some sections have fewer questions than a full SAT because the question bank is still being expanded.";
  } else if (mismatchedCount > 0 && !adaptiveModules) {
    poolWarning =
      `Only ${selectedQuestions.length - mismatchedCount} of ${selectedQuestions.length} questions ` +
      `match the "${adaptedDifficulty}" difficulty you picked — the rest were filled in from other ` +
      `levels because the bank doesn't have enough ${adaptedDifficulty} questions yet.`;
  }


  // Apply sort order — defaults to mixed (preserves existing shuffled / section-grouped order).
  // For combined tests, sort within each section so R&W stays before Math.
  const sortOrder: SortOrder = config.sortOrder ?? "mixed";
  if (sortOrder !== "mixed" && !adaptiveModules) {
    const dirMul = sortOrder === "hard_to_easy" ? -1 : 1;
    const byDiff = (a: Question, b: Question) =>
      dirMul * ((difficultyRank[a.difficulty] ?? 1) - (difficultyRank[b.difficulty] ?? 1));
    if (config.testType === "combined") {
      const rw = selectedQuestions.filter((q) => q.section === "reading_writing").sort(byDiff);
      const math = selectedQuestions.filter((q) => q.section === "math").sort(byDiff);
      selectedQuestions = [...rw, ...math];
    } else {
      selectedQuestions = [...selectedQuestions].sort(byDiff);
    }
  }

  // Temporary duplicate-detection log (per the user's request).
  const finalIds = selectedQuestions.map((q) => q.id);
  const dupes = finalIds.filter((id, i) => finalIds.indexOf(id) !== i);
  if (dupes.length) console.error("DUPLICATE QUESTIONS:", dupes);
  else console.log("No duplicates — question count:", finalIds.length);

  const { data: attempt, error: attemptError } = await supabase
    .from("test_attempts")
    .insert({
      user_id: userId,
      test_id: rawTests[0].id,
      answers: [],
      total_questions: selectedQuestions.length,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (attemptError) {
    console.error("Error creating test attempt:", attemptError);
    return null;
  }

  const repeatedCount = selectedQuestions.filter((q) =>
    seenQuestionIds.has(q.id.replace(/__rep\d+$/, ""))
  ).length;

  return {
    id: attempt.id,
    questions: selectedQuestions,
    timeLimit: config.timerEnabled ? getTimeMinutes(config) : null,
    config,
    repeatedCount,
    poolSize: allQuestions.length,
    poolWarning,
    adaptiveModules,
  };
}

export interface SkillResult {
  skill: SkillKey;
  difficulty: Question["difficulty"];
  correct: boolean;
}

export interface ScoreResult {
  /** Percent correct (0–100). Not an SAT score; see estimateSatScore. */
  score: number;
  correct: number;
  total: number;
  byTopic: Record<string, { correct: number; total: number }>;
  bySection: Record<string, { correct: number; total: number }>;
  bySkill: Record<string, { correct: number; total: number }>;
  /** One entry per question, in order; sent to record_skill_results. */
  skillResults: SkillResult[];
  scoreEstimate?: SatScoreEstimate;
}

export function isAnswerCorrect(question: Question, userAnswer: string | undefined): boolean {
  return userAnswer?.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
}

export function calculateScore(questions: Question[], answers: Record<string, string>): ScoreResult {
  let correct = 0;
  const byTopic: Record<string, { correct: number; total: number }> = {};
  const bySection: Record<string, { correct: number; total: number }> = {};
  const bySkill: Record<string, { correct: number; total: number }> = {};
  const skillResults: SkillResult[] = [];

  const bump = (map: Record<string, { correct: number; total: number }>, key: string, ok: boolean) => {
    map[key] ??= { correct: 0, total: 0 };
    map[key].total++;
    if (ok) map[key].correct++;
  };

  for (const question of questions) {
    const isCorrect = isAnswerCorrect(question, answers[question.id]);
    if (isCorrect) correct++;
    const skill = classifySkill(question);
    bump(byTopic, question.topic, isCorrect);
    bump(bySection, question.section, isCorrect);
    bump(bySkill, skill, isCorrect);
    skillResults.push({ skill, difficulty: question.difficulty, correct: isCorrect });
  }

  const total = questions.length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;

  return { score, correct, total, byTopic, bySection, bySkill, skillResults };
}

export interface SatScoreEstimate {
  readingWriting: number;
  math: number;
  total: number;
  low: number;
  high: number;
  routing: Partial<Record<"reading_writing" | "math", ModuleRoute>>;
}

const DIFFICULTY_WEIGHT: Record<string, number> = { easy: 0.8, normal: 1, hard: 1.3 };
const round10 = (n: number) => Math.round(n / 10) * 10;

/**
 * Rough 400–1600 estimate for a full adaptive test. Difficulty-weighted
 * accuracy mapped linearly onto 200–800 per section; students routed to the
 * easier Module 2 are capped at 610 for that section, as the easier module
 * limits the real score. NOT calibrated against official results yet, so it
 * is always shown as a range and labelled as an estimate.
 */
export function estimateSatScore(
  questions: Question[],
  answers: Record<string, string>,
  routing: SatScoreEstimate["routing"]
): SatScoreEstimate {
  const section = (name: "reading_writing" | "math") => {
    const qs = questions.filter((q) => q.section === name);
    if (qs.length === 0) return 200;
    let earned = 0;
    let possible = 0;
    for (const q of qs) {
      const w = DIFFICULTY_WEIGHT[q.difficulty] ?? 1;
      possible += w;
      if (isAnswerCorrect(q, answers[q.id])) earned += w;
    }
    let scaled = 200 + 600 * (earned / possible);
    if (routing[name] === "easier") scaled = Math.min(scaled, 610);
    return Math.max(200, Math.min(800, round10(scaled)));
  };
  const readingWriting = section("reading_writing");
  const math = section("math");
  const total = readingWriting + math;
  return {
    readingWriting,
    math,
    total,
    low: Math.max(400, total - 60),
    high: Math.min(1600, total + 60),
    routing,
  };
}

/** Update the student's skill mastery from a finished attempt (once per attempt). */
export async function recordSkillResults(attemptId: string, results: SkillResult[]): Promise<void> {
  const { error } = await supabase.rpc("record_skill_results", {
    p_attempt_id: attemptId,
    p_results: results as unknown as Json,
  });
  if (error) console.error("Failed to record skill mastery:", error);
}


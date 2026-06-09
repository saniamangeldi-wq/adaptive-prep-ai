import { supabase } from "@/integrations/supabase/client";

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
}

export interface TestConfig {
  testType: "math" | "reading_writing" | "combined";
  length: "quick" | "short" | "full";
  difficulty: "easy" | "normal" | "hard";
  timerEnabled: boolean;
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

// Calculate adaptive difficulty based on past performance
async function getAdaptiveDifficulty(userId: string, baseDifficulty: DifficultyLevel): Promise<DifficultyLevel> {
  const { data: recentAttempts } = await supabase
    .from("test_attempts")
    .select("correct_answers, total_questions, time_spent_seconds")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!recentAttempts || recentAttempts.length < 3) {
    return baseDifficulty;
  }

  const accuracy = recentAttempts.reduce((sum, a) => {
    return sum + ((a.correct_answers || 0) / (a.total_questions || 1));
  }, 0) / recentAttempts.length;

  const avgTimePerQuestion = recentAttempts.reduce((sum, a) => {
    const time = a.time_spent_seconds || 0;
    const qs = a.total_questions || 1;
    return sum + (time / qs);
  }, 0) / recentAttempts.length;

  if (accuracy > 0.8 && avgTimePerQuestion < 90) {
    if (baseDifficulty === "easy") return "normal";
    if (baseDifficulty === "normal") return "hard";
    return "hard";
  } else if (accuracy < 0.5) {
    if (baseDifficulty === "hard") return "normal";
    if (baseDifficulty === "normal") return "easy";
    return "easy";
  }

  return baseDifficulty;
}

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

  const adaptedDifficulty = await getAdaptiveDifficulty(userId, config.difficulty);

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
  const rankQuestion = (q: Question) => {
    const seenPenalty = seenQuestionIds.has(q.id) ? 1000 : 0;
    const diffDistance = Math.abs((difficultyRank[q.difficulty] ?? 1) - preferredRank);
    return seenPenalty + diffDistance;
  };

  // CHANGE 3: Fisher-Yates instead of biased Math.random()-0.5 sort.
  const unseenQuestions = shuffle(
    allQuestions.filter((q) => !seenQuestionIds.has(q.id))
  ).sort((a, b) => rankQuestion(a) - rankQuestion(b));

  // Seen pool sorted least-recently-seen first (oldest timestamp = highest priority for recycling).
  const seenQuestions = allQuestions
    .filter((q) => seenQuestionIds.has(q.id))
    .sort((a, b) => (lastSeenAt.get(a.id) ?? 0) - (lastSeenAt.get(b.id) ?? 0));

  let selectedQuestions: Question[];
  if (config.testType === "combined") {
    const isFullOfficial = config.length === "full";
    const rwTarget = isFullOfficial ? 54 : Math.floor(targetQuestions / 2);
    const mathTarget = isFullOfficial ? 44 : targetQuestions - rwTarget;

    const unseenMath = shuffle(unseenQuestions.filter((q) => q.section === "math"));
    const unseenRW = shuffle(unseenQuestions.filter((q) => q.section === "reading_writing"));
    // Overflow (seen) pools stay in least-recently-seen order.
    const seenMath = seenQuestions.filter((q) => q.section === "math");
    const seenRW = seenQuestions.filter((q) => q.section === "reading_writing");

    if (isFullOfficial) {
      // CHANGE 2: fillToTarget now recycles least-recently-seen instead of cloning.
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
    const prioritized = [...shuffle(unseenQuestions), ...seenQuestions];
    if (config.length === "full") {
      // CHANGE 2: single-section full uses the same recycle-not-clone strategy.
      selectedQuestions = fillToTarget(
        shuffle(unseenQuestions),
        targetQuestions,
        seenQuestions
      );
    } else {
      selectedQuestions = prioritized.slice(0, Math.min(targetQuestions, prioritized.length));
    }
  }

  // CHANGE 4: surface a warning when the bank couldn't fill the target.
  let poolWarning: string | undefined;
  if (selectedQuestions.length < targetQuestions) {
    poolWarning =
      "Some sections have fewer questions than a full SAT because the question bank is still being expanded.";
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
  };
}

export function calculateScore(questions: Question[], answers: Record<string, string>): {
  score: number;
  correct: number;
  total: number;
  byTopic: Record<string, { correct: number; total: number }>;
  bySection: Record<string, { correct: number; total: number }>;
} {
  let correct = 0;
  const byTopic: Record<string, { correct: number; total: number }> = {};
  const bySection: Record<string, { correct: number; total: number }> = {};

  for (const question of questions) {
    const userAnswer = answers[question.id];
    const isCorrect = userAnswer?.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();

    if (isCorrect) correct++;

    if (!byTopic[question.topic]) {
      byTopic[question.topic] = { correct: 0, total: 0 };
    }
    byTopic[question.topic].total++;
    if (isCorrect) byTopic[question.topic].correct++;

    if (!bySection[question.section]) {
      bySection[question.section] = { correct: 0, total: 0 };
    }
    bySection[question.section].total++;
    if (isCorrect) bySection[question.section].correct++;
  }

  const total = questions.length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;

  return { score, correct, total, byTopic, bySection };
}

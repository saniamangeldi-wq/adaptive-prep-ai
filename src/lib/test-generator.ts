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
  length: "quick" | "short" | "medium" | "long" | "full";
  difficulty: "easy" | "normal" | "hard";
  timerEnabled: boolean;
}

export interface GeneratedTest {
  id: string;
  questions: Question[];
  timeLimit: number | null;
  config: TestConfig;
}

const lengthToQuestions: Record<string, number> = {
  quick: 10,
  short: 25,
  medium: 50,
  long: 75,
  full: 98, // Official Digital SAT: 54 R&W + 44 Math
};

const lengthToMinutes: Record<string, number> = {
  quick: 10,
  short: 25,
  medium: 50,
  long: 75,
  full: 180,
};

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
    return baseDifficulty; // Not enough data, use selected difficulty
  }

  const accuracy = recentAttempts.reduce((sum, a) => {
    return sum + ((a.correct_answers || 0) / (a.total_questions || 1));
  }, 0) / recentAttempts.length;

  const avgTimePerQuestion = recentAttempts.reduce((sum, a) => {
    const time = a.time_spent_seconds || 0;
    const qs = a.total_questions || 1;
    return sum + (time / qs);
  }, 0) / recentAttempts.length;

  // Progressive difficulty calibration algorithm
  if (accuracy > 0.8 && avgTimePerQuestion < 90) {
    // Student mastering current level - increase difficulty
    if (baseDifficulty === "easy") return "normal";
    if (baseDifficulty === "normal") return "hard";
    return "hard";
  } else if (accuracy < 0.5) {
    // Student struggling - decrease difficulty
    if (baseDifficulty === "hard") return "normal";
    if (baseDifficulty === "normal") return "easy";
    return "easy";
  }

  return baseDifficulty; // Maintain current level
}

export async function generateTest(config: TestConfig, userId: string): Promise<GeneratedTest | null> {
  const targetQuestions = lengthToQuestions[config.length];
  
  // Apply adaptive difficulty calibration
  const adaptedDifficulty = await getAdaptiveDifficulty(userId, config.difficulty);
  
  // Determine which test types to fetch
  let testTypes: string[] = [];
  if (config.testType === "combined") {
    testTypes = ["math", "reading_writing"];
  } else {
    testTypes = [config.testType];
  }
  
  // For the official Digital SAT (combined + full) we MUST hit 54 R&W + 44 Math.
  // The DB doesn't always have enough questions at a single difficulty, so for
  // that mode we pull across all difficulties to maximize the available pool.
  const isOfficialFull = config.testType === "combined" && config.length === "full";

  // Always pull across all difficulties so we have the largest possible pool.
  // Difficulty becomes a *preference* used for ranking, not a hard filter — this
  // is critical because some difficulty buckets only have ~10 questions and would
  // otherwise repeat constantly.
  const { data: tests, error } = await supabase
    .from("sat_tests")
    .select("id, questions, difficulty, test_type")
    .in("test_type", testTypes)
    .eq("is_official", true);

  if (error || !tests || tests.length === 0) {
    console.error("Error fetching tests:", error);
    return null;
  }

  // Collect all questions from matching tests, tagging each with its source difficulty
  // so we can rank by closeness to the requested difficulty.
  const difficultyRank: Record<string, number> = { easy: 0, normal: 1, hard: 2 };
  const preferredRank = difficultyRank[adaptedDifficulty] ?? 1;
  let allQuestions: Question[] = [];
  for (const test of tests) {
    const questions = test.questions as unknown as Question[];
    // Override per-question difficulty with the parent test's difficulty when missing
    for (const q of questions) {
      allQuestions.push({ ...q, difficulty: q.difficulty || (test.difficulty as DifficultyLevel) });
    }
  }

  // Fetch previously seen question IDs across a wide attempt window so users
  // genuinely cycle through the bank before any repeats appear.
  const { data: recentAttempts } = await supabase
    .from("test_attempts")
    .select("answers")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);

  const seenQuestionIds = new Set<string>();
  if (recentAttempts) {
    for (const attempt of recentAttempts) {
      const answers = attempt.answers as Record<string, string> | unknown[] | null;
      if (answers && typeof answers === "object" && !Array.isArray(answers)) {
        // Strip any __repN suffix added by the padding logic so a padded repeat
        // still counts as "seen" for its base id.
        Object.keys(answers).forEach(id => seenQuestionIds.add(id.replace(/__rep\d+$/, "")));
      }
    }
  }

  // Rank questions: unseen first, then by closeness to preferred difficulty, then random.
  const rankQuestion = (q: Question) => {
    const seenPenalty = seenQuestionIds.has(q.id) ? 1000 : 0;
    const diffDistance = Math.abs((difficultyRank[q.difficulty] ?? 1) - preferredRank);
    return seenPenalty + diffDistance;
  };

  // Prioritize unseen questions, fall back to seen ones if pool is exhausted
  const unseenQuestions = allQuestions
    .filter(q => !seenQuestionIds.has(q.id))
    .sort((a, b) => rankQuestion(a) - rankQuestion(b) || Math.random() - 0.5);
  const seenQuestions = allQuestions
    .filter(q => seenQuestionIds.has(q.id))
    .sort((a, b) => rankQuestion(a) - rankQuestion(b) || Math.random() - 0.5);

  // If combined, balance math and reading/writing with dedup awareness
  let selectedQuestions: Question[];
  if (config.testType === "combined") {
    // Official Digital SAT structure: 54 R&W + 44 Math = 98 questions.
    // For "full" length we MUST hit those exact counts so the test renders
    // 27 + 27 R&W and 22 + 22 Math modules. Other lengths use a 50/50 split.
    const isFullOfficial = config.length === "full";
    const rwTarget = isFullOfficial ? 54 : Math.floor(targetQuestions / 2);
    const mathTarget = isFullOfficial ? 44 : targetQuestions - rwTarget;

    const unseenMath = unseenQuestions.filter(q => q.section === "math").sort(() => Math.random() - 0.5);
    const unseenRW = unseenQuestions.filter(q => q.section === "reading_writing").sort(() => Math.random() - 0.5);
    const seenMath = seenQuestions.filter(q => q.section === "math").sort(() => Math.random() - 0.5);
    const seenRW = seenQuestions.filter(q => q.section === "reading_writing").sort(() => Math.random() - 0.5);

    const mathPool = [...unseenMath, ...seenMath];
    const rwPool = [...unseenRW, ...seenRW];

    // For official mode, GUARANTEE the exact module counts. If the bank is
    // smaller than the target, repeat questions (with fresh ids per repeat)
    // so the modules always render the correct number of slots.
    const fillToTarget = (pool: Question[], target: number, sectionLabel: string): Question[] => {
      if (pool.length === 0) return [];
      if (pool.length >= target) return pool.slice(0, target);
      const out: Question[] = [...pool];
      let i = 0;
      let repeatRound = 1;
      while (out.length < target) {
        const original = pool[i % pool.length];
        // Clone with a unique id so React keys + answer tracking stay stable.
        out.push({ ...original, id: `${original.id}__rep${repeatRound}` });
        i++;
        if (i % pool.length === 0) repeatRound++;
      }
      console.warn(`[SAT] ${sectionLabel} pool short (${pool.length}/${target}) — padded with repeats.`);
      return out;
    };

    if (isFullOfficial) {
      selectedQuestions = [
        ...fillToTarget(rwPool, rwTarget, "Reading & Writing"),
        ...fillToTarget(mathPool, mathTarget, "Math"),
      ];
    } else {
      selectedQuestions = [
        ...rwPool.slice(0, rwTarget),
        ...mathPool.slice(0, mathTarget),
      ];
    }
    // NOTE: do NOT shuffle here — TakeSATTest splits by section/module.
  } else {
    const prioritized = [
      ...unseenQuestions.sort(() => Math.random() - 0.5),
      ...seenQuestions.sort(() => Math.random() - 0.5),
    ];
    selectedQuestions = prioritized.slice(0, Math.min(targetQuestions, prioritized.length));
  }

  // Create test attempt in database
  const { data: attempt, error: attemptError } = await supabase
    .from("test_attempts")
    .insert({
      user_id: userId,
      test_id: tests[0].id,
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

  return {
    id: attempt.id,
    questions: selectedQuestions,
    timeLimit: config.timerEnabled ? lengthToMinutes[config.length] : null,
    config,
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

    // Track by topic
    if (!byTopic[question.topic]) {
      byTopic[question.topic] = { correct: 0, total: 0 };
    }
    byTopic[question.topic].total++;
    if (isCorrect) byTopic[question.topic].correct++;

    // Track by section
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

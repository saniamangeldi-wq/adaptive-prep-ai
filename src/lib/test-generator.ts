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
  full: 154,
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
  
  // Fetch questions from sat_tests table - try adapted difficulty first, fallback to original
  let { data: tests, error } = await supabase
    .from("sat_tests")
    .select("id, questions, difficulty, test_type")
    .eq("difficulty", adaptedDifficulty)
    .in("test_type", testTypes)
    .eq("is_official", true);
  
  // Fallback to original difficulty if adapted yields no results
  if ((!tests || tests.length === 0) && adaptedDifficulty !== config.difficulty) {
    const fallback = await supabase
      .from("sat_tests")
      .select("id, questions, difficulty, test_type")
      .eq("difficulty", config.difficulty)
      .in("test_type", testTypes)
      .eq("is_official", true);
    tests = fallback.data;
    error = fallback.error;
  }

  if (error || !tests || tests.length === 0) {
    console.error("Error fetching tests:", error);
    return null;
  }

  // Collect all questions from matching tests
  let allQuestions: Question[] = [];
  for (const test of tests) {
    const questions = test.questions as unknown as Question[];
    allQuestions = [...allQuestions, ...questions];
  }

  // Shuffle and select the required number of questions
  const shuffled = allQuestions.sort(() => Math.random() - 0.5);
  const selectedQuestions = shuffled.slice(0, Math.min(targetQuestions, shuffled.length));

  // If combined, try to balance math and reading/writing
  if (config.testType === "combined" && selectedQuestions.length > 1) {
    const mathQs = allQuestions.filter(q => q.section === "math");
    const rwQs = allQuestions.filter(q => q.section === "reading_writing");
    
    const halfTarget = Math.floor(targetQuestions / 2);
    const balancedQuestions = [
      ...mathQs.sort(() => Math.random() - 0.5).slice(0, halfTarget),
      ...rwQs.sort(() => Math.random() - 0.5).slice(0, halfTarget),
    ].sort(() => Math.random() - 0.5);
    
    if (balancedQuestions.length >= selectedQuestions.length) {
      selectedQuestions.splice(0, selectedQuestions.length, ...balancedQuestions.slice(0, targetQuestions));
    }
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

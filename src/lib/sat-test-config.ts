// Official SAT Digital Test Configuration

export interface ModuleConfig {
  section: "reading_writing" | "math";
  moduleNumber: 1 | 2;
  questions: number;
  timeMinutes: number;
  timeSeconds: number;
}

export interface SectionConfig {
  name: string;
  displayName: string;
  totalQuestions: number;
  totalTimeMinutes: number;
  modules: ModuleConfig[];
}

export const SAT_TEST_STRUCTURE: Record<string, SectionConfig> = {
  reading_writing: {
    name: "reading_writing",
    displayName: "Reading and Writing",
    totalQuestions: 54,
    totalTimeMinutes: 64,
    modules: [
      { section: "reading_writing", moduleNumber: 1, questions: 27, timeMinutes: 32, timeSeconds: 32 * 60 },
      { section: "reading_writing", moduleNumber: 2, questions: 27, timeMinutes: 32, timeSeconds: 32 * 60 },
    ],
  },
  math: {
    name: "math",
    displayName: "Math",
    totalQuestions: 44,
    totalTimeMinutes: 70,
    modules: [
      { section: "math", moduleNumber: 1, questions: 22, timeMinutes: 35, timeSeconds: 35 * 60 },
      { section: "math", moduleNumber: 2, questions: 22, timeMinutes: 35, timeSeconds: 35 * 60 },
    ],
  },
};

export const BREAK_DURATION_SECONDS = 600; // 10 minutes

export const MODULE_DIRECTIONS: Record<string, Record<number, { title: string; time: string; questions: number; text: string }>> = {
  reading_writing: {
    1: {
      title: "Reading and Writing - Module 1",
      time: "32 minutes",
      questions: 27,
      text: `The questions in this section address a number of important reading and writing skills. Each question includes one or more passages, which may include a table or graph. Read each passage and question carefully, and then choose the best answer to the question based on the passage(s).

All questions in this section are multiple-choice with four answer choices. Each question has a single best answer.`,
    },
    2: {
      title: "Reading and Writing - Module 2",
      time: "32 minutes",
      questions: 27,
      text: "The second module contains questions that are tailored to your performance on the first module. Continue answering carefully and strategically.",
    },
  },
  math: {
    1: {
      title: "Math - Module 1",
      time: "35 minutes",
      questions: 22,
      text: `The questions in this section address a number of important math skills.

Use of a calculator is permitted for all questions.

Unless otherwise indicated:
• All variables and expressions represent real numbers.
• Figures provided are drawn to scale.
• All figures lie in a plane.
• The domain of a given function f is the set of all real numbers x for which f(x) is a real number.`,
    },
    2: {
      title: "Math - Module 2",
      time: "35 minutes",
      questions: 22,
      text: "The second module contains questions that are tailored to your performance on the first module.",
    },
  },
};

export interface TestFlowState {
  phase: "start" | "directions" | "test" | "review" | "break" | "complete";
  currentSection: "reading_writing" | "math";
  currentModule: 1 | 2;
}

export const INITIAL_TEST_FLOW: TestFlowState = {
  phase: "start",
  currentSection: "reading_writing",
  currentModule: 1,
};

export function getNextFlowState(current: TestFlowState): TestFlowState {
  // From start -> directions for first module
  if (current.phase === "start") {
    return { phase: "directions", currentSection: "reading_writing", currentModule: 1 };
  }

  // From directions -> test
  if (current.phase === "directions") {
    return { ...current, phase: "test" };
  }

  // From review -> next phase
  if (current.phase === "review") {
    if (current.currentSection === "reading_writing") {
      if (current.currentModule === 1) {
        // Move to Module 2
        return { phase: "directions", currentSection: "reading_writing", currentModule: 2 };
      } else {
        // After R&W Module 2 -> Break
        return { phase: "break", currentSection: "math", currentModule: 1 };
      }
    } else {
      if (current.currentModule === 1) {
        // Move to Math Module 2
        return { phase: "directions", currentSection: "math", currentModule: 2 };
      } else {
        // Test complete
        return { phase: "complete", currentSection: "math", currentModule: 2 };
      }
    }
  }

  // From break -> Math directions
  if (current.phase === "break") {
    return { phase: "directions", currentSection: "math", currentModule: 1 };
  }

  return current;
}

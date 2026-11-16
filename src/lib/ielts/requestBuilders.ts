import {
  LIMITS,
  TASK_RULES,
  type CustomVisualInput,
  type FeedbackLang,
  type GradeRequest,
  type TaskType,
  type TaskVariant,
  type WritingTask,
} from "@ielts/contract.ts";

/**
 * Request bodies the web app sends to the edge functions. Kept pure so the
 * integration tests can pass exactly these through the server's validators.
 */

/** The task for "Use my own question". The server resets minWords/timeMinutes itself. */
export function buildCustomTask(input: { taskType: TaskType; variant: TaskVariant; prompt: string }): WritingTask {
  const rules = TASK_RULES[input.taskType];
  return {
    id: "custom",
    source: "custom",
    taskType: input.taskType,
    variant: input.variant,
    prompt: input.prompt.trim(),
    bullets: [],
    visuals: [],
    minWords: rules.minWords,
    timeMinutes: rules.timeMinutes,
  };
}

/** The student's own chart for an Academic Task 1 question, or undefined when none is needed or given. */
export function buildCustomVisual(input: {
  taskType: TaskType;
  mode: "image" | "text";
  imageDataUrl: string | null;
  description: string;
}): CustomVisualInput | undefined {
  if (input.taskType !== "task1_academic") return undefined;
  if (input.mode === "image") return input.imageDataUrl ? { imageDataUrl: input.imageDataUrl } : undefined;
  const description = input.description.trim().slice(0, LIMITS.maxVisualDescriptionChars);
  return description ? { description } : undefined;
}

export function buildGradeRequest(input: {
  task: WritingTask;
  script: string;
  feedbackLang: FeedbackLang;
  sessionId?: string;
  visual?: CustomVisualInput | null;
  includeModelAnswer: boolean;
}): GradeRequest {
  return {
    task: input.task,
    script: input.script,
    feedbackLang: input.feedbackLang,
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    ...(input.visual ? { customVisual: input.visual } : {}),
    ...(input.includeModelAnswer ? { includeModelAnswer: true } : {}),
  };
}

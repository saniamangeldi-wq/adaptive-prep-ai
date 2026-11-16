// Build an AI Coach system-prompt fragment from a cognitive profile.

export type CognitiveProfile = {
  processing_speed: number;
  working_memory: number;
  reasoning_style: number;
  attention_stamina: number;
};

export function buildCognitivePromptFragment(p: CognitiveProfile | null): string {
  if (!p) return "";

  const lines: string[] = [
    "STUDENT COGNITIVE PROFILE (adapt your tone and depth accordingly):",
  ];

  if (p.processing_speed >= 70) {
    lines.push("- Fast processor: skip filler, get to the point quickly.");
  } else if (p.processing_speed <= 35) {
    lines.push("- Deliberate processor: slow down, give the student time, avoid information overload.");
  }

  if (p.working_memory >= 70) {
    lines.push("- Strong working memory: dense multi-step explanations OK.");
  } else if (p.working_memory <= 35) {
    lines.push("- Limited working memory: chunk into 2-3 steps max, repeat key facts, use simple variables.");
  }

  if (p.reasoning_style >= 70) {
    lines.push("- Logical/step-by-step thinker: show formal proofs, numbered steps, justify each move.");
  } else if (p.reasoning_style <= 35) {
    lines.push("- Intuitive/pattern thinker: lead with the big-picture insight or analogy first, formalize after.");
  }

  if (p.attention_stamina <= 40) {
    lines.push("- Lower attention stamina: keep responses under ~150 words, suggest a short break after long sessions.");
  }

  if (lines.length === 1) return ""; // all average — no special guidance needed
  return "\n\n" + lines.join("\n") + "\n";
}

/**
 * Returns suggested test pacing tweaks.
 */
export function getTestPacingHints(p: CognitiveProfile | null) {
  if (!p) return { suggestBreakAfterMin: 30, perQuestionTimeMultiplier: 1 };

  const breakMin =
    p.attention_stamina >= 70 ? 45 : p.attention_stamina >= 40 ? 30 : 20;

  const speedMultiplier =
    p.processing_speed >= 70 ? 0.85 : p.processing_speed <= 35 ? 1.25 : 1;

  return {
    suggestBreakAfterMin: breakMin,
    perQuestionTimeMultiplier: speedMultiplier,
  };
}

// Cognitive baseline scoring helpers.
// All scores normalized to 0-100.

export type CognitiveBaselineRaw = {
  // Reaction-time task: array of ms response per trial (lower = faster)
  reactionTimesMs: number[];
  // Digit-span: longest correctly-recalled sequence length
  digitSpanLength: number;
  // Reasoning: array of {correct: boolean, timeMs: number}
  reasoningResults: { correct: boolean; timeMs: number }[];
};

export type CognitiveScores = {
  processing_speed: number;
  working_memory: number;
  reasoning_style: number; // 0 intuitive (fast) ... 100 logical (deliberate)
  attention_stamina: number;
};

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

export function scoreBaseline(raw: CognitiveBaselineRaw): CognitiveScores {
  // Processing speed: average reaction time. ~250ms = 100, ~900ms = 0
  const avgRt =
    raw.reactionTimesMs.reduce((s, x) => s + x, 0) /
    Math.max(1, raw.reactionTimesMs.length);
  const processing_speed = clamp(
    Math.round(((900 - avgRt) / (900 - 250)) * 100)
  );

  // Working memory: digit span 3 -> 0, 9 -> 100
  const working_memory = clamp(Math.round(((raw.digitSpanLength - 3) / 6) * 100));

  // Reasoning style: avg time per reasoning item. Faster + correct = intuitive (low),
  // slower + correct = logical (high). Wrong answers pull toward 50 (uncertain).
  const correctItems = raw.reasoningResults.filter((r) => r.correct);
  const avgReasonTime =
    correctItems.length > 0
      ? correctItems.reduce((s, r) => s + r.timeMs, 0) / correctItems.length
      : 15000;
  // 5s -> 20 (intuitive), 30s -> 90 (logical)
  const reasoning_style = clamp(
    Math.round(((avgReasonTime - 5000) / 25000) * 70 + 20)
  );

  // Attention stamina: did RT degrade across trials? Compare first-half vs second-half avg.
  const half = Math.floor(raw.reactionTimesMs.length / 2);
  if (half < 2) {
    return {
      processing_speed,
      working_memory,
      reasoning_style,
      attention_stamina: 50,
    };
  }
  const firstAvg = raw.reactionTimesMs.slice(0, half).reduce((s, x) => s + x, 0) / half;
  const secondAvg =
    raw.reactionTimesMs.slice(half).reduce((s, x) => s + x, 0) /
    (raw.reactionTimesMs.length - half);
  // No degradation = 100, 50% slower = 0
  const degradation = (secondAvg - firstAvg) / Math.max(1, firstAvg);
  const attention_stamina = clamp(Math.round(100 - degradation * 200));

  return { processing_speed, working_memory, reasoning_style, attention_stamina };
}

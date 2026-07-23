// SM-2 spaced repetition algorithm (Piotr Wozniak, 1988), lightly adapted.
// See https://super-memory.com/english/ol/sm2.htm
//
// We rate each recall attempt on a 0..5 quality scale. Correct answers push
// the next review further out; wrong answers reset the streak.

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export interface CardScheduleState {
  ease: number;           // ease factor, min 1.30
  intervalDays: number;   // current interval
  repetitions: number;    // successful reviews in a row
  nextReviewAt: Date;
  lastReviewedAt: Date;
  lastQuality: Quality;
}

export const DEFAULT_EASE = 2.5;

export function initialState(): Omit<CardScheduleState, "lastReviewedAt" | "lastQuality"> {
  return {
    ease: DEFAULT_EASE,
    intervalDays: 0,
    repetitions: 0,
    nextReviewAt: new Date(), // due immediately for first study
  };
}

/**
 * Compute the next scheduling state after a review.
 *
 * quality:
 *   0-2 = wrong recall (streak resets, card returns tomorrow)
 *   3   = correct with hesitation
 *   4   = correct
 *   5   = perfect recall
 */
export function schedule(
  prev: { ease: number; intervalDays: number; repetitions: number },
  quality: Quality,
  now: Date = new Date()
): CardScheduleState {
  const q = Math.max(0, Math.min(5, quality)) as Quality;
  let { ease, intervalDays, repetitions } = prev;

  if (q < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * ease);
  }

  // Ease update — clamped to 1.30 minimum per SM-2.
  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < 1.3) ease = 1.3;

  const next = new Date(now);
  next.setDate(next.getDate() + Math.max(intervalDays, 1));

  return {
    ease: Number(ease.toFixed(2)),
    intervalDays,
    repetitions,
    nextReviewAt: next,
    lastReviewedAt: now,
    lastQuality: q,
  };
}

/** Map the four user-facing buttons to SM-2 quality scores. */
export const RATING_TO_QUALITY: Record<"again" | "hard" | "good" | "easy", Quality> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

export function isDue(nextReviewAt: string | Date, now: Date = new Date()): boolean {
  const d = typeof nextReviewAt === "string" ? new Date(nextReviewAt) : nextReviewAt;
  return d.getTime() <= now.getTime();
}

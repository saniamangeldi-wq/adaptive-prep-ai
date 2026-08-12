/**
 * Digital SAT raw-to-scaled conversion, shared by every surface that reports a
 * section or total score.
 *
 * Two rules matter here and both were previously violated:
 *  1. A section with **no attempted questions** has no score at all. It must
 *     report `null` (rendered as "—"), never 200. The old linear formula
 *     mapped an empty section to 0% accuracy and printed the 200 floor.
 *  2. A student who answered at least one question correctly must never see
 *     the 200 floor. The curves below start above 200 from the first correct
 *     answer, and `sectionScore` enforces that invariant explicitly.
 */

/** Operational question counts on the real Digital SAT. */
export const MATH_OPERATIONAL = 44;
export const RW_OPERATIONAL = 54;

/** Lowest score we will report once a student has ≥1 correct answer. */
const MIN_NONZERO_SCORE = 210;
const FLOOR = 200;
const CEILING = 800;

// Approximated College Board Digital SAT conversion tables (per section).
const MATH_TABLE: number[] = [
  200, 210, 220, 230, 240, 260, 280, 300, 320, 340, 360, 380, 400, 410, 420,
  440, 460, 480, 500, 510, 520, 540, 560, 570, 580, 600, 610, 620, 640, 650,
  660, 680, 690, 700, 710, 720, 730, 740, 750, 760, 770, 780, 790, 800, 800,
];

const RW_TABLE: number[] = [
  200, 210, 215, 220, 230, 240, 260, 280, 300, 320, 340, 360, 370, 380, 400,
  410, 420, 430, 440, 450, 460, 470, 480, 490, 500, 510, 520, 530, 540, 550,
  560, 570, 580, 590, 600, 610, 620, 630, 650, 660, 670, 680, 690, 700, 710,
  720, 730, 740, 750, 760, 770, 780, 790, 800, 800,
];

export type SatSection = "math" | "reading_writing";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Interpolates a conversion table at a fractional raw score. */
function lookup(table: number[], raw: number): number {
  const max = table.length - 1;
  const x = clamp(raw, 0, max);
  const lo = Math.floor(x);
  const hi = Math.ceil(x);
  if (lo === hi) return table[lo];
  return Math.round(table[lo] + (table[hi] - table[lo]) * (x - lo));
}

/**
 * Scales a section result to the 200–800 range.
 *
 * Returns `null` when the student attempted no questions in that section —
 * "no data" is not the same as "scored the floor".
 */
export function sectionScore(
  correct: number,
  total: number,
  section: SatSection = "math"
): number | null {
  if (!Number.isFinite(total) || total <= 0) return null;

  const safeCorrect = clamp(Number(correct) || 0, 0, total);
  const table = section === "math" ? MATH_TABLE : RW_TABLE;
  const operational = section === "math" ? MATH_OPERATIONAL : RW_OPERATIONAL;

  // Practice sets are rarely full length: project the raw score onto the
  // operational question count before reading the conversion table.
  const projectedRaw = (safeCorrect / total) * operational;
  const scaled = lookup(table, projectedRaw);

  // Hard invariant: at least one correct answer can never report the floor.
  if (safeCorrect > 0) return clamp(Math.max(scaled, MIN_NONZERO_SCORE), MIN_NONZERO_SCORE, CEILING);
  return FLOOR;
}

/**
 * Combines section scores into a 400–1600 total.
 * Returns `null` unless at least one section has real data; when only one
 * section was attempted, the total is that section doubled (the standard
 * single-section projection) rather than silently adding a phantom 200.
 */
export function totalScore(math: number | null, rw: number | null): number | null {
  if (math === null && rw === null) return null;
  if (math === null) return clamp(rw! * 2, 400, 1600);
  if (rw === null) return clamp(math * 2, 400, 1600);
  return clamp(math + rw, 400, 1600);
}

/** Renders a possibly-absent score for display. */
export function formatScore(score: number | null): string {
  return score === null ? "—" : String(score);
}

/** True when only one of the two sections has data (total is a projection). */
export function isProjectedTotal(math: number | null, rw: number | null): boolean {
  return (math === null) !== (rw === null);
}

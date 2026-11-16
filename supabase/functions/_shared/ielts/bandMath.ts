/**
 * Band arithmetic. Pure, no imports beyond the contract.
 *
 * Rounding convention for a single Writing task: the mean of the four
 * criteria is rounded DOWN to the half band below.
 *   7, 7, 7, 6 → 6.75 → 6.5        6, 6, 6, 7 → 6.25 → 6.0
 *
 * Why down: the published "quarter points round up" rule is for the OVERALL
 * test band across the four skills. The rule for one skill's criteria is not
 * published; IELTS teachers and former examiners consistently report that
 * Writing and Speaking round down. Rounding down is also the conservative
 * choice for a product that must never inflate. Decision taken by the lead on
 * 2026-11-16; calibration against examiner-scored scripts is what settles it.
 * `roundToHalfBand` (quarter points up) is kept for comparison in calibration.
 */

import type { CriterionKey } from "./contract.ts";

/** Floating-point guard. Criterion means are multiples of 0.125, so exact in binary anyway. */
const EPS = 1e-9;

/** True only for a finite number in 0–9 that sits on a half-band step. Never coerces. */
export function isValidBand(value: unknown): value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (value < 0 || value > 9) return false;
  return Number.isInteger(value * 2);
}

const CANONICAL_BAND_STRING = /^(?:[0-8](?:\.[05])?|9(?:\.0)?)$/;

/**
 * Strict parse of a model-supplied band. Accepts a valid number, or a string
 * that is exactly a canonical band ("6", "6.5", "9.0"). Anything else (6.3,
 * "6-7", "band 6", NaN, null, 10) returns null. Never invents a number.
 */
export function parseBand(value: unknown): number | null {
  if (isValidBand(value)) return value;
  if (typeof value === "string") {
    const s = value.trim();
    if (!CANONICAL_BAND_STRING.test(s)) return null;
    const n = Number(s);
    return isValidBand(n) ? n : null;
  }
  return null;
}

/** Nearest half band, quarter points round up. NOT used for task bands; kept for calibration comparisons. */
export function roundToHalfBand(mean: number): number {
  if (typeof mean !== "number" || !Number.isFinite(mean)) {
    throw new RangeError(`roundToHalfBand: not a finite number: ${String(mean)}`);
  }
  const whole = Math.floor(mean + EPS);
  const frac = mean - whole;
  let out: number;
  if (frac < 0.25 - EPS) out = whole;
  else if (frac < 0.75 - EPS) out = whole + 0.5;
  else out = whole + 1;
  return Math.min(9, Math.max(0, out));
}

/** Round down to the half band below. The convention used for task bands (see header). */
export function roundDownToHalfBand(mean: number): number {
  if (typeof mean !== "number" || !Number.isFinite(mean)) {
    throw new RangeError(`roundDownToHalfBand: not a finite number: ${String(mean)}`);
  }
  return Math.min(9, Math.max(0, Math.floor(mean * 2 + EPS) / 2));
}

export type CriterionBands = Record<CriterionKey, number>;

/**
 * Overall band for one Writing task from its four criteria.
 * Throws on any invalid band: callers must validate first, never default.
 */
export function overallFromCriteria(bands: CriterionBands): { raw: number; overall: number } {
  const keys: CriterionKey[] = ["task", "coherence", "lexical", "grammar"];
  for (const k of keys) {
    if (!isValidBand(bands[k])) {
      throw new RangeError(`overallFromCriteria: invalid band for ${k}: ${String(bands[k])}`);
    }
  }
  const raw = (bands.task + bands.coherence + bands.lexical + bands.grammar) / 4;
  return { raw, overall: roundDownToHalfBand(raw) };
}

/**
 * The Writing band when both tasks were taken: Task 2 counts twice as much
 * as Task 1. Inputs are the two task bands (already half-band values).
 */
export function combinedWritingBand(task1Band: number, task2Band: number): { raw: number; band: number } {
  if (!isValidBand(task1Band)) throw new RangeError(`combinedWritingBand: invalid Task 1 band ${String(task1Band)}`);
  if (!isValidBand(task2Band)) throw new RangeError(`combinedWritingBand: invalid Task 2 band ${String(task2Band)}`);
  const raw = (task1Band + 2 * task2Band) / 3;
  return { raw, band: roundDownToHalfBand(raw) };
}

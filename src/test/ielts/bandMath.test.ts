import { describe, expect, it } from "vitest";
import {
  combinedWritingBand,
  isValidBand,
  overallFromCriteria,
  parseBand,
  roundDownToHalfBand,
  roundToHalfBand,
} from "@ielts/bandMath.ts";

describe("roundToHalfBand", () => {
  it.each([
    [6, 6],
    [6.125, 6],
    [6.24, 6],
    [6.25, 6.5], // quarter rounds up to the half
    [6.375, 6.5],
    [6.5, 6.5],
    [6.625, 6.5],
    [6.74, 6.5],
    [6.75, 7], // three-quarter rounds up to the next whole band
    [6.875, 7],
    [8.875, 9],
    [0.125, 0],
    [0.25, 0.5],
  ])("%s → %s", (mean, expected) => {
    expect(roundToHalfBand(mean)).toBe(expected);
  });

  it("throws on non-numbers instead of inventing a band", () => {
    expect(() => roundToHalfBand(NaN)).toThrow();
    expect(() => roundToHalfBand(Infinity)).toThrow();
  });

  it("roundDown alternative rounds 6.75 to 6.5", () => {
    expect(roundDownToHalfBand(6.75)).toBe(6.5);
    expect(roundDownToHalfBand(6.25)).toBe(6);
  });
});

describe("band validation", () => {
  it("accepts half bands 0–9 only", () => {
    for (const b of [0, 0.5, 5, 6.5, 9]) expect(isValidBand(b)).toBe(true);
    for (const b of [6.3, 6.25, -0.5, 9.5, 10, NaN, Infinity, "6", null, undefined]) expect(isValidBand(b)).toBe(false);
  });

  it("parseBand never coerces garbage", () => {
    expect(parseBand(6.5)).toBe(6.5);
    expect(parseBand("6.5")).toBe(6.5);
    expect(parseBand("9.0")).toBe(9);
    for (const v of [6.3, "6.3", "6-7", "band 6", "", " ", "9.5", "10", null, undefined, {}, [], true]) expect(parseBand(v)).toBeNull();
  });
});

describe("overallFromCriteria", () => {
  it("averages and rounds down to the half band below", () => {
    expect(overallFromCriteria({ task: 7, coherence: 7, lexical: 7, grammar: 6 })).toEqual({ raw: 6.75, overall: 6.5 });
    expect(overallFromCriteria({ task: 6, coherence: 6, lexical: 6, grammar: 7 })).toEqual({ raw: 6.25, overall: 6 });
    expect(overallFromCriteria({ task: 6, coherence: 6, lexical: 6.5, grammar: 6 })).toEqual({ raw: 6.125, overall: 6 });
    expect(overallFromCriteria({ task: 5.5, coherence: 6, lexical: 6, grammar: 6 })).toEqual({ raw: 5.875, overall: 5.5 });
  });

  it("throws on an invalid criterion band", () => {
    expect(() => overallFromCriteria({ task: 6.3, coherence: 6, lexical: 6, grammar: 6 })).toThrow();
    expect(() => overallFromCriteria({ task: NaN, coherence: 6, lexical: 6, grammar: 6 })).toThrow();
  });
});

describe("combinedWritingBand", () => {
  it("counts Task 2 double", () => {
    expect(combinedWritingBand(6, 7)).toEqual({ raw: 20 / 3, band: 6.5 });
    expect(combinedWritingBand(7, 6)).toEqual({ raw: 19 / 3, band: 6 });
    expect(combinedWritingBand(5, 7).band).toBe(6); // 6.33 → 6
    expect(combinedWritingBand(6.5, 6).band).toBe(6); // 6.17 → 6
  });
  it("rejects invalid task bands", () => {
    expect(() => combinedWritingBand(6.2, 6)).toThrow();
  });
});

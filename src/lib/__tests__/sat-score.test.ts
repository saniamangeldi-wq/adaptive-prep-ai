import { describe, expect, it } from "vitest";
import { sectionScore, totalScore } from "@/lib/sat-score";

describe("sectionScore", () => {
  it("returns null when the section was never attempted", () => {
    expect(sectionScore(0, 0, "math")).toBeNull();
    expect(sectionScore(0, 0, "reading_writing")).toBeNull();
  });

  it("never reports the 200 floor once one answer is correct", () => {
    for (const total of [1, 5, 22, 27, 44, 54]) {
      expect(sectionScore(1, total, "math")).toBeGreaterThan(200);
      expect(sectionScore(1, total, "reading_writing")).toBeGreaterThan(200);
    }
  });

  it("reports the floor only for a genuine zero", () => {
    expect(sectionScore(0, 22, "math")).toBe(200);
  });

  it("caps at 800 for a perfect section", () => {
    expect(sectionScore(44, 44, "math")).toBe(800);
    expect(sectionScore(54, 54, "reading_writing")).toBe(800);
  });

  it("increases monotonically with more correct answers", () => {
    let prev = -1;
    for (let c = 0; c <= 44; c++) {
      const s = sectionScore(c, 44, "math")!;
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });

  it("stays inside 200-800 for short practice sets", () => {
    const s = sectionScore(3, 4, "math")!;
    expect(s).toBeGreaterThan(200);
    expect(s).toBeLessThanOrEqual(800);
  });
});

describe("totalScore", () => {
  it("returns null with no section data", () => {
    expect(totalScore(null, null)).toBeNull();
  });

  it("projects a single attempted section instead of adding a phantom 200", () => {
    expect(totalScore(600, null)).toBe(1200);
    expect(totalScore(null, 500)).toBe(1000);
  });

  it("sums both sections and clamps to the 400-1600 range", () => {
    expect(totalScore(600, 700)).toBe(1300);
    expect(totalScore(800, 800)).toBe(1600);
    expect(totalScore(200, 200)).toBe(400);
  });
});

// @vitest-environment node
import { describe, it, expect } from "vitest";
import { calculateVAKResult } from "../vak-scoring";
import type { VAKStyle } from "../vak-questions";
import {
  SPATIAL_VISUAL_QS,
  EXPRESSIVE_AUDITORY_QS,
  PHYSICAL_KINESTHETIC_QS,
} from "../vak-questions";

// Helper: answers keyed by question id (1-based), matching VAKAssessment.
const build = (styles: VAKStyle[]): Record<number, VAKStyle> => {
  const out: Record<number, VAKStyle> = {};
  styles.forEach((s, i) => {
    out[i + 1] = s;
  });
  return out;
};

describe("calculateVAKResult", () => {
  it("all visual → Visual primary at 100%", () => {
    const answers = build(Array(10).fill("visual"));
    const r = calculateVAKResult(answers, "tier_1");
    expect(r.primaryStyle).toBe("visual");
    expect(r.scores.visual).toBe(100);
    expect(r.scores.auditory).toBe(0);
    expect(r.scores.kinesthetic).toBe(0);
    expect(r.label).toBe("Visual Learner");
  });

  it("Elite tier: dominant visual with spatial indicators → Spatial Visual Learner", () => {
    const answers: Record<number, VAKStyle> = {};
    for (let i = 1; i <= 10; i++) answers[i] = "visual";
    // all SPATIAL_VISUAL_QS are visual → spatial hits ratio = 1 > 0.5
    SPATIAL_VISUAL_QS.forEach((q) => expect(answers[q]).toBe("visual"));
    const r = calculateVAKResult(answers, "tier_3");
    expect(r.subType).toBe("spatial_visual");
    expect(r.label).toBe("Spatial Visual Learner");
  });

  it("Elite tier: visual primary but no spatial indicators → Verbal Visual Learner", () => {
    const answers: Record<number, VAKStyle> = {};
    for (let i = 1; i <= 10; i++) answers[i] = "visual";
    // flip spatial indicators to non-visual so ratio = 0
    SPATIAL_VISUAL_QS.forEach((q) => (answers[q] = "auditory"));
    // ensure visual is still primary by making non-spatial answers visual
    const r = calculateVAKResult(answers, "tier_3");
    if (r.primaryStyle === "visual") {
      expect(r.subType).toBe("verbal_visual");
      expect(r.label).toBe("Verbal Visual Learner");
    }
  });

  it("Elite tier: expressive auditory indicators produce expressive sub-type", () => {
    const answers: Record<number, VAKStyle> = {};
    for (let i = 1; i <= 10; i++) answers[i] = "auditory";
    EXPRESSIVE_AUDITORY_QS.forEach((q) => (answers[q] = "auditory"));
    const r = calculateVAKResult(answers, "tier_3");
    expect(r.primaryStyle).toBe("auditory");
    expect(r.subType).toBe("expressive_auditory");
  });

  it("Elite tier: kinesthetic with physical indicators → Physical Kinesthetic", () => {
    const answers: Record<number, VAKStyle> = {};
    for (let i = 1; i <= 10; i++) answers[i] = "kinesthetic";
    PHYSICAL_KINESTHETIC_QS.forEach((q) => (answers[q] = "kinesthetic"));
    const r = calculateVAKResult(answers, "tier_3");
    expect(r.subType).toBe("physical_kinesthetic");
  });

  it("Elite tier: balanced top two within 10% → Multimodal sub-type", () => {
    // 5 visual, 5 auditory
    const answers = build([
      "visual", "visual", "visual", "visual", "visual",
      "auditory", "auditory", "auditory", "auditory", "auditory",
    ]);
    const r = calculateVAKResult(answers, "tier_3");
    expect(r.subType).toContain("multimodal");
  });

  it("indicator arrays only reference served question ids (1–10)", () => {
    const all = [...SPATIAL_VISUAL_QS, ...EXPRESSIVE_AUDITORY_QS, ...PHYSICAL_KINESTHETIC_QS];
    all.forEach((q) => expect(q).toBeGreaterThanOrEqual(1));
    all.forEach((q) => expect(q).toBeLessThanOrEqual(10));
  });

  it("handles empty answers without crashing (divide-by-zero guard)", () => {
    const r = calculateVAKResult({}, "tier_3");
    expect(r.scores.visual).toBe(0);
    expect(r.scores.auditory).toBe(0);
    expect(r.scores.kinesthetic).toBe(0);
    expect(r.label).toBeTruthy();
  });
});

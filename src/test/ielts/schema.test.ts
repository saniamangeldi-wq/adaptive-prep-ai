import { describe, expect, it } from "vitest";
import { graderJsonSchema, validateGraderOutput } from "@ielts/schema.ts";
import { checklistFor } from "@ielts/rubric.ts";
import { goodOpinionOutput } from "./fixtures";

const ctx = { taskType: "task2" as const, variant: "opinion" as const, includeModelAnswer: false };

function errorsOf(raw: unknown, c = ctx): string[] {
  const r = validateGraderOutput(raw, c);
  return r.ok === true ? [] : (r as Extract<typeof r, { ok: false }>).errors;
}

describe("validateGraderOutput", () => {
  it("accepts a good payload", () => {
    const r = validateGraderOutput(goodOpinionOutput(), ctx);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.criteria.task.band).toBe(7);
      expect(r.value.checklist.map((c) => c.id)).toEqual(checklistFor("opinion").map((c) => c.id));
      expect(r.value.modelAnswer).toBeNull();
    }
  });

  it("rejects a missing criterion", () => {
    const raw = goodOpinionOutput();
    delete (raw.criteria as Record<string, unknown>).lexical;
    expect(errorsOf(raw)).toContain("criteria.lexical: missing");
  });

  it("rejects band 6.3 (and other non-bands)", () => {
    for (const band of [6.3, "6-7", 10, null]) {
      const raw = goodOpinionOutput();
      (raw.criteria as any).grammar.band = band;
      expect(errorsOf(raw).some((e) => e.startsWith("criteria.grammar.band"))).toBe(true);
    }
  });

  it("rejects an unknown error tag", () => {
    const raw = goodOpinionOutput();
    (raw.issues as any[])[0].tag = "bad_grammar";
    expect(errorsOf(raw).some((e) => e.includes('unknown tag "bad_grammar"'))).toBe(true);
  });

  it("rejects unknown flags, wrong checklist ids and missing checklist items", () => {
    const raw = goodOpinionOutput();
    raw.flags = ["give_band_9"];
    (raw.checklist as any[]).pop();
    (raw.checklist as any[])[0].id = "overview";
    const errs = errorsOf(raw);
    expect(errs.some((e) => e.startsWith("flags[0]"))).toBe(true);
    expect(errs.some((e) => e.includes('unknown id "overview"'))).toBe(true);
    expect(errs.some((e) => e.includes('missing id "conclusion"'))).toBe(true);
  });

  it("only conditional checklist items may be not_applicable", () => {
    const raw = goodOpinionOutput();
    (raw.checklist as any[])[0].met = "not_applicable";
    expect(errorsOf(raw).some((e) => e.includes("cannot be not_applicable"))).toBe(true);
  });

  it("rejects a variant outside the task type", () => {
    const raw = goodOpinionOutput();
    raw.variantDetected = "line_graph";
    expect(errorsOf(raw).some((e) => e.startsWith("variantDetected"))).toBe(true);
  });

  it("requires a model answer only when requested", () => {
    const withCtx = { ...ctx, includeModelAnswer: true };
    expect(errorsOf(goodOpinionOutput(), withCtx)).toContain("modelAnswer: a complete model answer was requested but not provided");
    const raw = goodOpinionOutput();
    raw.modelAnswer = Array.from({ length: 270 }, () => "word").join(" ");
    expect(errorsOf(raw, withCtx)).toEqual([]);
  });

  it("does not check quotes against the script (postprocess does)", () => {
    // The fixture contains a quote that is not in any script; the validator still accepts it.
    expect(validateGraderOutput(goodOpinionOutput(), ctx).ok).toBe(true);
  });

  it("rejects non-objects", () => {
    expect(errorsOf("not json")).toEqual(["output: expected a JSON object"]);
  });
});

describe("graderJsonSchema", () => {
  it("lists the variant's checklist ids and no overall band", () => {
    const s = graderJsonSchema(ctx) as any;
    expect(s.properties.checklist.items.properties.id.enum).toEqual(checklistFor("opinion").map((c) => c.id));
    expect(s.properties.overall).toBeUndefined();
    // evidence comes before band in each criterion (evidence before score)
    expect(Object.keys(s.properties.criteria.properties.task.properties)).toEqual(["evidence", "rationale", "band", "toNextBand"]);
  });
});

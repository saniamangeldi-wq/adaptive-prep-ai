import { describe, expect, it } from "vitest";
import { validateGraderOutput, type GraderOutput } from "@ielts/schema.ts";
import { buildReport, isGradeReport, legacyCriteria, reportRow } from "@ielts/postprocess.ts";
import type { WritingTask } from "@ielts/contract.ts";
import { GRADER_VERSION } from "@ielts/prompt.ts";
import { goodOpinionOutput, LETTER_TASK, LINE_TASK, OPINION_SCRIPT, OPINION_TASK } from "./fixtures";

function parsed(raw = goodOpinionOutput(), variant: any = "opinion", taskType: any = "task2"): GraderOutput {
  const r = validateGraderOutput(raw, { taskType, variant, includeModelAnswer: false });
  if (r.ok === false) throw new Error((r as Extract<typeof r, { ok: false }>).errors.join("; "));
  return (r as Extract<typeof r, { ok: true }>).value;
}

function build(output: GraderOutput, task: WritingTask = OPINION_TASK, script = OPINION_SCRIPT, extra: Partial<Parameters<typeof buildReport>[0]> = {}) {
  return buildReport({
    output,
    task,
    script,
    feedbackLang: "en",
    model: "test-model",
    includeModelAnswer: false,
    id: "00000000-0000-0000-0000-000000000001",
    now: "2026-11-16T00:00:00.000Z",
    ...extra,
  });
}

describe("buildReport", () => {
  it("computes the overall itself and ignores any model overall", () => {
    const r = build(parsed());
    // 7 + 6.5 + 6.5 + 6 = 26 / 4 = 6.5 (the fixture's "overall: 9" is ignored)
    expect(r.overallRaw).toBe(6.5);
    expect(r.overall).toBe(6.5);
    expect(r.graderVersion).toBe(GRADER_VERSION);
  });

  it("checklist 'partly' on a capped item lowers the task band and records the adjustment", () => {
    const raw = goodOpinionOutput();
    (raw.criteria as any).task.band = 8;
    (raw.checklist as any[])[2].met = "partly";
    const r = build(parsed(raw)); // developed: partly → cap 6
    expect(r.criteria.task.band).toBe(6);
    expect(r.adjustments?.[0]).toMatchObject({ criterion: "task", from: 8, to: 6, rule: "checklist:developed:partly" });
    expect(r.overall).toBe(6); // (6+6.5+6.5+6)/4 = 6.25 → 6 (rounds down)
    expect(r.confidence).toBe("medium");
  });

  it("fills offsets with the exact script text and drops quotes not in the script", () => {
    const r = build(parsed());
    expect(r.issues).toHaveLength(2);
    for (const i of r.issues) {
      expect(i.start).not.toBeNull();
      expect(OPINION_SCRIPT.slice(i.start!, i.end!)).toBe(i.quote);
    }
    expect(r.issues.some((i) => i.quote.includes("not in the script"))).toBe(false);
  });

  it("maps tags to their criterion and counts tags", () => {
    const r = build(parsed());
    const spelling = r.issues.find((i) => i.tag === "spelling")!;
    expect(spelling.criterion).toBe("lexical");
    expect(r.errorTagCounts).toEqual({ subject_verb_agreement: 1, spelling: 1 });
  });

  it("deduplicates identical issues", () => {
    const raw = goodOpinionOutput();
    (raw.issues as any[]).push({ ...(raw.issues as any[])[0] });
    const r = build(parsed(raw));
    expect(r.issues.filter((i) => i.tag === "subject_verb_agreement")).toHaveLength(1);
  });

  it("sets length flags from the real word count", () => {
    const short = OPINION_SCRIPT.split(/\n\n/).slice(0, 2).join("\n\n"); // ~100 words
    const r = build(parsed(), OPINION_TASK, short);
    expect(r.wordCount).toBeLessThan(167);
    expect(r.flags).toContain("under_length");
    expect(r.flags).toContain("severely_under_length");
    expect(r.criteria.task.band).toBeLessThanOrEqual(5);
    expect(r.confidence).toBe("low");

    const full = build(parsed());
    expect(full.wordCount).toBeGreaterThanOrEqual(250);
    expect(full.flags).not.toContain("under_length");
  });

  it("20 words or fewer → band 1 everywhere", () => {
    const r = build(parsed(), OPINION_TASK, "Children should not have phones because it is bad for them and they play games.");
    expect(Object.values(r.criteria).every((c) => c.band <= 1)).toBe(true);
    expect(r.overall).toBe(1);
  });

  it("non-Latin script → not_english and band 0", () => {
    const r = build(parsed(), OPINION_TASK, "Я считаю, что детям не нужны смартфоны, потому что это вредно для их здоровья и учебы. ".repeat(4));
    expect(r.flags).toContain("not_english");
    expect(r.overall).toBe(0);
  });

  it("drops not_applicable checklist items and uses rubric labels", () => {
    const raw = {
      ...goodOpinionOutput(),
      variantDetected: "advantages_disadvantages",
      checklist: [
        { id: "advantages", met: "yes", note: "" },
        { id: "disadvantages", met: "yes", note: "" },
        { id: "verdict", met: "not_applicable", note: "" },
        { id: "developed", met: "yes", note: "" },
        { id: "conclusion", met: "yes", note: "" },
      ],
    };
    const task = { ...OPINION_TASK, variant: "advantages_disadvantages" as const, source: "custom" as const, id: "custom" };
    const r = build(parsed(raw, "advantages_disadvantages"), task);
    expect(r.checklist.map((c) => c.id)).toEqual(["advantages", "disadvantages", "developed", "conclusion"]);
    expect(r.checklist[0].label).toBe("Advantages developed");
  });

  it("flags a wrong variant only for non-bank tasks", () => {
    const raw = { ...goodOpinionOutput(), variantDetected: "discussion" };
    expect(build(parsed(raw)).variantDetected).toBeNull(); // bank task: trusted label
    const custom = { ...OPINION_TASK, source: "custom" as const, id: "custom" };
    const r = build(parsed(raw), custom);
    expect(r.variantDetected).toBe("discussion");
    expect(r.flags).toContain("wrong_task_variant");
  });

  it("custom Academic Task 1 without any visual → visual_not_available and low confidence", () => {
    const raw = {
      ...goodOpinionOutput(),
      variantDetected: "line_graph",
      checklist: [
        { id: "overview", met: "yes", note: "" },
        { id: "key_features", met: "yes", note: "" },
        { id: "data_support", met: "not_applicable", note: "" },
        { id: "comparisons", met: "yes", note: "" },
        { id: "objective", met: "yes", note: "" },
      ],
    };
    const task: WritingTask = { ...LINE_TASK, source: "custom", id: "custom", visuals: [] };
    const r = build(parsed(raw, "line_graph", "task1_academic"), task, OPINION_SCRIPT);
    expect(r.flags).toContain("visual_not_available");
    expect(r.confidence).toBe("low");
    expect(r.criteria.task.label).toBe("Task Achievement");
  });

  it("keeps the rewrite only when its original is a real paragraph", () => {
    expect(build(parsed()).rewrite?.original.startsWith("Secondly, smartphones")).toBe(true);
    const raw = goodOpinionOutput();
    (raw.rewrite as any).original = "A paragraph the student never wrote about something else entirely.";
    expect(build(parsed(raw)).rewrite).toBeNull();
  });

  it("builds legacy columns", () => {
    const r = build(parsed());
    expect(legacyCriteria(r).grammar).toEqual({ band: 6, comment: r.criteria.grammar.rationale, label: "Grammatical Range and Accuracy" });
    const row = reportRow(r);
    expect(row.overall_band).toBe(r.overall);
    expect(row.comments).toBe(r);
    expect(row.chart).toBeNull();
    expect(isGradeReport(JSON.parse(JSON.stringify(r)))).toBe(true);
    expect(isGradeReport({ summary: "old shape" })).toBe(false);
  });

  it("letter rows keep the bullets in the legacy prompt column", () => {
    const raw = {
      ...goodOpinionOutput(),
      variantDetected: "letter_formal",
      checklist: ["purpose", "bullet_1", "bullet_2", "bullet_3", "tone", "opening_closing"].map((id) => ({ id, met: "yes", note: "" })),
    };
    const r = build(parsed(raw, "letter_formal", "task1_general"), LETTER_TASK);
    expect(reportRow(r).prompt).toContain("• describe what you ordered");
  });
});

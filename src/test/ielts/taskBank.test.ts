import { describe, expect, it } from "vitest";
import { TASK_RULES, VARIANTS_BY_TASK, type DataVisual, type MapVisual, type ProcessVisual, type TaskType } from "@ielts/contract.ts";
import { TASK_BANK, getBankTask, pickBankTask } from "@ielts/taskBank.ts";
import { countMapChanges, validateVisual, validateWritingTask } from "@ielts/visuals.ts";
import { checklistFor, guideFor } from "@ielts/rubric.ts";

const MIN_PER_VARIANT: Record<TaskType, number> = { task2: 4, task1_general: 3, task1_academic: 2 };

describe("task bank integrity", () => {
  it("covers every variant with the minimum count", () => {
    for (const [taskType, variants] of Object.entries(VARIANTS_BY_TASK) as Array<[TaskType, readonly string[]]>) {
      for (const v of variants) {
        const n = TASK_BANK.filter((t) => t.taskType === taskType && t.variant === v).length;
        expect(n, `${taskType}/${v}`).toBeGreaterThanOrEqual(MIN_PER_VARIANT[taskType]);
      }
    }
  });

  it("has unique ids and only bank-sourced tasks", () => {
    const ids = TASK_BANK.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(TASK_BANK.every((t) => t.source === "bank")).toBe(true);
  });

  it("every task passes the strict validator", () => {
    for (const t of TASK_BANK) expect(validateWritingTask(t), t.id).toEqual([]);
  });

  it("prompts state the word minimum and rules match TASK_RULES", () => {
    for (const t of TASK_BANK) {
      expect(t.prompt, t.id).toContain(`Write at least ${TASK_RULES[t.taskType].minWords} words.`);
      expect(t.minWords).toBe(TASK_RULES[t.taskType].minWords);
      expect(t.timeMinutes).toBe(TASK_RULES[t.taskType].timeMinutes);
    }
  });

  it("letters have exactly three non-empty bullets; nothing else has bullets", () => {
    for (const t of TASK_BANK) {
      if (t.taskType === "task1_general") {
        expect(t.bullets, t.id).toHaveLength(3);
        expect(t.bullets.every((b) => b.trim().length > 5)).toBe(true);
        expect(t.prompt.trim().endsWith("In your letter:")).toBe(true);
      } else expect(t.bullets, t.id).toHaveLength(0);
    }
  });

  it("academic visuals are valid and realistic", () => {
    for (const t of TASK_BANK.filter((x) => x.taskType === "task1_academic")) {
      for (const v of t.visuals) expect(validateVisual(v), t.id).toEqual([]);
      if (t.variant === "mixed") {
        expect(t.visuals).toHaveLength(2);
        expect(t.visuals[0].kind).not.toBe(t.visuals[1].kind);
      }
      if (t.variant === "process") {
        const p = t.visuals[0] as ProcessVisual;
        expect(p.steps.length).toBeGreaterThanOrEqual(6);
        expect(p.steps.length).toBeLessThanOrEqual(9);
      }
      if (t.variant === "map") {
        const m = t.visuals[0] as MapVisual;
        expect(m.panels).toHaveLength(2);
        for (const p of m.panels)
          for (const f of p.features) {
            expect(f.x + f.w).toBeLessThanOrEqual(100);
            expect(f.y + f.h).toBeLessThanOrEqual(100);
          }
        expect(countMapChanges(m.panels[0].features, m.panels[1].features)).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it("every pie series sums to 100", () => {
    const pies = TASK_BANK.flatMap((t) => t.visuals).filter((v): v is DataVisual => v.kind === "pie");
    expect(pies.length).toBeGreaterThanOrEqual(3);
    for (const p of pies)
      for (const s of p.series) expect(p.data.reduce((a, row) => a + (row[s] as number), 0), `${p.title} ${s}`).toBe(100);
  });

  it("the mixed water task is consistent between its two visuals", () => {
    const t = getBankTask("ac-mixed-02")!;
    const bar = t.visuals[0] as DataVisual;
    const table = t.visuals[1] as DataVisual;
    const countryC = bar.data.find((r) => r.country === "Country C")!["Water use"];
    expect(table.data.reduce((a, r) => a + (r.Litres as number), 0)).toBe(countryC);
  });

  it("every variant has a rubric guide with a non-empty checklist of unique ids", () => {
    for (const variants of Object.values(VARIANTS_BY_TASK))
      for (const v of variants) {
        const ids = checklistFor(v).map((c) => c.id);
        expect(ids.length).toBeGreaterThan(2);
        expect(new Set(ids).size).toBe(ids.length);
        expect(guideFor(v).mustDo.length).toBeGreaterThan(2);
        expect(guideFor(v).commonLosses.length).toBeGreaterThan(2);
      }
  });

  it("letter checklists cover all three bullets", () => {
    for (const v of VARIANTS_BY_TASK.task1_general) expect(checklistFor(v).map((c) => c.id)).toEqual(expect.arrayContaining(["bullet_1", "bullet_2", "bullet_3"]));
  });
});

describe("pickBankTask", () => {
  it("filters by variant and honours excludeIds", () => {
    const seq = [0, 0.99];
    let i = 0;
    const rand = () => seq[i++ % seq.length];
    const a = pickBankTask({ taskType: "task2", variant: "opinion", excludeIds: ["t2-opinion-01", "t2-opinion-02", "t2-opinion-03"] }, rand);
    expect(a?.id).toBe("t2-opinion-04");
  });

  it("starts again from the full pool when everything was seen", () => {
    const all = TASK_BANK.filter((t) => t.variant === "map").map((t) => t.id);
    const t = pickBankTask({ taskType: "task1_academic", variant: "map", excludeIds: all }, () => 0);
    expect(all).toContain(t?.id);
  });

  it("returns a copy, not the bank object", () => {
    const t = pickBankTask({ taskType: "task1_academic", variant: "pie_chart" }, () => 0)!;
    t.prompt = "changed";
    expect(getBankTask(t.id)!.prompt).not.toBe("changed");
  });

  it("returns null for a variant of another task type", () => {
    expect(pickBankTask({ taskType: "task2", variant: "map" })).toBeNull();
  });
});

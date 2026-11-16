import { describe, it, expect } from "vitest";
import { readReportRow, summarizeReport, chatChipText, buildTrend } from "@/lib/ielts/reportRow";
import { legacyRow, malformedRows, reportTask1Low, reportTask2, rowFromReport } from "../fixtures/ielts";

describe("readReportRow", () => {
  it("reads a full report from the comments column", () => {
    const p = readReportRow(rowFromReport(reportTask2));
    expect(p.kind).toBe("full");
    if (p.kind !== "full") return;
    expect(p.report.overall).toBe(6);
    expect(p.report.criteria.grammar.band).toBe(5.5);
    expect(p.report.issues.length).toBe(reportTask2.issues.length);
    expect(p.report.id).toBe(reportTask2.id);
  });

  it("uses the row id even when the stored report has a null id", () => {
    const p = readReportRow({ ...rowFromReport(reportTask2), id: "row-id", comments: { ...reportTask2, id: null } });
    expect(p.kind === "full" && p.report.id).toBe("row-id");
  });

  it("fills missing optional parts with safe defaults", () => {
    const stripped: Record<string, unknown> = { ...reportTask2 };
    for (const k of ["checklist", "flags", "issues", "strengths", "priorities", "errorTagCounts", "rewrite", "modelAnswer", "confidence"]) delete stripped[k];
    const p = readReportRow({ ...rowFromReport(reportTask2), comments: stripped });
    expect(p.kind).toBe("full");
    if (p.kind !== "full") return;
    expect(p.report.checklist).toEqual([]);
    expect(p.report.flags).toEqual([]);
    expect(p.report.issues).toEqual([]);
    expect(p.report.rewrite).toBeNull();
    expect(p.report.modelAnswer).toBeNull();
    expect(p.report.confidence).toBe("medium");
  });

  it("keeps only three priorities and drops junk entries", () => {
    const comments = { ...reportTask2, priorities: [1, { title: "a", why: "b", how: "c" }, { title: "d", why: "e", how: "f" }, { title: "g", why: "h", how: "i" }, { title: "j", why: "k", how: "l" }], issues: [null, "x", reportTask2.issues[0]] };
    const p = readReportRow({ ...rowFromReport(reportTask2), comments });
    expect(p.kind === "full" && p.report.priorities.length).toBe(3);
    expect(p.kind === "full" && p.report.issues.length).toBe(1);
  });

  it("returns a reduced legacy view for rows from the old app", () => {
    const p = readReportRow(legacyRow);
    expect(p.kind).toBe("legacy");
    if (p.kind !== "legacy") return;
    expect(p.legacy.overall).toBe(5.5);
    expect(p.legacy.criteria.map((c) => c.key)).toEqual(["task", "coherence", "lexical", "grammar"]);
    expect(p.legacy.essay).toContain("Public transport");
    expect(p.legacy.corrections[0].suggestion).toBe("it should be free");
    expect(p.legacy.taskTypeLabel).toBe("Task 2 (essay)");
  });

  it("returns invalid, never throws, for broken rows", () => {
    for (const row of malformedRows) {
      const p = readReportRow(row);
      expect(p.kind).toBe("invalid");
    }
    expect(readReportRow(null).kind).toBe("invalid");
    expect(readReportRow(undefined).kind).toBe("invalid");
    expect(readReportRow({} as never).kind).toBe("invalid");
    expect(readReportRow({ id: "x", comments: "string", criteria: 5, essay: 5 } as never).kind).toBe("invalid");
  });
});

describe("summaries", () => {
  it("builds the chat chip text", () => {
    const s = summarizeReport(readReportRow(rowFromReport(reportTask2)));
    expect(s.taskLabel).toBe("Task 2, opinion essay");
    expect(chatChipText(s)).toBe("Task 2, opinion essay · estimated 6.0");
  });
  it("handles legacy and invalid rows", () => {
    expect(chatChipText(summarizeReport(readReportRow(legacyRow)))).toBe("Task 2 (essay) · estimated 5.5");
    expect(chatChipText(summarizeReport(readReportRow(malformedRows[0]), "task2"))).toBe("Task 2");
  });
});

describe("buildTrend", () => {
  it("orders oldest first and skips unreadable rows", () => {
    const parsed = [reportTask1Low, reportTask2].map((r) => readReportRow(rowFromReport(r)));
    parsed.push(readReportRow(legacyRow), readReportRow(malformedRows[0]));
    const t = buildTrend(parsed);
    expect(t.map((p) => p.id)).toEqual([legacyRow.id, reportTask2.id, reportTask1Low.id]);
    expect(t[1]).toMatchObject({ task: 6, coherence: 6.5, lexical: 6, grammar: 5.5, overall: 6 });
  });
});

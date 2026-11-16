/**
 * Server row writers → database (jsonb, via JSON) → web row readers.
 *   reports: buildReport + reportRow (postprocess.ts) → readReportRow (src/lib/ielts/reportRow.ts)
 *   drafts:  draftColumns / draftFromRow (requests.ts) → chooseDraft / local copy (src/lib/ielts/drafts.ts)
 * plus the chat function's view of the same stored rows.
 */
import { describe, expect, it } from "vitest";
import type { GradeReport, WritingTask } from "@ielts/contract.ts";
import { validateGraderOutput, type GraderOutput } from "@ielts/schema.ts";
import { buildReport, isGradeReport, reportRow } from "@ielts/postprocess.ts";
import { draftColumns, draftFromRow, validateDraftRequest } from "@ielts/requests.ts";
import { legacyReportContext, reportContext } from "@ielts/chat.ts";
import { bankTasksFor } from "@ielts/taskBank.ts";
import { buildTrend, chatChipText, readReportRow, summarizeReport, type ReportRowLike } from "@/lib/ielts/reportRow";
import { chooseDraft, readLocalDraft, writeLocalDraft } from "@/lib/ielts/drafts";
import { splitScript } from "@/lib/ielts/segments";
import { goodOpinionOutput, LINE_TASK, OPINION_SCRIPT, OPINION_TASK } from "../ielts/fixtures";
import { graderOutputFor } from "./fakeServer";
import { legacyRow } from "../fixtures/ielts";

function validated(raw: Record<string, unknown>, task: WritingTask): GraderOutput {
  const r = validateGraderOutput(raw, { taskType: task.taskType, variant: task.variant, includeModelAnswer: false });
  if (r.ok === false) throw new Error((r as { errors: string[] }).errors.join("; "));
  return (r as { value: GraderOutput }).value;
}

/** What `select("*")` gives back for a row inserted with reportRow(): jsonb through JSON, DB-filled columns added. */
function asStoredRow(report: GradeReport): ReportRowLike & Record<string, unknown> {
  const inserted = { ...reportRow(report), user_id: "u1", session_id: null };
  return JSON.parse(JSON.stringify({ ...inserted, created_at: "2026-11-16T09:30:00.123456+00:00", updated_at: "2026-11-16T09:30:00.123456+00:00" }));
}

function build(task: WritingTask, script: string, raw: Record<string, unknown>): GradeReport {
  return buildReport({
    output: validated(raw, task),
    task,
    script,
    feedbackLang: "en",
    model: "test-model",
    includeModelAnswer: false,
    id: "0b6c2d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d",
    now: "2026-11-16T09:30:00.000Z",
  });
}

describe("report: server row → web parser", () => {
  const report = build(OPINION_TASK, OPINION_SCRIPT, goodOpinionOutput());
  const row = asStoredRow(report);
  const parsed = readReportRow(row);

  it("comes back as a full report equal to what the server built", () => {
    expect(parsed.kind).toBe("full");
    if (parsed.kind !== "full") return;
    // `adjustments` is optional on the server and always an array on the web.
    expect(parsed.report).toEqual({ ...report, adjustments: report.adjustments ?? [] });
    expect(parsed.id).toBe(report.id);
    expect(parsed.report.overall).toBe(report.overall);
    expect(row.overall_band).toBe(report.overall);
  });

  it("keeps bands, checklist, issues, rewrite", () => {
    if (parsed.kind !== "full") throw new Error("not full");
    const r = parsed.report;
    expect(Object.values(r.criteria).map((c) => c.band)).toEqual([7, 6.5, 6.5, 6]);
    expect(r.checklist.length).toBeGreaterThan(0);
    expect(r.checklist.every((c) => c.label && ["yes", "partly", "no"].includes(c.met))).toBe(true);
    // The hallucinated quote was dropped by the server; the two real ones survive.
    expect(r.issues).toHaveLength(2);
    expect(r.rewrite?.original).toBeTruthy();
    expect(OPINION_SCRIPT.includes(r.rewrite!.original)).toBe(true);
  });

  it("issue offsets point at the quoted text, and every issue gets a highlight", () => {
    if (parsed.kind !== "full") throw new Error("not full");
    const r = parsed.report;
    for (const i of r.issues) {
      expect(typeof i.start).toBe("number");
      expect(r.script.slice(i.start!, i.end!)).toBe(i.quote);
    }
    const { segments, unlocated } = splitScript(r.script, r.issues);
    expect(unlocated).toEqual([]);
    expect(segments.map((s) => s.text).join("")).toBe(r.script);
    expect(segments.filter((s) => s.issueIndexes.length).length).toBe(r.issues.length);
  });

  it("carries the server's ceilings (adjustments) and the same overall", () => {
    const raw = goodOpinionOutput();
    (raw.criteria as Record<string, { band: number }>).task.band = 8;
    (raw.checklist as Array<{ id: string; met: string }>)[0].met = "no"; // clear_position: no → capped
    const capped = build(OPINION_TASK, OPINION_SCRIPT, raw);
    expect(capped.adjustments?.length).toBeGreaterThan(0);
    const p = readReportRow(asStoredRow(capped));
    if (p.kind !== "full") throw new Error("not full");
    expect(p.report.adjustments).toEqual(capped.adjustments);
    expect(p.report.criteria.task.band).toBe(capped.adjustments![0].to);
    expect(p.report.overall).toBe(capped.overall);
    expect(p.report.overallRaw).toBe(capped.overallRaw);
  });

  it("history and chat chip read the same row", () => {
    const s = summarizeReport(parsed);
    expect(s.band).toBe(report.overall);
    expect(chatChipText(s)).toBe(`Task 2, opinion essay · estimated ${report.overall.toFixed(1)}`);
    const trend = buildTrend([parsed]);
    expect(trend[0]).toMatchObject({ task: 7, coherence: 6.5, lexical: 6.5, grammar: 6, overall: report.overall });
  });

  it("the chat function recognises the stored comments as a full report", () => {
    expect(isGradeReport(row.comments)).toBe(true);
    const ctx = reportContext(row.comments as GradeReport);
    expect(ctx).toContain("STUDENT'S SCRIPT");
    expect(ctx).toContain(`overall ${report.overall}`);
  });

  it("an Academic Task 1 report keeps its visual in the row and in the report", () => {
    const task = LINE_TASK;
    const script = "The line graph shows changes over the period. ".repeat(20).trim();
    const r = build(task, script, graderOutputFor(task, script));
    const stored = asStoredRow(r);
    expect(stored.chart).toEqual(task.visuals);
    const p = readReportRow(stored);
    expect(p.kind === "full" && p.report.task.visuals).toEqual(task.visuals);
  });

  it("every bank task type survives the round trip", () => {
    for (const taskType of ["task1_academic", "task1_general", "task2"] as const) {
      for (const task of bankTasksFor(taskType)) {
        const script = "This answer has enough words to be graded properly by the checker. ".repeat(12).trim();
        const r = build(task, script, graderOutputFor(task, script));
        const p = readReportRow(asStoredRow(r));
        expect(p.kind, task.id).toBe("full");
        if (p.kind === "full") expect(p.report.task, task.id).toEqual(task);
      }
    }
  });

  it("a legacy row is shown as a reduced report, and the chat can use it", () => {
    const p = readReportRow(legacyRow);
    expect(p.kind).toBe("legacy");
    expect(isGradeReport(legacyRow.comments)).toBe(false);
    const ctx = legacyReportContext(legacyRow as never);
    expect(ctx).toContain("older version");
  });

  it("the column default for comments ('[]') and a damaged full report never throw", () => {
    expect(readReportRow({ ...legacyRow, comments: [] }).kind).toBe("legacy");
    expect(readReportRow({ ...row, comments: { ...(row.comments as object), criteria: null } }).kind).toBe("invalid");
  });
});

describe("drafts: server row ↔ web", () => {
  const task = bankTasksFor("task1_general", "letter_semi_formal")[0];

  it("a saved draft row reads back as the same draft", () => {
    const req = validateDraftRequest(JSON.parse(JSON.stringify({ action: "save", task, script: "Dear Sam,\nThanks.", secondsUsed: 61.4 })));
    if (req.ok === false || req.value.action !== "save") throw new Error("save rejected");
    const row = JSON.parse(JSON.stringify({ id: "9f0e8d7c-6b5a-4c3d-8e2f-1a0b9c8d7e6f", user_id: "u1", status: "in_progress", ...draftColumns(req.value), created_at: "2026-11-16T09:00:00+00:00", updated_at: "2026-11-16T09:05:00.5+00:00" }));
    const draft = draftFromRow(row);
    expect(draft).toEqual({ sessionId: row.id, task, script: "Dear Sam,\nThanks.", secondsUsed: 61, updatedAt: "2026-11-16T09:05:00.5+00:00" });
    // The web restore logic accepts it and the Postgres timestamp format parses.
    expect(Number.isNaN(Date.parse(draft!.updatedAt))).toBe(false);
    expect(chooseDraft(null, draft)?.source).toBe("server");
  });

  it("old-app writing sessions in another shape are skipped, not shown broken", () => {
    expect(draftFromRow({ id: "x", content: { prompt: "old" }, answers: { essay: "old" } })).toBeNull();
  });

  it("the device copy wins after offline edits even when the device clock is behind", () => {
    const server = { sessionId: "s", task, script: "saved on server", secondsUsed: 100, updatedAt: "2026-11-16T10:00:00.000Z" };
    // Device clock 3 minutes behind: its newer edit has an OLDER timestamp than the server copy.
    const local = { task, script: "saved on server, plus offline edits", secondsUsed: 160, updatedAt: "2026-11-16T09:58:00.000Z", serverUpdatedAt: server.updatedAt };
    expect(chooseDraft(local, server)).toMatchObject({ source: "local", script: local.script, serverIsStale: true });
    // Same content: nothing to push.
    expect(chooseDraft({ ...local, script: server.script, secondsUsed: 100 }, server)?.source).toBe("server");
    // Another device saved after this one synced: fall back to time, newer wins.
    const later = { ...server, script: "written on the laptop", updatedAt: "2026-11-16T10:30:00.000Z" };
    expect(chooseDraft(local, later)?.script).toBe("written on the laptop");
  });

  it("the device copy round-trips serverUpdatedAt", () => {
    const m = new Map<string, string>();
    const st = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    writeLocalDraft("s1", { task, script: "x", secondsUsed: 1, updatedAt: "2026-11-16T10:00:00Z", serverUpdatedAt: "2026-11-16T10:00:01Z" }, st);
    expect(readLocalDraft("s1", st)?.serverUpdatedAt).toBe("2026-11-16T10:00:01Z");
  });
});

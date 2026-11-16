import {
  CONTRACT_VERSION,
  type ChecklistItem,
  type CriterionKey,
  type CriterionResult,
  type GradeReport,
  type InlineIssue,
  type ReportFlag,
} from "@ielts/contract.ts";
import { describeTask, taskTypeLabel } from "./labels";

/** The columns of `ielts_writing_reports` that the UI reads. */
export interface ReportRowLike {
  id: string;
  created_at: string;
  task_type: string;
  prompt: string;
  essay: string;
  word_count: number;
  overall_band: number | null;
  criteria: unknown;
  comments: unknown;
  model_answer?: string | null;
}

export interface LegacyReportView {
  id: string;
  createdAt: string;
  taskTypeLabel: string;
  prompt: string;
  essay: string;
  wordCount: number;
  overall: number | null;
  criteria: Array<{ key: CriterionKey; label: string; band: number; comment: string }>;
  summary: string;
  strengths: string[];
  improvements: string[];
  corrections: Array<{ original: string; suggestion: string; reason: string }>;
  modelAnswer: string;
}

export type ParsedReport =
  | { kind: "full"; id: string; createdAt: string; report: GradeReport }
  | { kind: "legacy"; id: string; createdAt: string; legacy: LegacyReportView }
  | { kind: "invalid"; id: string; createdAt: string; reason: string };

const CRITERION_KEYS: CriterionKey[] = ["task", "coherence", "lexical", "grammar"];

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const strArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function legacyCriterionLabel(key: CriterionKey, given: unknown): string {
  if (typeof given === "string" && given) return given;
  return key === "task" ? "Task" : key === "coherence" ? "Coherence and Cohesion" : key === "lexical" ? "Lexical Resource" : "Grammatical Range and Accuracy";
}

function readCriteriaColumn(raw: unknown): LegacyReportView["criteria"] {
  if (!isObj(raw)) return [];
  const out: LegacyReportView["criteria"] = [];
  for (const key of CRITERION_KEYS) {
    const c = raw[key];
    if (!isObj(c)) continue;
    const band = num(c.band);
    if (band === null) continue;
    out.push({ key, label: legacyCriterionLabel(key, c.label), band, comment: str(c.comment ?? c.rationale) });
  }
  return out;
}

function normaliseFull(row: ReportRowLike, c: Record<string, unknown>): GradeReport | null {
  if (!isObj(c.task) || typeof c.task.taskType !== "string" || typeof c.task.prompt !== "string") return null;
  if (typeof c.script !== "string") return null;
  if (!isObj(c.criteria)) return null;

  const criteria = {} as Record<CriterionKey, CriterionResult>;
  for (const key of CRITERION_KEYS) {
    const r = c.criteria[key];
    if (!isObj(r)) return null;
    const band = num(r.band);
    if (band === null) return null;
    criteria[key] = {
      key,
      label: str(r.label, legacyCriterionLabel(key, null)),
      band,
      rationale: str(r.rationale),
      evidence: strArray(r.evidence),
      toNextBand: str(r.toNextBand),
    };
  }

  const overall = num(c.overall) ?? num(row.overall_band);
  if (overall === null) return null;

  const task = c.task as unknown as GradeReport["task"];
  const checklist: ChecklistItem[] = Array.isArray(c.checklist)
    ? c.checklist.filter(isObj).map((i) => ({
        id: str(i.id),
        label: str(i.label),
        met: i.met === "yes" || i.met === "partly" || i.met === "no" ? i.met : "partly",
        note: str(i.note),
      }))
    : [];
  const issues: InlineIssue[] = Array.isArray(c.issues)
    ? c.issues.filter(isObj).map((i) => ({
        quote: str(i.quote),
        start: num(i.start),
        end: num(i.end),
        criterion: (CRITERION_KEYS as string[]).includes(i.criterion as string) ? (i.criterion as CriterionKey) : "grammar",
        tag: (typeof i.tag === "string" ? i.tag : "other") as InlineIssue["tag"],
        explanation: str(i.explanation),
        suggestion: str(i.suggestion),
      }))
    : [];
  const rw = isObj(c.rewrite) && typeof c.rewrite.improved === "string"
    ? { original: str(c.rewrite.original), improved: c.rewrite.improved, changes: strArray(c.rewrite.changes) }
    : null;
  const counts: GradeReport["errorTagCounts"] = {};
  if (isObj(c.errorTagCounts)) {
    for (const [k, v] of Object.entries(c.errorTagCounts)) {
      const n = num(v);
      if (n !== null && n > 0) (counts as Record<string, number>)[k] = n;
    }
  }

  return {
    id: row.id,
    contractVersion: num(c.contractVersion) ?? CONTRACT_VERSION,
    graderVersion: str(c.graderVersion),
    model: str(c.model),
    createdAt: str(c.createdAt, row.created_at),
    task: {
      ...task,
      bullets: strArray(task.bullets),
      visuals: Array.isArray(task.visuals) ? task.visuals : [],
    },
    variantDetected: typeof c.variantDetected === "string" ? (c.variantDetected as GradeReport["variantDetected"]) : null,
    feedbackLang: c.feedbackLang === "ru" || c.feedbackLang === "kk" ? c.feedbackLang : "en",
    script: c.script,
    wordCount: num(c.wordCount) ?? row.word_count ?? 0,
    paragraphCount: num(c.paragraphCount) ?? 0,
    criteria,
    overallRaw: num(c.overallRaw) ?? overall,
    overall,
    checklist,
    flags: strArray(c.flags) as ReportFlag[],
    confidence: c.confidence === "high" || c.confidence === "low" ? c.confidence : "medium",
    summary: str(c.summary),
    strengths: strArray(c.strengths),
    priorities: Array.isArray(c.priorities)
      ? c.priorities.filter(isObj).slice(0, 3).map((p) => ({ title: str(p.title), why: str(p.why), how: str(p.how) }))
      : [],
    issues,
    errorTagCounts: counts,
    rewrite: rw,
    modelAnswer: typeof c.modelAnswer === "string" && c.modelAnswer.trim() ? c.modelAnswer : null,
    // Ceilings the server applied to a criterion band (see contract). Bad entries are dropped.
    adjustments: Array.isArray(c.adjustments)
      ? c.adjustments
          .filter(isObj)
          .filter((a) => typeof a.criterion === "string" && typeof a.from === "number" && typeof a.to === "number")
          .map((a) => ({
            criterion: a.criterion as CriterionKey,
            from: a.from as number,
            to: a.to as number,
            rule: str(a.rule),
            reason: str(a.reason),
          }))
      : [],
  };
}

function legacyFromRow(row: ReportRowLike, comments: Record<string, unknown>, criteria: LegacyReportView["criteria"]): LegacyReportView {
  return {
    id: row.id,
    createdAt: row.created_at,
    taskTypeLabel: taskTypeLabel(row.task_type),
    prompt: str(row.prompt),
    essay: str(row.essay),
    wordCount: num(row.word_count) ?? 0,
    overall: num(row.overall_band),
    criteria,
    summary: str(comments.summary),
    strengths: strArray(comments.strengths),
    improvements: strArray(comments.improvements),
    corrections: Array.isArray(comments.corrections)
      ? comments.corrections.filter(isObj).map((c) => ({ original: str(c.original), suggestion: str(c.suggestion), reason: str(c.reason) }))
      : [],
    modelAnswer: str(row.model_answer),
  };
}

/**
 * Read a row of `ielts_writing_reports`. New rows carry the full GradeReport in
 * `comments`; rows from the old app have a flat shape, which becomes a reduced view.
 * Never throws: anything unreadable comes back as `invalid`.
 */
export function readReportRow(row: ReportRowLike | null | undefined): ParsedReport {
  if (!row || typeof row !== "object") return { kind: "invalid", id: "", createdAt: "", reason: "No report data." };
  const id = str(row.id);
  const createdAt = str(row.created_at);

  try {
    const comments = isObj(row.comments) ? row.comments : null;

    if (comments && typeof comments.contractVersion === "number") {
      const report = normaliseFull(row, comments);
      if (report) return { kind: "full", id, createdAt, report };
      return { kind: "invalid", id, createdAt, reason: "This report is incomplete or damaged." };
    }

    const criteria = readCriteriaColumn(row.criteria);
    if (criteria.length > 0 && typeof row.essay === "string") {
      return { kind: "legacy", id, createdAt, legacy: legacyFromRow(row, comments ?? {}, criteria) };
    }
    return { kind: "invalid", id, createdAt, reason: "This report is in a format we cannot read." };
  } catch {
    return { kind: "invalid", id, createdAt, reason: "This report could not be read." };
  }
}

export interface ReportSummary {
  /** e.g. "Task 2, opinion essay" */
  taskLabel: string;
  /** Estimated overall band, or null if unknown. */
  band: number | null;
  wordCount: number | null;
}

export function summarizeReport(p: ParsedReport, fallbackTaskType = ""): ReportSummary {
  if (p.kind === "full") {
    const t = p.report.task;
    return { taskLabel: describeTask(t.taskType, p.report.variantDetected ?? t.variant), band: p.report.overall, wordCount: p.report.wordCount };
  }
  if (p.kind === "legacy") {
    return { taskLabel: p.legacy.taskTypeLabel, band: p.legacy.overall, wordCount: p.legacy.wordCount };
  }
  return { taskLabel: fallbackTaskType ? describeTask(fallbackTaskType) : "Report", band: null, wordCount: null };
}

/** Chip text for the chat: "Task 2, opinion essay · estimated 6.0". */
export function chatChipText(s: ReportSummary): string {
  return s.band === null ? s.taskLabel : `${s.taskLabel} · estimated ${s.band.toFixed(1)}`;
}

export interface TrendPoint {
  id: string;
  createdAt: string;
  task: number;
  coherence: number;
  lexical: number;
  grammar: number;
  overall: number | null;
}

/** Per-criterion bands over time, oldest first. Reports without readable criteria are skipped. */
export function buildTrend(parsed: ParsedReport[]): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (const p of parsed) {
    let bands: Record<CriterionKey, number> | null = null;
    let overall: number | null = null;
    if (p.kind === "full") {
      const c = p.report.criteria;
      bands = { task: c.task.band, coherence: c.coherence.band, lexical: c.lexical.band, grammar: c.grammar.band };
      overall = p.report.overall;
    } else if (p.kind === "legacy" && p.legacy.criteria.length === 4) {
      const by = Object.fromEntries(p.legacy.criteria.map((c) => [c.key, c.band])) as Record<CriterionKey, number>;
      bands = by;
      overall = p.legacy.overall;
    }
    if (bands) points.push({ id: p.id, createdAt: p.createdAt, ...bands, overall });
  }
  return points.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

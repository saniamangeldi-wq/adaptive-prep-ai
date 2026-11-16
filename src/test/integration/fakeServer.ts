/**
 * An in-process stand-in for the four edge functions, built from the server's own
 * pure code (validators, bank, post-processing, row mapping). It replaces
 * `globalThis.fetch`, so the web app's real request code (src/lib/ielts/api.ts,
 * src/hooks/useAIChat.ts) talks to it exactly as it would talk to Supabase.
 *
 * What is NOT the real server: authentication (any Bearer token is user U1), the
 * database (two in-memory tables), credits, and the model (a test supplies the
 * grader output). Each handler follows the order of work in its index.ts.
 */
import type { DraftRecord, DraftResponse, GetTaskResponse, GradeResponse, WritingTask } from "@ielts/contract.ts";
import { fail, json, readJson } from "@ielts/http.ts";
import { draftColumns, draftFromRow, isFeedbackLang, isUuid, validateDraftRequest, validateGetTaskRequest, validateGradeRequest } from "@ielts/requests.ts";
import { pickBankTask } from "@ielts/taskBank.ts";
import { validateGraderOutput, type GraderOutput } from "@ielts/schema.ts";
import { buildReport, isGradeReport, reportRow } from "@ielts/postprocess.ts";
import { checklistFor } from "@ielts/rubric.ts";
import { trimHistory } from "@ielts/chat.ts";

export const USER_ID = "11111111-1111-4111-8111-111111111111";

export interface Recorded {
  fn: string;
  /** The parsed JSON body exactly as the server's readJson saw it. */
  body: unknown;
  headers: Record<string, string>;
  status: number;
  response: unknown;
}

let counter = 0;
const uuid = () => {
  counter += 1;
  return `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`;
};

/** A valid grader output for any task and script: quotes are real substrings of the script. */
export function graderOutputFor(task: WritingTask, script: string, opts: { includeModelAnswer?: boolean } = {}): Record<string, unknown> {
  const words = script.trim().split(/\s+/);
  const quoteA = words.slice(0, 5).join(" ");
  const quoteB = words.slice(10, 14).join(" ");
  const paragraph = script.trim().split(/\n\s*\n/)[0];
  const crit = (band: number, quote: string) => ({ evidence: [quote], rationale: "Shows the features of this band.", band, toNextBand: "Do one specific thing better." });
  return {
    variantDetected: task.variant,
    flags: [],
    checklist: checklistFor(task.variant).map((d) => ({ id: d.id, met: "yes", note: "Covered." })),
    issues: [
      { quote: quoteA, criterion: "grammar", tag: "articles", explanation: "An article is missing.", suggestion: `${quoteA} (fixed)` },
      { quote: quoteB, criterion: "lexical", tag: "word_choice", explanation: "A more precise word exists.", suggestion: "better words" },
      { quote: "a sentence the student never wrote", criterion: "lexical", tag: "spelling", explanation: "Invented.", suggestion: "x" },
    ],
    criteria: { task: crit(7, quoteA), coherence: crit(6.5, quoteB), lexical: crit(6.5, quoteA), grammar: crit(6, quoteB) },
    strengths: ["Clear structure"],
    priorities: [{ title: "Vary sentences", why: "Limits grammar range.", how: "Add one complex sentence per paragraph." }],
    summary: "A clear answer with some errors.",
    rewrite: { original: paragraph, improved: `${paragraph} Improved.`, changes: ["Tighter wording"] },
    modelAnswer: opts.includeModelAnswer ? "This is a model answer. ".repeat(30).trim() : "",
  };
}

export interface FakeServer {
  requests: Recorded[];
  sessions: Array<Record<string, unknown>>;
  reports: Array<Record<string, unknown>>;
  /** Override the model's output for the next grading (default: graderOutputFor). */
  nextGraderOutput: ((task: WritingTask, script: string, includeModelAnswer: boolean) => unknown) | null;
  /** Make the next report insert fail (the grade function then returns report.id = null). */
  failNextReportInsert: boolean;
  /** SSE chunks the chat function streams back (strings are UTF-8 encoded; bytes are sent as they are). */
  chatChunks: Array<string | Uint8Array>;
  restore: () => void;
}

const nowIso = (() => {
  let t = Date.parse("2026-11-16T10:00:00.000Z");
  return () => new Date((t += 1000)).toISOString();
})();

function gradeHandler(server: FakeServer, body: unknown): Response {
  const checked = validateGradeRequest(body);
  if (checked.ok === false) return json(checked.error, checked.status);
  const input = checked.value;
  const raw = server.nextGraderOutput
    ? server.nextGraderOutput(input.task, input.script, input.includeModelAnswer)
    : graderOutputFor(input.task, input.script, { includeModelAnswer: input.includeModelAnswer });
  server.nextGraderOutput = null;
  const parsed = validateGraderOutput(raw, { taskType: input.task.taskType, variant: input.task.variant, includeModelAnswer: input.includeModelAnswer });
  if (parsed.ok === false) return fail(502, "The marker returned an unreadable result. Your credits were not used; please try again.", "grader_invalid_output");
  const output = (parsed as { ok: true; value: GraderOutput }).value;
  const reportId = uuid();
  const report = buildReport({
    output,
    task: input.task,
    script: input.script,
    feedbackLang: input.feedbackLang,
    model: "fake-model",
    includeModelAnswer: input.includeModelAnswer,
    customVisual: input.customVisual,
    id: reportId,
    now: nowIso(),
  });
  let sessionId: string | null = null;
  if (input.sessionId) {
    const s = server.sessions.find((r) => r.id === input.sessionId && r.user_id === USER_ID && r.skill === "writing");
    if (s) sessionId = s.id as string;
  }
  let saveError = false;
  if (server.failNextReportInsert) {
    server.failNextReportInsert = false;
    saveError = true;
    report.id = null;
  } else {
    const now = new Date().toISOString();
    // jsonb columns go through JSON, like Postgres would store them.
    server.reports.push(JSON.parse(JSON.stringify({ ...reportRow(report), user_id: USER_ID, session_id: sessionId, created_at: now, updated_at: now })));
  }
  if (sessionId && !saveError) {
    const s = server.sessions.find((r) => r.id === sessionId)!;
    Object.assign(s, { status: "completed", completed_at: nowIso(), band: report.overall });
  }
  const response: GradeResponse = { report, creditsRemaining: 10 };
  return json(response);
}

function taskHandler(body: unknown): Response {
  const checked = validateGetTaskRequest(body);
  if (checked.ok === false) return json(checked.error, checked.status);
  if (checked.value.source !== "bank") return fail(500, "Task generation is not configured.", "upstream_error");
  const task = pickBankTask(checked.value);
  if (!task) return fail(404, "No task available for that selection.", "not_found");
  const response: GetTaskResponse = { task, creditsRemaining: null };
  return json(response);
}

function draftHandler(server: FakeServer, body: unknown): Response {
  const checked = validateDraftRequest(body);
  if (checked.ok === false) return json(checked.error, checked.status);
  const r = checked.value;
  const mine = (id: string) => server.sessions.find((s) => s.id === id && s.user_id === USER_ID && s.skill === "writing" && s.status === "in_progress");
  switch (r.action) {
    case "save": {
      const cols = JSON.parse(JSON.stringify(draftColumns(r)));
      if (r.sessionId) {
        const row = mine(r.sessionId);
        if (!row) return fail(404, "Draft not found (it may have been submitted or discarded). Save without a sessionId to start a new one.", "not_found");
        Object.assign(row, cols, { updated_at: nowIso() });
        const res: DraftResponse = { action: "save", sessionId: row.id as string, updatedAt: row.updated_at as string };
        return json(res);
      }
      const t = nowIso();
      const row = { ...cols, id: uuid(), user_id: USER_ID, status: "in_progress", created_at: t, updated_at: t };
      server.sessions.push(row);
      const res: DraftResponse = { action: "save", sessionId: row.id, updatedAt: row.updated_at };
      return json(res);
    }
    case "get": {
      const row = mine(r.sessionId);
      const res: DraftResponse = { action: "get", draft: row ? draftFromRow(row) : null };
      return json(res);
    }
    case "list": {
      const drafts = server.sessions
        .filter((s) => s.user_id === USER_ID && s.skill === "writing" && s.status === "in_progress")
        .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
        .map(draftFromRow)
        .filter((d): d is DraftRecord => d !== null);
      const res: DraftResponse = { action: "list", drafts };
      return json(res);
    }
    case "discard": {
      const row = mine(r.sessionId);
      if (row) row.status = "abandoned";
      const res: DraftResponse = { action: "discard", ok: true };
      return json(res);
    }
  }
}

function chatHandler(server: FakeServer, body: unknown): Response {
  const b = body as Record<string, unknown> | null;
  if (!b || typeof b !== "object") return fail(400, "Request body must be JSON.", "bad_request");
  if (!Array.isArray(b.messages)) return fail(400, "messages must be an array.", "bad_request");
  const history = trimHistory(b.messages);
  if (history.length === 0) return fail(400, "No valid user message found.", "bad_request");
  if (b.lang !== undefined && !isFeedbackLang(b.lang)) {
    // The real function falls back to the profile language; record it as a mismatch for the test.
    return fail(400, "lang not understood (test check).", "bad_request");
  }
  if (b.reportId !== undefined && b.reportId !== null && b.reportId !== "") {
    if (!isUuid(b.reportId)) return fail(400, "reportId must be a UUID.", "bad_request");
    const row = server.reports.find((r) => r.id === b.reportId && r.user_id === USER_ID);
    if (!row) return fail(404, "Report not found.", "not_found");
    if (!isGradeReport(row.comments)) return fail(500, "test: stored report is not a GradeReport", "upstream_error");
  }
  const enc = new TextEncoder();
  const chunks = server.chatChunks;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(typeof c === "string" ? enc.encode(c) : c);
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

/** Max body size each function's readJson accepts (from the index.ts files). */
const BODY_LIMITS: Record<string, number> = {
  "ielts-grade-writing": 3_000_000,
  "ielts-generate-writing-task": 50_000,
  "ielts-draft": 200_000,
  "student-chat": 1_000_000,
};

export function installFakeServer(): FakeServer {
  const realFetch = globalThis.fetch;
  const server: FakeServer = {
    requests: [],
    sessions: [],
    reports: [],
    nextGraderOutput: null,
    failNextReportInsert: false,
    chatChunks: [],
    restore: () => {
      globalThis.fetch = realFetch;
    },
  };

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const m = url.match(/\/functions\/v1\/([a-z-]+)$/);
    if (!m) throw new TypeError(`fake server: unexpected URL ${url}`);
    const fn = m[1];
    const headers = Object.fromEntries(Object.entries((init?.headers as Record<string, string>) ?? {}));
    const req = new Request("https://fake.local/" + fn, { method: init?.method ?? "GET", headers, body: init?.body as string });
    let res: Response;
    let body: unknown = null;
    if (req.method !== "POST") res = fail(405, "Method not allowed.", "bad_request");
    else if (!headers.Authorization?.startsWith("Bearer ")) res = fail(401, "Please sign in.", "unauthorized");
    else {
      body = await readJson(req, BODY_LIMITS[fn] ?? 1_000_000);
      if (body === null) res = fail(400, "Request body must be JSON.", "bad_request");
      else if (fn === "ielts-grade-writing") res = gradeHandler(server, body);
      else if (fn === "ielts-generate-writing-task") res = taskHandler(body);
      else if (fn === "ielts-draft") res = draftHandler(server, body);
      else if (fn === "student-chat") res = chatHandler(server, body);
      else res = fail(404, "No such function.", "not_found");
    }
    const copy = res.clone();
    const isJson = (res.headers.get("Content-Type") ?? "").includes("application/json");
    server.requests.push({ fn, body, headers, status: res.status, response: isJson ? await copy.json() : null });
    return res;
  }) as typeof fetch;

  return server;
}

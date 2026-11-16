import type { DraftRecord, FeedbackLang, WritingTask } from "@ielts/contract.ts";

/** What we keep on the device for one writing session. */
export interface LocalDraft {
  task: WritingTask;
  script: string;
  secondsUsed: number;
  /** ISO time of the last edit on this device. */
  updatedAt: string;
  feedbackLang?: FeedbackLang;
  /**
   * `updatedAt` of the newest server copy this device knows about (from the last
   * successful load or save). Lets the device copy win after offline edits even when
   * the device clock is behind the server clock.
   */
  serverUpdatedAt?: string;
}

export interface ChosenDraft {
  source: "local" | "server";
  task: WritingTask;
  script: string;
  secondsUsed: number;
  updatedAt: string;
  /** True when the local copy won, so the server copy should be refreshed. */
  serverIsStale: boolean;
}

function time(iso: unknown): number {
  if (typeof iso !== "string") return Number.NEGATIVE_INFINITY;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
}

function validLocal(d: LocalDraft | null | undefined): d is LocalDraft {
  return !!d && typeof d.script === "string" && !!d.task && typeof d.task === "object";
}

function validServer(d: DraftRecord | null | undefined): d is DraftRecord {
  return !!d && typeof d.script === "string" && !!d.task && typeof d.task === "object";
}

/**
 * Pick the copy to restore.
 *  1. If the server copy has not changed since this device last synced with it
 *     (`local.serverUpdatedAt`), the device copy wins: any difference is an edit made
 *     here that has not reached the server yet. No clock comparison is needed.
 *  2. Otherwise the newer one wins. On a tie the server copy wins (it is the one that
 *     survives a cleared browser).
 */
export function chooseDraft(local: LocalDraft | null | undefined, server: DraftRecord | null | undefined): ChosenDraft | null {
  const l = validLocal(local) ? local : null;
  const s = validServer(server) ? server : null;
  if (!l && !s) return null;

  const fromServer = (d: DraftRecord): ChosenDraft => ({
    source: "server",
    task: d.task,
    script: d.script,
    secondsUsed: Number.isFinite(d.secondsUsed) ? d.secondsUsed : 0,
    updatedAt: d.updatedAt,
    serverIsStale: false,
  });
  const fromLocal = (d: LocalDraft, stale: boolean): ChosenDraft => ({
    source: "local",
    task: d.task,
    script: d.script,
    secondsUsed: Number.isFinite(d.secondsUsed) ? d.secondsUsed : 0,
    updatedAt: d.updatedAt,
    serverIsStale: stale,
  });

  if (l && !s) return fromLocal(l, true);
  if (s && !l) return fromServer(s);
  if (l!.serverUpdatedAt && time(s!.updatedAt) <= time(l!.serverUpdatedAt)) {
    const same = l!.script === s!.script && l!.secondsUsed === s!.secondsUsed;
    return same ? fromServer(s!) : fromLocal(l!, true);
  }
  return time(l!.updatedAt) > time(s!.updatedAt) ? fromLocal(l!, true) : fromServer(s!);
}

// ───────── localStorage helpers ─────────

const KEY_PREFIX = "adaptiveprep:ielts-draft:";

export function readLocalDraft(sessionId: string, storage: Pick<Storage, "getItem"> = localStorage): LocalDraft | null {
  try {
    const raw = storage.getItem(KEY_PREFIX + sessionId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalDraft;
    return validLocal(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeLocalDraft(sessionId: string, draft: LocalDraft, storage: Pick<Storage, "setItem"> = localStorage): boolean {
  try {
    storage.setItem(KEY_PREFIX + sessionId, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearLocalDraft(sessionId: string, storage: Pick<Storage, "removeItem"> = localStorage): void {
  try {
    storage.removeItem(KEY_PREFIX + sessionId);
  } catch {
    // ignore
  }
}

// ───────── Task ids already shown, so "Give me a task" tends to give a fresh one ─────────

const SEEN_KEY = "adaptiveprep:ielts-seen-tasks";
const SEEN_MAX = 60;

export function readSeenTaskIds(storage: Pick<Storage, "getItem"> = localStorage): string[] {
  try {
    const parsed = JSON.parse(storage.getItem(SEEN_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function rememberSeenTaskId(id: string, storage: Pick<Storage, "getItem" | "setItem"> = localStorage): void {
  if (!id || id === "custom") return;
  try {
    const next = [...readSeenTaskIds(storage).filter((x) => x !== id), id].slice(-SEEN_MAX);
    storage.setItem(SEEN_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

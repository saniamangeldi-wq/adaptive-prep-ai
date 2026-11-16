import type { InlineIssue } from "@ielts/contract.ts";

export interface LocatedIssue {
  /** Index into the original `issues` array. */
  index: number;
  issue: InlineIssue;
  start: number;
  end: number;
}

export interface ScriptSegment {
  text: string;
  start: number;
  end: number;
  /** Indexes (into the original `issues` array) of every issue covering this segment. Empty for plain text. */
  issueIndexes: number[];
}

export interface SplitResult {
  segments: ScriptSegment[];
  /** Issues that could not be placed in the text (no or bad offsets and the quote was not found). */
  unlocated: Array<{ index: number; issue: InlineIssue }>;
}

function isInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n);
}

/**
 * Decide where each issue sits in the script. Server offsets are used when they are
 * sane; otherwise the quote is searched for; otherwise the issue is "unlocated".
 * Never throws, whatever the input looks like.
 */
export function locateIssues(script: string, issues: unknown): { located: LocatedIssue[]; unlocated: SplitResult["unlocated"] } {
  const text = typeof script === "string" ? script : "";
  const located: LocatedIssue[] = [];
  const unlocated: SplitResult["unlocated"] = [];
  if (!Array.isArray(issues)) return { located, unlocated };

  issues.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") return;
    const issue = raw as InlineIssue;
    const quote = typeof issue.quote === "string" ? issue.quote : "";

    let start: number | null = null;
    let end: number | null = null;

    if (isInt(issue.start) && isInt(issue.end) && issue.start >= 0 && issue.start < text.length && issue.end > issue.start) {
      start = issue.start;
      end = Math.min(issue.end, text.length);
      // If the text at those offsets is not the quoted text, trust the quote instead.
      if (quote && text.slice(start, end) !== quote) {
        const found = text.indexOf(quote);
        if (found >= 0) {
          start = found;
          end = found + quote.length;
        } else {
          start = null;
          end = null;
        }
      }
    } else if (quote) {
      const found = text.indexOf(quote);
      if (found >= 0) {
        start = found;
        end = found + quote.length;
      }
    }

    if (start === null || end === null || end <= start) {
      unlocated.push({ index, issue });
    } else {
      located.push({ index, issue, start, end });
    }
  });

  return { located, unlocated };
}

/**
 * Cut the script into consecutive segments: plain text and highlighted spans. Where
 * issues overlap, the overlap becomes its own segment that lists all the issues on it.
 * The segments always join back into exactly the original script.
 */
export function splitScript(script: string, issues: unknown): SplitResult {
  const text = typeof script === "string" ? script : "";
  const { located, unlocated } = locateIssues(text, issues);
  if (text.length === 0) return { segments: [], unlocated };

  const cuts = new Set<number>([0, text.length]);
  for (const l of located) {
    cuts.add(l.start);
    cuts.add(l.end);
  }
  const points = [...cuts].sort((a, b) => a - b);

  const raw: ScriptSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    const issueIndexes = located
      .filter((l) => l.start <= start && l.end >= end)
      .map((l) => l.index)
      .sort((a, b) => a - b);
    raw.push({ text: text.slice(start, end), start, end, issueIndexes });
  }

  // Merge neighbours that carry the same issues (e.g. two plain stretches split by a cut).
  const segments: ScriptSegment[] = [];
  for (const seg of raw) {
    const prev = segments[segments.length - 1];
    if (prev && prev.issueIndexes.length === seg.issueIndexes.length && prev.issueIndexes.every((v, i) => v === seg.issueIndexes[i])) {
      prev.text += seg.text;
      prev.end = seg.end;
    } else {
      segments.push({ ...seg });
    }
  }
  return { segments, unlocated };
}

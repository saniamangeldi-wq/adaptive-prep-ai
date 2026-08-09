import type { QuestionTable } from "@/lib/test-generator";
import { normalizeSatText } from "@/lib/sat-content";

/* ------------------------------------------------------------------ *
 * Reading & Writing structure recovery
 *
 * Imported SAT Reading & Writing items frequently store their data table as
 * a single concatenated line, e.g.
 *
 *   "CountryApproximate number of speakers (in millions)Estimated % of
 *    populationDemocratic Republic of the Congo2225Kenya55100Tanzania61100"
 *
 * Every cell boundary in the original PDF table was lost. This module
 * recovers the structure without ever rewriting the question wording:
 * it only re-segments the flattened data block and discards nothing.
 * ------------------------------------------------------------------ */

const SEP = "\u0000";

/** A single value cell candidate: 12, 0.04, 59.1%, 100% */
const NUMBER_RE = /^\d+(?:\.\d+)?%?$/;

/** Splits the flattened block into label / value tokens. */
export function tokenizeConcatenatedBlock(blob: string): string[] {
  return blob
    .replace(/([a-z%).\u2019])([A-Z])/g, `$1${SEP}$2`) // wordEnd -> NextWord
    .replace(/([A-Z]{2,})([a-z])/g, `$1${SEP}$2`) // ACRONYM -> word
    .replace(/([A-Za-z)])(\d)/g, `$1${SEP}$2`) // letter -> digit
    .replace(/([\d%])([A-Za-z])/g, `$1${SEP}$2`) // digit/percent -> letter
    .replace(/%(?=[\d.])/g, `%${SEP}`) // percent -> next number
    .split(SEP)
    .map((t) => t.trim())
    .filter(Boolean);
}

const isValueToken = (t: string) => /^[\d.]/.test(t);
const isSingleNumber = (t: string) => NUMBER_RE.test(t);

function validPart(part: string): boolean {
  if (!NUMBER_RE.test(part)) return false;
  const digits = part.replace(/%$/, "");
  // Reject leading zeros ("05") but allow "0" and "0.5"
  if (/^0\d/.test(digits)) return false;
  return true;
}

function variance(lengths: number[]): number {
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  return lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length;
}

/**
 * Splits a run of digits that represents `k` adjacent table cells.
 * Candidate splits are scored: a "total" column (last numeric part equal to
 * the sum of the preceding ones) is strongly preferred, then the most evenly
 * balanced split. Returns null when no valid split exists.
 */
export function splitNumberBlob(blob: string, k: number): string[] | null {
  if (k <= 0 || blob.length > 32) return null;
  if (k === 1) return validPart(blob) ? [blob] : null;

  const results: string[][] = [];
  const walk = (rest: string, remaining: number, acc: string[]) => {
    if (results.length > 400) return;
    if (remaining === 1) {
      if (validPart(rest)) results.push([...acc, rest]);
      return;
    }
    for (let i = 1; i < rest.length; i++) {
      const head = rest.slice(0, i);
      if (!validPart(head)) continue;
      walk(rest.slice(i), remaining - 1, [...acc, head]);
    }
  };
  walk(blob, k, []);
  if (results.length === 0) return null;

  const score = (parts: string[]) => {
    const nums = parts.map((p) => Number(p.replace(/%$/, "")));
    let s = -variance(parts.map((p) => p.length));
    for (let i = 2; i < parts.length; i++) {
      const sum = nums.slice(0, i).reduce((a, b) => a + b, 0);
      if (!parts[i].endsWith("%") && Math.abs(sum - nums[i]) < 1e-9) s += 100;
    }
    // Deterministic tie-break: prefer longer leading parts.
    s += parts[0].length * 1e-3;
    return s;
  };

  return results.reduce((best, cur) => (score(cur) > score(best) ? cur : best));
}

/** Splits an all-caps acronym run ("SPCASTHTCOCC") into `k` equal headers. */
function splitAcronym(token: string, k: number): string[] | null {
  if (k <= 1) return [token];
  if (!/^[A-Z0-9]+$/.test(token) || token.length % k !== 0) return null;
  const size = token.length / k;
  return Array.from({ length: k }, (_, i) => token.slice(i * size, (i + 1) * size));
}

function attemptParse(tokens: string[], columns: number): QuestionTable | null {
  const firstValue = tokens.findIndex(isValueToken);
  if (firstValue < 2) return null;

  const headerTokens = tokens.slice(0, firstValue - 1);
  if (headerTokens.length === 0 || headerTokens.length > columns) return null;

  let headers = headerTokens;
  if (headerTokens.length < columns) {
    const extra = columns - headerTokens.length + 1;
    const split = splitAcronym(headerTokens[headerTokens.length - 1], extra);
    if (!split) return null;
    headers = [...headerTokens.slice(0, -1), ...split];
  }

  const rows: string[][] = [];
  const need = columns - 1;
  let i = firstValue - 1;
  while (i < tokens.length) {
    const label = tokens[i];
    if (isValueToken(label)) return null;
    i += 1;

    // The value cluster of this row: every numeric token that follows the label.
    const values: string[] = [];
    while (i < tokens.length && isValueToken(tokens[i])) {
      values.push(tokens[i]);
      i += 1;
    }
    // Lowercase text cells such as "not detected" can complete the row.
    let lowerCount = 0;
    while (i + lowerCount < tokens.length && /^[a-z]/.test(tokens[i + lowerCount])) lowerCount += 1;

    const textCells = values.length < need ? Math.min(lowerCount, need - values.length) : 0;
    const fromValues = need - textCells;

    let cells: string[];
    if (values.length === fromValues) {
      cells = values;
    } else if (values.length === 1) {
      const split = splitNumberBlob(values[0], fromValues);
      if (!split) return null;
      cells = split;
    } else {
      return null;
    }

    for (let t = 0; t < textCells; t++) {
      cells.push(tokens[i]);
      i += 1;
    }

    if (cells.length !== need) return null;
    rows.push([label, ...cells]);
  }


  if (rows.length === 0) return null;
  return { headers, rows };
}

/** Recovers a real table from a concatenated single-line data block. */
export function parseConcatenatedTable(blob: string): QuestionTable | null {
  const tokens = tokenizeConcatenatedBlock(blob.trim());
  if (tokens.length < 4) return null;
  const headerGuess = tokens.findIndex(isValueToken) - 1;

  const candidates = [headerGuess, ...Array.from({ length: 7 }, (_, i) => i + 2)]
    .filter((c, idx, arr) => c >= 2 && c <= 9 && arr.indexOf(c) === idx);

  for (const columns of candidates) {
    const parsed = attemptParse(tokens, columns);
    if (parsed) return parsed;
  }
  return null;
}

const CONCAT_SIGNATURE = /[a-z%)][A-Z]|[A-Za-z]\d|\d[A-Za-z]/;

function looksLikeTitle(block: string): boolean {
  const t = block.trim();
  return t.length > 0 && t.length < 140 && !/[.?!]$/.test(t) && !t.includes("\n");
}

export interface ExtractedBlock {
  table?: QuestionTable;
  /** Question text with the flattened data block (and its title) removed. */
  text: string;
}

/**
 * Finds the concatenated data block inside a question's text, converts it to a
 * real table, and returns the remaining prose untouched.
 */
export function extractConcatenatedTableBlock(rawText: string): ExtractedBlock {
  const source = rawText || "";
  const blocks = source.split(/\n\s*\n/);
  if (blocks.length < 2) return { text: normalizeSatText(source) };

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (block.includes("\n") || block.length < 20) continue;
    if (!CONCAT_SIGNATURE.test(block)) continue;
    const table = parseConcatenatedTable(block);
    if (!table) continue;

    const titleIndex = i > 0 && looksLikeTitle(blocks[i - 1]) ? i - 1 : -1;
    if (titleIndex >= 0) table.caption = blocks[titleIndex].trim();

    const rest = blocks
      .filter((_, idx) => idx !== i && idx !== titleIndex)
      .join("\n\n")
      .trim();
    if (!rest) return { text: normalizeSatText(source) };
    return { table, text: normalizeSatText(rest) };
  }

  return { text: normalizeSatText(source) };
}

/* ------------------------------------------------------------------ *
 * Text 1 / Text 2 passage separation
 * ------------------------------------------------------------------ */

export interface PassageSection {
  /** "Text 1", "Text 2", or undefined for unlabeled prose. */
  label?: string;
  body: string;
}

const TEXT_LABEL_RE = /(?:^|\s)(Text\s+\d+)\s+/g;

/**
 * Splits merged "Text 1 ... Text 2 ..." passages into labeled sections.
 * Wording is preserved verbatim; only the labels are lifted out.
 */
export function splitPassages(text: string): PassageSection[] {
  const source = text || "";
  const matches = [...source.matchAll(TEXT_LABEL_RE)];
  if (matches.length < 2) return [{ body: source.trim() }];

  const sections: PassageSection[] = [];
  const lead = source.slice(0, matches[0].index ?? 0).trim();
  if (lead) sections.push({ body: lead });

  matches.forEach((m, idx) => {
    const start = (m.index ?? 0) + m[0].length;
    const end = idx + 1 < matches.length ? matches[idx + 1].index ?? source.length : source.length;
    sections.push({ label: m[1].trim(), body: source.slice(start, end).trim() });
  });

  // The trailing question prompt lives at the end of the last section; split it
  // off so it is not rendered as part of Text 2.
  const last = sections[sections.length - 1];
  const promptMatch = last.body.match(/(?:^|\s)((?:Based on the texts|Which choice|What)\b[\s\S]*)$/);
  if (promptMatch) {
    last.body = last.body.slice(0, promptMatch.index).trim();
    sections.push({ body: promptMatch[1].trim() });
  }

  return sections.filter((s) => s.body.length > 0);
}

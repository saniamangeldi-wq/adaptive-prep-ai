/**
 * Text measurements on a candidate script. Pure.
 *
 * WORD COUNT — how an examiner would count on paper, and what we do:
 *   - A word is a run of characters between spaces that contains at least one
 *     letter or digit. Punctuation attached to a word does not change the count.
 *   - Hyphenated compounds count as ONE word ("well-known", "long-term",
 *     "25-year-old"). This is the usual examiner reading of a hyphenated form.
 *   - Contractions count as ONE word ("don't", "it's"). Conservative: never
 *     inflates the count.
 *   - Numbers count as words ("1990" = 1, "25%" = 1, "3.5" = 1, "$400" = 1).
 *     "25 per cent" is 3 words, as written.
 *   - Slash forms are one word ("and/or").
 *   - Free-standing symbols do not count ("&", "-", "–", "%", "=", "→").
 *   - An em dash or en dash written between two words with no spaces
 *     ("cars—especially") separates them: 2 words.
 *   - Copied task wording is NOT subtracted here. `promptOverlap` measures it
 *     separately; the report flags it and the grader is told how many words
 *     were copied (examiners do not credit copied rubric).
 *
 * PARAGRAPHS — if the script contains at least one blank line, paragraphs are
 * the blocks separated by blank lines; otherwise every non-empty line is a
 * paragraph (students often press Enter once between paragraphs in a text
 * box). Blocks without any word are ignored.
 */

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/** Split into whitespace tokens, also splitting on em/en dashes between words. */
function rawTokens(text: string): string[] {
  return text
    .replace(/[–—―]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

export function countWords(text: string): number {
  if (typeof text !== "string" || !text) return 0;
  let n = 0;
  for (const t of rawTokens(text)) if (LETTER_OR_DIGIT.test(t)) n++;
  return n;
}

export interface Paragraph {
  text: string;
  start: number;
  end: number;
}

/** Paragraphs with their character offsets in the original string (see header for the rule). */
export function splitParagraphs(text: string): Paragraph[] {
  if (typeof text !== "string" || !text) return [];
  // Work on the original string so offsets stay valid; \r\n and \r are line breaks too.
  const hasBlankLine = /(?:\r\n|\r|\n)[ \t ]*(?:\r\n|\r|\n)/.test(text);
  const separator = hasBlankLine
    ? /(?:\r\n|\r|\n)(?:[ \t ]*(?:\r\n|\r|\n))+/g
    : /\r\n|\r|\n/g;
  const out: Paragraph[] = [];
  let last = 0;
  const pushBlock = (from: number, to: number) => {
    const block = text.slice(from, to);
    const trimmed = block.trim();
    if (!trimmed || countWords(trimmed) === 0) return;
    const s = from + (block.length - block.trimStart().length);
    out.push({ text: trimmed, start: s, end: s + trimmed.length });
  };
  let m: RegExpExecArray | null;
  while ((m = separator.exec(text)) !== null) {
    pushBlock(last, m.index);
    last = m.index + m[0].length;
  }
  pushBlock(last, text.length);
  return out;
}

export function countParagraphs(text: string): number {
  return splitParagraphs(text).length;
}

// ───────────────────────── Quote location ─────────────────────────

export interface QuoteMatch {
  start: number;
  end: number;
  /** How it was found. */
  method: "exact" | "tolerant" | "tolerant_case";
}

const QUOTE_FOLD: Record<string, string> = {
  "‘": "'", "’": "'", "‚": "'", "‛": "'", "′": "'", "`": "'", "´": "'",
  "“": '"', "”": '"', "„": '"', "‟": '"', "″": '"', "«": '"', "»": '"',
  "‐": "-", "‑": "-", "‒": "-", "–": "-", "—": "-", "−": "-",
  "…": "...",
};

/**
 * Normalise for tolerant matching and keep a map from each normalised index
 * back to the original index: curly quotes → straight, dashes → "-",
 * ellipsis → "...", any whitespace run → one space.
 */
function foldWithMap(s: string, lower: boolean): { text: string; map: number[] } {
  let out = "";
  const map: number[] = [];
  let prevSpace = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      if (!prevSpace) {
        out += " ";
        map.push(i);
        prevSpace = true;
      }
      continue;
    }
    prevSpace = false;
    let rep = QUOTE_FOLD[ch] ?? ch;
    if (lower) {
      const l = rep.toLowerCase();
      if (l.length === rep.length) rep = l;
    }
    for (let k = 0; k < rep.length; k++) {
      out += rep[k];
      map.push(i);
    }
  }
  return { text: out, map };
}

function foldEndIndex(map: number[], normEnd: number, original: string): number {
  // normEnd is exclusive; the last matched normalised char maps to an original index.
  const lastOrig = map[normEnd - 1];
  return lastOrig + 1 <= original.length ? lastOrig + 1 : original.length;
}

const EDGE_JUNK = /^[\s"'‘’“”«».,;:!?…-]+|[\s"'‘’“”«».,;:!?…-]+$/g;

/**
 * Find a model-supplied quote in the script and return character offsets.
 * 1. exact match (on the trimmed quote);
 * 2. tolerant: whitespace runs, curly/straight quotes, dash and ellipsis forms;
 * 3. tolerant and case-insensitive;
 * then the same three after stripping wrapping quote marks / edge punctuation
 * that models often add. `fromIndex` lets callers find a later occurrence.
 * Returns null when nothing matches — never guesses an offset.
 */
export function locateQuote(script: string, quote: string, fromIndex = 0): QuoteMatch | null {
  if (typeof script !== "string" || typeof quote !== "string") return null;
  const candidates = [quote.trim()];
  const stripped = quote.replace(EDGE_JUNK, "").trim();
  if (stripped && stripped !== candidates[0]) candidates.push(stripped);

  for (const q of candidates) {
    if (q.length < 2) continue;
    const exact = script.indexOf(q, fromIndex);
    if (exact !== -1) return { start: exact, end: exact + q.length, method: "exact" };

    for (const lower of [false, true]) {
      const s = foldWithMap(script, lower);
      const nq = foldWithMap(q, lower).text.trim();
      if (nq.length < 2) continue;
      // translate fromIndex into normalised space
      let normFrom = 0;
      while (normFrom < s.map.length && s.map[normFrom] < fromIndex) normFrom++;
      const idx = s.text.indexOf(nq, normFrom);
      if (idx !== -1) {
        const start = s.map[idx];
        const end = foldEndIndex(s.map, idx + nq.length, script);
        return { start, end, method: lower ? "tolerant_case" : "tolerant" };
      }
    }
  }
  return null;
}

// ───────────────────────── Copying from the task wording ─────────────────────────

function wordTokens(text: string): string[] {
  return (text.toLowerCase().replace(/[‘’]/g, "'").match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu) ?? []);
}

export interface PromptOverlap {
  /** Script words that sit inside a run of ≥ n consecutive words also found in the task wording. */
  copiedWords: number;
  /** copiedWords / words in the script (0 for an empty script). */
  ratio: number;
  /** Longest copied run, in words. */
  longestRun: number;
}

/**
 * How much of the script is lifted from the task wording. A script word is
 * "copied" when it is part of an n-gram (default 6 words) that also occurs in
 * the prompt. Six words is long enough that ordinary topic phrases ("in many
 * countries", "the number of people") do not count, short enough to catch a
 * copied question sentence.
 */
export function promptOverlap(script: string, prompt: string, n = 6): PromptOverlap {
  const s = wordTokens(script ?? "");
  const p = wordTokens(prompt ?? "");
  if (s.length === 0 || p.length < n || s.length < n) return { copiedWords: 0, ratio: 0, longestRun: 0 };
  const grams = new Set<string>();
  for (let i = 0; i + n <= p.length; i++) grams.add(p.slice(i, i + n).join(" "));
  const covered = new Array<boolean>(s.length).fill(false);
  for (let i = 0; i + n <= s.length; i++) {
    if (grams.has(s.slice(i, i + n).join(" "))) for (let k = i; k < i + n; k++) covered[k] = true;
  }
  let copied = 0;
  let run = 0;
  let longest = 0;
  for (const c of covered) {
    if (c) {
      copied++;
      run++;
      if (run > longest) longest = run;
    } else run = 0;
  }
  return { copiedWords: copied, ratio: copied / s.length, longestRun: longest };
}

/** Share of letters that are basic Latin (A–Z, a–z) or Latin-1/Extended letters. 1 for a script without letters. */
export function latinLetterShare(text: string): number {
  const letters = (text ?? "").match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return 1;
  const latin = letters.filter((c) => /\p{Script=Latin}/u.test(c)).length;
  return latin / letters.length;
}

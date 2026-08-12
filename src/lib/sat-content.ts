import type { Question, QuestionFigure, QuestionTable } from "@/lib/test-generator";

const RAW_MARKUP_RE = /<\/?(?:svg|style|script|foreignObject)\b|\*\s*\{[^}]*\}|\b(?:stroke-linecap|stroke-linejoin|viewBox)\s*:/i;
const VISUAL_REFERENCE_RE = /\b(?:the|this|shown|given|following)\s+(?:graph|chart|figure|diagram|table)\b(?!\s+of\s+(?:this|the|the given)\s+equation)|\bgraph represents\b/i;

/** Converts common PDF/screen-reader math tokens without rewriting prose. */
export function normalizeMathTokens(input: string): string {
  if (!input) return "";
  let out = input
    .replace(/\bleft parenthesis\b/gi, "(")
    .replace(/\bright parenthesis\b/gi, ")")
    .replace(/\bleft bracket\b/gi, "[")
    .replace(/\bright bracket\b/gi, "]");

  // MathML-speech superscripts/subscripts:
  //   "x Superscript negative 2 Baseline"  -> "x^{-2}"
  //   "a Subscript n Baseline"             -> "a_{n}"
  // The exponent body runs up to the closing "Baseline" marker. LaTeX brace
  // form is emitted so KaTeX can typeset the result directly.
  for (let i = 0; i < 5; i++) {
    const before = out;
    out = out
      .replace(/\s*\bSuperscript\b\s+([\s\S]*?)\s*\bBaseline\b/gi, (_m, body) => `^{${normalizeScriptBody(body)}}`)
      .replace(/\s*\bSubscript\b\s+([\s\S]*?)\s*\bBaseline\b/gi, (_m, body) => `_{${normalizeScriptBody(body)}}`);
    if (out === before) break;
  }
  // Trailing Superscript/Subscript with no Baseline terminator: take the next token,
  // but only when that token is a plausible exponent/index (a number or single letter).
  // Anything else is genuine corruption and must survive so validation can quarantine it.
  out = out
    .replace(/\s*\bSuperscript\b\s+(negative\s+)?(\d+(?:\.\d+)?|[A-Za-z])\b/g, (_m, neg, tok) => `^{${neg ? "-" : ""}${tok}}`)
    .replace(/\s*\bSubscript\b\s+(\d+(?:\.\d+)?|[A-Za-z])\b/g, (_m, tok) => `_{${tok}}`)
    .replace(/\s*\bBaseline\b/g, "");


  return out
    .replace(/\bnegative\s+([0-9.]+)/gi, "-$1")
    // Comparison phrases must be handled before the bare "equals" rule, or
    // "greater than or equals 0" degrades into "greater than or = 0".
    .replace(/\bgreater than or equal(?:s| to)\b/gi, "≥")
    .replace(/\bless than or equal(?:s| to)\b/gi, "≤")
    .replace(/\bgreater than or\s*=/gi, "≥")
    .replace(/\bless than or\s*=/gi, "≤")

    .replace(/\bnot equal to\b/gi, "≠")
    .replace(/\bequals(?: sign)?\b/gi, "=")
    .replace(/\bplus(?: sign)?\b/gi, "+")
    .replace(/\bminus(?: sign)?\b/gi, "−")
    .replace(/\btimes(?: sign)?\b/gi, "×")
    .replace(/\b([A-Za-z])\s+\(/g, "$1(")
    .replace(/[ \t]+([),.;:?])/g, "$1")
    .replace(/([([])[ \t]+/g, "$1")
    .replace(/[ \t]{2,}/g, " ");

}

/** Normalizes the inside of a Superscript/Subscript body ("negative 2" -> "-2"). */
function normalizeScriptBody(body: string): string {
  return body
    .trim()
    .replace(/\bnegative\s+/gi, "-")
    .replace(/[ \t]{2,}/g, " ");
}


/** Removes leaked SVG/style markup while retaining surrounding question prose. */
export function stripRawVisualMarkup(input: string): string {
  if (!input) return "";
  return input
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<svg\b[\s\S]*?<\/svg\s*>/gi, "")
    .replace(/<foreignObject\b[\s\S]*?<\/foreignObject\s*>/gi, "")
    .replace(/^\s*\*?\s*\{[^}]*\}\s*$/gim, "")
    .replace(/^.*\b(?:stroke-linecap|stroke-linejoin|viewBox)\s*:[^\n]*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeSatText(input: string): string {
  return normalizeMathTokens(stripRawVisualMarkup(input));
}

export function hadRawVisualMarkup(input: string | undefined): boolean {
  return RAW_MARKUP_RE.test(input || "");
}

export function hasVisualReference(input: string | undefined): boolean {
  return VISUAL_REFERENCE_RE.test(input || "");
}

export function isValidTable(table: QuestionTable | undefined): table is QuestionTable {
  if (!table || !Array.isArray(table.headers) || table.headers.length < 2 || !Array.isArray(table.rows) || table.rows.length === 0) return false;
  return table.headers.every((cell) => typeof cell === "string") &&
    table.rows.every((row) => Array.isArray(row) && row.length === table.headers.length && row.every((cell) => typeof cell === "string"));
}

export function isPotentiallyRenderableFigure(figure: QuestionFigure | undefined): figure is QuestionFigure {
  if (!figure) return false;
  if (figure.type === "image") return typeof figure.src === "string" && /^(https?:|data:image\/)/i.test(figure.src);
  return typeof figure.svg === "string" && /<svg\b/i.test(figure.svg) && /<\/(?:svg)\s*>/i.test(figure.svg);
}

const CATEGORY_BLOCK_RE = /(\d+):\s*\n\s*\n((?:[A-Za-z][\w\s]*:\s*[\d.]+%\s*\n?)+)/g;

/**
 * Recovers a real data table from imported SAT questions whose chart was
 * flattened into the question text as a repeating
 * "N:\n\nlabel: value%\nlabel: value%" enumeration. The axis/legend jumble
 * before the data is discarded and only the real prose after it is kept.
 */
export function extractEmbeddedChartTable(rawText: string): { table?: QuestionTable; text: string } {
  if (!rawText) return { text: rawText };

  const matches = [...rawText.matchAll(CATEGORY_BLOCK_RE)];
  if (matches.length < 2) return { text: rawText };

  const lastMatch = matches[matches.length - 1];
  const dataEnd = (lastMatch.index ?? 0) + lastMatch[0].length;

  const seriesOrder: string[] = [];
  const rowMaps: Array<{ category: string; values: Record<string, string> }> = [];

  for (const m of matches) {
    const values: Record<string, string> = {};
    for (const [, label, value] of m[2].matchAll(/([A-Za-z][\w\s]*?):\s*([\d.]+%)/g)) {
      const key = label.trim();
      if (!seriesOrder.includes(key)) seriesOrder.push(key);
      values[key] = value;
    }
    rowMaps.push({ category: m[1], values });
  }

  const rows = rowMaps.map(({ category, values }) => [category, ...seriesOrder.map((s) => values[s] ?? "")]);

  const remainder = rawText.slice(dataEnd).trim();
  if (!remainder) return { text: rawText };

  return {
    table: { headers: ["Category", ...seriesOrder], rows, chart: "bar" },
    text: normalizeSatText(remainder),
  };
}

const LINE_HEADER_RE = /^The following (\d+) lines are shown:\s*$/i;
const SERIES_HEADER_RE = /^The (.+?) line:\s*$/i;
const POINT_RE =
  /^(?:Begins at|(?:Rises|Falls)(?: sharply| gradually)? to|Remains level to|Ends at)\s+(.+?),\s*((?:negative\s+)?[−–-]?[\d,]+(?:\.\d+)?(?:\s*[A-Za-z%][A-Za-z%\s.]*)?)$/i;

function cleanNumberWord(value: string): string {
  return value.trim().replace(/^negative\s+/i, "−");
}

/**
 * Recovers a real multi-series dataset from imported SAT questions whose line
 * graph was flattened into the stem as a screen-reader narration
 * ("The following 4 lines are shown: ... Begins at X, Y / Rises sharply to X, Y").
 * The glued axis/legend preamble before the narration is discarded and only the
 * real prose after it is kept.
 */
export function extractLineGraphTable(rawText: string): { table?: QuestionTable; text: string } {
  if (!rawText || !/The following \d+ lines are shown:/i.test(rawText)) return { text: rawText };

  const lines = rawText.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => LINE_HEADER_RE.test(l.trim()));
  if (headerIdx === -1) return { text: rawText };

  const series: string[] = [];
  const points = new Map<string, Map<string, string>>();
  const xOrder: string[] = [];
  let current: string | null = null;
  let i = headerIdx + 1;
  let lastDataIdx = headerIdx;

  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const seriesHeader = line.match(SERIES_HEADER_RE);
    if (seriesHeader) {
      const name = seriesHeader[1].trim();
      // Legend entries may carry an article the block header drops
      // ("the Philippines" vs "The Philippines line:").
      current =
        series.find((s) => s.toLowerCase() === name.toLowerCase() || s.toLowerCase().endsWith(` ${name.toLowerCase()}`)) ??
        name;
      if (!points.has(current)) points.set(current, new Map());
      lastDataIdx = i;
      continue;
    }

    const point = line.match(POINT_RE);
    if (point && current) {
      const x = cleanNumberWord(point[1]);
      const y = cleanNumberWord(point[2]);
      if (!xOrder.includes(x)) xOrder.push(x);
      points.get(current)!.set(x, y);
      lastDataIdx = i;
      continue;
    }

    // Legend names listed before the first series block.
    if (!current && line.length <= 60 && !/[.?!]$/.test(line)) {
      series.push(line);
      lastDataIdx = i;
      continue;
    }
    break; // first real prose line ends the narration block
  }

  const names = [...points.keys()];
  if (names.length < 1 || xOrder.length < 2) return { text: rawText };

  const prose = lines.slice(lastDataIdx + 1).join("\n").trim();
  if (prose.length < 40) return { text: rawText };

  const ordered = series.filter((s) => points.has(s)).concat(names.filter((n) => !series.includes(n)));
  const rows = xOrder.map((x) => [x, ...ordered.map((s) => points.get(s)!.get(x) ?? "")]);

  // Narration notes ("All values are approximate.") are not part of the axes.
  const preamble = lines
    .slice(0, headerIdx)
    .filter((l) => !/^[A-Z][^.]{4,80}\.$/.test(l.trim()))
    .join(" ");
  const caption = extractGraphCaption(preamble, ordered);
  const xLabel = extractAxisLabel(preamble, ordered) ?? "";

  return {
    table: {
      headers: [xLabel, ...ordered],
      rows,
      chart: "line",
      ...(caption ? { caption } : {}),
    },
    text: normalizeSatText(prose),
  };
}

/** Best-effort chart title out of the glued axis/legend preamble. */
export function extractGraphCaption(preamble: string, series: string[] = []): string | undefined {
  let head = stripLegend(preamble, series);
  const axis = extractAxisLabel(preamble, series);
  if (axis && head.endsWith(axis)) head = head.slice(0, head.length - axis.length);
  // Axis tick numbers glue the title to the rest: the longest alphabetic run
  // between numeric groups is the chart title.
  const candidate = head
    .split(/[\d,.]{2,}/)
    .map((part) => part.trim().replace(/^[^A-Za-z]+/, ""))
    .filter((part) => part.split(/\s+/).length >= 3)
    .sort((a, b) => b.length - a.length)[0];
  if (!candidate || candidate.length < 20 || candidate.length > 180) return undefined;
  const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";
  return (
    candidate
      // Month tick labels glue onto the title the same way numbers do.
      .replace(new RegExp(`^.*(?:${MONTHS})(?=[A-Z])`), "")
      // Un-glue words the extractor ran together ("Salesin Four" -> "Sales in Four").
      .replace(/([a-z]{3,})(in|from|of|and|for|by|with)(?=[A-Z ])/g, "$1 $2")
      .replace(/\b(in|from|of|and|for|by|to|with)(?=[A-Z])/g, "$1 ")
      .replace(/[,\s]+$/, "")
      .replace(/\s+(in|from|of|and|for|by|to|with)$/, "")
      .trim()
  );
}

/** The x-axis title is glued right before the legend names in the preamble. */
function stripLegend(preamble: string, series: string[]): string {
  let head = preamble.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const name of series) {
      if (head.toLowerCase().endsWith(name.toLowerCase())) {
        head = head.slice(0, head.length - name.length).trim();
        changed = true;
      }
    }
  }
  return head;
}

function extractAxisLabel(preamble: string, series: string[]): string | undefined {
  const head = stripLegend(preamble, series);
  const label = head.match(/([A-Z][a-z]+(?: [a-z]+){0,3})$/)?.[1]?.trim();
  return label && label.length <= 40 ? label : undefined;
}

export function shouldShowVisualFallback(question: Question, promptText: string, hasRecoveredTable = false): boolean {
  if (hasRecoveredTable) return false;
  if (question.visual_unavailable) return true;
  if (question.figure && !isPotentiallyRenderableFigure(question.figure)) return true;
  if (question.table && !isValidTable(question.table)) return true;
  const source = [question.stimulus, question.text, promptText].filter(Boolean).join("\n");
  return hadRawVisualMarkup(source) || (!question.figure && !question.table && hasVisualReference(source));
}
/**
 * A question may be delivered when validation returns "deliverable" or
 * "degraded" (a usable fallback exists). Quarantined and needs-review
 * questions never enter the live pool. See `validateQuestion` below.
 */
export function isQuestionDeliverable(question: Question): boolean {
  const status = validateQuestion(question).delivery_status;
  return status === "deliverable" || status === "degraded";
}

/* ------------------------------------------------------------------ *
 * Visual requirement derivation + question validation / quarantine
 * ------------------------------------------------------------------ */

export type VisualRequirement = "none" | "optional" | "required";
export type DeliveryStatus = "deliverable" | "degraded" | "quarantined" | "needs_review";

export interface QuestionMediaRecord {
  media_type?: "image" | "svg" | "table" | "text";
  /** Primary asset URL. */
  src?: string;
  /** Structured source data (table). */
  data?: QuestionTable;
  alt?: string;
  /** Self-contained textual equivalent of the visual. */
  text_equivalent?: string;
  /** Checksum or asset version for cache-busting / integrity. */
  checksum?: string;
}

/** Explicit prose references that unambiguously require a visual. */
const EXPLICIT_VISUAL_RE = new RegExp(
  [
    String.raw`\bin the (?:graph|table|figure|chart|diagram|scatterplot|histogram)\b`,
    String.raw`\b(?:graph|table|figure|chart|diagram)\s+(?:above|below|shown)\b`,
    String.raw`\bas shown\b`,
    String.raw`\bthe graph of\b(?!\s+(?:this|the|the given)\s+equation)`,
    String.raw`\bscatterplot\b`,
    String.raw`\bbar (?:graph|chart)\b`,
    String.raw`\bshown in the\s+(?:graph|table|figure|chart|diagram)\b`,
    String.raw`\bthe (?:following|given) (?:graph|table|figure|chart|diagram)\b`,
  ].join("|"),
  "i"
);

/** Domain hints that suggest — but must never force — a visual. */
const DOMAIN_HINT_RE = /\b(?:data set|dataset|frequency|distribution|quantitative evidence|percent of respondents|survey)\b/i;

/** Raw math serialization tokens that must never survive normalization. */
const RAW_MATH_TOKEN_RE = /\b(?:Superscript|Subscript|Baseline|StartFraction|EndFraction|StartRoot|EndRoot|StartAbsoluteValue)\b/i;

function questionSource(question: Question): string {
  return [question.stimulus, question.text].filter(Boolean).join("\n");
}

/** Derives the visual requirement purely from explicit content references. */
export function deriveVisualRequirement(question: Question): VisualRequirement {
  const source = questionSource(question);
  if (EXPLICIT_VISUAL_RE.test(source)) return "required";
  if (question.figure || question.table || question.media?.data || question.media?.src) return "optional";
  return "none";
}

/** True when only domain-level signals hint at a visual (needs a human decision). */
export function hasDomainOnlyVisualSignal(question: Question): boolean {
  const source = questionSource(question);
  return !EXPLICIT_VISUAL_RE.test(source) && DOMAIN_HINT_RE.test(source);
}

/** A converted script body must be a number or a single variable. */
const SCRIPT_BODY_RE = /[\^_]\(([^)]*)\)/g;
const VALID_SCRIPT_BODY_RE = /^-?(?:\d+(?:\.\d+)?|[A-Za-z]\d?)$/;

/**
 * Math serialization is malformed when speech tokens survive normalization, or
 * when a `Superscript`/`Subscript` marker in the source converted into a
 * nonsensical body (e.g. swallowing prose because the `Baseline` terminator
 * was lost during import).
 */
export function validateMathSerialization(question: Question): string[] {
  const raw = questionSource(question);
  const normalized = normalizeSatText(raw);
  const reasons: string[] = [];
  if (RAW_MATH_TOKEN_RE.test(normalized)) {
    reasons.push("math_serialization_invalid");
    return reasons;
  }
  if (RAW_MATH_TOKEN_RE.test(raw)) {
    for (const [, body] of normalized.matchAll(SCRIPT_BODY_RE)) {
      if (!VALID_SCRIPT_BODY_RE.test(body.trim())) {
        reasons.push("math_serialization_invalid");
        break;
      }
    }
  }
  return reasons;
}

/** A text equivalent only counts if it can actually stand in for the visual. */
export function isUsableTextEquivalent(text: string | undefined): boolean {
  if (!text || text.trim().length < 120) return false;
  return (text.match(/-?\d+(?:\.\d+)?/g) || []).length >= 2;
}

export interface QuestionValidationResult {
  visual_requirement: VisualRequirement;
  delivery_status: DeliveryStatus;
  media_type?: string;
  fallback_used?: "structured" | "text";
  failure_reasons: string[];
}

/**
 * Single source of truth for whether a question may enter the delivery pool.
 * Mirrors the rules stored in `public.question_validation_state`.
 */
export function validateQuestion(question: Question, hasRecoveredTable = false): QuestionValidationResult {
  const failure_reasons: string[] = [...validateMathSerialization(question)];
  const visual_requirement = deriveVisualRequirement(question);

  const media = question.media;
  const figure = question.figure ?? (question.image_url
    ? ({ type: "image", src: question.image_url, alt: question.image_alt || "" } as QuestionFigure)
    : undefined);
  const structured = question.table ?? media?.data;

  const figureOk = isPotentiallyRenderableFigure(figure);
  const mediaUrlOk = typeof media?.src === "string" && /^(https?:|data:image\/)/i.test(media.src);
  const structuredOk = isValidTable(structured) || hasRecoveredTable;
  const textOk = isUsableTextEquivalent(media?.text_equivalent);

  const media_type = figureOk ? figure!.type : mediaUrlOk ? "image" : structuredOk ? "table" : textOk ? "text" : undefined;
  let fallback_used: "structured" | "text" | undefined;

  if (question.visual_unavailable) failure_reasons.push("flagged_visual_unavailable");
  if (figure && !figureOk) failure_reasons.push("asset_invalid");
  if (question.table && !isValidTable(question.table)) failure_reasons.push("structured_data_invalid");
  if (hadRawVisualMarkup(questionSource(question))) failure_reasons.push("raw_markup_in_text");

  if (visual_requirement === "required") {
    const hasPrimary = figureOk || mediaUrlOk;
    if (!hasPrimary && !structuredOk && !textOk) {
      failure_reasons.push(figure || media ? "asset_unreachable_no_fallback" : "required_visual_missing_media");
    } else if (!hasPrimary) {
      fallback_used = structuredOk ? "structured" : "text";
    }
  }

  let delivery_status: DeliveryStatus = "deliverable";
  if (failure_reasons.length > 0) delivery_status = "quarantined";
  else if (fallback_used) delivery_status = "degraded";
  else if (visual_requirement === "none" && hasDomainOnlyVisualSignal(question) && !structuredOk && !figureOk) {
    delivery_status = "needs_review";
  }

  return { visual_requirement, delivery_status, media_type, fallback_used, failure_reasons };
}

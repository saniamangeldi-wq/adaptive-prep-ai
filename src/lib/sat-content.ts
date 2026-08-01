import type { Question, QuestionFigure, QuestionTable } from "@/lib/test-generator";

const RAW_MARKUP_RE = /<\/?(?:svg|style|script|foreignObject)\b|\*\s*\{[^}]*\}|\b(?:stroke-linecap|stroke-linejoin|viewBox)\s*:/i;
const VISUAL_REFERENCE_RE = /\b(?:the|this|shown|given|following)\s+(?:graph|chart|figure|diagram|table)\b|\bgraph represents\b/i;

/** Converts common PDF/screen-reader math tokens without rewriting prose. */
export function normalizeMathTokens(input: string): string {
  if (!input) return "";
  return input
    .replace(/\bleft parenthesis\b/gi, "(")
    .replace(/\bright parenthesis\b/gi, ")")
    .replace(/\bleft bracket\b/gi, "[")
    .replace(/\bright bracket\b/gi, "]")
    .replace(/\bequals(?: sign)?\b/gi, "=")
    .replace(/\bplus(?: sign)?\b/gi, "+")
    .replace(/\bminus(?: sign)?\b/gi, "−")
    .replace(/\btimes(?: sign)?\b/gi, "×")
    .replace(/\bgreater than or equal to\b/gi, "≥")
    .replace(/\bless than or equal to\b/gi, "≤")
    .replace(/\bnot equal to\b/gi, "≠")
    .replace(/\b([A-Za-z])\s+\(/g, "$1(")
    .replace(/[ \t]+([),.;:?])/g, "$1")
    .replace(/([([])[ \t]+/g, "$1")
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

export function shouldShowVisualFallback(question: Question, promptText: string): boolean {
  if (question.visual_unavailable) return true;
  if (question.figure && !isPotentiallyRenderableFigure(question.figure)) return true;
  if (question.table && !isValidTable(question.table)) return true;
  const source = [question.stimulus, question.text, promptText].filter(Boolean).join("\n");
  return hadRawVisualMarkup(source) || (!question.figure && !question.table && hasVisualReference(source));
}
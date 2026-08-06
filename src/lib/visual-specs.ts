import type { Question, QuestionTable } from "@/lib/test-generator";

/**
 * Structured table spec that can be consumed by deterministic renderers now
 * and AI visual regeneration later.
 */
export interface TableSpec {
  kind: "table";
  headers: string[];
  rows: string[][];
}

/**
 * Structured graph/relationship spec derived from textual line equations.
 */
export interface GraphSpec {
  kind: "graph";
  relationship: "linear";
  xVariable: string;
  yVariable: string;
  equation: string;
  slope: number;
  intercept: number;
}

export interface VisualSpecValidationResult {
  valid: boolean;
  errors: string[];
}

function parseNumericCell(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const normalized = value
    .replace(/[$,%]/g, "")
    .replace(/,/g, "")
    .trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function createTableSpec(table: QuestionTable | undefined): TableSpec | undefined {
  if (!table) return undefined;
  return {
    kind: "table",
    headers: table.headers.map((h) => String(h ?? "").trim()),
    rows: table.rows.map((row) => row.map((cell) => String(cell ?? "").trim())),
  };
}

export function validateTableSpec(spec: TableSpec | undefined): VisualSpecValidationResult {
  const errors: string[] = [];
  if (!spec) return { valid: false, errors: ["Missing table spec"] };
  if (!Array.isArray(spec.headers) || spec.headers.length < 2 || spec.headers.some((h) => !h)) {
    errors.push("Table headers are required");
  }
  if (!Array.isArray(spec.rows) || spec.rows.length === 0) {
    errors.push("Table rows are required");
  }
  if (spec.rows.some((row) => !Array.isArray(row) || row.length !== spec.headers.length)) {
    errors.push("Inconsistent row/column lengths");
  }

  let numericCells = 0;
  for (const row of spec.rows) {
    for (const cell of row) {
      if (parseNumericCell(cell) !== undefined) numericCells++;
    }
  }
  if (numericCells === 0) errors.push("Table spec must include numeric values");

  for (const row of spec.rows) {
    const label = row[0]?.toLowerCase?.() ?? "";
    if (!/\btotal\b/.test(label) || row.length < 3) continue;
    const expected = parseNumericCell(row[row.length - 1]);
    const parts = row.slice(1, -1).map(parseNumericCell);
    if (expected === undefined || parts.some((v) => v === undefined)) continue;
    const sum = parts.reduce((acc, n) => acc + (n as number), 0);
    if (Math.abs(sum - expected) > 1e-6) {
      errors.push("Total row does not match numeric sum");
      break;
    }
  }

  return { valid: errors.length === 0, errors };
}

function parseLinearEquation(source: string): Omit<GraphSpec, "kind" | "relationship"> | undefined {
  if (!source) return undefined;
  const compact = source.replace(/\s+/g, "").replace(/−/g, "-");

  const fxMatch = compact.match(/^([a-zA-Z])\(([a-zA-Z])\)=([+-]?\d*\.?\d*)([a-zA-Z])([+-]\d*\.?\d+)$/);
  if (fxMatch) {
    const yVariable = fxMatch[1];
    const xVariable = fxMatch[2];
    const slopeToken = fxMatch[3];
    const xTermVariable = fxMatch[4];
    const interceptToken = fxMatch[5];
    if (xVariable !== xTermVariable) return undefined;
    const slope = slopeToken === "" || slopeToken === "+" ? 1 : slopeToken === "-" ? -1 : Number(slopeToken);
    const intercept = Number(interceptToken);
    if (!Number.isFinite(slope) || !Number.isFinite(intercept)) return undefined;
    return { xVariable, yVariable, equation: `${yVariable}(${xVariable}) = ${slope}${xVariable} ${intercept >= 0 ? "+" : "−"} ${Math.abs(intercept)}`, slope, intercept };
  }

  const yxMatch = compact.match(/^([a-zA-Z])=([+-]?\d*\.?\d*)([a-zA-Z])([+-]\d*\.?\d+)$/);
  if (!yxMatch) return undefined;
  const yVariable = yxMatch[1];
  const slopeToken = yxMatch[2];
  const xVariable = yxMatch[3];
  const interceptToken = yxMatch[4];
  const slope = slopeToken === "" || slopeToken === "+" ? 1 : slopeToken === "-" ? -1 : Number(slopeToken);
  const intercept = Number(interceptToken);
  if (!Number.isFinite(slope) || !Number.isFinite(intercept)) return undefined;
  return { xVariable, yVariable, equation: `${yVariable} = ${slope}${xVariable} ${intercept >= 0 ? "+" : "−"} ${Math.abs(intercept)}`, slope, intercept };
}

export function createGraphSpec(question: Question, promptText?: string): GraphSpec | undefined {
  const candidates = [promptText, question.text, question.stimulus]
    .filter((x): x is string => Boolean(x))
    .map((text) => text.replace(/\$|\\\(|\\\)|\\\[|\\\]/g, " "));

  for (const candidate of candidates) {
    const equalities = candidate.match(/[a-zA-Z]\s*(?:\(\s*[a-zA-Z]\s*\))?\s*=\s*[^\n.;:!?]+/g) || [];
    for (const eq of equalities) {
      const parsed = parseLinearEquation(eq);
      if (parsed) {
        return { kind: "graph", relationship: "linear", ...parsed };
      }
    }
  }
  return undefined;
}

export function validateGraphSpec(spec: GraphSpec | undefined): VisualSpecValidationResult {
  const errors: string[] = [];
  if (!spec) return { valid: false, errors: ["Missing graph spec"] };
  if (!spec.equation || !spec.xVariable || !spec.yVariable) {
    errors.push("Graph fields are required");
  }
  if (!Number.isFinite(spec.slope) || !Number.isFinite(spec.intercept)) {
    errors.push("Slope and intercept must be numeric");
  }
  return { valid: errors.length === 0, errors };
}

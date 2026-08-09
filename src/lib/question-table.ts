import type { Question, QuestionTable } from "@/lib/test-generator";
import { extractEmbeddedChartTable, isValidTable, normalizeSatText } from "@/lib/sat-content";
import { extractConcatenatedTableBlock } from "@/lib/rw-structure";

const MAX_CELL_LEN = 60;

function isCellLike(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > MAX_CELL_LEN) return false;
  // Sentences / prose are not table cells
  if (/[.?!]$/.test(t)) return false;
  if (t.split(/\s+/).length > 8) return false;
  return true;
}

function splitCells(block: string): string[] {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  // Support single-line rows delimited by pipes or tabs
  if (lines.length === 1) {
    const single = lines[0];
    if (single.includes("|")) {
      return single.split("|").map((c) => c.trim()).filter((c) => c.length > 0);
    }
    if (single.includes("\t")) {
      return single.split("\t").map((c) => c.trim()).filter((c) => c.length > 0);
    }
  }
  return lines;
}

export interface ParsedQuestionText {
  /** Structured table extracted from the top of the question text, if any. */
  table?: QuestionTable;
  /** The question text with the flattened table removed. */
  text: string;
}

/**
 * Many imported SAT questions store their data table flattened into the
 * question text (header cells on their own lines, then blank-line separated
 * rows) before the actual prompt. This recovers that structure so it can be
 * rendered as a real table. Question wording is left untouched.
 */
export function parseFlattenedTable(rawText: string): ParsedQuestionText {
  const text = normalizeSatText(rawText || "");
  const blocks = text.split(/\n\s*\n/);
  if (blocks.length < 2) return { text };

  const headerCells = splitCells(blocks[0]);
  if (headerCells.length < 2 || !headerCells.every(isCellLike)) return { text };

  const rows: string[][] = [];
  let i = 1;
  for (; i < blocks.length; i++) {
    const cells = splitCells(blocks[i]);
    if (cells.length !== headerCells.length || !cells.every(isCellLike)) break;
    rows.push(cells);
  }

  if (rows.length === 0) return { text };

  const rest = blocks.slice(i).join("\n\n").trim();
  if (!rest) return { text };

  return {
    table: { headers: headerCells, rows },
    text: rest,
  };
}

/**
 * Resolves the table + prompt text for a question, preferring explicit
 * structured table data when present.
 */
export function resolveQuestionParts(question: Question): {
  table?: QuestionTable;
  /** A flattened data block was found but could not be turned into a table. */
  dataBlockUnrecoverable?: boolean;
  text: string;
} {
  if (isValidTable(question.table)) return { table: question.table, text: normalizeSatText(question.text) };

  const extracted = extractEmbeddedChartTable(question.text);
  if (extracted.table) return extracted;

  const concatenated = extractConcatenatedTableBlock(question.text);
  if (concatenated.table || concatenated.dataBlockUnrecoverable) return concatenated;

  return parseFlattenedTable(question.text);
}

// Word and paragraph counting for the live counter. Uses the same code as the
// server, so the number the student sees while writing matches the report.
import { countWords as sharedCountWords, splitParagraphs } from "@ielts/text.ts";

export function countWords(text: string): number {
  return sharedCountWords(text);
}

export function countParagraphs(text: string): number {
  if (typeof text !== "string" || !text.trim()) return 0;
  return splitParagraphs(text).length;
}

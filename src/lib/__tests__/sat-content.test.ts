import { describe, expect, it } from "vitest";
import { normalizeSatText, isValidTable, shouldShowVisualFallback } from "@/lib/sat-content";
import type { Question } from "@/lib/test-generator";

const baseQuestion: Question = {
  id: "q1", type: "multiple_choice", section: "math", difficulty: "normal", topic: "algebra",
  text: "What is x?", options: ["1", "2", "3", "4"], correct_answer: "A", explanation: "",
};

describe("SAT content normalization", () => {
  it("converts verbalized math tokens to readable notation", () => {
    expect(normalizeSatText("f left parenthesis x right parenthesis equals 2x plus 244"))
      .toBe("f(x) = 2x + 244");
  });

  it("removes leaked SVG and CSS markup", () => {
    expect(normalizeSatText("*{stroke-linecap:butt;stroke-linejoin:round;}\n\nQuestion text"))
      .toBe("Question text");
    expect(normalizeSatText("<svg><script>alert(1)</script><path d='M0 0'/></svg>\nWhat is x?"))
      .toBe("What is x?");
  });

  it("validates rectangular structured tables", () => {
    expect(isValidTable({ headers: ["x", "y"], rows: [["1", "2"]] })).toBe(true);
    expect(isValidTable({ headers: ["x", "y"], rows: [["1"]] })).toBe(false);
  });

  it("requests a fallback for referenced or malformed visuals", () => {
    expect(shouldShowVisualFallback({ ...baseQuestion, text: "The graph represents cost." }, "The graph represents cost.")).toBe(true);
    expect(shouldShowVisualFallback({ ...baseQuestion, figure: { type: "svg", svg: "broken", alt: "Graph" } }, baseQuestion.text)).toBe(true);
  });
});
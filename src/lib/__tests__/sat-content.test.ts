import { describe, expect, it } from "vitest";
import { normalizeSatText, isValidTable, shouldShowVisualFallback, isQuestionDeliverable } from "@/lib/sat-content";
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

  it("does not show fallback for algebraic graph descriptions without an embedded image", () => {
    const algebraicText =
      "The graph of this equation in the xy-plane is a line. What is the best interpretation of the x-intercept in this context?";
    expect(shouldShowVisualFallback({ ...baseQuestion, text: algebraicText }, algebraicText)).toBe(false);
  });
});
describe("MathML-speech token normalization", () => {
  it("converts Superscript/Baseline exponents", () => {
    expect(normalizeSatText("x Superscript negative 2 Baseline equals 4")).toBe("x^(-2) = 4");
  });

  it("converts Subscript/Baseline indices", () => {
    expect(normalizeSatText("a Subscript n Baseline")).toBe("a_(n)");
  });

  it("converts standalone negative numbers", () => {
    expect(normalizeSatText("the value is negative 7")).toBe("the value is -7");
  });
});

describe("question deliverability", () => {
  it("rejects questions referencing a missing visual", () => {
    expect(isQuestionDeliverable({ ...baseQuestion, text: "In the table above, Melissa recorded the price." })).toBe(false);
  });

  it("accepts questions with a valid table", () => {
    expect(isQuestionDeliverable({ ...baseQuestion, text: "In the table above.", table: { headers: ["x", "y"], rows: [["1", "2"]] } })).toBe(true);
  });

  it("accepts plain algebra questions", () => {
    expect(isQuestionDeliverable(baseQuestion)).toBe(true);
  });
});

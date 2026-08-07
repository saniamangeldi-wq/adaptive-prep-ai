import { describe, expect, it } from "vitest";
import { normalizeSatText, isValidTable, shouldShowVisualFallback, isQuestionDeliverable, validateQuestion } from "@/lib/sat-content";
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

describe("visual requirement + quarantine validation", () => {
  const required = { ...baseQuestion, text: "In the graph above, what is the value of y?" };

  it("A. required visual with null media is quarantined", () => {
    const r = validateQuestion(required);
    expect(r.visual_requirement).toBe("required");
    expect(r.delivery_status).toBe("quarantined");
    expect(r.failure_reasons).toContain("required_visual_missing_media");
    expect(isQuestionDeliverable(required)).toBe(false);
  });

  it("B. required visual with broken URL but valid structured data is degraded", () => {
    const q: Question = {
      ...required,
      media: { media_type: "image", src: "not-a-url", data: { headers: ["x", "y"], rows: [["1", "2"]] } },
    };
    const r = validateQuestion(q);
    expect(r.delivery_status).toBe("degraded");
    expect(r.fallback_used).toBe("structured");
    expect(isQuestionDeliverable(q)).toBe(true);
  });

  it("C. required visual with broken URL and no fallback is quarantined", () => {
    const q: Question = { ...required, media: { media_type: "image", src: "not-a-url" } };
    const r = validateQuestion(q);
    expect(r.delivery_status).toBe("quarantined");
    expect(r.failure_reasons).toContain("asset_unreachable_no_fallback");
  });

  it("D. optional visual with no renderable media is deliverable", () => {
    const q: Question = { ...baseQuestion, media: { media_type: "table", data: { headers: ["x", "y"], rows: [["1", "2"]] } } };
    const r = validateQuestion(q);
    expect(r.visual_requirement).toBe("optional");
    expect(r.delivery_status).toBe("deliverable");
  });

  it("E. no visual required is deliverable", () => {
    const r = validateQuestion(baseQuestion);
    expect(r.visual_requirement).toBe("none");
    expect(r.delivery_status).toBe("deliverable");
  });

  it("F. surviving Superscript/Baseline math tokens quarantine the question", () => {
    const q: Question = { ...baseQuestion, text: "Solve x Superscript for the value." };
    const r = validateQuestion(q);
    expect(r.failure_reasons).toContain("math_serialization_invalid");
    expect(r.delivery_status).toBe("quarantined");
  });

  it("domain-only signals are flagged for review, never forced to required", () => {
    const q: Question = { ...baseQuestion, text: "The data set of survey responses has a frequency of 12 and 18." };
    const r = validateQuestion(q);
    expect(r.visual_requirement).toBe("none");
    expect(r.delivery_status).toBe("needs_review");
    expect(isQuestionDeliverable(q)).toBe(false);
  });
});

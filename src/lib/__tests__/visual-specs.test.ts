import { describe, expect, it } from "vitest";
import type { Question } from "@/lib/test-generator";
import { createGraphSpec, createTableSpec, validateGraphSpec, validateTableSpec } from "@/lib/visual-specs";

const baseQuestion: Question = {
  id: "q1",
  type: "multiple_choice",
  section: "math",
  difficulty: "normal",
  topic: "algebra",
  text: "What is x?",
  options: ["1", "2", "3", "4"],
  correct_answer: "A",
  explanation: "",
};

describe("visual specs", () => {
  it("builds and validates a distribution table spec", () => {
    const spec = createTableSpec({
      headers: ["Color", "Count", "Percent"],
      rows: [["Blue", "3", "30"], ["Green", "7", "70"], ["Total", "10", "100"]],
    });
    const result = validateTableSpec(spec);
    expect(spec?.kind).toBe("table");
    expect(result.valid).toBe(true);
  });

  it("rejects inconsistent total rows", () => {
    const spec = createTableSpec({
      headers: ["Color", "Count", "Percent"],
      rows: [["Blue", "3", "30"], ["Green", "7", "70"], ["Total", "11", "100"]],
    });
    const result = validateTableSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Total row does not match numeric sum");
  });

  it("builds and validates a linear function graph spec", () => {
    const spec = createGraphSpec({
      ...baseQuestion,
      text: "For the line given by \\( f(x) = 2x + 3 \\), what is the y-intercept?",
    });
    const result = validateGraphSpec(spec);
    expect(result.valid).toBe(true);
    expect(spec?.slope).toBe(2);
    expect(spec?.intercept).toBe(3);
  });

  it("returns no graph spec when no equation exists", () => {
    const spec = createGraphSpec({
      ...baseQuestion,
      text: "The graph is shown in the figure.",
    });
    expect(spec).toBeUndefined();
  });
});

import { describe, it, expect } from "vitest";
import { normalizeSatText } from "@/lib/sat-content";
import { wrapMathRuns } from "@/components/MathRenderer";

const n = (s: string) => wrapMathRuns(normalizeSatText(s));

describe("latex", () => {
  it("superscript", () => {
    expect(normalizeSatText("x Superscript negative 2 Baseline")).toBe("x^{-2}");
  });
  it("wraps runs", () => {
    console.log(n("The function f(x) = 33 (0.4)^{x} + 3 where x greater than or equals 0."));
    console.log(n("(x − 1)^{2} = -4 How many distinct real solutions does the given equation have?"));
    console.log(n("Circle A has the equation (x + 5)^{2} + (y − 5)^{2} = 4. What is k?"));
    expect(n("y = 200 (4)^{x}")).toContain("$");
  });
});

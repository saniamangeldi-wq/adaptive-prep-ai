import { describe, it, expect } from "vitest";
import { normalizeSatText } from "@/lib/sat-content";
import { wrapMathRuns } from "@/components/MathRenderer";

const render = (s: string) => wrapMathRuns(normalizeSatText(s));

describe("speech-math normalization", () => {
  it("converts Superscript/Baseline into LaTeX braces", () => {
    expect(normalizeSatText("x Superscript negative 2 Baseline")).toBe("x^{-2}");
  });

  it("keeps comparison phrases intact", () => {
    expect(normalizeSatText("x greater than or equals 0")).toContain("≥");
    expect(normalizeSatText("x greater than or = 0")).toContain("≥");
    expect(normalizeSatText("x greater than or equals 0")).not.toContain("or =");
  });
});

describe("wrapMathRuns", () => {
  it("wraps exponential expressions embedded in prose", () => {
    const out = render("The function f(x) = 33 (0.4)^{x} + 3 models the value.");
    expect(out).toContain("$f(x) = 33 (0.4)^{x} + 3$");
    expect(out).toContain("models the value.");
  });

  it("wraps circle equations without swallowing the trailing sentence", () => {
    const out = render("(x - 1)^{2} = -4 How many solutions?");
    expect(out.startsWith("$(x - 1)^{2} = -4$")).toBe(true);
    expect(out).toContain("How many solutions?");
  });

  it("leaves plain prose untouched", () => {
    const text = "Which choice best states the main idea of the passage?";
    expect(render(text)).toBe(text);
  });

  it("does not double-wrap text that already has delimiters", () => {
    const text = "The value is $x^{2}$ today.";
    expect(wrapMathRuns(text)).toBe(text);
  });
});

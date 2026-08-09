import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MathRenderer } from "@/components/MathRenderer";
import { QuestionMedia } from "@/components/test/QuestionMedia";
import { VISUAL_COPY } from "@/lib/visual-status";
import type { Question } from "@/lib/test-generator";

const base: Question = {
  id: "m-1", type: "multiple_choice", section: "math", difficulty: "normal", topic: "algebra",
  text: "", options: ["A", "B", "C", "D"], correct_answer: "A", explanation: "",
};

describe("math rendering across sections", () => {
  it("renders (x - 1)^2 = 4 as typeset math, not raw tokens", () => {
    const { container } = render(<MathRenderer text="(x - 1)^{2} = 4" />);
    expect(container.querySelector(".katex")).toBeTruthy();
    expect(container.textContent).not.toContain("^{");
  });

  it("renders a StartFraction/EndFraction expression without leaking tokens", () => {
    const { container } = render(
      <MathRenderer text="StartFraction x plus 1 Over 2 EndFraction = 5" />
    );
    expect(container.textContent).not.toMatch(/StartFraction|EndFraction/);
    expect(container.querySelector(".katex")).toBeTruthy();
  });

  it("shows a readable fallback when legacy tokens cannot be normalized", () => {
    render(<MathRenderer as="div" text="Solve x Superscript for the value." />);
    expect(screen.getByText(VISUAL_COPY.mathFallback)).toBeInTheDocument();
  });
});

describe("unrecoverable required visual", () => {
  it("blocks the item instead of showing concatenated raw data", () => {
    render(
      <QuestionMedia
        question={{ ...base, section: "reading_writing", text: "Based on the graph above, what is the value of y?" }}
      />
    );
    expect(screen.getByText(VISUAL_COPY.broken)).toBeInTheDocument();
    expect(screen.queryByText("Visual OK")).not.toBeInTheDocument();
  });
});

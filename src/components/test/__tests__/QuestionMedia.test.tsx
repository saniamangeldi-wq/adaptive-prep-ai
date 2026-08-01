import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuestionMedia } from "@/components/test/QuestionMedia";
import type { Question } from "@/lib/test-generator";

const question: Question = {
  id: "q1", type: "multiple_choice", section: "math", difficulty: "normal", topic: "data",
  text: "What does the graph show?", options: ["A", "B", "C", "D"], correct_answer: "A", explanation: "",
};

describe("QuestionMedia", () => {
  it("renders a structured table", () => {
    render(<QuestionMedia question={{ ...question, table: { headers: ["Year", "Value"], rows: [["2020", "10"]] } }} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("2020")).toBeInTheDocument();
  });

  it("renders a sanitized SVG without scripts", () => {
    const { container } = render(<QuestionMedia question={{ ...question, figure: { type: "svg", alt: "Line graph", svg: "<svg><script>alert(1)</script><line x1='0' y1='0' x2='10' y2='10'/></svg>" } }} />);
    expect(screen.getByRole("img", { name: "Line graph" })).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("line")).not.toBeNull();
  });

  it("shows a fallback for a malformed visual", () => {
    render(<QuestionMedia question={{ ...question, figure: { type: "svg", alt: "Graph", svg: "<svg></svg>" } }} />);
    expect(screen.getByText("Source visual unavailable")).toBeInTheDocument();
  });
});
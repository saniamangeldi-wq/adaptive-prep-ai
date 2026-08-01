import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuestionMedia, sanitizeSvg } from "@/components/test/QuestionMedia";
import type { Question } from "@/lib/test-generator";

const question: Question = {
  id: "q1", type: "multiple_choice", section: "math", difficulty: "normal", topic: "data",
  text: "What does the graph show?", options: ["A", "B", "C", "D"], correct_answer: "A", explanation: "",
};

describe("QuestionMedia", () => {
  it("renders a structured table", () => {
    const view = render(<QuestionMedia question={{ ...question, table: { headers: ["Year", "Value"], rows: [["2020", "10"]] } }} />);
    expect(view.getByRole("table")).toBeInTheDocument();
    expect(view.getByText("2020")).toBeInTheDocument();
  });

  it("sanitizes unsafe SVG markup", () => {
    const raw = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><script>alert(1)</script><rect width='10' height='10'/></svg>";
    const safe = sanitizeSvg(raw);
    expect(safe).not.toContain("<script");
  });

  it("renders a valid image figure", () => {
    const view = render(<QuestionMedia question={{ ...question, figure: { type: "image", alt: "Line graph", src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" } }} />);
    expect(view.getByLabelText("Line graph")).toBeInTheDocument();
  });

  it("shows a fallback for a malformed visual", () => {
    const view = render(<QuestionMedia question={{ ...question, figure: { type: "svg", alt: "Graph", svg: "<svg></svg>" } }} />);
    expect(view.getByText("Source visual unavailable")).toBeInTheDocument();
  });
});
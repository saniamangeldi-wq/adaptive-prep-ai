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

  it("renders recovered tile-distribution data instead of fallback", () => {
    const view = render(
      <QuestionMedia
        question={{
          ...question,
          text: "Type\nPercent\n\nBlue\n30\n\nGreen\n70\n\nThe table shows the distribution of tiles in a bag.",
        }}
      />
    );
    expect(view.getByRole("table")).toBeInTheDocument();
    expect(view.queryByText("Source visual unavailable")).not.toBeInTheDocument();
  });

  it("renders a valid table spec even when the prompt references a graph", () => {
    const view = render(
      <QuestionMedia
        question={{
          ...question,
          text: "The graph shows plumber charges based on hours worked.",
          table_spec: {
            kind: "table",
            headers: ["Hours", "Charge"],
            rows: [["1", "75"], ["2", "125"]],
          },
        }}
      />
    );
    expect(view.getByRole("table")).toBeInTheDocument();
    expect(view.queryByText("Source visual unavailable")).not.toBeInTheDocument();
  });

  it("renders linear function summary for f(x)=2x+3 without fallback", () => {
    const view = render(
      <QuestionMedia
        question={{
          ...question,
          text: "The graph of \\( f(x) = 2x + 3 \\) is shown. Which statement is true?",
        }}
      />
    );
    expect(view.getByText("Structured relationship")).toBeInTheDocument();
    expect(view.getByText("Slope: 2")).toBeInTheDocument();
    expect(view.queryByText("Source visual unavailable")).not.toBeInTheDocument();
  });

  it("sanitizes unsafe SVG markup", () => {
    const raw = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><script>alert(1)</script><rect width='10' height='10'/></svg>";
    const safe = sanitizeSvg(raw);
    expect(safe).not.toContain("<script");
  });

  it("renders a valid image figure", () => {
    const view = render(<QuestionMedia question={{ ...question, figure: { type: "image", alt: "Line graph", src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" } }} />);
    expect(view.getByAltText("Line graph")).toBeInTheDocument();
  });

  it("shows a fallback for a malformed visual", () => {
    const view = render(<QuestionMedia question={{ ...question, figure: { type: "svg", alt: "Graph", svg: "<svg></svg>" } }} />);
    expect(view.getByText("Source visual unavailable")).toBeInTheDocument();
  });
});
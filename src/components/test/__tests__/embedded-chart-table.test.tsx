import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuestionMedia } from "@/components/test/QuestionMedia";
import { resolveQuestionParts } from "@/lib/question-table";
import type { Question } from "@/lib/test-generator";

const chartDumpText = `Voters' political orientation (1 = strong liberal, 7 = strong conservative)

low information

high information

Percentage supporting policy

1:

low information: 78%
high information: 92%

2:

low information: 71%
high information: 85%

3:

low information: 65%
high information: 74%

4:

low information: 58%
high information: 60%

5:

low information: 52%
high information: 44%

6:

low information: 47%
high information: 31%

7:

low information: 41%
high information: 18%

Researchers surveyed voters about a proposed policy, comparing how strongly informed and less informed respondents supported it across the political spectrum.

Which choice best describes data in the graph that support the researchers' conclusion?`;

const question: Question = {
  id: "q-chart",
  type: "multiple_choice",
  section: "reading_writing",
  difficulty: "normal",
  topic: "data analysis",
  text: chartDumpText,
  options: ["A", "B", "C", "D"],
  correct_answer: "A",
  explanation: "",
};

describe("embedded chart table recovery", () => {
  it("extracts a table with the expected headers and rows", () => {
    const { table, text } = resolveQuestionParts(question);
    expect(table).toBeDefined();
    expect(table!.headers).toEqual(["Category", "low information", "high information"]);
    expect(table!.rows).toHaveLength(7);
    expect(table!.rows[0]).toEqual(["1", "78%", "92%"]);
    expect(text).toContain("Which choice");
    expect(text).not.toContain("Voters' political orientation (1 = strong");
  });

  it("renders a table and no fallback box", () => {
    const view = render(<QuestionMedia question={question} />);
    expect(view.getByRole("table")).toBeInTheDocument();
    expect(view.queryByText("Source visual unavailable")).not.toBeInTheDocument();
    expect(view.container.textContent).not.toContain("Voters' political orientation (1 = strong");
  });
});

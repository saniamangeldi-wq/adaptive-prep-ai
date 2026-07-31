import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuestionMedia } from "@/components/test/QuestionMedia";
import { QuestionCard } from "@/components/test/QuestionCard";
import { SATQuestionCard } from "@/components/test/sat/SATQuestionCard";
import type { Question } from "@/lib/test-generator";

const fixture: Question = {
  id: "visual-1",
  type: "multiple_choice",
  section: "math",
  difficulty: "normal",
  topic: "Problem Solving & Data Analysis",
  text: "Which value is supported by the figure?",
  options: ["1", "2", "3", "4"],
  correct_answer: "2",
  explanation: "Fixture explanation",
  stimulus: "Use table and figure.",
  table: { headers: ["x", "y"], rows: [["1", "2"]], caption: "Fixture table" },
  figure: { type: "svg", svg: '<svg aria-label="graph"><line x1="0" y1="0" x2="10" y2="10" /></svg>', alt: "Fixture graph" },
};

describe("SAT visual question renderers", () => {
  it.each([
    ["QuestionMedia", (question: Question) => <QuestionMedia question={question} />],
    ["QuestionCard", (question: Question) => <QuestionCard question={question} questionNumber={1} totalQuestions={1} selectedAnswer={undefined} onAnswerChange={() => {}} isFlagged={false} onToggleFlag={() => {}} />],
    ["SATQuestionCard", (question: Question) => <SATQuestionCard question={question} selectedAnswer={undefined} onAnswerChange={() => {}} />],
  ])("renders table and SVG in %s", (_name, view) => {
    render(view(fixture));
    expect(screen.getByText("Fixture table")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Fixture graph" })).toBeInTheDocument();
  });

  it("shows visible unavailable state for malformed or absent visual asset", () => {
    render(<QuestionMedia question={{ ...fixture, figure: { type: "image", alt: "Missing diagram" } }} />);
    expect(screen.getByText(/visual unavailable|image unavailable|missing visual/i)).toBeInTheDocument();
  });
});

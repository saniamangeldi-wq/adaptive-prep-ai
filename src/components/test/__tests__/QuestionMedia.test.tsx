import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuestionMedia, sanitizeSvg } from "@/components/test/QuestionMedia";
import { VISUAL_COPY, scanPracticeSet } from "@/lib/visual-status";
import type { Question } from "@/lib/test-generator";

const question: Question = {
  id: "q1", type: "multiple_choice", section: "math", difficulty: "normal", topic: "data",
  text: "What does the graph above show?", options: ["A", "B", "C", "D"], correct_answer: "A", explanation: "",
};

const plainQuestion: Question = { ...question, id: "q-plain", text: "If 2x + 4 = 10, what is x?" };

const VALID_TABLE = { headers: ["Year", "Value"], rows: [["2020", "10"]] };

/** Controls whether the probed image "loads". */
let imageOutcome: "load" | "error" | "pending" = "load";

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 100;
  set src(_value: string) {
    queueMicrotask(() => {
      if (imageOutcome === "load") this.onload?.();
      else if (imageOutcome === "error") this.onerror?.();
    });
  }
}

beforeEach(() => {
  imageOutcome = "load";
  vi.stubGlobal("Image", MockImage);
});
afterEach(() => vi.unstubAllGlobals());

const IMG = "https://cdn.example.com/graph.png";

describe("VisualRenderer states", () => {
  it("shows the checking state before the asset resolves", () => {
    imageOutcome = "pending";
    render(<QuestionMedia question={{ ...question, figure: { type: "image", alt: "Graph", src: IMG } }} />);
    expect(screen.getByText(VISUAL_COPY.checking)).toBeInTheDocument();
    expect(screen.queryByText("Visual OK")).not.toBeInTheDocument();
  });

  it("renders a valid graph once it genuinely loads", async () => {
    render(<QuestionMedia question={{ ...question, figure: { type: "image", alt: "Line graph", src: IMG } }} />);
    expect(await screen.findByAltText("Line graph")).toBeInTheDocument();
    expect(screen.getByText("Visual OK")).toBeInTheDocument();
  });

  it("falls back to structured data when the graph URL is broken", async () => {
    imageOutcome = "error";
    render(<QuestionMedia question={{ ...question, figure: { type: "image", alt: "Graph", src: IMG }, table: VALID_TABLE }} />);
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    expect(screen.getByText(VISUAL_COPY.structuredFallback)).toBeInTheDocument();
    expect(screen.queryByAltText("Graph")).not.toBeInTheDocument();
  });

  it("blocks the item when a required visual has no usable representation", async () => {
    imageOutcome = "error";
    render(<QuestionMedia question={{ ...question, figure: { type: "image", alt: "Graph", src: IMG } }} />);
    expect(await screen.findByText(VISUAL_COPY.broken)).toBeInTheDocument();
    expect(screen.queryByText("Source visual unavailable")).not.toBeInTheDocument();
  });

  it("renders nothing for a normal text-only question", () => {
    const { container } = render(<QuestionMedia question={plainQuestion} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a structured table when it is the only representation", () => {
    render(<QuestionMedia question={{ ...question, table: VALID_TABLE }} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("2020")).toBeInTheDocument();
  });

  it("renders a table recovered from question text even when no visual is formally required", () => {
    const flattened: Question = {
      ...question,
      id: "opensat-math-mcq-96",
      text:
        "Time (years)\nTotal amount (dollars)\n\n0\n604.00\n\n1\n606.42\n\n2\n608.84\n\n" +
        "Rosa opened a savings account at a bank. The table shows the exponential relationship " +
        "between the time t, in years, since Rosa opened the account and the total amount n, in dollars, in the account.",
    };
    render(<QuestionMedia question={flattened} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("606.42")).toBeInTheDocument();
  });

  it("sanitizes unsafe SVG markup", () => {
    const raw = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><script>alert(1)</script><rect width='10' height='10'/></svg>";
    expect(sanitizeSvg(raw)).not.toContain("<script");
  });
});

describe("practice set scan", () => {
  it("classifies requirement and health counts", () => {
    const scan = scanPracticeSet([
      plainQuestion,
      { ...question, id: "q-broken" },
      { ...question, id: "q-table", table: VALID_TABLE },
    ]);
    expect(scan.total).toBe(3);
    expect(scan.visual_required).toBe(2);
    expect(scan.no_visual_requirement).toBe(1);
    expect(scan.broken).toBe(1);
    expect(scan.ok + scan.degraded).toBe(2);
  });
});

describe("temporary raw image fallback", () => {
  it("shows the original image when a required visual fails to render", async () => {
    imageOutcome = "error";
    render(<QuestionMedia question={{ ...question, figure: { type: "image", alt: "Graph", src: IMG } }} />);
    const img = await screen.findByAltText("Graph");
    expect(img).toHaveAttribute("src", IMG);
    expect(screen.getByText(VISUAL_COPY.rawFallback)).toBeInTheDocument();
    expect(screen.getByText(VISUAL_COPY.broken)).toBeInTheDocument();
  });

  it("shows a missing-file message when no source image exists", () => {
    render(<QuestionMedia question={question} />);
    expect(screen.getByText(VISUAL_COPY.missingSource)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("leaves a text-only question untouched", () => {
    const { container } = render(<QuestionMedia question={plainQuestion} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("line chart rendering", () => {
  const lineTable = {
    headers: ["Year", "Algeria", "France"],
    rows: [["1970", "39.5", "71.1"], ["1980", "43.5", "73.3"]],
    chart: "line" as const,
    caption: "Urban Population of Algeria and France",
  };

  it("renders a line chart plus the accessible data table", async () => {
    render(<QuestionMedia question={{ ...question, id: "q-line", table: lineTable }} />);
    await waitFor(() => expect(screen.getByText("Urban Population of Algeria and France")).toBeInTheDocument());
    // Accessible table fallback is always rendered underneath the chart.
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Algeria" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "1970" })).toBeInTheDocument();
    expect(screen.queryByText(VISUAL_COPY.broken)).not.toBeInTheDocument();
  });
});

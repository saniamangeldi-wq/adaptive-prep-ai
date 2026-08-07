import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MathRenderer } from "@/components/MathRenderer";
import { VISUAL_COPY } from "@/lib/visual-status";

describe("MathRenderer", () => {
  it("keeps ordinary prose as ordinary text", () => {
    render(<MathRenderer as="div" text="Melissa recorded the price of each item she bought." />);
    expect(screen.getByText(/Melissa recorded the price/)).toBeInTheDocument();
    expect(screen.queryByText(VISUAL_COPY.mathFallback)).not.toBeInTheDocument();
  });

  it("converts verbalized math instead of printing tokens", () => {
    const { container } = render(<MathRenderer as="div" text="f left parenthesis x right parenthesis equals 2 x plus 244" />);
    expect(container.textContent).toContain("f(x)");
    expect(container.textContent).not.toContain("left parenthesis");
  });

  it("never renders raw CSS or SVG markup", () => {
    const { container } = render(<MathRenderer as="div" text={"*{stroke-linecap:butt;stroke-linejoin:round;}\n\nWhat is the value of x?"} />);
    expect(container.textContent).not.toContain("stroke-linecap");
    expect(container.textContent).toContain("What is the value of x?");
  });

  it("shows a readable fallback for unresolvable legacy fragments", () => {
    render(<MathRenderer as="div" text="StartRoot x plus 1" questionId="q1" />);
    expect(screen.getByText(VISUAL_COPY.mathFallback)).toBeInTheDocument();
  });
});

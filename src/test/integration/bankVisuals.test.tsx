/**
 * Every task the server can hand out renders in the web app without throwing,
 * and each visual has a text alternative built from its real data.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { DataVisual, MapVisual, ProcessVisual, TaskVisual } from "@ielts/contract.ts";
import { TASK_BANK } from "@ielts/taskBank.ts";
import { TaskCard } from "@/components/writing/TaskCard";
import { describeDataVisual, describeMapPanel, describeProcess } from "@/lib/ielts/visualText";
import { describeTask } from "@/lib/ielts/labels";
import { allTaskFixtures } from "../fixtures/ielts";

let errors: unknown[][] = [];
beforeEach(() => {
  errors = [];
  vi.spyOn(console, "error").mockImplementation((...args) => void errors.push(args));
  // recharts warns that a chart has no size: happy-dom does no layout.
  vi.spyOn(console, "warn").mockImplementation(() => {});
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function textAlternative(v: TaskVisual): string {
  switch (v.kind) {
    case "process":
      return describeProcess(v as ProcessVisual);
    case "map":
      return (v as MapVisual).panels.map(describeMapPanel).join(" ");
    default:
      return describeDataVisual(v as DataVisual);
  }
}

describe("bank tasks render safely", () => {
  it("the bank is not empty and covers every task type", () => {
    expect(new Set(TASK_BANK.map((t) => t.taskType))).toEqual(new Set(["task1_academic", "task1_general", "task2"]));
  });

  it.each(TASK_BANK.map((t) => [t.id, t] as const))("%s", (_id, task) => {
    for (const v of task.visuals) {
      const alt = textAlternative(v);
      expect(alt.length).toBeGreaterThan(20);
      expect(alt).not.toMatch(/undefined|NaN|\[object Object\]/);
      if (v.kind === "map") for (const p of (v as MapVisual).panels) for (const f of p.features) expect(alt).toContain(f.label);
      if (v.kind === "process") for (const s of (v as ProcessVisual).steps) expect(alt).toContain(s.label);
      if (v.kind !== "map" && v.kind !== "process") for (const s of (v as DataVisual).series) expect(alt).toContain(s);
    }
    const { container, unmount } = render(<TaskCard task={task} />);
    expect(container.textContent).toContain(describeTask(task.taskType, task.variant));
    expect(container.textContent).toContain(task.prompt.slice(0, 40));
    for (const b of task.bullets) expect(container.textContent).toContain(b);
    expect(container.textContent).not.toContain("could not be displayed");
    unmount();
    // React key warnings, prop-type errors and the like show up here.
    const reactErrors = errors.filter((e) => !String(e[0]).includes("width(0) and height(0)"));
    expect(reactErrors).toEqual([]);
  });

  it("the browser-check fixtures render too", () => {
    for (const task of allTaskFixtures) {
      const { container, unmount } = render(<TaskCard task={task} />);
      expect(container.textContent).not.toContain("could not be displayed");
      unmount();
    }
  });

  it("odd visuals degrade to a message instead of throwing", () => {
    const broken = { ...allTaskFixtures[0], visuals: [{ kind: "radar" }, { kind: "line", title: "t", categoryKey: "", series: [], data: null }, null] as never };
    const { container } = render(<TaskCard task={broken} />);
    expect(container.textContent).toContain("could not be displayed");
  });
});

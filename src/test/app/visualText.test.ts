import { describe, it, expect } from "vitest";
import { describeDataVisual, describeMapPanel, describeProcess } from "@/lib/ielts/visualText";
import { dataUrlBytes } from "@/lib/ielts/image";
import { taskCycle, taskLine, taskMap, taskProcess } from "../fixtures/ielts";
import type { DataVisual, MapVisual, ProcessVisual } from "@ielts/contract.ts";

describe("visual text alternatives", () => {
  it("describes a data visual with its values", () => {
    const t = describeDataVisual(taskLine.visuals[0] as DataVisual);
    expect(t).toContain("Line chart");
    expect(t).toContain("2005: Under 25 4.5");
    expect(t).toContain("hours");
  });
  it("describes processes and says when it is a cycle", () => {
    expect(describeProcess(taskProcess.visuals[0] as ProcessVisual)).toContain("Step 3: Crushed into small pieces (called cullet)");
    expect(describeProcess(taskCycle.visuals[0] as ProcessVisual)).toContain("leads back to step 1");
  });
  it("describes map features with a rough position", () => {
    const panel = (taskMap.visuals[0] as MapVisual).panels[1];
    const t = describeMapPanel(panel);
    expect(t).toContain("Today:");
    expect(t).toContain("Car park (parking)");
    expect(t).toMatch(/Park \(green\) at the bottom right/);
  });
  it("does not crash on odd data", () => {
    expect(() => describeDataVisual({} as DataVisual)).not.toThrow();
    expect(() => describeProcess({} as ProcessVisual)).not.toThrow();
    expect(() => describeMapPanel({} as never)).not.toThrow();
    expect(() => describeDataVisual({ kind: "bar", title: "t", categoryKey: "k", series: ["a"], data: [null as never] })).not.toThrow();
  });
});

describe("image helpers", () => {
  it("measures a data URL by its length", () => {
    expect(dataUrlBytes("data:image/jpeg;base64,AAAA")).toBe(27);
    expect(dataUrlBytes(undefined as unknown as string)).toBe(0);
  });
});

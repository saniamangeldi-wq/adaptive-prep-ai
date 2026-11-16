import { describe, expect, it } from "vitest";
import type { MapVisual } from "@ielts/contract.ts";
import { TASK_BANK } from "@ielts/taskBank.ts";
import { fontRange, layoutMapLabels, MAP_FONT_MAX, type PlacedLabel } from "@/lib/ielts/mapLayout";

type Feature = MapVisual["panels"][number]["features"][number];
const f = (id: string, label: string, x: number, y: number, w: number, h: number, type: Feature["type"] = "building"): Feature => ({ id, label, type, x, y, w, h });

const boxOf = (l: Extract<PlacedLabel, { kind: "text" }>) => {
  const tw = Math.max(...l.lines.map((s) => s.length)) * 0.57 * l.fontSize;
  const th = l.lines.length * l.fontSize * 1.15;
  return { x0: l.x - tw / 2, x1: l.x + tw / 2, y0: l.y - th / 2, y1: l.y + th / 2 };
};

describe("layoutMapLabels", () => {
  it("puts a label that fits inside its feature, centred", () => {
    const [l] = layoutMapLabels([f("a", "Forest", 0, 0, 40, 40)], 320);
    expect(l).toMatchObject({ kind: "text", lines: ["Forest"], x: 20, y: 20 });
  });

  it("wraps onto two lines when that is what fits", () => {
    const [l] = layoutMapLabels([f("a", "Fish-processing factory", 60, 10, 30, 35)], 470);
    expect(l.kind === "text" && l.lines).toEqual(["Fish-processing", "factory"]);
  });

  it("gives a numbered badge to a feature too small for a readable label", () => {
    const [l] = layoutMapLabels([f("a", "Footbridge", 45, 81, 4, 17, "path")], 320);
    expect(l).toMatchObject({ kind: "badge", n: 1, label: "Footbridge" });
  });

  it("features with the same name share one badge number", () => {
    const out = layoutMapLabels([f("a", "Warehouse", 35, 5, 6, 6), f("b", "Warehouse", 35, 25, 6, 6), f("c", "Shop", 35, 45, 6, 6)], 320);
    expect(out.map((l) => (l.kind === "badge" ? l.n : 0))).toEqual([1, 1, 2]);
  });

  it("moves a label along a wide feature away from another label", () => {
    const out = layoutMapLabels([f("p", "Cycle path", 0, 81, 100, 3, "path"), f("b", "Bridge stop", 40, 78, 20, 9)], 320);
    const texts = out.filter((l): l is Extract<PlacedLabel, { kind: "text" }> => l.kind === "text");
    expect(texts).toHaveLength(2);
    const [a, b] = texts.map(boxOf);
    expect(a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1).toBe(false);
  });

  it("uses bigger grid units on a narrow map and smaller on a wide one, within limits", () => {
    expect(fontRange(320).max).toBe(MAP_FONT_MAX);
    expect(fontRange(800).max).toBeLessThan(2);
    expect(fontRange(0)).toEqual({ min: 3, max: MAP_FONT_MAX });
  });

  it("never throws and never places overlapping labels for any bank map at phone or desktop width", () => {
    const maps = TASK_BANK.flatMap((t) => t.visuals).filter((v): v is MapVisual => v.kind === "map");
    expect(maps.length).toBeGreaterThan(0);
    for (const m of maps)
      for (const p of m.panels)
        for (const width of [300, 340, 470, 900]) {
          const out = layoutMapLabels(p.features, width);
          expect(out).toHaveLength(p.features.length);
          const boxes = out.filter((l): l is Extract<PlacedLabel, { kind: "text" }> => l.kind === "text").map(boxOf);
          for (let i = 0; i < boxes.length; i++)
            for (let j = i + 1; j < boxes.length; j++) {
              const a = boxes[i];
              const b = boxes[j];
              expect(a.x0 < b.x1 - 0.01 && b.x0 < a.x1 - 0.01 && a.y0 < b.y1 - 0.01 && b.y0 < a.y1 - 0.01, `${p.label} @${width}`).toBe(false);
            }
        }
  });

  it("copes with junk", () => {
    expect(layoutMapLabels([f("a", "", 0, 0, 10, 10), { id: "b", label: "X", type: "other", x: NaN, y: 200, w: -5, h: 3 } as Feature], 320)).toHaveLength(1);
  });
});

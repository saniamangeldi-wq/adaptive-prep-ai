import type { MapVisual } from "@ielts/contract.ts";

/**
 * Where to write each map label (0–100 grid, the same units as the features).
 * A label goes inside its feature at the largest size that fits, on one or two lines,
 * and is moved along wide features to avoid other labels. A feature too small for a
 * readable label gets a numbered badge instead, and its name is listed under the map
 * (once per name).
 * Pure, so it can be unit tested.
 */

type Feature = MapVisual["panels"][number]["features"][number];

/** Label size limits in grid units for a map drawn about 320 px wide (a phone). */
export const MAP_FONT_MAX = 3.6;
export const MAP_FONT_MIN = 3.0;
/** Smallest and largest label size in screen pixels, whatever the map's width. */
const MIN_PX = 10;
const MAX_PX = 13;

/** Font limits in grid units for a map drawn `widthPx` wide. */
export function fontRange(widthPx: number): { min: number; max: number } {
  if (!Number.isFinite(widthPx) || widthPx <= 0) return { min: MAP_FONT_MIN, max: MAP_FONT_MAX };
  const unit = widthPx / 100;
  const max = Math.min(MAP_FONT_MAX, MAX_PX / unit);
  return { min: Math.min(max, MIN_PX / unit), max };
}
/** Average width of one bold character, as a share of the font size. */
const CHAR_W = 0.57;
const LINE_H = 1.15;
const BADGE_R = 2.4;

export type PlacedLabel =
  | { kind: "text"; id: string; lines: string[]; fontSize: number; x: number; y: number }
  | { kind: "badge"; id: string; n: number; label: string; x: number; y: number };

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function lineOptions(label: string): string[][] {
  const words = label.split(/\s+/).filter(Boolean);
  const out: string[][] = [[words.join(" ")]];
  if (words.length > 1) {
    let best: string[] | null = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" ");
      const b = words.slice(i).join(" ");
      if (!best || Math.max(a.length, b.length) < Math.max(best[0].length, best[1].length)) best = [a, b];
    }
    if (best) out.push(best);
  }
  return out;
}

const textWidth = (lines: string[], f: number) => Math.max(...lines.map((l) => l.length)) * CHAR_W * f;
const textHeight = (lines: string[], f: number) => lines.length * f * LINE_H;

export function layoutMapLabels(features: Feature[], widthPx = 0): PlacedLabel[] {
  const range = fontRange(widthPx);
  const placed: PlacedLabel[] = [];
  const boxes: Box[] = [];
  let badgeNo = 0;

  // Small features first: they have the fewest places to go.
  const order = features
    .map((f, i) => ({ f, i, area: Math.max(0, Number(f.w) || 0) * Math.max(0, Number(f.h) || 0) }))
    .sort((a, b) => a.area - b.area || a.i - b.i);

  const result = new Array<PlacedLabel | null>(features.length).fill(null);
  const shapes: Box[] = features.map((f) => {
    const x = Number(f.x) || 0;
    const y = Number(f.y) || 0;
    return { x0: x, y0: y, x1: x + (Number(f.w) || 0), y1: y + (Number(f.h) || 0) };
  });

  for (const { f, i } of order) {
    const label = String(f.label ?? "").trim();
    if (!label) continue;
    const x = clamp(Number(f.x) || 0, 0, 100);
    const y = clamp(Number(f.y) || 0, 0, 100);
    const w = clamp(Number(f.w) || 0, 0, 100 - x);
    const h = clamp(Number(f.h) || 0, 0, 100 - y);

    let done = false;
    const steps = Math.max(1, Math.round((range.max - range.min) / 0.1));
    for (let k = 0; k <= steps && !done; k++) {
      const fs = range.max - ((range.max - range.min) * k) / steps;
      for (const lines of lineOptions(label)) {
        const tw = textWidth(lines, fs);
        const th = textHeight(lines, fs);
        // Long thin features (roads, paths) may carry a one-line label slightly taller than they are.
        const fitsH = th <= h - 0.4 || (lines.length === 1 && h >= fs * 0.8);
        if (tw > w - 0.8 || !fitsH) continue;
        // Candidate centres along the feature, middle first. First try to keep clear of
        // other labels AND other shapes; then only of other labels.
        const xs = [0.5, 0.25, 0.75, 0.15, 0.85].map((p) => clamp(x + w * p, x + tw / 2 + 0.4, x + w - tw / 2 - 0.4));
        const cy = y + h / 2;
        for (const avoidShapes of [true, false]) {
          for (const cx of xs) {
            const box = { x0: cx - tw / 2, y0: cy - th / 2, x1: cx + tw / 2, y1: cy + th / 2 };
            if (boxes.some((b) => overlaps(b, box))) continue;
            if (avoidShapes && shapes.some((r, j) => j !== i && overlaps(r, box))) continue;
            boxes.push(box);
            result[i] = { kind: "text", id: f.id, lines, fontSize: Math.round(fs * 100) / 100, x: cx, y: cy };
            done = true;
            break;
          }
          if (done) break;
        }
        if (done) break;
      }
    }
    if (!done) {
      const cx = clamp(x + w / 2, BADGE_R, 100 - BADGE_R);
      const cy = clamp(y + h / 2, BADGE_R, 100 - BADGE_R);
      boxes.push({ x0: cx - BADGE_R, y0: cy - BADGE_R, x1: cx + BADGE_R, y1: cy + BADGE_R });
      result[i] = { kind: "badge", id: f.id, n: 0, label, x: cx, y: cy };
    }
  }

  // Number badges in reading order (top to bottom, left to right) so the key is easy to
  // follow. Features with the same name share a number (three warehouses are all "1").
  const badges = result.filter((r): r is Extract<PlacedLabel, { kind: "badge" }> => r?.kind === "badge").sort((a, b) => a.y - b.y || a.x - b.x);
  const byName = new Map<string, number>();
  for (const b of badges) {
    const key = b.label.toLowerCase();
    if (!byName.has(key)) byName.set(key, ++badgeNo);
    b.n = byName.get(key)!;
  }
  for (const r of result) if (r) placed.push(r);
  return placed;
}

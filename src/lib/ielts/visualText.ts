import type { DataVisual, MapVisual, ProcessVisual } from "@ielts/contract.ts";

/** Text alternatives for the task visuals, for screen readers. Never throw on odd data. */

export function describeDataVisual(v: DataVisual): string {
  const rows = Array.isArray(v?.data) ? v.data : [];
  const series = Array.isArray(v?.series) ? v.series : [];
  const key = v?.categoryKey;
  const unit = v?.unit ? ` (${v.unit})` : "";
  const kind = v?.kind === "table" ? "Table" : `${String(v?.kind ?? "chart").replace(/^./, (c) => c.toUpperCase())} chart`;
  const parts = rows.map((row) => {
    const label = key ? String(row?.[key] ?? "") : "";
    const values = series.map((s) => `${s} ${row?.[s] ?? "no data"}`).join(", ");
    return `${label}: ${values}`;
  });
  return `${kind}: ${v?.title ?? "untitled"}${unit}. ${parts.join("; ")}.`;
}

export function describeProcess(v: ProcessVisual): string {
  const steps = Array.isArray(v?.steps) ? v.steps : [];
  const list = steps.map((s, i) => `Step ${i + 1}: ${s.label}${s.detail ? ` (${s.detail})` : ""}`).join(". ");
  const end = v?.cyclic ? " The last step leads back to step 1." : "";
  return `${v?.cyclic ? "Cycle" : "Process"}: ${v?.title ?? "untitled"}. ${list}.${end}`;
}

function position(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const v = cy < 34 ? "top" : cy > 66 ? "bottom" : "middle";
  const hz = cx < 34 ? "left" : cx > 66 ? "right" : "centre";
  if (v === "middle" && hz === "centre") return "in the centre";
  if (v === "middle") return `on the ${hz}`;
  if (hz === "centre") return `at the ${v}`;
  return `at the ${v} ${hz}`;
}

export function describeMapPanel(panel: MapVisual["panels"][number]): string {
  const features = Array.isArray(panel?.features) ? panel.features : [];
  const list = features
    .map((f) => `${f.label} (${f.type}) ${position(Number(f.x) || 0, Number(f.y) || 0, Number(f.w) || 0, Number(f.h) || 0)}`)
    .join("; ");
  return `${panel?.label ?? "Map"}: ${list || "no features listed"}.`;
}

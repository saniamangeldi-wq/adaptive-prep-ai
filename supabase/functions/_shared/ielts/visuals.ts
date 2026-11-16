/**
 * Task 1 Academic visuals and WritingTask validation, plus a compact text
 * serialisation of visuals for the grader prompt. Pure.
 *
 * The same validator checks the bank (unit tests), model-generated tasks
 * (ielts-generate-writing-task) and tasks sent back by the client for
 * grading (ielts-grade-writing).
 */

import type { DataVisual, MapFeatureType, MapVisual, ProcessVisual, TaskVisual, TaskVariant, WritingTask } from "./contract.ts";
import { LIMITS, TASK_RULES, VARIANTS_BY_TASK } from "./contract.ts";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isNonEmptyStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

const MAP_FEATURE_TYPES: readonly MapFeatureType[] = [
  "building", "housing", "road", "path", "water", "green", "farmland", "parking", "industry", "other",
];

const DATA_KINDS = ["line", "bar", "pie", "table"] as const;

/** Which visual kind(s) each Academic variant needs. */
export const VISUAL_KIND_BY_VARIANT: Partial<Record<TaskVariant, TaskVisual["kind"]>> = {
  line_graph: "line",
  bar_chart: "bar",
  pie_chart: "pie",
  table: "table",
  process: "process",
  map: "map",
};

/** Tolerance for pie slices that should sum to 100 (rounded figures). */
export const PIE_SUM_TOLERANCE = 0.5;

// ───────────────────────── Visual validation ─────────────────────────

function validateDataVisual(v: Record<string, unknown>, path: string, errors: string[]): void {
  if (!isNonEmptyStr(v.title)) errors.push(`${path}.title: required`);
  if (v.unit !== undefined && typeof v.unit !== "string") errors.push(`${path}.unit: must be a string`);
  if (!isNonEmptyStr(v.categoryKey)) errors.push(`${path}.categoryKey: required`);
  const series = v.series;
  if (!Array.isArray(series) || series.length === 0 || series.length > 8 || !series.every(isNonEmptyStr)) {
    errors.push(`${path}.series: 1–8 non-empty names required`);
    return;
  }
  if (new Set(series).size !== series.length) errors.push(`${path}.series: names must be unique`);
  if (series.includes(v.categoryKey as string)) errors.push(`${path}.series: must not include the categoryKey`);
  const data = v.data;
  const minRows = v.kind === "line" ? 3 : v.kind === "pie" ? 3 : 2;
  if (!Array.isArray(data) || data.length < minRows || data.length > 20) {
    errors.push(`${path}.data: ${minRows}–20 rows required`);
    return;
  }
  const cats = new Set<string>();
  data.forEach((row, i) => {
    if (!isObj(row)) return void errors.push(`${path}.data[${i}]: expected an object`);
    const cat = row[v.categoryKey as string];
    if (!(isNonEmptyStr(cat) || (typeof cat === "number" && Number.isFinite(cat)))) errors.push(`${path}.data[${i}]: missing category "${String(v.categoryKey)}"`);
    else {
      const key = String(cat);
      if (cats.has(key)) errors.push(`${path}.data[${i}]: duplicate category "${key}"`);
      cats.add(key);
    }
    for (const s of series as string[]) {
      const n = row[s];
      if (typeof n !== "number" || !Number.isFinite(n)) errors.push(`${path}.data[${i}]["${s}"]: expected a number`);
      else if (n < 0) errors.push(`${path}.data[${i}]["${s}"]: negative values are not used in IELTS visuals`);
    }
  });
  if (v.kind === "pie") {
    if (v.unit !== "%") errors.push(`${path}.unit: a pie chart must use "%"`);
    if (data.length > 10) errors.push(`${path}.data: a pie chart should have at most 10 slices`);
    for (const s of series as string[]) {
      const sum = (data as Array<Record<string, unknown>>).reduce((acc, row) => acc + (typeof row[s] === "number" ? (row[s] as number) : 0), 0);
      if (Math.abs(sum - 100) > PIE_SUM_TOLERANCE) errors.push(`${path}: slices of "${s}" sum to ${sum}, not 100`);
    }
  }
}

function validateProcessVisual(v: Record<string, unknown>, path: string, errors: string[]): void {
  if (!isNonEmptyStr(v.title)) errors.push(`${path}.title: required`);
  if (typeof v.cyclic !== "boolean") errors.push(`${path}.cyclic: must be true or false`);
  const steps = v.steps;
  if (!Array.isArray(steps) || steps.length < 5 || steps.length > 12) {
    errors.push(`${path}.steps: 5–12 steps required`);
    return;
  }
  const ids = new Set<string>();
  steps.forEach((s, i) => {
    if (!isObj(s) || !isNonEmptyStr(s.id) || !isNonEmptyStr(s.label)) return void errors.push(`${path}.steps[${i}]: id and label required`);
    if (ids.has(s.id)) errors.push(`${path}.steps[${i}]: duplicate id "${s.id}"`);
    ids.add(s.id);
    if (s.detail !== undefined && typeof s.detail !== "string") errors.push(`${path}.steps[${i}].detail: must be a string`);
  });
  if (v.links !== undefined) {
    if (!Array.isArray(v.links)) errors.push(`${path}.links: must be an array`);
    else
      v.links.forEach((l, i) => {
        if (!isObj(l) || !ids.has(l.from as string) || !ids.has(l.to as string)) errors.push(`${path}.links[${i}]: from/to must name existing steps`);
      });
  }
}

type Feature = MapVisual["panels"][number]["features"][number];

function featureKey(f: Feature): string {
  return `${f.label}|${f.type}|${f.x}|${f.y}|${f.w}|${f.h}`;
}

/** Number of features that differ between two panels (added, removed, or changed in place). */
export function countMapChanges(a: Feature[], b: Feature[]): number {
  const ka = new Set(a.map(featureKey));
  const kb = new Set(b.map(featureKey));
  let n = 0;
  for (const k of ka) if (!kb.has(k)) n++;
  for (const k of kb) if (!ka.has(k)) n++;
  return n;
}

function validateMapVisual(v: Record<string, unknown>, path: string, errors: string[]): void {
  if (!isNonEmptyStr(v.title)) errors.push(`${path}.title: required`);
  const panels = v.panels;
  if (!Array.isArray(panels) || panels.length !== 2) {
    errors.push(`${path}.panels: exactly two panels required`);
    return;
  }
  const labels = new Set<string>();
  panels.forEach((p, pi) => {
    const pp = `${path}.panels[${pi}]`;
    if (!isObj(p) || !isNonEmptyStr(p.label)) return void errors.push(`${pp}.label: required`);
    if (labels.has(p.label)) errors.push(`${pp}.label: duplicate panel label`);
    labels.add(p.label);
    if (!Array.isArray(p.features) || p.features.length < 3 || p.features.length > 20) return void errors.push(`${pp}.features: 3–20 features required`);
    const ids = new Set<string>();
    p.features.forEach((f, fi) => {
      const fp = `${pp}.features[${fi}]`;
      if (!isObj(f) || !isNonEmptyStr(f.id) || !isNonEmptyStr(f.label)) return void errors.push(`${fp}: id and label required`);
      if (ids.has(f.id)) errors.push(`${fp}: duplicate id "${f.id}"`);
      ids.add(f.id);
      if (typeof f.type !== "string" || !MAP_FEATURE_TYPES.includes(f.type as MapFeatureType)) errors.push(`${fp}.type: unknown type ${JSON.stringify(f.type)}`);
      const nums = [f.x, f.y, f.w, f.h];
      if (!nums.every((n) => typeof n === "number" && Number.isFinite(n))) return void errors.push(`${fp}: x, y, w, h must be numbers`);
      const [x, y, w, h] = nums as number[];
      if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 100 || y + h > 100) errors.push(`${fp}: must lie inside the 0–100 grid with positive size`);
    });
  });
  if (errors.length === 0) {
    const [a, b] = panels as MapVisual["panels"];
    if (countMapChanges(a.features, b.features) === 0) errors.push(`${path}: the two panels are identical; a map task needs visible changes`);
  }
}

/** Validate one visual. Returns a list of errors (empty = valid). */
export function validateVisual(v: unknown, path = "visual"): string[] {
  const errors: string[] = [];
  if (!isObj(v)) return [`${path}: expected an object`];
  switch (v.kind) {
    case "line":
    case "bar":
    case "pie":
    case "table":
      validateDataVisual(v, path, errors);
      break;
    case "process":
      validateProcessVisual(v, path, errors);
      break;
    case "map":
      validateMapVisual(v, path, errors);
      break;
    default:
      errors.push(`${path}.kind: unknown kind ${JSON.stringify(v.kind)}`);
  }
  return errors;
}

/** Visuals required by the variant: one of the right kind, or two different data kinds for `mixed`. */
export function validateVisualsForVariant(variant: TaskVariant, visuals: unknown): string[] {
  if (!Array.isArray(visuals)) return ["visuals: expected an array"];
  const errors: string[] = [];
  visuals.forEach((v, i) => errors.push(...validateVisual(v, `visuals[${i}]`)));
  if (variant === "mixed") {
    if (visuals.length !== 2) errors.push("visuals: a mixed task needs exactly two visuals");
    else {
      const kinds = visuals.map((v) => (isObj(v) ? v.kind : undefined));
      if (!kinds.every((k) => (DATA_KINDS as readonly unknown[]).includes(k))) errors.push("visuals: mixed visuals must be line, bar, pie or table");
      if (kinds[0] === kinds[1]) errors.push("visuals: mixed visuals must be of different kinds");
    }
  } else {
    const kind = VISUAL_KIND_BY_VARIANT[variant];
    if (visuals.length !== 1) errors.push(`visuals: a ${variant} task needs exactly one visual`);
    else if (isObj(visuals[0]) && visuals[0].kind !== kind) errors.push(`visuals[0].kind: a ${variant} task needs a ${kind} visual`);
  }
  return errors;
}

// ───────────────────────── WritingTask validation ─────────────────────────

export interface TaskValidationOptions {
  /** Custom tasks may omit visuals (Academic) and give 0–5 bullets (letters). Default: by task.source. */
  lenient?: boolean;
}

/**
 * Validate a WritingTask. Bank and generated tasks are held to the full
 * standard (right visuals, exactly three bullets). Custom tasks typed in by a
 * student may have no visuals and their bullets may be inside the prompt.
 */
export function validateWritingTask(t: unknown, opts: TaskValidationOptions = {}): string[] {
  if (!isObj(t)) return ["task: expected an object"];
  const errors: string[] = [];
  if (!isNonEmptyStr(t.id) || (t.id as string).length > 100) errors.push("task.id: 1–100 characters required");
  if (t.source !== "bank" && t.source !== "generated" && t.source !== "custom") errors.push('task.source: must be "bank", "generated" or "custom"');
  const taskType = t.taskType;
  if (taskType !== "task1_academic" && taskType !== "task1_general" && taskType !== "task2") {
    errors.push("task.taskType: unknown");
    return errors;
  }
  const variants = VARIANTS_BY_TASK[taskType];
  if (typeof t.variant !== "string" || !variants.includes(t.variant as TaskVariant)) {
    errors.push(`task.variant: must be one of ${variants.join(", ")}`);
    return errors;
  }
  if (!isNonEmptyStr(t.prompt)) errors.push("task.prompt: required");
  else if ((t.prompt as string).length > LIMITS.maxPromptChars) errors.push(`task.prompt: longer than ${LIMITS.maxPromptChars} characters`);
  if (t.topic !== undefined && typeof t.topic !== "string") errors.push("task.topic: must be a string");
  if (typeof t.minWords !== "number" || typeof t.timeMinutes !== "number") errors.push("task.minWords/timeMinutes: numbers required");

  const lenient = opts.lenient ?? t.source === "custom";
  const bullets = t.bullets;
  if (!Array.isArray(bullets) || !bullets.every((b) => typeof b === "string")) errors.push("task.bullets: array of strings required");
  else if (taskType === "task1_general") {
    if (!lenient && (bullets.length !== 3 || !bullets.every(isNonEmptyStr))) errors.push("task.bullets: a letter task needs exactly three bullet points");
    if (lenient && bullets.length > 5) errors.push("task.bullets: at most five");
    if (bullets.some((b) => (b as string).length > 300)) errors.push("task.bullets: each bullet at most 300 characters");
  } else if (bullets.length !== 0) errors.push("task.bullets: only letter tasks have bullet points");

  const visuals = t.visuals;
  if (!Array.isArray(visuals)) errors.push("task.visuals: array required");
  else if (taskType === "task1_academic") {
    if (!(lenient && visuals.length === 0)) errors.push(...validateVisualsForVariant(t.variant as TaskVariant, visuals));
  } else if (visuals.length !== 0) errors.push("task.visuals: only Academic Task 1 has visuals");
  return errors;
}

/** Fix the fields the server owns (minWords, timeMinutes) from TASK_RULES. */
export function withServerRules<T extends WritingTask>(task: T): T {
  const r = TASK_RULES[task.taskType];
  return { ...task, minWords: r.minWords, timeMinutes: r.timeMinutes };
}

// ───────────────────────── Compact serialisation for the prompt ─────────────────────────

function fmtNum(n: unknown): string {
  return typeof n === "number" ? String(n) : String(n ?? "");
}

function compassOf(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const ns = cy < 33.4 ? "north" : cy > 66.6 ? "south" : "";
  const ew = cx < 33.4 ? "west" : cx > 66.6 ? "east" : "";
  if (!ns && !ew) return "centre";
  return ns && ew ? `${ns}-${ew}` : ns || ew;
}

function serializeData(v: DataVisual): string {
  const head = `${v.kind.toUpperCase()} — ${v.title}${v.unit ? ` (unit: ${v.unit})` : ""}`;
  const lines = [head, [v.categoryKey, ...v.series].join(" | ")];
  for (const row of v.data) lines.push([fmtNum(row[v.categoryKey]), ...v.series.map((s) => fmtNum(row[s]))].join(" | "));
  return lines.join("\n");
}

function serializeProcess(v: ProcessVisual): string {
  const lines = [`PROCESS — ${v.title} (${v.cyclic ? "cyclical: the last stage leads back to the first" : "linear"}; ${v.steps.length} stages)`];
  v.steps.forEach((s, i) => lines.push(`${i + 1}. ${s.label}${s.detail ? ` — ${s.detail}` : ""}`));
  if (v.links?.length) lines.push(`Links: ${v.links.map((l) => `${l.from}→${l.to}${l.label ? ` (${l.label})` : ""}`).join("; ")}`);
  return lines.join("\n");
}

function serializeMap(v: MapVisual): string {
  const lines = [`MAP — ${v.title} (grid 0–100, origin top-left; north is up)`];
  for (const p of v.panels) {
    lines.push(`[${p.label}]`);
    for (const f of p.features) lines.push(`- ${f.label} (${f.type}) in the ${compassOf(f.x, f.y, f.w, f.h)}; x${f.x} y${f.y} w${f.w} h${f.h}`);
  }
  if (v.panels.length === 2) {
    const [a, b] = v.panels;
    const la = new Set(a.features.map((f) => f.label));
    const lb = new Set(b.features.map((f) => f.label));
    const gone = [...la].filter((l) => !lb.has(l));
    const added = [...lb].filter((l) => !la.has(l));
    if (gone.length) lines.push(`Only in "${a.label}": ${gone.join(", ")}`);
    if (added.length) lines.push(`Only in "${b.label}": ${added.join(", ")}`);
  }
  return lines.join("\n");
}

/** Compact, model-friendly text for one visual. */
export function serializeVisual(v: TaskVisual): string {
  switch (v.kind) {
    case "process":
      return serializeProcess(v);
    case "map":
      return serializeMap(v);
    default:
      return serializeData(v as DataVisual);
  }
}

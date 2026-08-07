/**
 * Read-only SAT practice-set audit. No DB writes, no question modification.
 * Usage: bun scripts/audit-practice-set.ts /tmp/questions.json
 */
import { readFileSync, writeFileSync } from "fs";
import {
  validateQuestion,
  deriveVisualRequirement,
  validateMathSerialization,
  hasVisualReference,
  isValidTable,
  isPotentiallyRenderableFigure,
  isUsableTextEquivalent,
} from "../src/lib/sat-content";
import { resolveQuestionParts } from "../src/lib/question-table";
import { buildVisualPlan } from "../src/lib/visual-status";
import type { Question } from "../src/types/test";

type Bucket =
  | "not_required"
  | "ok"
  | "degraded_re_render"
  | "degraded_text_fallback"
  | "broken_quarantined";

const all: Question[] = JSON.parse(readFileSync(process.argv[2], "utf8"));

async function assetReachable(src?: string): Promise<boolean | null> {
  if (!src) return null;
  if (src.startsWith("data:")) return src.length > 64;
  try {
    const r = await fetch(src, { method: "HEAD" });
    return r.ok;
  } catch {
    return false;
  }
}

async function auditOne(q: Question) {
  const parts = resolveQuestionParts(q);
  const recovered = isValidTable(parts.table) && !isValidTable((q as any).table);
  const v = validateQuestion(q, recovered);
  const plan = buildVisualPlan(q);
  const anyQ = q as any;
  const figure = anyQ.figure;
  const reachable = await assetReachable(figure?.src ?? figure?.url);
  const mathIssues = validateMathSerialization(q);
  const textEq = isUsableTextEquivalent(anyQ.text) || isUsableTextEquivalent(figure?.alt);

  const requirement = deriveVisualRequirement(q);
  const hasMediaMeta = Boolean(figure || anyQ.table || anyQ.stimulus);
  const structured = isValidTable(parts.table) || isValidTable(anyQ.table);
  const primaryOk = isPotentiallyRenderableFigure(figure) && reachable !== false;

  let bucket: Bucket;
  const reasons: string[] = [];
  if (requirement === "none") {
    bucket = "not_required";
  } else if (primaryOk) {
    bucket = "ok";
  } else if (structured) {
    bucket = "degraded_re_render";
    reasons.push("no renderable primary asset; structured table recovered from text");
  } else if (requirement === "optional" && textEq) {
    bucket = "degraded_text_fallback";
    reasons.push("visual reference present but only text equivalent available");
  } else {
    bucket = "broken_quarantined";
    reasons.push("required visual missing with no structured or text substitute");
  }
  if (mathIssues.length) {
    reasons.push(`raw math serialization: ${mathIssues.join(", ")}`);
    if (bucket === "ok" || bucket === "not_required") bucket = "degraded_re_render";
  }
  if (v.status === "quarantined") {
    bucket = "broken_quarantined";
    reasons.push(...v.reasons);
  } else if (v.status === "needs_review" && bucket === "ok") {
    bucket = "degraded_re_render";
    reasons.push(...v.reasons);
  }

  const action =
    bucket === "broken_quarantined"
      ? "Quarantine + regenerate visual via restructure-sat-media, or replace question"
      : bucket === "degraded_re_render"
        ? "Re-render: rebuild figure/table from source PDF; normalize math tokens"
        : bucket === "degraded_text_fallback"
          ? "Author explicit alt-text/table equivalent, then re-promote"
          : "None";

  return {
    id: q.id,
    section: (q as any).section,
    topic: (q as any).topic,
    visual_requirement: requirement,
    visual_reference_detected: hasVisualReference(anyQ.text),
    media_metadata_present: hasMediaMeta,
    primary_asset_reachable: reachable,
    structured_data_present: structured,
    text_equivalent_present: textEq,
    math_formatting_failures: mathIssues,
    delivery_status: v.status,
    plan_kind: plan.primary,
    bucket,
    reasons,
    recommended_action: action,
    excerpt: String(anyQ.text ?? "").slice(0, 160),
  };
}

const rx = {
  geometry: /lines?\s+s\b[\s\S]{0,80}\bq\b[\s\S]{0,80}\br\b|line\s+s\s*,\s*q|parallel[\s\S]{0,40}\bs\b[\s\S]{0,40}\bq\b/i,
  gas: /gas\s*(price|oline)/i,
  hx: /y\s*=\s*h\s*\(\s*x\s*\)|function\s+h\b/i,
  superscript: /Superscript|Baseline/i,
};

function pickSet(): Question[] {
  const spotlight: Question[] = [];
  const seen = new Set<string>();
  for (const key of Object.keys(rx) as (keyof typeof rx)[]) {
    const hit = all.find((q) => rx[key].test(String((q as any).text ?? "")) && !seen.has(q.id));
    if (hit) {
      spotlight.push(hit);
      seen.add(hit.id);
    }
  }
  // deterministic remainder: stable order slice of the corpus
  const rest = all.filter((q) => !seen.has(q.id)).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const step = Math.max(1, Math.floor(rest.length / (44 - spotlight.length)));
  const picked: Question[] = [];
  for (let i = 0; picked.length < 44 - spotlight.length && i < rest.length; i += step) picked.push(rest[i]);
  return [...spotlight, ...picked];
}

const set = pickSet();
const rows = [] as Awaited<ReturnType<typeof auditOne>>[];
for (const q of set) rows.push(await auditOne(q));

const count = (b: Bucket) => rows.filter((r) => r.bucket === b).length;
const summary = {
  total_questions: rows.length,
  visual_required_count: rows.filter((r) => r.visual_requirement === "required").length,
  visual_optional_count: rows.filter((r) => r.visual_requirement === "optional").length,
  no_visual_count: rows.filter((r) => r.visual_requirement === "none").length,
  ok_count: count("ok") + count("not_required"),
  degraded_count: count("degraded_re_render") + count("degraded_text_fallback"),
  broken_count: count("broken_quarantined"),
  math_formatting_failure_count: rows.filter((r) => r.math_formatting_failures.length > 0).length,
};

const spotlightIds = {
  geometry_lines_s_q_r: rows[0]?.id ?? null,
  gas_price_table: rows[1]?.id ?? null,
  function_y_equals_h_x: rows[2]?.id ?? null,
  superscript_baseline_algebra: rows[3]?.id ?? null,
};

const json = { summary, spotlight: spotlightIds, questions: rows };
writeFileSync("/mnt/documents/sat-practice-audit.json", JSON.stringify(json, null, 2));

const md = [
  "# SAT Practice Set Audit (read-only)",
  "",
  "| Metric | Value |",
  "| --- | --- |",
  ...Object.entries(summary).map(([k, v]) => `| ${k} | ${v} |`),
  "",
  "## Per-question findings",
  "",
  "| ID | Section | Requirement | Bucket | Failure reasons | Recommended action |",
  "| --- | --- | --- | --- | --- | --- |",
  ...rows.map(
    (r) =>
      `| ${r.id} | ${r.section} | ${r.visual_requirement} | ${r.bucket} | ${r.reasons.join("; ") || "—"} | ${r.recommended_action} |`,
  ),
].join("\n");
writeFileSync("/mnt/documents/sat-practice-audit.md", md);

console.log(JSON.stringify({ summary, spotlight: spotlightIds }, null, 2));
console.log("\nSpotlight rows:\n", JSON.stringify(rows.slice(0, 4), null, 2));

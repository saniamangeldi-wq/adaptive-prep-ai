/**
 * The exact shape the grader model must return, as
 *   1. a JSON Schema for tool / function calling (and for the json_object
 *      fallback, where it is pasted into the prompt), and
 *   2. a hand-written runtime validator with no dependencies.
 *
 * The schema sticks to the subset every OpenAI-compatible provider accepts
 * (type, properties, required, items, enum on strings, description,
 * maxItems): no unions, no nullable, no numeric enums. "No rewrite" is an
 * empty `original`; "no model answer" is an empty string.
 *
 * Property ORDER is deliberate (models write fields in schema order):
 * flags and checklist first, then the inline issues, then per criterion
 * evidence → rationale → band, so the model quotes before it scores.
 * There is no overall band in the schema; the server computes it.
 */

import type { CriterionKey, ErrorTag, TaskType, TaskVariant } from "./contract.ts";
import { ERROR_TAGS, VARIANTS_BY_TASK } from "./contract.ts";
import { parseBand } from "./bandMath.ts";
import { checklistFor } from "./rubric.ts";

export const GRADER_TOOL_NAME = "submit_ielts_assessment";

/** Flags the MODEL may raise. under_length / severely_under_length / wrong_task_variant are server-computed. */
export const MODEL_FLAGS = ["off_topic", "not_english", "copied_from_prompt", "memorised_or_template", "visual_not_available"] as const;
export type ModelFlag = (typeof MODEL_FLAGS)[number];

export const CHECKLIST_VERDICTS = ["yes", "partly", "no", "not_applicable"] as const;
export type ChecklistVerdict = (typeof CHECKLIST_VERDICTS)[number];

export const CRITERION_KEYS: readonly CriterionKey[] = ["task", "coherence", "lexical", "grammar"];

/** Output limits, told to the model and enforced (by capping) in postprocess. */
export const OUTPUT_LIMITS = {
  maxIssues: 15,
  maxEvidencePerCriterion: 3,
  maxStrengths: 3,
  maxPriorities: 3,
  maxRewriteChanges: 4,
} as const;

export interface GraderCriterion {
  evidence: string[];
  rationale: string;
  band: number;
  toNextBand: string;
}

export interface GraderIssue {
  quote: string;
  criterion: CriterionKey;
  tag: ErrorTag;
  explanation: string;
  suggestion: string;
}

export interface GraderOutput {
  variantDetected: TaskVariant;
  flags: ModelFlag[];
  checklist: Array<{ id: string; met: ChecklistVerdict; note: string }>;
  issues: GraderIssue[];
  criteria: Record<CriterionKey, GraderCriterion>;
  strengths: string[];
  priorities: Array<{ title: string; why: string; how: string }>;
  summary: string;
  rewrite: { original: string; improved: string; changes: string[] } | null;
  modelAnswer: string | null;
}

export interface SchemaContext {
  taskType: TaskType;
  variant: TaskVariant;
  includeModelAnswer: boolean;
}

// ───────────────────────── JSON Schema ─────────────────────────

const str = (description: string) => ({ type: "string", description });

function criterionSchema(name: string) {
  return {
    type: "object",
    description: `${name}. Quote first, then explain, then score.`,
    properties: {
      evidence: {
        type: "array",
        description: "1–3 short EXACT quotes copied character for character from the script (max ~20 words each) that justify the band.",
        items: { type: "string" },
        maxItems: OUTPUT_LIMITS.maxEvidencePerCriterion,
      },
      rationale: str("2–4 sentences in the feedback language: which band features the script shows, referring to the evidence."),
      band: { type: "number", description: "Band 0–9 in steps of 0.5 (e.g. 5, 5.5, 6). Never 6.3 or 6.25." },
      toNextBand: str("In the feedback language: the one or two concrete changes that would raise this criterion by half a band."),
    },
    required: ["evidence", "rationale", "band", "toNextBand"],
  };
}

/** JSON Schema of the tool parameters. Checklist ids and variant enum are specific to the task. */
export function graderJsonSchema(ctx: SchemaContext): Record<string, unknown> {
  const checklistIds = checklistFor(ctx.variant).map((c) => c.id);
  return {
    type: "object",
    properties: {
      variantDetected: {
        type: "string",
        enum: [...VARIANTS_BY_TASK[ctx.taskType]],
        description: "Which variant the QUESTION actually is, judged from its wording.",
      },
      flags: {
        type: "array",
        description: "Raise only when clearly true. Empty array if none.",
        items: { type: "string", enum: [...MODEL_FLAGS] },
        maxItems: MODEL_FLAGS.length,
      },
      checklist: {
        type: "array",
        description: `One entry per checklist id, in this order: ${checklistIds.join(", ")}.`,
        items: {
          type: "object",
          properties: {
            id: { type: "string", enum: checklistIds },
            met: { type: "string", enum: [...CHECKLIST_VERDICTS] },
            note: str("One sentence in the feedback language explaining the verdict, pointing at the script."),
          },
          required: ["id", "met", "note"],
        },
        maxItems: checklistIds.length,
      },
      issues: {
        type: "array",
        description: `The most useful specific problems, most important first, at most ${OUTPUT_LIMITS.maxIssues}. Each quote must be an exact substring of the script.`,
        items: {
          type: "object",
          properties: {
            quote: str("EXACT substring of the script containing the problem: the shortest span that shows it (a phrase or one sentence)."),
            criterion: { type: "string", enum: [...CRITERION_KEYS] },
            tag: { type: "string", enum: [...ERROR_TAGS] },
            explanation: str("In the feedback language, max ~25 words: what is wrong and why it costs marks."),
            suggestion: str("Corrected or improved wording for the quoted span, in English."),
          },
          required: ["quote", "criterion", "tag", "explanation", "suggestion"],
        },
        maxItems: OUTPUT_LIMITS.maxIssues,
      },
      criteria: {
        type: "object",
        properties: {
          task: criterionSchema("Task Achievement (Task 1) or Task Response (Task 2)"),
          coherence: criterionSchema("Coherence and Cohesion"),
          lexical: criterionSchema("Lexical Resource"),
          grammar: criterionSchema("Grammatical Range and Accuracy"),
        },
        required: ["task", "coherence", "lexical", "grammar"],
      },
      strengths: {
        type: "array",
        description: "1–3 genuine strengths in the feedback language, each tied to something in the script. Empty if there are none.",
        items: { type: "string" },
        maxItems: OUTPUT_LIMITS.maxStrengths,
      },
      priorities: {
        type: "array",
        description: "Up to 3 improvements that would raise the band most, most valuable first. In the feedback language.",
        items: {
          type: "object",
          properties: {
            title: str("Short imperative title."),
            why: str("Why it matters for the band, referring to this script."),
            how: str("Concrete way to do it next time, with a short English example if useful."),
          },
          required: ["title", "why", "how"],
        },
        maxItems: OUTPUT_LIMITS.maxPriorities,
      },
      summary: str("2–3 sentences in the feedback language: the estimated level and the main reason. No overall band number."),
      rewrite: {
        type: "object",
        description: "One paragraph of the script rewritten about one band higher. Leave all fields empty if the script has no usable paragraph.",
        properties: {
          original: str("The paragraph copied EXACTLY from the script."),
          improved: str("The same paragraph rewritten about one band higher, same ideas, in English."),
          changes: {
            type: "array",
            description: `Up to ${OUTPUT_LIMITS.maxRewriteChanges} short notes in the feedback language on what was changed and why.`,
            items: { type: "string" },
            maxItems: OUTPUT_LIMITS.maxRewriteChanges,
          },
        },
        required: ["original", "improved", "changes"],
      },
      modelAnswer: str(
        ctx.includeModelAnswer
          ? "REQUIRED: a complete band-8 model answer to this task in English, a little over the word minimum."
          : "Must be an empty string (not requested).",
      ),
    },
    required: ["variantDetected", "flags", "checklist", "issues", "criteria", "strengths", "priorities", "summary", "rewrite", "modelAnswer"],
  };
}

/** Tool definition in OpenAI `tools` format. */
export function graderTool(ctx: SchemaContext) {
  return {
    type: "function",
    function: {
      name: GRADER_TOOL_NAME,
      description: "Submit the complete IELTS Writing assessment of the candidate script.",
      parameters: graderJsonSchema(ctx),
    },
  };
}

// ───────────────────────── Runtime validator ─────────────────────────

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isNonEmptyStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const ERROR_TAG_SET = new Set<string>(ERROR_TAGS);
const MODEL_FLAG_SET = new Set<string>(MODEL_FLAGS);
const VERDICT_SET = new Set<string>(CHECKLIST_VERDICTS);

function stringArray(v: unknown, path: string, errors: string[], opts: { allowEmptyItems?: boolean } = {}): string[] {
  if (!Array.isArray(v)) {
    errors.push(`${path}: expected an array of strings`);
    return [];
  }
  const out: string[] = [];
  v.forEach((item, i) => {
    if (typeof item !== "string") errors.push(`${path}[${i}]: expected a string`);
    else if (!opts.allowEmptyItems && !item.trim()) {
      /* silently skip empty strings */
    } else out.push(item.trim());
  });
  return out;
}

/**
 * Validate the model's output. Rejects (with precise messages) anything
 * structurally wrong: missing criterion, invalid band (6.3, "6-7", 10),
 * unknown tag/criterion/flag/verdict, checklist ids that do not match the
 * variant, missing or wrong-variant detection, missing model answer when it
 * was requested. Length overflows are NOT errors (postprocess caps them),
 * because a retry costs a full grading call.
 *
 * Quotes are NOT checked against the script here; postprocess locates them
 * and drops the ones that are not in the script.
 */
export function validateGraderOutput(raw: unknown, ctx: SchemaContext): ValidationResult<GraderOutput> {
  const errors: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: ["output: expected a JSON object"] };

  // variantDetected
  const allowedVariants = VARIANTS_BY_TASK[ctx.taskType];
  let variantDetected = raw.variantDetected as TaskVariant;
  if (typeof raw.variantDetected !== "string" || !allowedVariants.includes(raw.variantDetected as TaskVariant)) {
    errors.push(`variantDetected: must be one of ${allowedVariants.join(", ")}`);
    variantDetected = ctx.variant;
  }

  // flags
  const flags: ModelFlag[] = [];
  if (!Array.isArray(raw.flags)) errors.push("flags: expected an array");
  else
    raw.flags.forEach((f, i) => {
      if (typeof f !== "string" || !MODEL_FLAG_SET.has(f)) errors.push(`flags[${i}]: unknown flag ${JSON.stringify(f)}`);
      else if (!flags.includes(f as ModelFlag)) flags.push(f as ModelFlag);
    });

  // checklist
  const defs = checklistFor(ctx.variant);
  const checklist: GraderOutput["checklist"] = [];
  if (!Array.isArray(raw.checklist)) errors.push("checklist: expected an array");
  else {
    const seen = new Map<string, { met: ChecklistVerdict; note: string }>();
    raw.checklist.forEach((item, i) => {
      if (!isObj(item)) return void errors.push(`checklist[${i}]: expected an object`);
      const id = item.id;
      const def = defs.find((d) => d.id === id);
      if (typeof id !== "string" || !def) return void errors.push(`checklist[${i}].id: unknown id ${JSON.stringify(id)}`);
      if (typeof item.met !== "string" || !VERDICT_SET.has(item.met))
        return void errors.push(`checklist[${i}].met: must be one of ${CHECKLIST_VERDICTS.join(", ")}`);
      if (item.met === "not_applicable" && !def.conditional)
        return void errors.push(`checklist[${i}]: "${id}" always applies and cannot be not_applicable`);
      if (seen.has(id)) return void errors.push(`checklist[${i}]: duplicate id "${id}"`);
      seen.set(id, { met: item.met as ChecklistVerdict, note: typeof item.note === "string" ? item.note.trim() : "" });
    });
    for (const d of defs) {
      const v = seen.get(d.id);
      if (!v) errors.push(`checklist: missing id "${d.id}"`);
      else checklist.push({ id: d.id, met: v.met, note: v.note });
    }
  }

  // issues
  const issues: GraderIssue[] = [];
  if (!Array.isArray(raw.issues)) errors.push("issues: expected an array");
  else
    raw.issues.forEach((item, i) => {
      if (!isObj(item)) return void errors.push(`issues[${i}]: expected an object`);
      const p = `issues[${i}]`;
      let bad = false;
      if (!isNonEmptyStr(item.quote)) (errors.push(`${p}.quote: expected a non-empty string`), (bad = true));
      if (typeof item.criterion !== "string" || !CRITERION_KEYS.includes(item.criterion as CriterionKey))
        (errors.push(`${p}.criterion: must be one of ${CRITERION_KEYS.join(", ")}`), (bad = true));
      if (typeof item.tag !== "string" || !ERROR_TAG_SET.has(item.tag)) (errors.push(`${p}.tag: unknown tag ${JSON.stringify(item.tag)}`), (bad = true));
      if (!isNonEmptyStr(item.explanation)) (errors.push(`${p}.explanation: expected a non-empty string`), (bad = true));
      if (typeof item.suggestion !== "string") (errors.push(`${p}.suggestion: expected a string`), (bad = true));
      if (!bad)
        issues.push({
          quote: (item.quote as string).trim(),
          criterion: item.criterion as CriterionKey,
          tag: item.tag as ErrorTag,
          explanation: (item.explanation as string).trim(),
          suggestion: (item.suggestion as string).trim(),
        });
    });

  // criteria
  const criteria = {} as Record<CriterionKey, GraderCriterion>;
  if (!isObj(raw.criteria)) errors.push("criteria: expected an object with task, coherence, lexical, grammar");
  else
    for (const key of CRITERION_KEYS) {
      const c = raw.criteria[key];
      const p = `criteria.${key}`;
      if (!isObj(c)) {
        errors.push(`${p}: missing`);
        continue;
      }
      const band = parseBand(c.band);
      if (band === null) errors.push(`${p}.band: ${JSON.stringify(c.band)} is not a band (0–9 in steps of 0.5)`);
      if (!isNonEmptyStr(c.rationale)) errors.push(`${p}.rationale: expected a non-empty string`);
      if (typeof c.toNextBand !== "string") errors.push(`${p}.toNextBand: expected a string`);
      const evidence = stringArray(c.evidence, `${p}.evidence`, errors);
      criteria[key] = {
        evidence,
        rationale: typeof c.rationale === "string" ? c.rationale.trim() : "",
        band: band ?? NaN,
        toNextBand: typeof c.toNextBand === "string" ? c.toNextBand.trim() : "",
      };
    }

  // strengths, priorities, summary
  const strengths = stringArray(raw.strengths, "strengths", errors);
  const priorities: GraderOutput["priorities"] = [];
  if (!Array.isArray(raw.priorities)) errors.push("priorities: expected an array");
  else
    raw.priorities.forEach((item, i) => {
      if (!isObj(item) || !isNonEmptyStr(item.title) || !isNonEmptyStr(item.why) || !isNonEmptyStr(item.how))
        return void errors.push(`priorities[${i}]: expected {title, why, how} non-empty strings`);
      priorities.push({ title: item.title.trim(), why: item.why.trim(), how: item.how.trim() });
    });
  if (!isNonEmptyStr(raw.summary)) errors.push("summary: expected a non-empty string");

  // rewrite (empty original ⇒ none)
  let rewrite: GraderOutput["rewrite"] = null;
  if (raw.rewrite !== null && raw.rewrite !== undefined) {
    if (!isObj(raw.rewrite)) errors.push("rewrite: expected an object");
    else {
      const r = raw.rewrite;
      const original = typeof r.original === "string" ? r.original.trim() : "";
      const improved = typeof r.improved === "string" ? r.improved.trim() : "";
      const changes = r.changes === undefined ? [] : stringArray(r.changes, "rewrite.changes", errors);
      if (typeof r.original !== "string" || typeof r.improved !== "string") errors.push("rewrite: original and improved must be strings");
      else if (original && !improved) errors.push("rewrite.improved: empty while original is given");
      if (original && improved) rewrite = { original, improved, changes };
    }
  }

  // model answer
  let modelAnswer: string | null = null;
  if (raw.modelAnswer !== undefined && raw.modelAnswer !== null && typeof raw.modelAnswer !== "string") errors.push("modelAnswer: expected a string");
  const ma = typeof raw.modelAnswer === "string" ? raw.modelAnswer.trim() : "";
  if (ctx.includeModelAnswer) {
    if (ma.split(/\s+/).filter(Boolean).length < 80) errors.push("modelAnswer: a complete model answer was requested but not provided");
    else modelAnswer = ma;
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: { variantDetected, flags, checklist, issues, criteria, strengths, priorities, summary: (raw.summary as string).trim(), rewrite, modelAnswer },
  };
}

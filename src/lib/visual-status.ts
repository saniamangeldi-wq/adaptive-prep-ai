import { useEffect, useState } from "react";
import type { Question } from "@/lib/test-generator";
import {
  deriveVisualRequirement,
  isPotentiallyRenderableFigure,
  isUsableTextEquivalent,
  isValidTable,
  validateQuestion,
  type VisualRequirement,
} from "@/lib/sat-content";
import { resolveQuestionParts } from "@/lib/question-table";

/** Lifecycle of a question visual as observed by the renderer. */
export type VisualRenderStatus =
  | "not_required"
  | "checking"
  | "ok"
  | "degraded_re_render"
  | "degraded_text_fallback"
  | "broken_quarantined";

export const VISUAL_COPY = {
  checking: "Checking visual...",
  broken: "This practice item is temporarily unavailable because its required visual could not be loaded.",
  structuredFallback: "The original visual could not be displayed. Showing an accessible equivalent instead.",
  mathFallback: "A formatting issue was detected in this mathematical expression. A readable fallback is being shown.",
} as const;

/** Resolves the figure a question intends to show, from any legacy field. */
export function resolveFigure(question: Question) {
  if (question.figure) return question.figure;
  if (question.image_url) {
    return { type: "image" as const, src: question.image_url, alt: question.image_alt || "Question figure" };
  }
  if (question.media?.src) {
    return { type: "image" as const, src: question.media.src, alt: question.media.alt || "Question figure" };
  }
  return undefined;
}

type ProbeState = "idle" | "checking" | "loaded" | "failed";

/**
 * Verifies that an image URL genuinely decodes. A non-empty URL is never
 * treated as proof of health — the probe must resolve first.
 */
export function useAssetProbe(src: string | undefined): ProbeState {
  const [state, setState] = useState<ProbeState>(src ? "checking" : "idle");

  useEffect(() => {
    if (!src) {
      setState("idle");
      return;
    }
    if (!/^(https?:|data:image\/)/i.test(src)) {
      setState("failed");
      return;
    }
    let cancelled = false;
    setState("checking");
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setState(img.naturalWidth > 0 ? "loaded" : "failed");
    };
    img.onerror = () => {
      if (!cancelled) setState("failed");
    };
    img.src = src;
    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return state;
}

export interface VisualPlan {
  requirement: VisualRequirement;
  /** Renderable inline SVG figure, already shape-checked. */
  svg?: string;
  /** Primary image asset that still needs to be verified. */
  imageSrc?: string;
  alt?: string;
  caption?: string;
  /** Structured re-render source. */
  table?: ReturnType<typeof resolveQuestionParts>["table"];
  /** Self-contained textual equivalent. */
  textEquivalent?: string;
}

/** Collects every representation available for a question's visual. */
export function buildVisualPlan(question: Question): VisualPlan {
  const figure = resolveFigure(question);
  const { table: recovered } = resolveQuestionParts(question);
  const structured = isValidTable(question.table)
    ? question.table
    : isValidTable(question.media?.data)
      ? question.media?.data
      : recovered;

  const renderable = isPotentiallyRenderableFigure(figure);
  return {
    requirement: deriveVisualRequirement(question),
    svg: renderable && figure?.type === "svg" ? figure.svg : undefined,
    imageSrc: renderable && figure?.type === "image" ? figure.src : undefined,
    alt: figure?.alt,
    caption: figure?.caption,
    table: structured,
    textEquivalent: isUsableTextEquivalent(question.media?.text_equivalent)
      ? question.media?.text_equivalent
      : undefined,
  };
}

/**
 * Resolves the terminal status once the asset probe has settled. `checking` is
 * owned by the renderer while a probe is still in flight.
 */
export function resolveVisualStatus(plan: VisualPlan, assetOk: boolean | null): VisualRenderStatus {
  if (plan.imageSrc && assetOk === null) return "checking";
  if (plan.svg) return "ok";
  if (plan.imageSrc && assetOk) return "ok";
  if (plan.table) return plan.requirement === "none" && !plan.imageSrc ? "ok" : "degraded_re_render";
  if (plan.textEquivalent) return "degraded_text_fallback";
  return plan.requirement === "required" ? "broken_quarantined" : "not_required";
}

export interface PracticeSetScan {
  total: number;
  visual_required: number;
  visual_optional: number;
  no_visual_requirement: number;
  ok: number;
  degraded: number;
  broken: number;
}

/** Static health scan of an assembled practice set. */
export function scanPracticeSet(questions: Question[]): PracticeSetScan {
  const scan: PracticeSetScan = {
    total: questions.length,
    visual_required: 0,
    visual_optional: 0,
    no_visual_requirement: 0,
    ok: 0,
    degraded: 0,
    broken: 0,
  };

  for (const question of questions) {
    const plan = buildVisualPlan(question);
    if (plan.requirement === "required") scan.visual_required++;
    else if (plan.requirement === "optional") scan.visual_optional++;
    else scan.no_visual_requirement++;

    const result = validateQuestion(question, Boolean(plan.table));
    if (result.delivery_status === "quarantined") scan.broken++;
    else if (result.delivery_status === "degraded" || result.delivery_status === "needs_review") scan.degraded++;
    else scan.ok++;
  }

  return scan;
}

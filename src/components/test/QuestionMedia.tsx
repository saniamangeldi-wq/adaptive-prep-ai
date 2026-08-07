import DOMPurify from "dompurify";
import { MathRenderer } from "@/components/MathRenderer";
import type { Question, QuestionFigure, QuestionTable } from "@/lib/test-generator";
import { resolveQuestionParts } from "@/lib/question-table";
import { isPotentiallyRenderableFigure, shouldShowVisualFallback } from "@/lib/sat-content";
import { logVisualHealthEvent } from "@/lib/visual-health";
import { useEffect, useState } from "react";

/**
 * SVG sanitizer backed by DOMPurify. Strips scripts, event handlers, and
 * javascript: URLs while preserving safe SVG markup for question figures.
 */
export function sanitizeSvg(raw: string): string {
  if (!raw) return "";
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["script", "foreignObject"],
    FORBID_ATTR: ["onerror", "onload", "onclick"],
  });
}


export function resolveFigure(question: Question): QuestionFigure | undefined {
  if (question.figure) return question.figure;
  if (question.image_url) {
    return { type: "image", src: question.image_url, alt: question.image_alt || "Question figure" };
  }
  return undefined;
}

function DataTable({ table }: { table: QuestionTable }) {
  return (
    <figure className="my-4 flex flex-col items-center overflow-x-auto">
      <table className="min-w-[240px] max-w-full border-separate border-spacing-0 rounded-lg overflow-hidden border border-border bg-card text-sm shadow-sm">
        <thead className="bg-muted">
          <tr>
            {table.headers.map((h, i) => (
              <th
                key={i}
                className="border-b border-border px-4 py-3 text-center font-semibold text-foreground tracking-wide"
              >
                <MathRenderer text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className="last:border-b-0">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="border-b border-border px-4 py-3 text-center text-foreground tabular-nums"
                >
                  <MathRenderer text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.caption && (
        <figcaption className="mt-2 text-xs text-muted-foreground text-center">
          {table.caption}
        </figcaption>
      )}
    </figure>
  );
}

function VisualFallback({ question, reason }: { question?: Question; reason?: "missing" | "unreachable" | "invalid" }) {
  useEffect(() => {
    if (question) logVisualHealthEvent(question, "fallback_rendered", reason ?? "missing");
  }, [question, reason]);
  return (
    <div role="status" className="my-4 flex min-h-28 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-8 text-center text-sm font-medium text-muted-foreground">
      Source visual unavailable
    </div>
  );
}

function Figure({ figure, question }: { figure: QuestionFigure; question: Question }) {
  const [imageFailed, setImageFailed] = useState(false);
  const safeSvg = figure.type === "svg" && figure.svg ? sanitizeSvg(figure.svg) : "";
  const validSvg = safeSvg && /<svg\b/i.test(safeSvg) && /<(?:path|line|polyline|polygon|rect|circle|ellipse|text|image)\b/i.test(safeSvg);
  if (!isPotentiallyRenderableFigure(figure) || (figure.type === "svg" && !validSvg) || imageFailed) return <VisualFallback question={question} reason={imageFailed ? "unreachable" : "invalid"} />;
  return (
    <figure className="my-4 flex flex-col items-center">
      <div className="flex justify-center p-5 rounded-xl bg-background border border-border shadow-sm">
        {figure.type === "svg" && figure.svg ? (
          <div
            role="img"
            aria-label={figure.alt}
            className="max-w-full [&>svg]:max-h-[420px] [&>svg]:w-auto"
            dangerouslySetInnerHTML={{ __html: safeSvg }}
          />
        ) : figure.src ? (
          <img
            src={figure.src}
            alt={figure.alt}
            className="max-w-full max-h-[420px] object-contain"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : null}
      </div>
      {figure.caption && (
        <figcaption className="mt-2 text-xs text-muted-foreground text-center">
          {figure.caption}
        </figcaption>
      )}
    </figure>
  );
}

interface QuestionMediaProps {
  question: Question;
  /** Optional className applied to the stimulus paragraph. */
  stimulusClassName?: string;
}

/**
 * Renders, in order: stimulus (if any) → figure/table (if any).
 * The prompt text and options are rendered by the caller.
 */
export function QuestionMedia({ question, stimulusClassName }: QuestionMediaProps) {
  const figure = resolveFigure(question);
  const { table, text } = resolveQuestionParts(question);
  const showFallback = shouldShowVisualFallback(question, text, Boolean(table));
  const hasAny = question.stimulus || table || figure || showFallback;
  if (!hasAny) return null;

  return (
    <div className="space-y-4">
      {question.stimulus && (
        <MathRenderer
          as="div"
          className={
            stimulusClassName ??
            "p-4 rounded-xl bg-muted/40 border border-border/50 text-foreground leading-relaxed whitespace-pre-line"
          }
          text={question.stimulus}
        />
      )}
      {figure && <Figure figure={figure} question={question} />}
      {table && <DataTable table={table} />}
      {!figure && !table && showFallback && <VisualFallback question={question} reason="missing" />}
    </div>
  );
}

export default QuestionMedia;

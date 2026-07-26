import DOMPurify from "dompurify";
import { MathRenderer } from "@/components/MathRenderer";
import type { Question, QuestionFigure, QuestionTable } from "@/lib/test-generator";

/**
 * SVG sanitizer backed by DOMPurify. Strips scripts, event handlers, and
 * javascript: URLs while preserving safe SVG markup for question figures.
 */
function sanitizeSvg(raw: string): string {
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
    <figure className="my-2 overflow-x-auto">
      <table className="min-w-[240px] border-collapse border border-border rounded-lg overflow-hidden text-sm">
        <thead className="bg-muted/60">
          <tr>
            {table.headers.map((h, i) => (
              <th
                key={i}
                className="border border-border px-3 py-2 text-left font-semibold text-foreground"
              >
                <MathRenderer text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className="odd:bg-background even:bg-muted/20">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="border border-border px-3 py-2 text-foreground align-top"
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

function Figure({ figure }: { figure: QuestionFigure }) {
  return (
    <figure className="my-2">
      <div className="flex justify-center p-4 rounded-xl bg-white border border-border/50">
        {figure.type === "svg" && figure.svg ? (
          <div
            role="img"
            aria-label={figure.alt}
            className="max-w-full [&>svg]:max-h-[420px] [&>svg]:w-auto"
            dangerouslySetInnerHTML={{ __html: sanitizeSvg(figure.svg) }}
          />
        ) : figure.src ? (
          <img
            src={figure.src}
            alt={figure.alt}
            className="max-w-full max-h-[420px] object-contain"
            loading="lazy"
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
  const hasAny = question.stimulus || question.table || figure;
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
      {figure && <Figure figure={figure} />}
      {question.table && <DataTable table={question.table} />}
    </div>
  );
}

export default QuestionMedia;

import { MathRenderer } from "@/components/MathRenderer";
import type { Question, QuestionFigure, QuestionTable } from "@/lib/test-generator";

/**
 * Minimal SVG sanitizer: strips <script> tags, on* event handlers, and
 * javascript: URLs. Not a full XSS shield — only safe for trusted-authored
 * content bundled with the question bank. Do not use for arbitrary user input.
 */
function sanitizeSvg(raw: string): string {
  if (!raw) return "";
  let s = raw;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  s = s.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  s = s.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");
  s = s.replace(/(href|xlink:href)\s*=\s*"(\s*javascript:[^"]*)"/gi, '$1="#"');
  s = s.replace(/(href|xlink:href)\s*=\s*'(\s*javascript:[^']*)'/gi, "$1='#'");
  return s;
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

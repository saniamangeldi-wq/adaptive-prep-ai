import { MathRenderer } from "@/components/MathRenderer";
import type { Question } from "@/lib/test-generator";
import { resolveQuestionParts } from "@/lib/question-table";
import { VisualRenderer } from "@/components/test/VisualRenderer";

export { sanitizeSvg, DataTable } from "@/components/test/VisualRenderer";
export { resolveFigure } from "@/lib/visual-status";

interface QuestionMediaProps {
  question: Question;
  /** Optional className applied to the stimulus paragraph. */
  stimulusClassName?: string;
}

/**
 * Renders, in order: stimulus (if any) -> verified visual (if any).
 * The prompt text and options are rendered by the caller.
 */
export function QuestionMedia({ question, stimulusClassName }: QuestionMediaProps) {
  const { table } = resolveQuestionParts(question);
  if (!question.stimulus && !table && !question.figure && !question.image_url && !question.media) return null;

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
      <VisualRenderer question={question} />
    </div>
  );
}

export default QuestionMedia;

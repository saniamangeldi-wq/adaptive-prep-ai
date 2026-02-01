import { cn } from "@/lib/utils";
import type { Question } from "@/lib/test-generator";

interface QuestionNavProps {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, string>;
  flaggedQuestions: Set<string>;
  onNavigate: (index: number) => void;
}

export function QuestionNav({
  questions,
  currentIndex,
  answers,
  flaggedQuestions,
  onNavigate,
}: QuestionNavProps) {
  return (
    <div className="bg-card rounded-xl border border-border/50 p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Questions</h3>
      <div className="grid grid-cols-5 gap-2">
        {questions.map((question, index) => {
          const isAnswered = !!answers[question.id];
          const isFlagged = flaggedQuestions.has(question.id);
          const isCurrent = index === currentIndex;

          return (
            <button
              key={question.id}
              onClick={() => onNavigate(index)}
              className={cn(
                "relative w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200",
                isCurrent
                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : isAnswered
                  ? "bg-primary/20 text-primary hover:bg-primary/30"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {index + 1}
              {isFlagged && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-muted" />
          <span>Unanswered</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-primary/20" />
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative w-4 h-4 rounded bg-muted">
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-500 rounded-full" />
          </span>
          <span>Flagged</span>
        </div>
      </div>
    </div>
  );
}

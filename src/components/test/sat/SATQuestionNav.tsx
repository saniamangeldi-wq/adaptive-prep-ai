import { cn } from "@/lib/utils";
import { Flag } from "lucide-react";
import type { Question } from "@/lib/test-generator";

interface SATQuestionNavProps {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, string>;
  flaggedQuestions: Set<string>;
  onNavigate: (index: number) => void;
}

export function SATQuestionNav({
  questions,
  currentIndex,
  answers,
  flaggedQuestions,
  onNavigate,
}: SATQuestionNavProps) {
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = flaggedQuestions.size;

  return (
    <div className="p-4 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-muted">
          <div className="text-lg font-bold text-foreground">{questions.length}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        <div className="p-2 rounded-lg bg-primary/10">
          <div className="text-lg font-bold text-primary">{answeredCount}</div>
          <div className="text-xs text-muted-foreground">Done</div>
        </div>
        <div className="p-2 rounded-lg bg-orange-500/10">
          <div className="text-lg font-bold text-orange-500">{flaggedCount}</div>
          <div className="text-xs text-muted-foreground">Flagged</div>
        </div>
      </div>

      {/* Question Grid */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Go to Question
        </h3>
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
                  <Flag className="absolute -top-1 -right-1 w-3 h-3 text-orange-500 fill-orange-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2 pt-4 border-t border-border">
        <h4 className="text-xs font-medium text-muted-foreground uppercase">Legend</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-primary text-primary-foreground flex items-center justify-center text-[10px]">1</span>
            <span className="text-muted-foreground">Current</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-primary/20 text-primary flex items-center justify-center text-[10px]">1</span>
            <span className="text-muted-foreground">Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-muted text-muted-foreground flex items-center justify-center text-[10px]">1</span>
            <span className="text-muted-foreground">Unanswered</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px]">
              1
              <Flag className="absolute -top-1 -right-1 w-2.5 h-2.5 text-orange-500 fill-orange-500" />
            </span>
            <span className="text-muted-foreground">Flagged</span>
          </div>
        </div>
      </div>
    </div>
  );
}

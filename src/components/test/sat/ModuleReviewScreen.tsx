import { AlertTriangle, ArrowLeft, CheckCircle2, Flag, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Question } from "@/lib/test-generator";

interface ModuleReviewScreenProps {
  questions: Question[];
  answers: Record<string, string>;
  flaggedQuestions: Set<string>;
  section: "reading_writing" | "math";
  moduleNumber: 1 | 2;
  onReturnToQuestion: (index: number) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export function ModuleReviewScreen({
  questions,
  answers,
  flaggedQuestions,
  section,
  moduleNumber,
  onReturnToQuestion,
  onSubmit,
  isSubmitting,
}: ModuleReviewScreenProps) {
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;
  const flaggedCount = flaggedQuestions.size;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-3xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Review Your Answers
          </h1>
          <p className="text-muted-foreground">
            {section === "math" ? "Math" : "Reading and Writing"} - Module {moduleNumber}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
            <div className="text-3xl font-bold text-primary">{answeredCount}</div>
            <div className="text-sm text-muted-foreground">Answered</div>
          </div>
          <div className={cn(
            "rounded-xl border p-4 text-center",
            unansweredCount > 0
              ? "bg-yellow-500/10 border-yellow-500/30"
              : "bg-card border-border/50"
          )}>
            <div className={cn(
              "text-3xl font-bold",
              unansweredCount > 0 ? "text-yellow-500" : "text-muted-foreground"
            )}>
              {unansweredCount}
            </div>
            <div className="text-sm text-muted-foreground">Unanswered</div>
          </div>
          <div className={cn(
            "rounded-xl border p-4 text-center",
            flaggedCount > 0
              ? "bg-orange-500/10 border-orange-500/30"
              : "bg-card border-border/50"
          )}>
            <div className={cn(
              "text-3xl font-bold",
              flaggedCount > 0 ? "text-orange-500" : "text-muted-foreground"
            )}>
              {flaggedCount}
            </div>
            <div className="text-sm text-muted-foreground">Flagged</div>
          </div>
        </div>

        {/* Warning Message */}
        {unansweredCount > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div className="text-sm text-foreground">
              You have <strong>{unansweredCount} unanswered question{unansweredCount > 1 ? "s" : ""}</strong>.
              {" "}There is no penalty for guessing.
            </div>
          </div>
        )}

        {/* Question Grid */}
        <div className="bg-card rounded-2xl border border-border/50 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Questions</h2>
          <div className="grid grid-cols-5 sm:grid-cols-9 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = !!answers[q.id];
              const isFlagged = flaggedQuestions.has(q.id);

              return (
                <button
                  key={q.id}
                  onClick={() => onReturnToQuestion(idx)}
                  className={cn(
                    "relative w-full aspect-square rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105",
                    isAnswered
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-muted text-muted-foreground border border-border",
                    isFlagged && "ring-2 ring-orange-500 ring-offset-2 ring-offset-background"
                  )}
                >
                  {idx + 1}
                  {isFlagged && (
                    <Flag className="absolute -top-1 -right-1 w-3 h-3 text-orange-500 fill-orange-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-border/50 flex flex-wrap gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-primary/20 border border-primary/30" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-muted border border-border" />
              <span>Unanswered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative w-4 h-4 rounded bg-muted border border-border ring-2 ring-orange-500">
                <Flag className="absolute -top-1 -right-1 w-2 h-2 text-orange-500 fill-orange-500" />
              </span>
              <span>Flagged</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => onReturnToQuestion(0)}
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Questions
          </Button>
          <Button
            variant="hero"
            size="lg"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Module
              </>
            )}
          </Button>
        </div>

        {/* Warning about not being able to return */}
        <p className="text-center text-sm text-muted-foreground">
          ⚠️ Once you submit, you cannot return to this module.
        </p>
      </div>
    </div>
  );
}

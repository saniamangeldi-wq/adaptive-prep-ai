import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  VAK_QUESTIONS,
  getQuestionCountForTier,
  getEstimatedMinutes,
  type VAKStyle,
} from "@/lib/vak-questions";

interface VAKAssessmentProps {
  tier: string;
  savedProgress?: { answers: Record<number, VAKStyle>; currentIndex: number } | null;
  onComplete: (answers: Record<number, VAKStyle>) => void;
  onProgressSave: (answers: Record<number, VAKStyle>, currentIndex: number) => void;
}

export function VAKAssessment({
  tier,
  savedProgress,
  onComplete,
  onProgressSave,
}: VAKAssessmentProps) {
  const totalQuestions = getQuestionCountForTier(tier);
  const questions = VAK_QUESTIONS.slice(0, totalQuestions);
  const estimatedMinutes = getEstimatedMinutes(totalQuestions);

  const [started, setStarted] = useState(!!savedProgress);
  const [currentIndex, setCurrentIndex] = useState(savedProgress?.currentIndex ?? 0);
  const [answers, setAnswers] = useState<Record<number, VAKStyle>>(
    savedProgress?.answers ?? {}
  );

  // Auto-save progress every time answer changes
  useEffect(() => {
    if (started && Object.keys(answers).length > 0) {
      onProgressSave(answers, currentIndex);
    }
  }, [answers, currentIndex, started]);

  const handleAnswer = useCallback(
    (style: VAKStyle) => {
      const updated = { ...answers, [currentIndex]: style };
      setAnswers(updated);

      // Auto-advance after short delay
      setTimeout(() => {
        if (currentIndex < totalQuestions - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          onComplete(updated);
        }
      }, 300);
    },
    [answers, currentIndex, totalQuestions, onComplete]
  );

  const handleBack = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const progress = ((currentIndex + (answers[currentIndex] !== undefined ? 1 : 0)) / totalQuestions) * 100;

  // ─── Start Screen ────────────────────────────────────────
  if (!started) {
    return (
      <div className="space-y-8 text-center">
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground">
            Learning Style Assessment
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Discover how you learn best. Your results will personalize your
            entire platform experience.
          </p>
        </div>

        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            {totalQuestions} questions
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            ~{estimatedMinutes} minutes
          </span>
        </div>

        <div className="p-4 rounded-xl bg-secondary/50 border border-border text-left max-w-sm mx-auto">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">How it works:</strong> Choose the
            option that best describes you in each scenario. There are no right
            or wrong answers — just be honest!
          </p>
        </div>

        {savedProgress && Object.keys(savedProgress.answers).length > 0 && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
            <p className="text-foreground">
              You left your assessment at Question{" "}
              {savedProgress.currentIndex + 1}. Continue where you left off?
            </p>
          </div>
        )}

        <Button
          variant="hero"
          size="lg"
          onClick={() => setStarted(true)}
          className="min-w-[200px]"
        >
          {savedProgress && Object.keys(savedProgress.answers).length > 0
            ? "Continue Assessment"
            : "Start Assessment"}
        </Button>
      </div>
    );
  }

  // ─── Question Screen ─────────────────────────────────────
  const question = questions[currentIndex];
  if (!question) return null;

  return (
    <div className="space-y-6">
      {/* Sticky progress */}
      <div className="sticky top-0 z-10 bg-background pt-2 pb-4 -mx-2 px-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <h2 className="text-xl md:text-2xl font-bold text-foreground leading-tight min-h-[3.5rem]">
        {question.question}
      </h2>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option, idx) => {
          const letter = ["A", "B", "C"][idx];
          const isSelected = answers[currentIndex] === option.style;
          return (
            <button
              key={option.style}
              onClick={() => handleAnswer(option.style)}
              className={cn(
                "w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-start gap-3",
                "min-h-[48px] text-base",
                isSelected
                  ? "border-primary bg-primary/10 scale-[1.01]"
                  : "border-border hover:border-primary/50 active:scale-[0.99]"
              )}
            >
              <span
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {letter}
              </span>
              <span className="text-foreground pt-1">{option.text}</span>
            </button>
          );
        })}
      </div>

      {/* Back button */}
      {currentIndex > 0 && (
        <button
          onClick={handleBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Previous question
        </button>
      )}
    </div>
  );
}

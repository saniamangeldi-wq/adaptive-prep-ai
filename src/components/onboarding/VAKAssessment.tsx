import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Clock, AlertCircle, Zap, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  VAK_QUESTIONS,
  VAK_LENGTHS,
  getQuestionCountForLength,
  getQuestionCountForTier,
  getEstimatedMinutes,
  pickRandomQuestionIds,
  type VAKStyle,
  type VAKLength,
} from "@/lib/vak-questions";

interface VAKAssessmentProps {
  tier: string;
  /** If true, show the Quick vs Full picker (retake flow). Onboarding uses quick by default. */
  allowLengthChoice?: boolean;
  savedProgress?: { answers: Record<number, VAKStyle>; currentIndex: number; questionIds?: number[]; length?: VAKLength } | null;
  onComplete: (answers: Record<number, VAKStyle>) => void;
  onProgressSave: (answers: Record<number, VAKStyle>, currentIndex: number, questionIds: number[], length: VAKLength) => void;
}

export function VAKAssessment({
  tier,
  allowLengthChoice = false,
  savedProgress,
  onComplete,
  onProgressSave,
}: VAKAssessmentProps) {
  // Length state — default 'quick' for onboarding, saved progress overrides.
  const [length, setLength] = useState<VAKLength>(savedProgress?.length ?? "quick");
  const [started, setStarted] = useState(!!savedProgress);

  // Randomized question ids for this attempt (stable once started).
  const [questionIds, setQuestionIds] = useState<number[]>(
    savedProgress?.questionIds ?? pickRandomQuestionIds(getQuestionCountForLength(savedProgress?.length ?? "quick"))
  );

  const questions = useMemo(
    () => questionIds.map((id) => VAK_QUESTIONS.find((q) => q.id === id)!).filter(Boolean),
    [questionIds]
  );
  const totalQuestions = questions.length;
  const estimatedMinutes = getEstimatedMinutes(totalQuestions);

  const [currentIndex, setCurrentIndex] = useState(savedProgress?.currentIndex ?? 0);
  const [answers, setAnswers] = useState<Record<number, VAKStyle>>(
    savedProgress?.answers ?? {}
  );

  // Auto-save progress every time answer changes
  useEffect(() => {
    if (started && Object.keys(answers).length > 0) {
      onProgressSave(answers, currentIndex, questionIds, length);
    }
  }, [answers, currentIndex, started]);

  const handleAnswer = useCallback(
    (style: VAKStyle) => {
      const qId = questions[currentIndex]?.id;
      if (qId === undefined) return;
      const updated = { ...answers, [qId]: style };
      setAnswers(updated);

      setTimeout(() => {
        if (currentIndex < totalQuestions - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          onComplete(updated);
        }
      }, 300);
    },
    [answers, currentIndex, questions, totalQuestions, onComplete]
  );

  const handleBack = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const pickLength = (l: VAKLength) => {
    setLength(l);
    setQuestionIds(pickRandomQuestionIds(getQuestionCountForLength(l)));
    setAnswers({});
    setCurrentIndex(0);
  };

  const currentQId = questions[currentIndex]?.id;
  const progress = ((currentIndex + (currentQId !== undefined && answers[currentQId] !== undefined ? 1 : 0)) / totalQuestions) * 100;

  // ─── Start Screen ────────────────────────────────────────
  if (!started) {
    return (
      <div className="space-y-8 text-center">
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground">
            Learning Preferences Check-In
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            A quick way to tell us which content formats you tend to engage with most. We'll use it to pick smart defaults — you can switch formats on any lesson.
          </p>
        </div>

        {allowLengthChoice && (
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
            <button
              onClick={() => pickLength("quick")}
              className={cn(
                "p-4 rounded-xl border-2 text-left transition-all",
                length === "quick" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">Quick</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {VAK_LENGTHS.quick} questions · ~{getEstimatedMinutes(VAK_LENGTHS.quick)} min
              </p>
            </button>
            <button
              onClick={() => pickLength("full")}
              className={cn(
                "p-4 rounded-xl border-2 text-left transition-all",
                length === "full" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">Full</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {VAK_LENGTHS.full} questions · ~{getEstimatedMinutes(VAK_LENGTHS.full)} min · more accurate
              </p>
            </button>
          </div>
        )}

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
          const isSelected = currentQId !== undefined && answers[currentQId] === option.style;
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

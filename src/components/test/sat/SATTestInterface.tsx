import { useState, useCallback, useEffect } from "react";
import { Flag, Calculator, ChevronLeft, ChevronRight, Pencil, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SATQuestionCard } from "./SATQuestionCard";
import { SATTimer } from "./SATTimer";
import { SATQuestionNav } from "./SATQuestionNav";
import type { Question } from "@/lib/test-generator";

interface SATTestInterfaceProps {
  questions: Question[];
  section: "reading_writing" | "math";
  moduleNumber: 1 | 2;
  timeLimitSeconds: number;
  answers: Record<string, string>;
  flaggedQuestions: Set<string>;
  onAnswerChange: (questionId: string, answer: string) => void;
  onToggleFlag: (questionId: string) => void;
  onTimeUp: () => void;
  onReview: () => void;
}

export function SATTestInterface({
  questions,
  section,
  moduleNumber,
  timeLimitSeconds,
  answers,
  flaggedQuestions,
  onAnswerChange,
  onToggleFlag,
  onTimeUp,
  onReview,
}: SATTestInterfaceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showNav, setShowNav] = useState(false);

  const currentQuestion = questions[currentIndex];

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onReview();
    }
  }, [currentIndex, questions.length, onReview]);

  const handleNavigate = useCallback((index: number) => {
    setCurrentIndex(index);
    setShowNav(false);
  }, []);

  const handleAnswerSelect = useCallback((answer: string) => {
    onAnswerChange(currentQuestion.id, answer);
  }, [currentQuestion.id, onAnswerChange]);

  const handleToggleCurrentFlag = useCallback(() => {
    onToggleFlag(currentQuestion.id);
  }, [currentQuestion.id, onToggleFlag]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrevious();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrevious, handleNext]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Navigation Bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">
            {section === "math" ? "Math" : "Reading and Writing"}
          </span>
          <span className="px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
            Module {moduleNumber}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <SATTimer 
            initialSeconds={timeLimitSeconds} 
            onTimeUp={onTimeUp}
          />
        </div>

        <div className="flex items-center gap-2">
          {section === "math" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCalculator(!showCalculator)}
              className={cn(showCalculator && "bg-primary/10 text-primary")}
            >
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Calculator</span>
            </Button>
          )}
          <Button variant="ghost" size="sm">
            <Pencil className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Annotate</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNav(!showNav)}
            className={cn(showNav && "bg-primary/10 text-primary")}
          >
            <Grid3X3 className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Review</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Question Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Question Header */}
          <div className="flex items-center justify-between px-4 sm:px-8 py-3 border-b border-border/50">
            <span className="text-sm font-medium text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleCurrentFlag}
              className={cn(
                "gap-2",
                flaggedQuestions.has(currentQuestion.id) && "text-orange-500"
              )}
            >
              <Flag className={cn(
                "w-4 h-4",
                flaggedQuestions.has(currentQuestion.id) && "fill-current"
              )} />
              {flaggedQuestions.has(currentQuestion.id) ? "Flagged" : "Flag for Review"}
            </Button>
          </div>

          {/* Question Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
            <SATQuestionCard
              question={currentQuestion}
              selectedAnswer={answers[currentQuestion.id]}
              onAnswerChange={handleAnswerSelect}
            />
          </div>

          {/* Bottom Navigation */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-8 py-4 border-t border-border bg-card">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {questions.length}
            </span>

            <Button
              variant={currentIndex === questions.length - 1 ? "hero" : "default"}
              onClick={handleNext}
            >
              {currentIndex === questions.length - 1 ? "Review Answers" : "Next"}
              {currentIndex < questions.length - 1 && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Question Navigator Sidebar */}
        {showNav && (
          <div className="w-72 border-l border-border bg-card overflow-y-auto">
            <SATQuestionNav
              questions={questions}
              currentIndex={currentIndex}
              answers={answers}
              flaggedQuestions={flaggedQuestions}
              onNavigate={handleNavigate}
            />
          </div>
        )}
      </div>

      {/* Calculator Modal (placeholder) */}
      {showCalculator && section === "math" && (
        <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted">
            <span className="font-medium text-sm">Desmos Calculator</span>
            <Button variant="ghost" size="sm" onClick={() => setShowCalculator(false)}>
              ✕
            </Button>
          </div>
          <iframe
            src="https://www.desmos.com/calculator"
            className="w-full h-[calc(100%-40px)]"
            title="Desmos Calculator"
          />
        </div>
      )}
    </div>
  );
}

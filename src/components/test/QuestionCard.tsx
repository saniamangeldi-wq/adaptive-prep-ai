import { useState } from "react";
import { Flag, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Question } from "@/lib/test-generator";

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: string | undefined;
  onAnswerChange: (answer: string) => void;
  isFlagged: boolean;
  onToggleFlag: () => void;
  showCorrectAnswer?: boolean;
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onAnswerChange,
  isFlagged,
  onToggleFlag,
  showCorrectAnswer = false,
}: QuestionCardProps) {
  const [gridInValue, setGridInValue] = useState(selectedAnswer || "");

  const handleGridInChange = (value: string) => {
    setGridInValue(value);
    onAnswerChange(value);
  };

  const isCorrectAnswer = (option: string) => {
    return showCorrectAnswer && option === question.correct_answer;
  };

  const isWrongAnswer = (option: string) => {
    return showCorrectAnswer && selectedAnswer === option && option !== question.correct_answer;
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground">
            Question {questionNumber} of {totalQuestions}
          </span>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-xs font-medium",
            question.section === "math" 
              ? "bg-blue-500/10 text-blue-500" 
              : "bg-purple-500/10 text-purple-500"
          )}>
            {question.section === "math" ? "Math" : "Reading & Writing"}
          </span>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-xs font-medium",
            question.difficulty === "easy" 
              ? "bg-green-500/10 text-green-500"
              : question.difficulty === "normal"
              ? "bg-yellow-500/10 text-yellow-500"
              : "bg-red-500/10 text-red-500"
          )}>
            {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleFlag}
          className={cn(
            "gap-2",
            isFlagged && "text-yellow-500 hover:text-yellow-600"
          )}
        >
          <Flag className={cn("w-4 h-4", isFlagged && "fill-current")} />
          {isFlagged ? "Flagged" : "Flag"}
        </Button>
      </div>

      {/* Question */}
      <div className="p-6 space-y-6">
        <p className="text-lg text-foreground leading-relaxed">{question.text}</p>

        {/* Answer Options */}
        {question.type === "multiple_choice" ? (
          <div className="space-y-3">
            {question.options.map((option, index) => {
              const optionLetter = String.fromCharCode(65 + index);
              const isSelected = selectedAnswer === option;
              const isCorrect = isCorrectAnswer(option);
              const isWrong = isWrongAnswer(option);

              return (
                <button
                  key={index}
                  onClick={() => !showCorrectAnswer && onAnswerChange(option)}
                  disabled={showCorrectAnswer}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200",
                    isCorrect
                      ? "border-green-500 bg-green-500/10"
                      : isWrong
                      ? "border-red-500 bg-red-500/10"
                      : isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50",
                    showCorrectAnswer && "cursor-default"
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors",
                      isCorrect
                        ? "bg-green-500 text-white"
                        : isWrong
                        ? "bg-red-500 text-white"
                        : isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCorrect ? <Check className="w-4 h-4" /> : optionLetter}
                  </span>
                  <span className={cn(
                    "flex-1",
                    isCorrect ? "text-green-600 font-medium" : isWrong ? "text-red-600" : "text-foreground"
                  )}>
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              Enter your answer:
            </label>
            <Input
              type="text"
              value={gridInValue}
              onChange={(e) => handleGridInChange(e.target.value)}
              placeholder="Type your answer..."
              className={cn(
                "text-lg h-12",
                showCorrectAnswer && selectedAnswer === question.correct_answer && "border-green-500 bg-green-500/10",
                showCorrectAnswer && selectedAnswer !== question.correct_answer && "border-red-500 bg-red-500/10"
              )}
              disabled={showCorrectAnswer}
            />
            {showCorrectAnswer && selectedAnswer !== question.correct_answer && (
              <p className="text-sm text-green-600">
                Correct answer: <strong>{question.correct_answer}</strong>
              </p>
            )}
          </div>
        )}

        {/* Explanation (shown in review mode) */}
        {showCorrectAnswer && question.explanation && (
          <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-sm font-medium text-muted-foreground mb-1">Explanation:</p>
            <p className="text-foreground">{question.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}

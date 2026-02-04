import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { Question } from "@/lib/test-generator";

interface SATQuestionCardProps {
  question: Question;
  selectedAnswer: string | undefined;
  onAnswerChange: (answer: string) => void;
}

export function SATQuestionCard({
  question,
  selectedAnswer,
  onAnswerChange,
}: SATQuestionCardProps) {
  const [gridInValue, setGridInValue] = useState(selectedAnswer || "");

  const handleGridInChange = (value: string) => {
    setGridInValue(value);
    onAnswerChange(value);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Question Text / Passage */}
      <div className="space-y-4">
        {question.text && question.text.length > 300 && (
          <div className="p-6 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-foreground leading-relaxed whitespace-pre-line">
              {question.text}
            </p>
          </div>
        )}

        {question.text && question.text.length <= 300 && (
          <p className="text-lg text-foreground leading-relaxed">
            {question.text}
          </p>
        )}
      </div>

      {/* Answer Choices */}
      {question.type === "multiple_choice" ? (
        <div className="space-y-3">
          {question.options.map((option, index) => {
            const letter = String.fromCharCode(65 + index); // A, B, C, D
            const isSelected = selectedAnswer === option;

            return (
              <button
                key={index}
                onClick={() => onAnswerChange(option)}
                className={cn(
                  "w-full grid grid-cols-[48px_1fr_48px] items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                {/* Letter Circle */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {letter}
                </div>

                {/* Option Text */}
                <span className="text-foreground">{option}</span>

                {/* Selection Indicator */}
                <div className="flex justify-end">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    )}
                  >
                    {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        // Grid-In Question
        <div className="space-y-4">
          <label className="text-sm font-medium text-muted-foreground">
            Enter your answer:
          </label>
          <Input
            type="text"
            value={gridInValue}
            onChange={(e) => handleGridInChange(e.target.value)}
            placeholder="Type your answer..."
            className="text-lg h-14 text-center font-mono"
          />
          <p className="text-xs text-muted-foreground">
            You may enter positive or negative numbers, fractions (e.g., 1/2), or decimals.
          </p>
        </div>
      )}
    </div>
  );
}

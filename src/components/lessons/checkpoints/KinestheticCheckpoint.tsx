import { MathRenderer } from "@/components/MathRenderer";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface KinestheticCheckpointProps {
  checkpoint: {
    question: string;
    options?: string[];
    correct_index?: number;
    explanation: string;
  };
  onAnswer: (correct: boolean) => void;
}

const ICONS = ["🔧", "⚡", "🎯", "💡"];

export function KinestheticCheckpoint({ checkpoint, onAnswer }: KinestheticCheckpointProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const options = checkpoint.options || [];

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    const isCorrect = idx === checkpoint.correct_index;
    setTimeout(() => onAnswer(isCorrect), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Scenario setup */}
      <div className="border-l-4 border-primary bg-primary/10 p-4 rounded-r-lg">
        <MathRenderer as="p" className="text-foreground font-medium" text={checkpoint.question} />
      </div>

      {/* Decision cards */}
      <div className="space-y-2">
        {options.map((opt, idx) => {
          const isCorrect = idx === checkpoint.correct_index;
          const isSelected = selected === idx;

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={answered}
              className={cn(
                "w-full text-left p-4 rounded-lg border-2 transition-all duration-300",
                !answered && "border-border hover:border-primary/50 cursor-pointer",
                answered && isSelected && isCorrect && "border-green-500 bg-green-500/10",
                answered && isSelected && !isCorrect && "border-amber-500 bg-amber-500/10",
                answered && !isSelected && "opacity-40"
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg">{ICONS[idx % ICONS.length]}</span>
                <span className="text-sm text-foreground">{opt}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {answered && selected !== null && (
        <div className={cn(
          "rounded-lg p-4 text-sm animate-in fade-in slide-in-from-bottom-2",
          selected === checkpoint.correct_index
            ? "bg-green-500/10 border border-green-500/30 text-foreground"
            : "bg-amber-500/10 border border-amber-500/30 text-foreground"
        )}>
          <p className="font-medium mb-1">
            {selected === checkpoint.correct_index ? "Smart move! Here's why:" : "That could work, but here's the better approach:"}
          </p>
          <p><MathRenderer text={checkpoint.explanation} /></p>
        </div>
      )}
    </div>
  );
}

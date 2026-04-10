import { cn } from "@/lib/utils";
import { useState } from "react";


interface AuditoryCheckpointProps {
  checkpoint: {
    question: string;
    options?: string[];
    correct_index?: number;
    explanation: string;
  };
  onAnswer: (correct: boolean) => void;
}

export function AuditoryCheckpoint({ checkpoint, onAnswer }: AuditoryCheckpointProps) {
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
      {/* Conversational question - no rigid label */}
      <p className="text-lg text-foreground font-medium leading-relaxed">
        {checkpoint.question}
      </p>

      {/* Options as rounded pills */}
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
                "w-full text-left p-4 rounded-xl border-l-4 transition-all duration-300",
                !answered && "border-l-primary/30 border border-border hover:border-primary/50 cursor-pointer",
                answered && isSelected && isCorrect && "border-l-green-500 border-green-500/30 bg-green-500/10",
                answered && isSelected && !isCorrect && "border-l-destructive border-destructive/30 bg-destructive/10",
                answered && !isSelected && "opacity-40"
              )}
            >
              <span className="text-sm text-foreground">{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation in audio-friendly format */}
      {answered && (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            {checkpoint.explanation.split(/[.!]/).filter(Boolean).map((sentence, i) => (
              <p key={i} className="text-sm text-foreground leading-relaxed">
                {i > 0 && <span className="text-primary mr-1">→</span>}
                {sentence.trim()}.
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

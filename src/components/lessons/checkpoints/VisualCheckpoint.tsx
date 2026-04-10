import { cn } from "@/lib/utils";
import { useState } from "react";

interface DiagramLabel {
  label: string;
  correct: boolean;
}

interface VisualCheckpointProps {
  checkpoint: {
    question: string;
    diagram_prompt?: string;
    diagram_labels?: DiagramLabel[];
    explanation: string;
  };
  onAnswer: (correct: boolean) => void;
}

export function VisualCheckpoint({ checkpoint, onAnswer }: VisualCheckpointProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const labels = checkpoint.diagram_labels || [];

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    const isCorrect = labels[idx]?.correct === true;
    setTimeout(() => onAnswer(isCorrect), 2000);
  };

  return (
    <div className="space-y-4">
      <p className="text-foreground font-medium">{checkpoint.question}</p>

      {checkpoint.diagram_prompt && (
        <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground italic">{checkpoint.diagram_prompt}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {labels.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(idx)}
            disabled={answered}
            className={cn(
              "p-3 rounded-lg border text-sm text-left transition-all duration-300",
              !answered && "border-border hover:border-primary/50 cursor-pointer",
              answered && selected === idx && item.correct && "border-green-500 bg-green-500/10",
              answered && selected === idx && !item.correct && "border-destructive bg-destructive/10",
              answered && selected !== idx && item.correct && "border-green-500/50 bg-green-500/5",
              answered && selected !== idx && !item.correct && "opacity-50"
            )}
          >
            {item.label}
            {answered && selected === idx && (
              <span className="ml-2">{item.correct ? "✅" : "❌"}</span>
            )}
          </button>
        ))}
      </div>

      {answered && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-foreground animate-in fade-in slide-in-from-bottom-2">
          {checkpoint.explanation}
        </div>
      )}
    </div>
  );
}

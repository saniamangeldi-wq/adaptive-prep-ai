import { MathRenderer } from "@/components/MathRenderer";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ReadingWritingCheckpointProps {
  checkpoint: {
    question: string;
    text_excerpt?: string;
    analysis_question?: string;
    options?: string[];
    correct_index?: number;
    explanation: string;
  };
  onAnswer: (correct: boolean) => void;
}

export function ReadingWritingCheckpoint({ checkpoint, onAnswer }: ReadingWritingCheckpointProps) {
  const [response, setResponse] = useState("");
  const [showModel, setShowModel] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleSubmit = () => {
    setAnswered(true);
    setShowModel(true);
    setTimeout(() => onAnswer(true), 3000); // text analysis is self-graded
  };

  const handleOptionSelect = (idx: number) => {
    if (answered) return;
    setSelectedOption(idx);
    setAnswered(true);
    setShowModel(true);
    setTimeout(() => onAnswer(idx === checkpoint.correct_index), 2500);
  };

  return (
    <div className="space-y-4">
      <p className="text-foreground font-medium">{checkpoint.question}</p>

      {/* Text excerpt */}
      {checkpoint.text_excerpt && (
        <blockquote className="border-l-4 border-primary bg-card p-4 rounded-r-lg">
          <p className="text-sm text-foreground italic leading-relaxed font-serif">
            {checkpoint.text_excerpt}
          </p>
        </blockquote>
      )}

      {/* Analysis question */}
      {checkpoint.analysis_question && (
        <p className="text-sm text-foreground font-medium">{checkpoint.analysis_question}</p>
      )}

      {/* Written response */}
      <div className="space-y-2">
        <Textarea
          placeholder="Write your analysis here..."
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          className="min-h-[80px] text-sm"
          disabled={answered}
        />
        {!answered && (
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={response.trim().length === 0} size="sm">
              Submit Analysis
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowModel(true); setAnswered(true); setTimeout(() => onAnswer(true), 3000); }}>
              See Model Answer
            </Button>
          </div>
        )}
      </div>

      {/* Multiple choice scaffold */}
      {checkpoint.options && checkpoint.options.length > 0 && !answered && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Or if you prefer, pick the closest match:</p>
          {checkpoint.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleOptionSelect(idx)}
              className="w-full text-left p-2.5 rounded-lg border border-border text-sm hover:border-primary/50 transition-colors"
            >
              <span className="text-muted-foreground mr-2">{String.fromCharCode(65 + idx)}.</span>
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Model answer / explanation */}
      {showModel && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Model Answer</p>
            <p className="text-sm text-foreground leading-relaxed">{checkpoint.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

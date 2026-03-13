import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface QuizOption {
  id: string;
  text: string;
}

interface QuizData {
  widget_type: "interactive_quiz";
  question: string;
  input_type: "radio" | "text_input";
  options?: QuizOption[];
  correct_answer: string;
  explanation: string;
}

export function QuestionWidget({ data }: { data: QuizData }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isCorrect =
    data.input_type === "radio"
      ? selected === data.correct_answer
      : textAnswer.trim().toLowerCase() === data.correct_answer.toLowerCase();

  const handleSubmit = () => {
    if (data.input_type === "radio" && !selected) return;
    if (data.input_type === "text_input" && !textAnswer.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="my-4 rounded-xl border border-border/40 bg-muted/20 p-5">
      <p className="text-sm font-semibold text-foreground mb-4">{data.question}</p>

      {data.input_type === "radio" && data.options ? (
        <div className="space-y-2 mb-4">
          {data.options.map((opt) => {
            const isThis = selected === opt.id;
            const showResult = submitted;
            const thisCorrect = opt.id === data.correct_answer;

            return (
              <button
                key={opt.id}
                onClick={() => !submitted && setSelected(opt.id)}
                disabled={submitted}
                className={cn(
                  "w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all flex items-center gap-3",
                  !showResult && isThis && "border-primary/60 bg-primary/10 text-foreground",
                  !showResult && !isThis && "border-border/30 text-muted-foreground hover:border-border/60",
                  showResult && thisCorrect && "border-green-500/60 bg-green-500/10 text-foreground",
                  showResult && isThis && !thisCorrect && "border-destructive/60 bg-destructive/10 text-foreground",
                  showResult && !isThis && !thisCorrect && "border-border/20 text-muted-foreground/50"
                )}
              >
                <span className="font-medium w-5 shrink-0">{opt.id}.</span>
                <span className="flex-1">{opt.text}</span>
                {showResult && thisCorrect && <Check className="w-4 h-4 text-green-500 shrink-0" />}
                {showResult && isThis && !thisCorrect && <X className="w-4 h-4 text-destructive shrink-0" />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mb-4">
          <input
            type="text"
            value={textAnswer}
            onChange={(e) => !submitted && setTextAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={submitted}
            placeholder="Type your answer..."
            className="w-full px-4 py-2.5 rounded-lg border border-border/30 bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
          />
        </div>
      )}

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={data.input_type === "radio" ? !selected : !textAnswer.trim()}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          Check Answer
        </button>
      ) : (
        <div className={cn(
          "rounded-lg p-3 text-sm",
          isCorrect ? "bg-green-500/10 border border-green-500/30" : "bg-destructive/10 border border-destructive/30"
        )}>
          <p className="font-medium mb-1">
            {isCorrect ? "✓ Correct!" : `✗ The answer is ${data.correct_answer}`}
          </p>
          <p className="text-muted-foreground">{data.explanation}</p>
        </div>
      )}
    </div>
  );
}

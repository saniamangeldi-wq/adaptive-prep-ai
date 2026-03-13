import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, X, PenLine, Eye, RotateCcw } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface QuizOption {
  id: string;
  text: string;
}

interface QuizData {
  widget_type: "interactive_quiz";
  question: string;
  input_type: "radio" | "text_input" | "free_write";
  options?: QuizOption[];
  correct_answer?: string;
  explanation?: string;
  // free_write fields
  placeholder?: string;
  min_words?: number;
  evaluation_criteria?: string[];
  sample_answer?: string;
}

interface QuestionWidgetProps {
  data: QuizData;
  onSubmitFreeWrite?: (payload: string) => void;
}

export function QuestionWidget({ data, onSubmitFreeWrite }: QuestionWidgetProps) {
  if (data.input_type === "free_write") {
    return <FreeWriteWidget data={data} onSubmit={onSubmitFreeWrite} />;
  }
  return <MCQWidget data={data} />;
}

/* ─── Multiple Choice / Text Input Widget (unchanged) ─── */
function MCQWidget({ data }: { data: QuizData }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isCorrect =
    data.input_type === "radio"
      ? selected === data.correct_answer
      : textAnswer.trim().toLowerCase() === (data.correct_answer || "").toLowerCase();

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

/* ─── Free Write Widget ─── */
function FreeWriteWidget({ data, onSubmit }: { data: QuizData; onSubmit?: (payload: string) => void }) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showSample, setShowSample] = useState(false);

  const minWords = data.min_words || 10;
  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const meetsMin = wordCount >= minWords;

  const handleSubmit = () => {
    if (!meetsMin) return;
    setSubmitted(true);

    if (onSubmit) {
      const criteriaStr = (data.evaluation_criteria || []).map((c, i) => `${i + 1}. ${c}`).join("\n");
      const payload = `[Student's free write answer submitted]\nStudent wrote: "${answer}"\nEvaluation criteria:\n${criteriaStr}\nPlease evaluate their answer against these criteria. Be specific about what they did well and what needs improvement. Do not just give them the sample answer — guide them to improve it themselves.`;
      onSubmit(payload);
    }
  };

  const handleTryAgain = () => {
    setAnswer("");
    setSubmitted(false);
    setShowSample(false);
  };

  return (
    <div className="my-4 rounded-xl border border-border/40 bg-muted/20 p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <PenLine className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">Free Response</span>
      </div>

      {/* Question */}
      <p className="text-sm font-semibold text-foreground mb-4">{data.question}</p>

      {/* Textarea */}
      <Textarea
        value={answer}
        onChange={(e) => !submitted && setAnswer(e.target.value)}
        disabled={submitted}
        placeholder={data.placeholder || "Write your answer here..."}
        rows={4}
        className="resize-y mb-2 text-sm bg-background border-border/30 focus-visible:ring-primary/30 disabled:opacity-60"
      />

      {/* Word counter */}
      <p className={cn(
        "text-xs mb-4 transition-colors",
        meetsMin ? "text-primary" : "text-muted-foreground"
      )}>
        Word count: {wordCount} / min {minWords} words
      </p>

      {/* Action buttons */}
      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={!meetsMin}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            meetsMin
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed opacity-40"
          )}
        >
          Submit Answer →
        </button>
      ) : (
        <div className="space-y-3">
          {/* Submitted confirmation */}
          <div className="rounded-lg p-3 text-sm bg-primary/10 border border-primary/20">
            <p className="font-medium text-foreground">✓ Answer submitted — AI is evaluating...</p>
          </div>

          {/* Action row */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleTryAgain}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border/30 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Try Again
            </button>

            {data.sample_answer && !showSample && (
              <button
                onClick={() => setShowSample(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border/30 transition-colors"
              >
                <Eye className="w-3 h-3" />
                See Example Answer
              </button>
            )}
          </div>

          {/* Sample answer reveal */}
          {showSample && data.sample_answer && (
            <div className="rounded-lg p-3 text-sm bg-green-500/10 border border-green-500/30">
              <p className="font-medium text-foreground mb-1">Example Answer:</p>
              <p className="text-muted-foreground">{data.sample_answer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

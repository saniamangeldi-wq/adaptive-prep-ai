import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, X, PenLine, Eye, RotateCcw, ArrowRight, Copy } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — try selecting manually");
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border/30 transition-colors"
      aria-label={`${label} to clipboard`}
    >
      {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}

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
  placeholder?: string;
  min_words?: number;
  evaluation_criteria?: string[];
  sample_answer?: string;
}

interface QuestionWidgetProps {
  data: QuizData;
  onSubmitFreeWrite?: (payload: string) => void;
  onNextQuestion?: () => void;
}

export function QuestionWidget({ data, onSubmitFreeWrite, onNextQuestion }: QuestionWidgetProps) {
  if (data.input_type === "free_write") {
    return <FreeWriteWidget data={data} onSubmit={onSubmitFreeWrite} onNextQuestion={onNextQuestion} />;
  }
  return <MCQWidget data={data} onNextQuestion={onNextQuestion} />;
}

/* ─── Multiple Choice / Text Input Widget ─── */
function MCQWidget({ data, onNextQuestion }: { data: QuizData; onNextQuestion?: () => void }) {
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
        <div className="space-y-3">
          <div className={cn(
            "rounded-lg p-3 text-sm",
            isCorrect ? "bg-green-500/10 border border-green-500/30" : "bg-destructive/10 border border-destructive/30"
          )}>
            <p className="font-medium mb-1">
              {isCorrect ? "✓ Correct!" : `✗ The answer is ${data.correct_answer}`}
            </p>
            <p className="text-muted-foreground">{data.explanation}</p>
          </div>
          
          {onNextQuestion && (
            <button
              onClick={onNextQuestion}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Next Question <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Free Write Widget ─── */
function FreeWriteWidget({ data, onSubmit, onNextQuestion }: { data: QuizData; onSubmit?: (payload: string) => void; onNextQuestion?: () => void }) {
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
      <div className="flex items-center gap-2 mb-3">
        <PenLine className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">Free Response</span>
      </div>

      <p className="text-sm font-semibold text-foreground mb-4">{data.question}</p>

      <Textarea
        value={answer}
        onChange={(e) => !submitted && setAnswer(e.target.value)}
        disabled={submitted}
        placeholder={data.placeholder || "Write your answer here..."}
        rows={5}
        spellCheck
        autoCorrect="on"
        autoCapitalize="sentences"
        className="resize-y mb-2 text-sm bg-background border-border/30 focus-visible:ring-primary/30 disabled:opacity-60 leading-relaxed"
      />

      <p className={cn(
        "text-xs mb-4 transition-colors",
        meetsMin ? "text-primary" : "text-muted-foreground"
      )}>
        Word count: {wordCount} / min {minWords} words
      </p>

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
          {/* Student's submitted answer */}
          <div className="rounded-lg border border-border/40 bg-background/60 overflow-hidden">
            <div className="px-3 py-2 border-b border-border/40 bg-muted/30 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Your Answer</p>
              <CopyButton text={answer} label="Copy answer" />
            </div>
            <p className="px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
              {answer}
            </p>
          </div>

          {/* Evaluation criteria */}
          {data.evaluation_criteria && data.evaluation_criteria.length > 0 && (
            <div className="rounded-lg border border-border/40 bg-background/60 overflow-hidden">
              <div className="px-3 py-2 border-b border-border/40 bg-muted/30 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Evaluation Criteria</p>
                <CopyButton text={data.evaluation_criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")} label="Copy" />
              </div>
              <ul className="px-4 py-2.5 text-sm text-foreground space-y-1 list-disc">
                {data.evaluation_criteria.map((c, i) => (
                  <li key={i} className="leading-relaxed">{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Status */}
          <div className="rounded-lg p-3 text-sm bg-primary/10 border border-primary/20">
            <p className="font-medium text-foreground">✓ Submitted — your AI coach is reviewing your response below.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

            {onNextQuestion && (
              <button
                onClick={onNextQuestion}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Next Question <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {showSample && data.sample_answer && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 overflow-hidden">
              <div className="px-3 py-2 border-b border-green-500/20">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">Example Answer</p>
              </div>
              <p className="px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                {data.sample_answer}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

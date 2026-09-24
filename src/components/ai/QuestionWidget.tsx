import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Check, X, PenLine, Eye, ArrowRight, Copy, Lightbulb, SkipForward, CircleDot, Loader2, CloudOff } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { MathRenderer } from "@/components/MathRenderer";
import { toast } from "sonner";
import { callQuizTracker, isUuid, stableQuestionId, trackEvent, trackOrQueue, type QuizAttempt } from "@/lib/quiz-tracker";

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

interface QuizOption { id: string; text: string }

export interface QuizData {
  widget_type: "interactive_quiz";
  question: string;
  input_type: "radio" | "text_input" | "free_write";
  options?: QuizOption[];
  correct_answer?: string;
  explanation?: string;
  hint?: string;
  placeholder?: string;
  min_words?: number;
  evaluation_criteria?: string[];
  sample_answer?: string;
  question_id?: string;
  session_id?: string;
  subject?: string;
  topic?: string;
  subtopic?: string;
}

interface QuestionWidgetProps {
  data: QuizData;
  conversationId?: string | null;
  subject?: string;
  onSubmitFreeWrite?: (payload: string) => void;
  onNextQuestion?: () => void;
  onRequestHint?: (question: string) => void;
}

interface Meta { question_id: string; sequence_number: number; total_questions: number; topic: string }

/** Registers the question with the tracker and restores any saved attempt. */
function useTrackedQuestion(data: QuizData, conversationId?: string | null, subject?: string) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [offline, setOffline] = useState(false);
  const renderedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const qid = isUuid(data.question_id)
        ? data.question_id
        : await stableQuestionId(`${conversationId || "local"}|${data.question}|${JSON.stringify(data.options || [])}`);
      try {
        const r = await callQuizTracker("register", {
          conversation_id: conversationId || null,
          question: {
            question_id: qid,
            subject: data.subject || subject || "SAT",
            topic: data.topic || "General",
            subtopic: data.subtopic || null,
            question_text: data.question,
            input_type: data.input_type,
            options: data.options || null,
            correct_answer: data.correct_answer ?? null,
            explanation: data.explanation ?? null,
            evaluation_criteria: data.evaluation_criteria ?? null,
          },
        });
        if (cancelled) return;
        setMeta({ question_id: qid, sequence_number: r.sequence_number, total_questions: r.total_questions, topic: r.topic });
        if (r.attempt) setAttempt(r.attempt);
        if (r.hint_used) setHintUsed(true);
        window.dispatchEvent(new CustomEvent("adaptiveprep:quiz-changed"));
      } catch {
        if (!cancelled) { setMeta({ question_id: qid, sequence_number: 0, total_questions: 10, topic: data.topic || "General" }); setOffline(true); }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.question, conversationId]);

  const elapsed = () => Math.round((Date.now() - renderedAt.current) / 1000);

  const send = async (action: "submit" | "skip", selected?: string): Promise<QuizAttempt | null> => {
    if (!meta) return null;
    try {
      const r = await trackOrQueue<any>(action, {
        question_id: meta.question_id,
        selected_answer: selected,
        hint_used: hintUsed,
        response_time_seconds: elapsed(),
      });
      if (!r) {
        setOffline(true);
        return null;
      }
      setAttempt(r.attempt);
      window.dispatchEvent(new CustomEvent("adaptiveprep:quiz-changed", { detail: { report: r.report } }));
      return r.attempt;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save your answer");
      return null;
    }
  };

  const useHint = () => {
    setHintUsed(true);
    if (meta) trackEvent(meta.question_id, "hint_requested");
  };

  return { meta, attempt, setAttempt, hintUsed, useHint, send, offline };
}

function MetaHeader({ meta, hintUsed }: { meta: Meta | null; hintUsed: boolean }) {
  if (!meta || !meta.sequence_number) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px] text-muted-foreground">
      <span className="font-semibold uppercase tracking-wide text-primary">Question {meta.sequence_number} of {meta.total_questions}</span>
      <span aria-hidden>·</span>
      <span className="truncate max-w-[60%]">{meta.topic}</span>
      {hintUsed && (
        <span className="inline-flex items-center gap-1 rounded-full border border-border/40 px-2 py-0.5">
          <Lightbulb className="w-3 h-3" /> Hint used
        </span>
      )}
    </div>
  );
}

function StatusBadge({ attempt }: { attempt: QuizAttempt }) {
  if (attempt.status === "skipped") {
    return <p className="flex items-center gap-2 font-medium"><SkipForward className="w-4 h-4" /> Skipped{attempt.correct_answer ? ` — the answer was ${attempt.correct_answer}` : ""}</p>;
  }
  if (attempt.status === "unanswered") {
    return <p className="flex items-center gap-2 font-medium"><CircleDot className="w-4 h-4" /> Unanswered (topic ended)</p>;
  }
  return attempt.is_correct ? (
    <p className="flex items-center gap-2 font-medium"><Check className="w-4 h-4" /> Correct — submitted {attempt.selected_answer}</p>
  ) : (
    <p className="flex items-center gap-2 font-medium"><X className="w-4 h-4" /> Incorrect — you chose {attempt.selected_answer}{attempt.correct_answer ? `, the answer is ${attempt.correct_answer}` : ""}</p>
  );
}

export function QuestionWidget(props: QuestionWidgetProps) {
  if (props.data.input_type === "free_write") return <FreeWriteWidget {...props} />;
  return <MCQWidget {...props} />;
}

/* ─── Multiple Choice / Short Answer ─── */
function MCQWidget({ data, conversationId, subject, onNextQuestion, onRequestHint }: QuestionWidgetProps) {
  const { meta, attempt, hintUsed, useHint, send, offline } = useTrackedQuestion(data, conversationId, subject);
  const [selected, setSelected] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [localResult, setLocalResult] = useState<boolean | null>(null);
  const [needChoice, setNeedChoice] = useState(false);

  const done = !!attempt || localResult !== null;
  const answer = data.input_type === "radio" ? selected : textAnswer.trim();
  const shownSelected = attempt?.selected_answer ?? selected;
  const correctKey = attempt?.correct_answer ?? null;

  const handleSubmit = async () => {
    if (!answer || done || busy) { if (!answer) setNeedChoice(true); return; }
    setBusy(true);
    const r = await send("submit", answer);
    if (!r && offline) {
      // Saved offline — show a provisional result; it syncs when back online.
      setLocalResult((data.correct_answer || "").trim().toLowerCase() === answer.trim().toLowerCase());
    }
    setBusy(false);
  };

  const handleSkip = async () => {
    if (done || busy) return;
    setBusy(true);
    await send("skip");
    setBusy(false);
  };

  const handleHint = () => {
    useHint();
    if (data.hint) setShowHint(true);
    else onRequestHint?.(data.question);
  };

  const openExplanation = () => {
    setShowExplanation(true);
    if (meta) trackEvent(meta.question_id, "explanation_opened");
  };

  const explanation = attempt?.explanation ?? (localResult !== null ? data.explanation : null);

  return (
    <div className="my-4 rounded-xl border border-border/40 bg-muted/20 p-4 sm:p-5" role="group" aria-label="Quiz question">
      <MetaHeader meta={meta} hintUsed={hintUsed} />
      <MathRenderer as="p" className="text-sm font-semibold text-foreground mb-4" text={data.question} />

      {data.input_type === "radio" && data.options ? (
        <div className="space-y-2 mb-4" role="radiogroup" aria-label="Answer choices">
          {data.options.map((opt) => {
            const isThis = shownSelected === opt.id;
            const thisCorrect = done && correctKey === opt.id;
            const thisWrong = done && isThis && attempt?.status === "submitted" && !attempt?.is_correct;
            return (
              <button
                key={opt.id}
                role="radio"
                aria-checked={isThis}
                onClick={() => { if (!done) { setSelected(opt.id); setNeedChoice(false); } }}
                disabled={done}
                className={cn(
                  "w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  !done && isThis && "border-primary/60 bg-primary/10 text-foreground",
                  !done && !isThis && "border-border/30 text-muted-foreground hover:border-border/60",
                  thisCorrect && "border-primary/60 bg-primary/10 text-foreground",
                  thisWrong && "border-destructive/60 bg-destructive/10 text-foreground",
                  done && !thisCorrect && !thisWrong && "border-border/20 text-muted-foreground/60"
                )}
              >
                <span className="font-medium w-5 shrink-0">{opt.id}.</span>
                <MathRenderer className="flex-1" text={opt.text} />
                {!done && isThis && <span className="text-[10px] font-semibold uppercase text-primary">Selected</span>}
                {thisCorrect && <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-primary"><Check className="w-4 h-4" /> Correct</span>}
                {thisWrong && <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-destructive"><X className="w-4 h-4" /> Your answer</span>}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mb-4">
          <label className="sr-only" htmlFor={`qa-${meta?.question_id}`}>Your answer</label>
          <input
            id={`qa-${meta?.question_id}`}
            type="text"
            value={attempt?.selected_answer ?? textAnswer}
            onChange={(e) => !done && setTextAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={done}
            placeholder="Type your answer..."
            className="w-full px-4 py-2.5 rounded-lg border border-border/30 bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
          />
        </div>
      )}

      {showHint && data.hint && !done && (
        <div className="mb-3 rounded-lg border border-border/40 bg-background/60 p-3 text-sm flex gap-2">
          <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <MathRenderer className="text-muted-foreground" text={data.hint} />
        </div>
      )}

      {!done ? (
        <div className="space-y-2">
          {needChoice && <p className="text-xs text-destructive" role="alert">Choose an answer and press Submit, or press Skip.</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={!answer || busy || !meta}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Submit Answer
            </button>
            <button onClick={handleHint} disabled={busy || (showHint && !!data.hint)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/30 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40">
              <Lightbulb className="w-3.5 h-3.5" /> Hint
            </button>
            <button onClick={handleSkip} disabled={busy || !meta} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/30 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40">
              <SkipForward className="w-3.5 h-3.5" /> Skip
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className={cn(
            "rounded-lg p-3 text-sm border",
            attempt?.status === "submitted" && attempt.is_correct && "bg-primary/10 border-primary/30",
            attempt?.status === "submitted" && !attempt.is_correct && "bg-destructive/10 border-destructive/30",
            (!attempt || attempt.status !== "submitted") && "bg-muted/40 border-border/40"
          )}>
            {attempt ? <StatusBadge attempt={attempt} /> : (
              <p className="flex items-center gap-2 font-medium"><CloudOff className="w-4 h-4" /> {localResult ? "Correct" : "Incorrect"} — saved offline, will sync when you're back online</p>
            )}
            {attempt?.hint_used && <p className="mt-1 text-xs text-muted-foreground">Hint-assisted</p>}
          </div>

          {explanation && (showExplanation ? (
            <div className="rounded-lg border border-border/40 bg-background/60 p-3 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Explanation</p>
              <MathRenderer as="p" className="text-foreground" text={explanation} />
            </div>
          ) : (
            <button onClick={openExplanation} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/30 text-xs text-muted-foreground hover:text-foreground">
              <Eye className="w-3 h-3" /> Show explanation
            </button>
          ))}

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

/* ─── Free Write ─── */
function FreeWriteWidget({ data, conversationId, subject, onSubmitFreeWrite, onNextQuestion }: QuestionWidgetProps) {
  const { meta, attempt, hintUsed, useHint, send } = useTrackedQuestion(data, conversationId, subject);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const submitted = !!attempt;
  const text = attempt?.selected_answer ?? answer;
  const minWords = data.min_words || 10;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const meetsMin = wordCount >= minWords;

  const handleSubmit = async () => {
    if (!meetsMin || submitted || busy) return;
    setBusy(true);
    const r = await send("submit", answer);
    setBusy(false);
    if (r && onSubmitFreeWrite) {
      const criteriaStr = (data.evaluation_criteria || []).map((c, i) => `${i + 1}. ${c}`).join("\n");
      onSubmitFreeWrite(`[Student's free write answer submitted — saved score ${r.score ?? "n/a"}/100]\nStudent wrote: "${answer}"\nEvaluation criteria:\n${criteriaStr}\nPlease evaluate their answer against these criteria. Be specific about what they did well and what needs improvement. Do not just give them the sample answer — guide them to improve it themselves.`);
    }
  };

  const handleSkip = async () => {
    if (submitted || busy) return;
    setBusy(true);
    await send("skip");
    setBusy(false);
  };

  return (
    <div className="my-4 rounded-xl border border-border/40 bg-muted/20 p-4 sm:p-5">
      <MetaHeader meta={meta} hintUsed={hintUsed} />
      <div className="flex items-center gap-2 mb-3">
        <PenLine className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">Free Response</span>
      </div>

      <MathRenderer as="p" className="text-sm font-semibold text-foreground mb-4" text={data.question} />

      <Textarea
        value={text}
        onChange={(e) => !submitted && setAnswer(e.target.value)}
        disabled={submitted}
        aria-label="Your answer"
        placeholder={data.placeholder || "Write your answer here..."}
        rows={5}
        spellCheck
        className="resize-y mb-2 text-sm bg-background border-border/30 focus-visible:ring-primary/30 disabled:opacity-80 leading-relaxed"
      />
      {!submitted && (
        <p className={cn("text-xs mb-4", meetsMin ? "text-primary" : "text-muted-foreground")}>
          Word count: {wordCount} / min {minWords} words
        </p>
      )}

      {showHint && data.hint && !submitted && (
        <div className="mb-3 rounded-lg border border-border/40 bg-background/60 p-3 text-sm flex gap-2">
          <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <MathRenderer className="text-muted-foreground" text={data.hint} />
        </div>
      )}

      {!submitted ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={!meetsMin || busy || !meta}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Submit Answer
          </button>
          {data.hint && (
            <button onClick={() => { useHint(); setShowHint(true); }} disabled={showHint} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/30 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40">
              <Lightbulb className="w-3.5 h-3.5" /> Hint
            </button>
          )}
          <button onClick={handleSkip} disabled={busy || !meta} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/30 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40">
            <SkipForward className="w-3.5 h-3.5" /> Skip
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-border/40 bg-background/60 overflow-hidden">
            <div className="px-3 py-2 border-b border-border/40 bg-muted/30 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Saved result</p>
              {attempt?.selected_answer && <CopyButton text={attempt.selected_answer} label="Copy answer" />}
            </div>
            <div className="px-3 py-2.5 text-sm space-y-1">
              <StatusBadge attempt={attempt!} />
              {attempt?.score != null && <p className="text-muted-foreground">Score: {Math.round(Number(attempt.score))}/100</p>}
              {attempt?.evaluation && <p className="text-muted-foreground">{attempt.evaluation}</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {data.sample_answer && !showSample && (
              <button
                onClick={() => { setShowSample(true); if (meta) trackEvent(meta.question_id, "explanation_opened"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border/30"
              >
                <Eye className="w-3 h-3" /> See Example Answer
              </button>
            )}
            {onNextQuestion && (
              <button onClick={onNextQuestion} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                Next Question <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {showSample && data.sample_answer && (
            <div className="rounded-lg border border-primary/30 bg-primary/10 overflow-hidden">
              <div className="px-3 py-2 border-b border-primary/20 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Example Answer</p>
                <CopyButton text={data.sample_answer} label="Copy" />
              </div>
              <p className="px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">{data.sample_answer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

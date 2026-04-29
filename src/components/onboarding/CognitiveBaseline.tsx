import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, Zap, Target } from "lucide-react";
import { scoreBaseline, type CognitiveBaselineRaw, type CognitiveScores } from "@/lib/cognitive-baseline";

type Phase = "intro" | "rt" | "rt_done" | "span" | "span_done" | "reason" | "done";

const REASONING_ITEMS = [
  {
    q: "If all Bloops are Razzles and all Razzles are Lazzles, are all Bloops definitely Lazzles?",
    options: ["Yes", "No", "Cannot tell"],
    answer: 0,
  },
  {
    q: "What number comes next? 2, 6, 12, 20, 30, ?",
    options: ["36", "40", "42", "44"],
    answer: 2,
  },
];

const SPAN_SEQUENCES = [
  "4827",
  "73916",
  "528194",
  "9462807",
  "31748295",
];

export function CognitiveBaseline({
  onComplete,
}: {
  onComplete: (scores: CognitiveScores, raw: CognitiveBaselineRaw) => void;
}) {
  const [phase, setPhase] = useState<Phase>("intro");

  // RT task
  const [rtTrials, setRtTrials] = useState<number[]>([]);
  const [rtWaiting, setRtWaiting] = useState(false);
  const [rtShownAt, setRtShownAt] = useState<number | null>(null);
  const rtTimerRef = useRef<number | null>(null);
  const RT_TRIAL_COUNT = 6;

  // Digit span
  const [spanIndex, setSpanIndex] = useState(0);
  const [showingSpan, setShowingSpan] = useState(false);
  const [spanInput, setSpanInput] = useState("");
  const [longestSpan, setLongestSpan] = useState(3);

  // Reasoning
  const [reasonIndex, setReasonIndex] = useState(0);
  const [reasonStartedAt, setReasonStartedAt] = useState<number | null>(null);
  const [reasonResults, setReasonResults] = useState<{ correct: boolean; timeMs: number }[]>([]);

  // ---------- RT ----------
  const startRtTrial = () => {
    setRtWaiting(true);
    setRtShownAt(null);
    const delay = 800 + Math.random() * 1800;
    rtTimerRef.current = window.setTimeout(() => {
      setRtShownAt(performance.now());
      setRtWaiting(false);
    }, delay);
  };

  const handleRtClick = () => {
    if (rtWaiting) {
      // too early — penalize with a 900ms trial
      if (rtTimerRef.current) clearTimeout(rtTimerRef.current);
      setRtTrials((t) => [...t, 900]);
      setRtWaiting(false);
      setRtShownAt(null);
      return;
    }
    if (rtShownAt != null) {
      const rt = performance.now() - rtShownAt;
      const next = [...rtTrials, rt];
      setRtTrials(next);
      setRtShownAt(null);
      if (next.length >= RT_TRIAL_COUNT) {
        setPhase("rt_done");
      } else {
        setTimeout(startRtTrial, 600);
      }
    }
  };

  useEffect(() => {
    if (phase === "rt" && rtTrials.length === 0 && !rtWaiting && rtShownAt == null) {
      startRtTrial();
    }
    return () => {
      if (rtTimerRef.current) clearTimeout(rtTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ---------- Digit Span ----------
  const startSpanTrial = () => {
    setShowingSpan(true);
    setSpanInput("");
    setTimeout(() => setShowingSpan(false), 1200 + spanIndex * 400);
  };

  const submitSpan = () => {
    const target = SPAN_SEQUENCES[spanIndex];
    if (spanInput === target) {
      setLongestSpan(target.length);
      if (spanIndex < SPAN_SEQUENCES.length - 1) {
        setSpanIndex(spanIndex + 1);
        setTimeout(startSpanTrial, 400);
      } else {
        setPhase("span_done");
      }
    } else {
      setPhase("span_done");
    }
  };

  useEffect(() => {
    if (phase === "span" && spanIndex === 0 && !showingSpan && spanInput === "") {
      startSpanTrial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ---------- Reasoning ----------
  useEffect(() => {
    if (phase === "reason" && reasonStartedAt == null) {
      setReasonStartedAt(performance.now());
    }
  }, [phase, reasonStartedAt, reasonIndex]);

  const handleReasonAnswer = (idx: number) => {
    const item = REASONING_ITEMS[reasonIndex];
    const timeMs = reasonStartedAt ? performance.now() - reasonStartedAt : 15000;
    const next = [...reasonResults, { correct: idx === item.answer, timeMs }];
    setReasonResults(next);
    if (reasonIndex < REASONING_ITEMS.length - 1) {
      setReasonIndex(reasonIndex + 1);
      setReasonStartedAt(performance.now());
    } else {
      // finalize
      const raw: CognitiveBaselineRaw = {
        reactionTimesMs: rtTrials,
        digitSpanLength: longestSpan,
        reasoningResults: next,
      };
      const scores = scoreBaseline(raw);
      setPhase("done");
      onComplete(scores, raw);
    }
  };

  // ---------- Render ----------
  if (phase === "intro") {
    return (
      <div className="space-y-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
          <Brain className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-3xl font-bold mb-2">Quick Cognitive Calibration</h2>
          <p className="text-muted-foreground">
            ~2 minutes. We'll measure your processing speed, working memory, and reasoning style so the AI Coach and tests adapt to you.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-left">
          <div className="p-3 rounded-lg bg-card border border-border">
            <Zap className="w-4 h-4 text-primary mb-1" />
            <div className="text-xs font-medium">Speed</div>
            <div className="text-[11px] text-muted-foreground">6 quick taps</div>
          </div>
          <div className="p-3 rounded-lg bg-card border border-border">
            <Brain className="w-4 h-4 text-primary mb-1" />
            <div className="text-xs font-medium">Memory</div>
            <div className="text-[11px] text-muted-foreground">Recall sequences</div>
          </div>
          <div className="p-3 rounded-lg bg-card border border-border">
            <Target className="w-4 h-4 text-primary mb-1" />
            <div className="text-xs font-medium">Reasoning</div>
            <div className="text-[11px] text-muted-foreground">2 logic items</div>
          </div>
        </div>
        <Button variant="hero" size="lg" className="w-full" onClick={() => setPhase("rt")}>
          Start Calibration
        </Button>
      </div>
    );
  }

  if (phase === "rt") {
    return (
      <div className="space-y-6 text-center">
        <h3 className="text-xl font-semibold">Tap when the circle turns green</h3>
        <p className="text-sm text-muted-foreground">Trial {rtTrials.length + 1} of {RT_TRIAL_COUNT}</p>
        <button
          onClick={handleRtClick}
          className={`mx-auto w-48 h-48 rounded-full transition-colors ${
            rtShownAt != null ? "bg-primary" : "bg-muted"
          }`}
          aria-label="Reaction target"
        />
        <p className="text-xs text-muted-foreground">
          {rtWaiting ? "Wait for green..." : rtShownAt ? "TAP NOW!" : "Get ready..."}
        </p>
      </div>
    );
  }

  if (phase === "rt_done") {
    return (
      <div className="space-y-6 text-center">
        <h3 className="text-xl font-semibold">Nice. Now memory.</h3>
        <p className="text-muted-foreground">
          A short number will flash on screen. After it disappears, type it back.
        </p>
        <Button variant="hero" size="lg" onClick={() => setPhase("span")}>Continue</Button>
      </div>
    );
  }

  if (phase === "span") {
    return (
      <div className="space-y-6 text-center">
        <h3 className="text-xl font-semibold">Memorize this number</h3>
        <div className="h-32 flex items-center justify-center">
          {showingSpan ? (
            <div className="text-6xl font-bold tracking-widest text-primary">
              {SPAN_SEQUENCES[spanIndex]}
            </div>
          ) : (
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={spanInput}
              onChange={(e) => setSpanInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && submitSpan()}
              className="text-4xl text-center font-mono bg-card border border-border rounded-lg px-4 py-3 w-64 text-foreground"
              placeholder="Type it back"
            />
          )}
        </div>
        {!showingSpan && (
          <Button variant="hero" onClick={submitSpan} disabled={!spanInput}>
            Submit
          </Button>
        )}
      </div>
    );
  }

  if (phase === "span_done") {
    return (
      <div className="space-y-6 text-center">
        <h3 className="text-xl font-semibold">Last part: 2 quick reasoning items.</h3>
        <Button variant="hero" size="lg" onClick={() => setPhase("reason")}>Continue</Button>
      </div>
    );
  }

  if (phase === "reason") {
    const item = REASONING_ITEMS[reasonIndex];
    return (
      <div className="space-y-6">
        <div className="text-sm text-muted-foreground text-center">
          Question {reasonIndex + 1} of {REASONING_ITEMS.length}
        </div>
        <h3 className="text-xl font-semibold text-center">{item.q}</h3>
        <div className="space-y-2">
          {item.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleReasonAnswer(i)}
              className="w-full p-4 text-left rounded-lg bg-card border border-border hover:border-primary transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

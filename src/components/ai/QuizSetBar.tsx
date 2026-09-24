import { useCallback, useEffect, useState } from "react";
import { BarChart3, Flag, Trophy, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { callQuizTracker, type QuizSetState } from "@/lib/quiz-tracker";

interface Report {
  topic: string;
  total_questions: number;
  first_attempt_score: number;
  first_attempt_accuracy: number;
  eventual_score: number;
  answered: number;
  incorrect_first_attempt: number;
  hints_used: number;
  skipped: number;
  unanswered: number;
  average_response_time_seconds: number | null;
  strongest_subskill: string | null;
  weakest_subskill: string | null;
  recommended_review: string[];
}

export function QuizSetBar({ conversationId, onOpenDashboard, onSend }: {
  conversationId: string | null;
  onOpenDashboard: () => void;
  onSend: (text: string) => void;
}) {
  const [state, setState] = useState<QuizSetState | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [ending, setEnding] = useState(false);

  const refresh = useCallback(async () => {
    if (!conversationId) { setState(null); return; }
    try {
      const r = await callQuizTracker<{ state: QuizSetState | null; report: Report | null }>("state", { conversation_id: conversationId });
      setState(r.state);
      setReport(r.report);
    } catch { /* offline */ }
  }, [conversationId]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const h = (e: Event) => {
      const rep = (e as CustomEvent).detail?.report as Report | undefined;
      if (rep) { setReport(rep); setShowReport(true); }
      refresh();
    };
    window.addEventListener("adaptiveprep:quiz-changed", h);
    return () => window.removeEventListener("adaptiveprep:quiz-changed", h);
  }, [refresh]);

  const endTopic = async () => {
    if (!state) return;
    setEnding(true);
    try {
      const r = await callQuizTracker<{ report: Report }>("end_session", { session_id: state.session.id });
      setReport(r.report);
      setShowReport(true);
      refresh();
    } finally { setEnding(false); }
  };

  const active = state && state.session.status === "active";
  const total = state?.session.total_questions ?? 10;

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border/30 bg-muted/20 px-3 py-2 text-xs">
        {active ? (
          <>
            <span className="font-semibold text-foreground truncate max-w-[40%]" title={state.session.topic}>{state.session.topic}</span>
            <span className="text-muted-foreground">Question {Math.min(state.current_sequence, total)} of {total}</span>
            <Progress value={(state.completed / total) * 100} className="h-1.5 w-24 sm:w-32" aria-label={`${state.completed} of ${total} done`} />
            <span className="text-muted-foreground">{state.progress.correct_first_attempt} correct</span>
            <button onClick={endTopic} disabled={ending} className="inline-flex items-center gap-1 rounded-md border border-border/30 px-2 py-1 text-muted-foreground hover:text-foreground">
              {ending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Flag className="w-3 h-3" />} End Topic
            </button>
          </>
        ) : report ? (
          <button onClick={() => setShowReport(true)} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <Trophy className="w-3 h-3" /> Last topic report: {report.topic} — {report.first_attempt_score}/{report.total_questions}
          </button>
        ) : (
          <span className="text-muted-foreground">Ask for a 10-question set on any topic to start tracking.</span>
        )}
        <button onClick={onOpenDashboard} className="ml-auto inline-flex items-center gap-1 rounded-md border border-border/30 px-2 py-1 text-muted-foreground hover:text-foreground">
          <BarChart3 className="w-3 h-3" /> My progress
        </button>
      </div>

      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Topic report</DialogTitle>
            <DialogDescription>{report?.topic}</DialogDescription>
          </DialogHeader>
          {report && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <Stat label="First-attempt score" value={`${report.first_attempt_score}/${report.total_questions}`} />
                <Stat label="First-attempt accuracy" value={`${report.first_attempt_accuracy}%`} />
                <Stat label="Eventual score" value={`${report.eventual_score}/${report.total_questions}`} />
                <Stat label="Incorrect" value={String(report.incorrect_first_attempt)} />
                <Stat label="Skipped" value={String(report.skipped)} />
                <Stat label="Unanswered" value={String(report.unanswered)} />
                <Stat label="Hints used" value={String(report.hints_used)} />
                <Stat label="Avg. time" value={report.average_response_time_seconds != null ? `${report.average_response_time_seconds}s` : "—"} />
              </div>
              <p><span className="text-muted-foreground">Strongest subskill:</span> {report.strongest_subskill || "—"}</p>
              <p><span className="text-muted-foreground">Weakest subskill:</span> {report.weakest_subskill || "—"}</p>
              {report.recommended_review.length > 0 && (
                <p><span className="text-muted-foreground">Review:</span> {report.recommended_review.join(", ")}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => { setShowReport(false); onSend(`Start a new 10-question set on ${report.weakest_subskill || report.topic}.`); }}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  Practice weakest area
                </button>
                <button onClick={() => { setShowReport(false); onSend("Move to the next topic."); }} className="rounded-lg border border-border/40 px-3 py-1.5 text-xs">
                  Next topic
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  );
}

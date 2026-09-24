import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { callQuizTracker } from "@/lib/quiz-tracker";

interface Summary {
  answered: number;
  correct_first_attempt: number;
  accuracy_percentage: number;
  eventual_accuracy_percentage: number;
  hints_used: number;
  skipped: number;
  average_response_time_seconds: number | null;
  last_practiced: string | null;
}
interface Sub extends Summary { subtopic: string }
interface Topic extends Summary { topic: string; subtopics: Sub[] }
interface Subject extends Summary { subject: string; topics: Topic[] }
interface Data {
  overall: Summary;
  subjects: Subject[];
  weakest: { subject: string; topic: string; accuracy: number }[];
  strongest: { subject: string; topic: string; accuracy: number }[];
  incorrect: { topic: string; question_text: string; selected_answer: string; correct_answer: string }[];
}

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "—");

function Row({ label, s, level }: { label: string; s: Summary; level: 0 | 1 | 2 }) {
  return (
    <div className={level === 0 ? "pt-3" : level === 1 ? "pl-3" : "pl-6"}>
      <div className="flex items-center justify-between gap-2">
        <p className={level === 0 ? "font-semibold text-foreground" : level === 1 ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</p>
        <span className="text-xs text-muted-foreground">{s.accuracy_percentage}%</span>
      </div>
      {level < 2 && <Progress value={s.accuracy_percentage} className="h-1.5 my-1" aria-label={`${label} accuracy`} />}
      <p className="text-[11px] text-muted-foreground">
        {s.answered} attempted · {s.correct_first_attempt} first-try correct · eventual {s.eventual_accuracy_percentage}% · {s.hints_used} hints · avg {s.average_response_time_seconds ?? "—"}s · last {fmtDate(s.last_practiced)}
      </p>
    </div>
  );
}

export function QuizDashboard({ open, onOpenChange, onSend }: { open: boolean; onOpenChange: (o: boolean) => void; onSend: (t: string) => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    callQuizTracker<Data>("dashboard").then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [open]);

  const weakest = data?.weakest[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>My quiz progress</DialogTitle>
          <DialogDescription>Built from every answer you've submitted in the AI Coach.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : !data || data.overall.answered + data.overall.skipped === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No quiz answers yet. Ask the coach for a 10-question set to begin.</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <button
                disabled={!weakest}
                onClick={() => { onOpenChange(false); weakest && onSend(`Start a 10-question set on ${weakest.topic} (${weakest.subject}).`); }}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40"
              >
                Practice weakest topic
              </button>
              <button
                disabled={!data.incorrect.length}
                onClick={() => {
                  onOpenChange(false);
                  const list = data.incorrect.slice(0, 5).map((q, i) => `${i + 1}. [${q.topic}] ${q.question_text.slice(0, 160)} (I chose ${q.selected_answer}, correct ${q.correct_answer})`).join("\n");
                  onSend(`Help me review these questions I got wrong, one at a time, then give me a similar question for each:\n${list}`);
                }}
                className="rounded-lg border border-border/40 px-3 py-1.5 text-xs disabled:opacity-40"
              >
                Review incorrect questions
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Weakest topics</p>
                <ol className="text-xs space-y-0.5 list-decimal pl-4">{data.weakest.map((t) => <li key={t.topic}>{t.topic} — {t.accuracy}%</li>)}</ol>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Strongest topics</p>
                <ol className="text-xs space-y-0.5 list-decimal pl-4">{data.strongest.map((t) => <li key={t.topic}>{t.topic} — {t.accuracy}%</li>)}</ol>
              </div>
            </div>

            <div className="divide-y divide-border/30">
              {data.subjects.map((s) => (
                <div key={s.subject} className="pb-3 space-y-2">
                  <Row label={s.subject} s={s} level={0} />
                  {s.topics.map((t) => (
                    <div key={t.topic} className="space-y-1">
                      <Row label={t.topic} s={t} level={1} />
                      {t.subtopics.map((st) => <Row key={st.subtopic} label={st.subtopic} s={st} level={2} />)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

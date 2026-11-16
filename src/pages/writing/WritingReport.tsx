import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, MessageCircle, PenLine, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FullReportView, LegacyReportViewUi } from "@/components/writing/ReportView";
import { supabase } from "@/integrations/supabase/client";
import { describeApiError, saveDraft } from "@/lib/ielts/api";
import { writeLocalDraft } from "@/lib/ielts/drafts";
import { readReportRow, type ParsedReport, type ReportRowLike } from "@/lib/ielts/reportRow";
import type { GradeReport } from "@ielts/contract.ts";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "missing" }
  | { status: "ready"; parsed: ParsedReport };

export const REPORT_FOOTER = "Band scores are estimates. AdaptivePrep is not affiliated with or endorsed by the IELTS partners.";

export default function WritingReport() {
  const { reportId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    window.scrollTo(0, 0);

    // A graded report the server could not store comes with the page as router state.
    const fromState = (location.state as { report?: GradeReport } | null)?.report;
    if (reportId === "unsaved") {
      if (fromState) {
        const parsed = readReportRow({
          id: "unsaved",
          created_at: fromState.createdAt ?? new Date().toISOString(),
          task_type: fromState.task?.taskType ?? "",
          prompt: fromState.task?.prompt ?? "",
          essay: fromState.script ?? "",
          word_count: fromState.wordCount ?? 0,
          overall_band: fromState.overall ?? null,
          criteria: null,
          comments: fromState,
        });
        setState({ status: "ready", parsed });
      } else {
        setState({ status: "missing" });
      }
      return;
    }

    setState({ status: "loading" });
    (async () => {
      try {
        const { data, error } = await supabase.from("ielts_writing_reports").select("*").eq("id", reportId).maybeSingle();
        if (cancelled) return;
        if (error) {
          setState({ status: "error", message: "We could not load this report. Check your connection and try again." });
          return;
        }
        if (!data) {
          setState({ status: "missing" });
          return;
        }
        setState({ status: "ready", parsed: readReportRow(data as unknown as ReportRowLike) });
      } catch {
        if (!cancelled) setState({ status: "error", message: "We could not load this report. Check your connection and try again." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportId, location.state, attempt]);

  const writeAgain = async (parsed: ParsedReport) => {
    if (parsed.kind !== "full") return;
    setBusy(true);
    setActionError(null);
    try {
      const task = parsed.report.task;
      const saved = await saveDraft({ task, script: "", secondsUsed: 0 });
      writeLocalDraft(saved.sessionId, { task, script: "", secondsUsed: 0, updatedAt: saved.updatedAt });
      navigate(`/dashboard/writing/session/${saved.sessionId}`);
    } catch (e) {
      setActionError(describeApiError(e, "draft"));
      setBusy(false);
    }
  };

  const retry = () => setAttempt((n) => n + 1);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link to="/dashboard/history" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> History
          </Link>
        </div>

        {state.status === "loading" && (
          <div className="space-y-4" role="status" aria-live="polite">
            <span className="sr-only">Loading your report</span>
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        )}

        {state.status === "error" && (
          <Message title="Could not load the report" body={state.message}>
            <Button onClick={retry}><RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />Try again</Button>
            <Button variant="outline" asChild><Link to="/dashboard/history">Back to history</Link></Button>
          </Message>
        )}

        {state.status === "missing" && (
          <Message title="We could not find this report" body="It may have been removed, or the link may be wrong.">
            <Button asChild><Link to="/dashboard/history">Back to history</Link></Button>
            <Button variant="outline" asChild><Link to="/dashboard/writing">Check an essay</Link></Button>
          </Message>
        )}

        {state.status === "ready" && state.parsed.kind === "invalid" && (
          <Message title="This report cannot be shown" body={state.parsed.reason}>
            <Button asChild><Link to="/dashboard/history">Back to history</Link></Button>
            <Button variant="outline" asChild><Link to="/dashboard/writing">Check an essay</Link></Button>
          </Message>
        )}

        {state.status === "ready" && state.parsed.kind !== "invalid" && (
          <>
            <h1 className="sr-only">Writing report</h1>
            {state.parsed.id === "unsaved" && (
              <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-foreground">
                We could not save this report, so it will not appear in your history. Your answer is still in your drafts on the Writing page.
              </p>
            )}
            {state.parsed.kind === "full" ? <FullReportView report={state.parsed.report} /> : <LegacyReportViewUi view={state.parsed.legacy} />}

            <div className="space-y-3 pt-2">
              {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
              <div className="flex flex-col sm:flex-row gap-3">
                {state.parsed.id && state.parsed.id !== "unsaved" && (
                  <Button asChild className="sm:flex-1">
                    <Link to={`/dashboard?report=${encodeURIComponent(state.parsed.id)}`}>
                      <MessageCircle className="h-4 w-4 mr-2" aria-hidden="true" />Ask the coach about this report
                    </Link>
                  </Button>
                )}
                {state.parsed.kind === "full" && (
                  <Button variant="outline" className="sm:flex-1" disabled={busy} onClick={() => writeAgain(state.parsed)}>
                    {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" /> : <PenLine className="h-4 w-4 mr-2" aria-hidden="true" />}
                    Write it again
                  </Button>
                )}
                <Button variant="outline" className="sm:flex-1" asChild>
                  <Link to="/dashboard/writing">Try another task</Link>
                </Button>
              </div>
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground border-t border-border pt-4">{REPORT_FOOTER}</p>
      </div>
    </DashboardLayout>
  );
}

function Message({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-3" role="alert">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <p className="text-muted-foreground">{body}</p>
      <div className="flex flex-col sm:flex-row gap-3 pt-1">{children}</div>
    </div>
  );
}

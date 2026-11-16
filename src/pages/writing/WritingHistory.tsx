import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, FileWarning, PenLine, RefreshCw } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CRITERION_COLORS } from "@/components/writing/ScriptHighlights";
import { supabase } from "@/integrations/supabase/client";
import { criterionLabel, formatBand } from "@/lib/ielts/labels";
import { buildTrend, readReportRow, summarizeReport, type ParsedReport, type ReportRowLike } from "@/lib/ielts/reportRow";
import { useAuth } from "@/contexts/AuthContext";

const MAX_ROWS = 100;
const CRITERIA = ["task", "coherence", "lexical", "grammar"] as const;

const dateFmt = (iso: string, withYear = true) => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
};

type State = { status: "loading" } | { status: "error" } | { status: "ready"; items: ParsedReport[] };

export default function WritingHistory() {
  const { user } = useAuth();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      try {
        let q = supabase.from("ielts_writing_reports").select("*").order("created_at", { ascending: false }).limit(MAX_ROWS);
        if (user?.id) q = q.eq("user_id", user.id);
        const { data, error } = await q;
        if (cancelled) return;
        if (error || !Array.isArray(data)) {
          setState({ status: "error" });
          return;
        }
        setState({ status: "ready", items: data.map((row) => readReportRow(row as unknown as ReportRowLike)) });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, attempt]);

  const trend = useMemo(() => (state.status === "ready" ? buildTrend(state.items) : []), [state]);
  const chartData = useMemo(
    () => trend.map((p, i) => ({ ...p, label: dateFmt(p.createdAt, false) || `#${i + 1}`, n: i + 1 })),
    [trend]
  );

  // Start the axis at 3 as usual, lower when a band is below 3 (very short or non-English answers), so no point falls off the chart.
  const yMin = useMemo(() => {
    const lows = trend.flatMap((p) => CRITERIA.map((k) => p[k])).filter((n) => Number.isFinite(n));
    return Math.max(0, Math.min(3, Math.floor(Math.min(9, ...lows))));
  }, [trend]);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto w-full space-y-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">History</h1>
            <p className="text-sm text-muted-foreground mt-1">Your writing reports, newest first. Bands are estimates.</p>
          </div>
          <Button asChild size="sm" className="flex-shrink-0">
            <Link to="/dashboard/writing"><PenLine className="h-4 w-4 mr-2" aria-hidden="true" />Check an essay</Link>
          </Button>
        </div>

        {state.status === "loading" && (
          <div className="space-y-3" role="status">
            <span className="sr-only">Loading your reports</span>
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        )}

        {state.status === "error" && (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-3" role="alert">
            <h2 className="text-lg font-semibold text-foreground">We could not load your reports</h2>
            <p className="text-muted-foreground">Check your connection and try again.</p>
            <Button onClick={() => setAttempt((n) => n + 1)}><RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />Try again</Button>
          </div>
        )}

        {state.status === "ready" && state.items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-3">
            <h2 className="text-lg font-semibold text-foreground">No reports yet</h2>
            <p className="text-muted-foreground">When you check an essay, the report is saved here so you can compare over time.</p>
            <Button asChild><Link to="/dashboard/writing">Check your first essay</Link></Button>
          </div>
        )}

        {state.status === "ready" && state.items.length > 0 && (
          <>
            {chartData.length >= 2 && (
              <section className="space-y-3" aria-labelledby="trend-title">
                <h2 id="trend-title" className="text-lg font-semibold text-foreground">Estimated band by criterion</h2>
                <div className="relative overflow-hidden rounded-xl border border-border bg-card p-3 sm:p-4">
                  <div className="h-64 w-full" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                        <YAxis domain={[yMin, 9]} ticks={Array.from({ length: 10 - yMin }, (_, i) => yMin + i)} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        {CRITERIA.map((k) => (
                          <Line key={k} type="linear" dataKey={k} name={criterionLabel(k)} stroke={CRITERION_COLORS[k]} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <table className="sr-only">
                    <caption>Estimated band for each criterion, oldest to newest</caption>
                    <thead>
                      <tr><th>Date</th>{CRITERIA.map((k) => <th key={k}>{criterionLabel(k)}</th>)}</tr>
                    </thead>
                    <tbody>
                      {chartData.map((p) => (
                        <tr key={p.id}><td>{dateFmt(p.createdAt)}</td>{CRITERIA.map((k) => <td key={k}>{formatBand(p[k])}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="space-y-3" aria-labelledby="list-title">
              <h2 id="list-title" className="text-lg font-semibold text-foreground">Reports</h2>
              <ul className="space-y-2">
                {state.items.map((p, i) => {
                  const s = summarizeReport(p);
                  const date = dateFmt(p.createdAt);
                  if (p.kind === "invalid") {
                    return (
                      <li key={p.id || i} className="flex items-center gap-3 rounded-xl border border-border p-4 text-muted-foreground">
                        <FileWarning className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="text-sm text-foreground">A report we could not read</p>
                          <p className="text-xs">{date}</p>
                        </div>
                      </li>
                    );
                  }
                  return (
                    <li key={p.id}>
                      <Link
                        to={`/dashboard/writing/report/${p.id}`}
                        className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{s.taskLabel}</p>
                          <p className="text-xs text-muted-foreground">
                            {date}
                            {s.wordCount !== null ? ` · ${s.wordCount} words` : ""}
                            {p.kind === "legacy" ? " · earlier version" : ""}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-bold tabular-nums text-foreground leading-none">{formatBand(s.band)}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">estimated</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {state.items.length >= MAX_ROWS && <p className="text-xs text-muted-foreground">Showing your latest {MAX_ROWS} reports.</p>}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

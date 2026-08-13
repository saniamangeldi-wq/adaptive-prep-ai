import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, Target, History } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from "recharts";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageSeo } from "@/components/seo/PageSeo";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatScore } from "@/lib/sat-score";

interface Attempt {
  id: string;
  score: number | null;
  correct_answers: number | null;
  total_questions: number | null;
  completed_at: string | null;
  abandoned: boolean | null;
  feedback: unknown;
}

interface TopicStat {
  topic: string;
  correct: number;
  total: number;
}

/**
 * Per-student progress detail for tutors and teachers: score trend, weakest
 * domains, and full test history. Abandoned attempts are shown but never
 * counted towards trends or accuracy.
 */
export default function StudentProgressDetail() {
  const { studentId } = useParams<{ studentId: string }>();
  const { profile: viewer } = useAuth();
  const isTeacher = viewer?.role === "teacher";
  const backHref = isTeacher ? "/dashboard/classroom" : "/dashboard/students";

  const { data, isLoading } = useQuery({
    queryKey: ["student-progress-detail", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const [{ data: profile }, { data: attempts }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, email, grade_level")
          .eq("user_id", studentId!)
          .maybeSingle(),
        supabase
          .from("test_attempts")
          .select("id, score, correct_answers, total_questions, completed_at, abandoned, feedback")
          .eq("user_id", studentId!)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: true }),
      ]);
      return { profile, attempts: (attempts ?? []) as Attempt[] };
    },
  });

  const scored = useMemo(
    () => (data?.attempts ?? []).filter((a) => !a.abandoned && a.score != null),
    [data],
  );

  const trend = useMemo(
    () =>
      scored.map((a, i) => ({
        name: `#${i + 1}`,
        score: a.score as number,
        date: a.completed_at ? new Date(a.completed_at).toLocaleDateString() : "",
      })),
    [scored],
  );

  const weakTopics = useMemo<TopicStat[]>(() => {
    const totals = new Map<string, TopicStat>();
    for (const a of scored) {
      const byTopic = (a.feedback as { byTopic?: Record<string, { correct: number; total: number }> } | null)
        ?.byTopic;
      if (!byTopic) continue;
      for (const [topic, v] of Object.entries(byTopic)) {
        const cur = totals.get(topic) ?? { topic, correct: 0, total: 0 };
        cur.correct += v?.correct ?? 0;
        cur.total += v?.total ?? 0;
        totals.set(topic, cur);
      }
    }
    return Array.from(totals.values())
      .filter((t) => t.total >= 3)
      .sort((a, b) => a.correct / a.total - b.correct / b.total)
      .slice(0, 6);
  }, [scored]);

  const name = data?.profile?.full_name || data?.profile?.email || "Student";
  const first = scored[0]?.score ?? null;
  const latest = scored[scored.length - 1]?.score ?? null;
  const improvement = first != null && latest != null && scored.length > 1 ? latest - first : null;

  return (
    <DashboardLayout>
      <PageSeo
        title={`Student progress | AdaptivePrep`}
        description="Detailed SAT score trends, weak domains, and test history for an individual student."
        path={`/dashboard/students/${studentId ?? ""}`}
      />
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/students">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </Button>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{name}</h1>
          <p className="text-muted-foreground mt-1">
            {isLoading ? "Loading progress…" : `${scored.length} scored test${scored.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Metric label="Latest score" value={formatScore(latest)} />
          <Metric label="First score" value={formatScore(first)} />
          <Metric
            label="Improvement"
            value={improvement == null ? "—" : `${improvement > 0 ? "+" : ""}${improvement}`}
          />
        </div>

        <section className="p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Score trend</h2>
          </div>
          {trend.length < 2 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Not enough completed tests yet to draw a trend.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <ReTooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                    }}
                  />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Weakest domains</h2>
          </div>
          {weakTopics.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No topic-level data yet. It appears once the student completes a scored test.
            </p>
          ) : (
            <div className="space-y-3">
              {weakTopics.map((t) => {
                const pct = Math.round((t.correct / t.total) * 100);
                return (
                  <div key={t.topic}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-foreground">{t.topic}</span>
                      <span className="text-muted-foreground">
                        {pct}% ({t.correct}/{t.total})
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct < 50 ? "bg-destructive" : "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Test history</h2>
          </div>
          {(data?.attempts ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              This student hasn't completed any tests yet.
            </p>
          ) : (
            <div className="space-y-2">
              {[...(data?.attempts ?? [])].reverse().map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 border border-border/40"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-foreground">
                      {a.completed_at ? new Date(a.completed_at).toLocaleString() : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.correct_answers ?? 0}/{a.total_questions ?? 0} correct
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-xs px-2 py-1 rounded-lg ${
                      a.abandoned
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    {a.abandoned ? "Abandoned" : formatScore(a.score ?? null)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5 rounded-xl bg-card border border-border/50">
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

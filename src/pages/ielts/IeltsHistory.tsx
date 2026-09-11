import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageSeo } from "@/components/seo/PageSeo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { IeltsBandReport } from "./IeltsBandReport";
import type { IeltsWritingReport } from "@/lib/ielts";

interface SessionRow {
  id: string;
  skill: string;
  variant: string | null;
  band: number | null;
  raw_score: number | null;
  status: string | null;
  created_at: string;
}

export default function IeltsHistory() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [reports, setReports] = useState<Array<{ id: string; created_at: string; report: IeltsWritingReport }>>([]);
  const [openReport, setOpenReport] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: s }, { data: r }] = await Promise.all([
        supabase
          .from("ielts_sessions")
          .select("id, skill, variant, band, raw_score, status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("ielts_writing_reports")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      if (cancelled) return;
      setSessions((s as SessionRow[]) ?? []);
      setReports(
        ((r ?? []) as Array<Record<string, unknown>>).map((row) => ({
          id: String(row.id),
          created_at: String(row.created_at),
          report: {
            id: String(row.id),
            taskType: row.task_type as IeltsWritingReport["taskType"],
            wordCount: Number(row.word_count ?? 0),
            overall: Number(row.overall_band ?? 0),
            criteria: (row.criteria ?? {}) as IeltsWritingReport["criteria"],
            comments: (row.comments ?? {}) as IeltsWritingReport["comments"],
            modelAnswer: String(row.model_answer ?? ""),
          },
        })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <>
      <PageSeo
        title="Your IELTS history | AdaptivePrep"
        description="Every IELTS reading set and writing band report you have completed."
        path="/dashboard/ielts/history"
      />
      <DashboardLayout>
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">IELTS history</h1>
              <p className="text-muted-foreground">Your completed sets and band reports.</p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/dashboard/ielts">Back</Link>
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <section className="space-y-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <BookOpen className="h-4 w-4" /> Reading sets
                </h2>
                {sessions.filter((s) => s.skill === "reading").length === 0 ? (
                  <Card className="p-5 text-sm text-muted-foreground">
                    No reading sets yet.
                  </Card>
                ) : (
                  sessions
                    .filter((s) => s.skill === "reading")
                    .map((s) => (
                      <Card key={s.id} className="flex items-center justify-between p-4">
                        <div>
                          <p className="text-sm text-foreground">
                            {new Date(s.created_at).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {s.variant === "general" ? "General Training" : "Academic"} ·{" "}
                            {s.status === "completed" ? "completed" : "not finished"}
                          </p>
                        </div>
                        {s.band !== null && (
                          <Badge variant="secondary" className="text-base">
                            Band {s.band.toFixed(1)}
                          </Badge>
                        )}
                      </Card>
                    ))
                )}
              </section>

              <section className="space-y-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <PenLine className="h-4 w-4" /> Writing reports
                </h2>
                {reports.length === 0 ? (
                  <Card className="p-5 text-sm text-muted-foreground">
                    No writing reports yet.
                  </Card>
                ) : (
                  reports.map((r) => (
                    <div key={r.id} className="space-y-2">
                      <Card className="flex items-center justify-between p-4">
                        <div>
                          <p className="text-sm text-foreground">
                            {new Date(r.created_at).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">{r.report.taskType}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="text-base">
                            Band {r.report.overall.toFixed(1)}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOpenReport(openReport === r.id ? null : r.id)}
                          >
                            {openReport === r.id ? "Hide" : "View"}
                          </Button>
                        </div>
                      </Card>
                      {openReport === r.id && <IeltsBandReport report={r.report} />}
                    </div>
                  ))
                )}
              </section>
            </>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}

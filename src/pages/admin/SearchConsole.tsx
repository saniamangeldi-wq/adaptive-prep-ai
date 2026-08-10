import { useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageSeo } from "@/components/seo/PageSeo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Loader2, RefreshCw, Search, TrendingUp } from "lucide-react";

interface Row {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface Report {
  status: string;
  siteUrl?: string;
  sites?: string[];
  range?: { startDate: string; endDate: string };
  totals?: Row | null;
  queries?: Row[];
  pages?: Row[];
  countries?: Row[];
  sitemaps?: Array<{
    path: string;
    lastSubmitted?: string;
    lastDownloaded?: string;
    errors?: string;
    warnings?: string;
    contents?: Array<{ submitted?: string; indexed?: string }>;
  }>;
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function RowTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <Card className="p-4 overflow-hidden">
      <h3 className="font-semibold mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data reported for this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left">
                <th className="py-1 pr-2 font-medium">Item</th>
                <th className="py-1 px-2 font-medium text-right">Clicks</th>
                <th className="py-1 px-2 font-medium text-right">Impr.</th>
                <th className="py-1 px-2 font-medium text-right">CTR</th>
                <th className="py-1 pl-2 font-medium text-right">Pos.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="py-1.5 pr-2 max-w-[280px] truncate">{r.keys?.[0]}</td>
                  <td className="py-1.5 px-2 text-right">{r.clicks}</td>
                  <td className="py-1.5 px-2 text-right">{r.impressions}</td>
                  <td className="py-1.5 px-2 text-right">{pct(r.ctr)}</td>
                  <td className="py-1.5 pl-2 text-right">{r.position.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function SearchConsole() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === "school_admin";

  const load = useCallback(
    async (siteUrl?: string) => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("search-console-report", {
        body: { days: 28, ...(siteUrl ? { siteUrl } : {}) },
      });
      if (error) {
        const details =
          error instanceof FunctionsHttpError ? await error.context.text() : error.message;
        toast({ title: "Could not load Search Console", description: details, variant: "destructive" });
        setReport(null);
      } else {
        setReport(data as Report);
      }
      setLoading(false);
    },
    [toast],
  );

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <PageSeo title="Search Console" description="Google Search Console performance for AdaptivePrep" path="/admin/search-console" />
        <div className="p-6">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">This page is available to administrators only.</p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const totals = report?.totals;

  return (
    <DashboardLayout>
      <PageSeo title="Search Console" description="Google Search Console performance for AdaptivePrep" path="/admin/search-console" />
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Search className="h-5 w-5" /> Google Search Console
            </h1>
            {report?.siteUrl && (
              <p className="text-sm text-muted-foreground">
                {report.siteUrl} · {report.range?.startDate} → {report.range?.endDate}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => load(report?.siteUrl)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>

        {loading && !report && (
          <Card className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading search data…
          </Card>
        )}

        {report?.status === "no_property" && (
          <Card className="p-6 text-sm text-muted-foreground">
            No verified Search Console property is available on the connected Google account.
          </Card>
        )}

        {report?.status === "selection_required" && (
          <Card className="p-6 space-y-3">
            <p className="text-sm">Choose which property to view:</p>
            <div className="flex flex-wrap gap-2">
              {report.sites?.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => load(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </Card>
        )}

        {report?.status === "ok" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Clicks", value: totals?.clicks ?? 0 },
                { label: "Impressions", value: totals?.impressions ?? 0 },
                { label: "CTR", value: totals ? pct(totals.ctr) : "—" },
                { label: "Avg. position", value: totals ? totals.position.toFixed(1) : "—" },
              ].map((s) => (
                <Card key={s.label} className="p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-semibold mt-1">{s.value}</p>
                </Card>
              ))}
            </div>

            <Card className="p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Sitemaps
              </h3>
              {report.sitemaps?.length ? (
                <ul className="space-y-2 text-sm">
                  {report.sitemaps.map((sm) => (
                    <li key={sm.path} className="flex flex-wrap items-center gap-2">
                      <span className="truncate max-w-[320px]">{sm.path}</span>
                      <Badge variant={Number(sm.errors ?? 0) > 0 ? "destructive" : "default"}>
                        {sm.errors ?? 0} errors
                      </Badge>
                      <Badge variant="secondary">
                        {sm.contents?.[0]?.indexed ?? 0}/{sm.contents?.[0]?.submitted ?? 0} indexed
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No sitemap submitted.</p>
              )}
            </Card>

            <RowTable title="Top queries" rows={report.queries ?? []} />
            <RowTable title="Top pages" rows={report.pages ?? []} />
            <RowTable title="Top countries" rows={report.countries ?? []} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

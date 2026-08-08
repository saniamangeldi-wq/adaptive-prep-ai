import { useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageSeo } from "@/components/seo/PageSeo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SAT_SOURCE_BUCKET } from "@/lib/sat-source-files";
import { AlertCircle, Download, FileText, Loader2, RefreshCw } from "lucide-react";

interface SourcePdf {
  id: string;
  original_filename: string;
  storage_bucket: string;
  storage_path: string;
  file_size: number | null;
  checksum_sha256: string;
  processing_status: string;
  processing_error: string | null;
  question_count: number | null;
  figure_count: number | null;
  current_version: number;
  created_at: string;
}

const statusVariant = (status: string) =>
  status === "succeeded" ? "default" : status === "failed" ? "destructive" : "secondary";

export default function PdfArchive() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<SourcePdf[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = profile?.role === "school_admin";

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sat_source_pdfs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Could not load archive", description: error.message, variant: "destructive" });
    }
    setRows((data as SourcePdf[]) ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const download = async (row: SourcePdf) => {
    const { data, error } = await supabase.storage
      .from(row.storage_bucket || SAT_SOURCE_BUCKET)
      .createSignedUrl(row.storage_path, 120);
    if (error || !data?.signedUrl) {
      toast({ title: "Download failed", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const reprocess = async (row: SourcePdf) => {
    setBusyId(row.id);
    try {
      const { data, error } = await supabase.functions.invoke("reprocess-sat-pdf", {
        body: { sourcePdfId: row.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({
        title: "Reprocessed",
        description: `Version ${(data as any)?.version ?? "?"} created with ${(data as any)?.questionsCount ?? 0} questions.`,
      });
      await load();
    } catch (e: any) {
      toast({ title: "Reprocess failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <PageSeo title="SAT PDF Archive | AdaptivePrep Admin" description="Admin archive of original SAT source PDFs." path="/admin/pdf-archive" />
        <div className="max-w-2xl mx-auto text-center py-12">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">Admin access is required to view the PDF archive.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageSeo title="SAT PDF Archive | AdaptivePrep Admin" description="Browse, download, and reprocess archived SAT source PDFs." path="/admin/pdf-archive" />
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">SAT PDF Archive</h1>
            <p className="text-muted-foreground mt-1">
              Every uploaded source PDF is kept permanently and can be reprocessed into a new version.
            </p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading} className="shrink-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        </div>

        {loading && rows.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">Loading archive...</Card>
        )}

        {!loading && rows.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            No PDFs archived yet. Upload one from the Upload Tests page.
          </Card>
        )}

        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <FileText className="w-9 h-9 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{row.original_filename}</p>
                  <p className="text-sm text-muted-foreground">
                    {row.file_size ? `${(row.file_size / 1024 / 1024).toFixed(2)} MB · ` : ""}
                    v{row.current_version} · {row.question_count ?? 0} questions · {row.figure_count ?? 0} figures
                  </p>
                  <p className="text-xs text-muted-foreground/70 font-mono truncate mt-1">
                    sha256 {row.checksum_sha256.slice(0, 16)}…
                  </p>
                  {row.processing_error && (
                    <p className="text-sm text-destructive mt-1">{row.processing_error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={statusVariant(row.processing_status)}>{row.processing_status}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => download(row)}>
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reprocess(row)}
                    disabled={busyId === row.id}
                  >
                    {busyId === row.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Reprocess
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

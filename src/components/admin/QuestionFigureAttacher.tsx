import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

const TEN_YEARS_SECONDS = 60 * 60 * 24 * 365 * 10;

/**
 * Admin tool: attach a real figure image to a single SAT question.
 * The bucket is private, so the stored URL is a long-lived signed URL.
 */
export function QuestionFigureAttacher() {
  const { toast } = useToast();
  const [questionId, setQuestionId] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("question_validation_state")
        .select("question_id")
        .eq("visual_requirement", "required")
        .in("delivery_status", ["quarantined", "needs_review"])
        .limit(24);
      if (!cancelled) setMissing((data ?? []).map((r) => r.question_id));
    })();
    return () => {
      cancelled = true;
    };
  }, [busy]);

  async function attach() {
    if (!questionId.trim() || !file) {
      toast({ title: "Question ID and image are required", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const path = `${questionId.trim()}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("question-figures")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: signed, error: signErr } = await supabase.storage
        .from("question-figures")
        .createSignedUrl(path, TEN_YEARS_SECONDS);
      if (signErr || !signed?.signedUrl) throw signErr ?? new Error("Could not sign URL");

      const { data, error } = await supabase.functions.invoke("attach-question-figure", {
        body: {
          question_id: questionId.trim(),
          src: signed.signedUrl,
          alt: alt.trim() || `Figure for question ${questionId.trim()}`,
          caption: caption.trim() || undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast({ title: "Figure attached", description: `Question ${questionId.trim()} now renders an image.` });
      setFile(null);
      setAlt("");
      setCaption("");
    } catch (e) {
      toast({ title: "Attach failed", description: String((e as Error).message ?? e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function removeFigure() {
    if (!questionId.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("attach-question-figure", {
        body: { question_id: questionId.trim(), remove: true },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Figure removed" });
    } catch (e) {
      toast({ title: "Remove failed", description: String((e as Error).message ?? e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h4 className="font-medium text-foreground">Attach a figure image to a question</h4>
        <p className="text-sm text-muted-foreground mt-1">
          Upload the original graph, chart or diagram for a question. The image is stored privately and
          linked to the question so the renderer shows it instead of a fallback.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="figure-question-id">Question ID</Label>
          <Input
            id="figure-question-id"
            value={questionId}
            onChange={(e) => setQuestionId(e.target.value)}
            placeholder="opensat-math-mcq-84"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="figure-file">Image file</Label>
          <Input
            id="figure-file"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="figure-alt">Alt text</Label>
          <Input
            id="figure-alt"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Graph of y = h(x) with vertex at (2, -3)"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="figure-caption">Caption (optional)</Label>
          <Input
            id="figure-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Figure 1"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={attach} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          Attach figure
        </Button>
        <Button onClick={removeFigure} disabled={busy || !questionId.trim()} variant="outline">
          <Trash2 className="w-4 h-4" />
          Remove figure
        </Button>
      </div>

      {missing.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Questions waiting on a visual — click to fill the ID:</p>
          <div className="flex flex-wrap gap-2">
            {missing.map((id) => (
              <Badge
                key={id}
                variant="outline"
                className="cursor-pointer"
                onClick={() => setQuestionId(id)}
              >
                {id}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default QuestionFigureAttacher;

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageIcon, Loader2, Download, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GenerateImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getActiveTheme(): "dark" | "midnight" | "sepia" {
  const stored = localStorage.getItem("app-theme");
  if (stored === "midnight" || stored === "sepia") return stored;
  return "dark";
}

export function GenerateImageDialog({ open, onOpenChange }: GenerateImageDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    const text = prompt.trim();
    if (text.length < 3) {
      toast.error("Describe the picture you want first.");
      return;
    }

    setIsGenerating(true);
    setImage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("You must be signed in to generate pictures.");
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ prompt: text, theme: getActiveTheme() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.image) {
        toast.error(data.error || "Could not generate the picture.");
        return;
      }
      setImage(data.image as string);
    } catch (err) {
      console.error("Image generation failed:", err);
      toast.error("Could not generate the picture. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image;
    a.download = `adaptiveprep-${Date.now()}.png`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Generate a picture
          </DialogTitle>
          <DialogDescription>
            Create a study visual that automatically matches your current theme.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="image-prompt">Describe your picture</Label>
            <Textarea
              id="image-prompt"
              rows={3}
              maxLength={600}
              placeholder="e.g., A diagram of the unit circle with key angles labelled"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          <div className="rounded-xl border border-border bg-muted/30 aspect-square overflow-hidden flex items-center justify-center">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs">Painting your picture...</p>
              </div>
            ) : image ? (
              <img src={image} alt={prompt} className="w-full h-full object-contain" />
            ) : (
              <p className="text-xs text-muted-foreground px-6 text-center">
                Your generated picture will appear here.
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3 inline mr-1 text-primary" />
            Uses 3 AI credits per picture.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          {image && (
            <Button variant="outline" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          )}
          <Button variant="hero" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4 mr-2" />
                {image ? "Generate again" : "Generate"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

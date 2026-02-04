import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Globe, FileText, Loader2, Wand2 } from "lucide-react";
import { FlashcardDeck } from "@/lib/flashcard-data";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface GenerateWithAIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateDeck: (deck: FlashcardDeck) => void;
}

export function GenerateWithAIDialog({ open, onOpenChange, onCreateDeck }: GenerateWithAIDialogProps) {
  const { profile } = useAuth();
  const [topic, setTopic] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [category, setCategory] = useState<FlashcardDeck["category"]>("custom");
  const [cardCount, setCardCount] = useState("10");
  const [sourceType, setSourceType] = useState<"internet" | "custom">("internet");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic for your flashcards");
      return;
    }

    if (sourceType === "custom" && !additionalInfo.trim()) {
      toast.error("Please provide your content to generate flashcards from");
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("You must be logged in to generate flashcards");
        setIsGenerating(false);
        return;
      }

      // Call the dedicated flashcard generation endpoint
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-flashcards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          topic: topic.trim(),
          cardCount: parseInt(cardCount),
          sourceType,
          customContent: sourceType === "custom" ? additionalInfo.trim() : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast.error("No credits remaining. Please upgrade your plan.");
        } else if (response.status === 429) {
          toast.error("Rate limit exceeded. Please try again later.");
        } else {
          toast.error(data.error || "Failed to generate flashcards");
        }
        setIsGenerating(false);
        return;
      }

      if (!data.cards || data.cards.length === 0) {
        toast.error("No flashcards were generated. Please try again.");
        setIsGenerating(false);
        return;
      }

      const newDeck: FlashcardDeck = {
        id: `ai-${Date.now()}`,
        title: topic.trim(),
        description: `AI-generated flashcards about ${topic}`,
        category,
        cards: data.cards.map((c: { front: string; back: string }, i: number) => ({
          id: `ai-card-${Date.now()}-${i}`,
          front: c.front || "",
          back: c.back || "",
        })).filter((c: { front: string; back: string }) => c.front && c.back),
        source: "ai_generated",
        createdAt: new Date(),
      };

      onCreateDeck(newDeck);
      
      // Reset form
      setTopic("");
      setAdditionalInfo("");
      setCategory("custom");
      setCardCount("10");
      setSourceType("internet");
      onOpenChange(false);
      
      toast.success(`Generated ${newDeck.cards.length} flashcards for "${topic}"!`);
    } catch (error) {
      console.error("Error generating flashcards:", error);
      toast.error("Failed to generate flashcards. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Generate with AI
          </DialogTitle>
          <DialogDescription>
            Let AI create flashcards using the internet or your own materials
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Source Type */}
          <div className="space-y-3">
            <Label>Information Source</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSourceType("internet")}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  sourceType === "internet"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Globe className={`w-5 h-5 mb-2 ${sourceType === "internet" ? "text-primary" : "text-muted-foreground"}`} />
                <p className="font-medium text-sm">Search Internet</p>
                <p className="text-xs text-muted-foreground mt-1">AI finds current info online</p>
              </button>
              <button
                type="button"
                onClick={() => setSourceType("custom")}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  sourceType === "custom"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <FileText className={`w-5 h-5 mb-2 ${sourceType === "custom" ? "text-primary" : "text-muted-foreground"}`} />
                <p className="font-medium text-sm">Your Content</p>
                <p className="text-xs text-muted-foreground mt-1">Paste notes or text</p>
              </button>
            </div>
          </div>

          {/* Topic */}
          <div className="space-y-2">
            <Label htmlFor="ai-topic">Topic *</Label>
            <Input
              id="ai-topic"
              placeholder="e.g., Quadratic equations, SAT vocabulary, Grammar rules..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          {/* Custom Content (if selected) */}
          {sourceType === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="custom-content">Your Content *</Label>
              <Textarea
                id="custom-content"
                placeholder="Paste your notes, textbook content, or any text you want to turn into flashcards..."
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                The more detailed your content, the better the flashcards!
              </p>
            </div>
          )}

          {/* Options Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ai-category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as FlashcardDeck["category"])}>
                <SelectTrigger id="ai-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="math">Math</SelectItem>
                  <SelectItem value="vocabulary">Vocabulary</SelectItem>
                  <SelectItem value="grammar">Grammar</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="card-count">Number of Cards</Label>
              <Select value={cardCount} onValueChange={setCardCount}>
                <SelectTrigger id="card-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 cards</SelectItem>
                  <SelectItem value="10">10 cards</SelectItem>
                  <SelectItem value="15">15 cards</SelectItem>
                  <SelectItem value="20">20 cards</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Credits notice */}
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <p className="text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3 inline mr-1 text-primary" />
              This will use 1 AI credit. You have {profile?.credits_remaining || 0} credits remaining.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button variant="hero" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Flashcards
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

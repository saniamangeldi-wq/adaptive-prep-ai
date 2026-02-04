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

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("You must be logged in to generate flashcards");
        setIsGenerating(false);
        return;
      }

      // Call the AI to generate flashcards
      const prompt = sourceType === "internet" 
        ? `Generate ${cardCount} SAT-style flashcards about "${topic}". Use current, accurate information from the web. Each card should have a clear question/term on the front and a detailed answer/explanation on the back.`
        : `Generate ${cardCount} SAT-style flashcards about "${topic}" using this information: ${additionalInfo}. Each card should have a clear question/term on the front and a detailed answer/explanation on the back.`;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/student-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [
            { 
              role: "user", 
              content: `${prompt}\n\nRespond ONLY with a JSON array of flashcard objects in this exact format:\n[{"front": "question/term", "back": "answer/definition"}, ...]\n\nNo other text, just the JSON array.`
            }
          ],
          taskType: "flashcard_generation"
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate flashcards");
      }

      // Read the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ") && !line.includes("[DONE]")) {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) fullContent += content;
              } catch {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }

      // Try to extract JSON from the response
      const jsonMatch = fullContent.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Could not parse flashcard data");
      }

      const cards = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(cards) || cards.length === 0) {
        throw new Error("No flashcards generated");
      }

      const newDeck: FlashcardDeck = {
        id: `ai-${Date.now()}`,
        title: topic.trim(),
        description: `AI-generated flashcards about ${topic}`,
        category,
        cards: cards.map((c: { front: string; back: string }, i: number) => ({
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

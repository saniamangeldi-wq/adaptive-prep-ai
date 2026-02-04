import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, X } from "lucide-react";
import { FlashcardDeck, Flashcard } from "@/lib/flashcard-data";
import { toast } from "sonner";

interface CreateDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateDeck: (deck: FlashcardDeck) => void;
}

export function CreateDeckDialog({ open, onOpenChange, onCreateDeck }: CreateDeckDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<FlashcardDeck["category"]>("custom");
  const [cards, setCards] = useState<Array<{ front: string; back: string }>>([
    { front: "", back: "" },
  ]);

  const addCard = () => {
    setCards([...cards, { front: "", back: "" }]);
  };

  const removeCard = (index: number) => {
    if (cards.length > 1) {
      setCards(cards.filter((_, i) => i !== index));
    }
  };

  const updateCard = (index: number, field: "front" | "back", value: string) => {
    const newCards = [...cards];
    newCards[index][field] = value;
    setCards(newCards);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Please enter a deck title");
      return;
    }

    if (!description.trim()) {
      toast.error("Please enter a deck description");
      return;
    }

    const validCards = cards.filter(c => c.front.trim() && c.back.trim());
    if (validCards.length === 0) {
      toast.error("Please add at least one complete flashcard");
      return;
    }

    const newDeck: FlashcardDeck = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      category,
      cards: validCards.map((c, i) => ({
        id: `card-${Date.now()}-${i}`,
        front: c.front.trim(),
        back: c.back.trim(),
      })),
      source: "manual",
      createdAt: new Date(),
    };

    onCreateDeck(newDeck);
    
    // Reset form
    setTitle("");
    setDescription("");
    setCategory("custom");
    setCards([{ front: "", back: "" }]);
    onOpenChange(false);
    
    toast.success(`Created deck "${newDeck.title}" with ${validCards.length} cards!`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Deck</DialogTitle>
          <DialogDescription>
            Add your own flashcards with detailed questions and answers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Deck Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Deck Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Physics Formulas, Literary Terms..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what this deck covers and how it will help..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as FlashcardDeck["category"])}>
                <SelectTrigger>
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
          </div>

          {/* Cards Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Flashcards ({cards.length})</Label>
              <Button variant="outline" size="sm" onClick={addCard}>
                <Plus className="w-4 h-4 mr-1" />
                Add Card
              </Button>
            </div>

            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
              {cards.map((card, index) => (
                <div 
                  key={index} 
                  className="p-4 rounded-lg border border-border bg-secondary/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Card {index + 1}
                    </span>
                    {cards.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => removeCard(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Front (Question/Term)</Label>
                    <Input
                      placeholder="Enter the question or term..."
                      value={card.front}
                      onChange={(e) => updateCard(index, "front", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Back (Answer/Definition)</Label>
                    <Textarea
                      placeholder="Enter the answer, definition, or explanation..."
                      value={card.back}
                      onChange={(e) => updateCard(index, "back", e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button variant="hero" onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-2" />
            Create Deck
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

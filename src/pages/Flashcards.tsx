import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Layers, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  RotateCcw,
  Brain
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface FlashcardDeck {
  id: string;
  title: string;
  description: string;
  cardCount: number;
  source: "manual" | "ai_generated";
}

// Mock data
const mockDecks: FlashcardDeck[] = [
  {
    id: "1",
    title: "SAT Math Formulas",
    description: "Essential formulas for algebra and geometry",
    cardCount: 25,
    source: "ai_generated",
  },
  {
    id: "2",
    title: "Vocabulary Builder",
    description: "High-frequency SAT vocabulary words",
    cardCount: 50,
    source: "ai_generated",
  },
  {
    id: "3",
    title: "Grammar Rules",
    description: "Key grammar concepts for writing section",
    cardCount: 15,
    source: "manual",
  },
];

const mockCards: Flashcard[] = [
  { id: "1", front: "Quadratic Formula", back: "x = (-b ± √(b²-4ac)) / 2a\n\nUsed to find the roots of ax² + bx + c = 0" },
  { id: "2", front: "Area of a Circle", back: "A = πr²\n\nWhere r is the radius" },
  { id: "3", front: "Pythagorean Theorem", back: "a² + b² = c²\n\nFor right triangles, where c is the hypotenuse" },
  { id: "4", front: "Slope Formula", back: "m = (y₂ - y₁) / (x₂ - x₁)\n\nRise over run between two points" },
  { id: "5", front: "Distance Formula", back: "d = √[(x₂-x₁)² + (y₂-y₁)²]\n\nDerived from Pythagorean theorem" },
];

export default function Flashcards() {
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (selectedDeck) {
    const currentCard = mockCards[currentCardIndex];
    const progress = ((currentCardIndex + 1) / mockCards.length) * 100;

    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedDeck(null)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Back to decks
            </button>
            <span className="text-sm text-muted-foreground">
              {currentCardIndex + 1} of {mockCards.length}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Flashcard */}
          <div 
            className="aspect-[4/3] perspective-1000 cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className={cn(
              "relative w-full h-full transition-transform duration-500 transform-style-3d",
              isFlipped && "rotate-y-180"
            )}>
              {/* Front */}
              <div className="absolute inset-0 backface-hidden">
                <div className="w-full h-full p-8 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/30 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-primary mb-4">QUESTION</span>
                  <h2 className="text-2xl font-bold text-foreground">{currentCard.front}</h2>
                  <p className="text-sm text-muted-foreground mt-4">Click to reveal answer</p>
                </div>
              </div>
              
              {/* Back */}
              <div className="absolute inset-0 backface-hidden rotate-y-180">
                <div className="w-full h-full p-8 rounded-2xl bg-card border border-border flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-success mb-4">ANSWER</span>
                  <p className="text-lg text-foreground whitespace-pre-line">{currentCard.back}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setCurrentCardIndex(Math.max(0, currentCardIndex - 1));
                setIsFlipped(false);
              }}
              disabled={currentCardIndex === 0}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => {
                setCurrentCardIndex(0);
                setIsFlipped(false);
              }}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restart
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setCurrentCardIndex(Math.min(mockCards.length - 1, currentCardIndex + 1));
                setIsFlipped(false);
              }}
              disabled={currentCardIndex === mockCards.length - 1}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <Layers className="w-7 h-7 text-primary" />
              Flashcards
            </h1>
            <p className="text-muted-foreground mt-1">
              Review key concepts with smart flashcards
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create Deck
            </Button>
            <Button variant="hero">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate with AI
            </Button>
          </div>
        </div>

        {/* Decks grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockDecks.map((deck) => (
            <button
              key={deck.id}
              onClick={() => setSelectedDeck(deck)}
              className="p-6 rounded-xl bg-card border border-border/50 hover:border-primary/30 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  deck.source === "ai_generated" 
                    ? "bg-primary/20" 
                    : "bg-accent/20"
                )}>
                  {deck.source === "ai_generated" ? (
                    <Brain className="w-5 h-5 text-primary" />
                  ) : (
                    <Layers className="w-5 h-5 text-accent" />
                  )}
                </div>
                {deck.source === "ai_generated" && (
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                    AI Generated
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                {deck.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {deck.description}
              </p>
              <p className="text-xs text-muted-foreground/70">
                {deck.cardCount} cards
              </p>
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

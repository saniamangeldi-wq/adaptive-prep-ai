import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Layers, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  RotateCcw,
  Brain,
  Zap,
  BookOpen,
  Calculator,
  FileText,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getTierLimits, TRIAL_LIMITS } from "@/lib/tier-limits";
import { UpgradePrompt } from "@/components/dashboard/UpgradePrompt";
import { CreateDeckDialog } from "@/components/flashcards/CreateDeckDialog";
import { GenerateWithAIDialog } from "@/components/flashcards/GenerateWithAIDialog";
import { premadeDecks, FlashcardDeck, Flashcard } from "@/lib/flashcard-data";
import { useFlashcardDecks } from "@/hooks/useFlashcardDecks";
import { useCardSchedule, type Rating } from "@/hooks/useCardSchedule";
import { toast } from "sonner";
import { PageSeo } from "@/components/seo/PageSeo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Flashcards() {
  const { profile } = useAuth();
  const { decks: userDecks, loading: decksLoading, createDeck, deleteDeck } = useFlashcardDecks();
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<FlashcardDeck["category"] | "all">("all");
  const [deckToDelete, setDeckToDelete] = useState<FlashcardDeck | null>(null);

  // Combine premade and user decks
  const allDecks = [...userDecks, ...premadeDecks];
  
  // Filter decks by category
  const filteredDecks = categoryFilter === "all" 
    ? allDecks 
    : allDecks.filter(d => d.category === categoryFilter);

  // Calculate flashcard limits
  const tierLimits = getTierLimits(profile?.tier);
  const isTrialUser = profile?.is_trial && profile?.trial_ends_at;
  const dailyLimit = isTrialUser ? TRIAL_LIMITS.flashcardsPerDay : tierLimits.flashcardsPerDay;
  const usedToday = profile?.flashcards_created_today || 0;
  const isUnlimited = dailyLimit === -1;
  const remaining = isUnlimited ? Infinity : Math.max(0, dailyLimit - usedToday);
  
  // AI flashcard generation requires Tier 2+
  const canUseAIGeneration = profile?.tier === "tier_2" || profile?.tier === "tier_3" || isTrialUser;
  const hasReachedLimit = !isUnlimited && remaining <= 0;

  const handleCreateDeck = async (deck: FlashcardDeck) => {
    // Only save non-premade decks to database
    if (deck.source !== "premade") {
      const source = deck.source === "ai_generated" ? "ai_generated" : "manual";
      await createDeck(deck.title, deck.description, deck.cards, deck.category, source);
    }
  };

  const handleDeleteDeck = async () => {
    if (!deckToDelete) return;
    await deleteDeck(deckToDelete.id);
    setDeckToDelete(null);
  };

  const getCategoryIcon = (category: FlashcardDeck["category"]) => {
    switch (category) {
      case "math": return <Calculator className="w-5 h-5" />;
      case "vocabulary": return <BookOpen className="w-5 h-5" />;
      case "grammar": return <FileText className="w-5 h-5" />;
      default: return <Layers className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: FlashcardDeck["category"]) => {
    switch (category) {
      case "math": return "text-blue-400 bg-blue-500/20";
      case "vocabulary": return "text-purple-400 bg-purple-500/20";
      case "grammar": return "text-orange-400 bg-orange-500/20";
      default: return "text-primary bg-primary/20";
    }
  };

  if (selectedDeck) {
    return (
      <StudyDeckView
        deck={selectedDeck}
        currentCardIndex={currentCardIndex}
        setCurrentCardIndex={setCurrentCardIndex}
        isFlipped={isFlipped}
        setIsFlipped={setIsFlipped}
        onExit={() => {
          setSelectedDeck(null);
          setCurrentCardIndex(0);
          setIsFlipped(false);
        }}
      />
    );
  }


  // Deck selection view
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
              {allDecks.length} decks • {allDecks.reduce((t, d) => t + d.cards.length, 0)} cards total
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Flashcard limit indicator */}
            {!isUnlimited && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {remaining}/{dailyLimit}
                </span>
                <span className="text-xs text-muted-foreground">today</span>
              </div>
            )}
            <Button 
              variant="outline" 
              disabled={hasReachedLimit}
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Deck
            </Button>
            <Button 
              variant="hero" 
              disabled={!canUseAIGeneration}
              onClick={() => setShowAIDialog(true)}
              title={!canUseAIGeneration ? "AI generation requires Pro plan or higher" : undefined}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate with AI
              {!canUseAIGeneration && <Badge variant="secondary" className="ml-2 text-xs">Pro+</Badge>}
            </Button>
          </div>
        </div>

        {/* Upgrade prompt when limit reached */}
        {hasReachedLimit && (
          <UpgradePrompt type="feature" featureName="More flashcards" />
        )}

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={categoryFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter("all")}
          >
            All ({allDecks.length})
          </Button>
          <Button
            variant={categoryFilter === "math" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter("math")}
            className={categoryFilter === "math" ? "" : "text-blue-400 border-blue-500/30 hover:bg-blue-500/10"}
          >
            <Calculator className="w-4 h-4 mr-1" />
            Math ({allDecks.filter(d => d.category === "math").length})
          </Button>
          <Button
            variant={categoryFilter === "vocabulary" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter("vocabulary")}
            className={categoryFilter === "vocabulary" ? "" : "text-purple-400 border-purple-500/30 hover:bg-purple-500/10"}
          >
            <BookOpen className="w-4 h-4 mr-1" />
            Vocabulary ({allDecks.filter(d => d.category === "vocabulary").length})
          </Button>
          <Button
            variant={categoryFilter === "grammar" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter("grammar")}
            className={categoryFilter === "grammar" ? "" : "text-orange-400 border-orange-500/30 hover:bg-orange-500/10"}
          >
            <FileText className="w-4 h-4 mr-1" />
            Grammar ({allDecks.filter(d => d.category === "grammar").length})
          </Button>
          <Button
            variant={categoryFilter === "custom" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter("custom")}
          >
            <Layers className="w-4 h-4 mr-1" />
            Custom ({allDecks.filter(d => d.category === "custom").length})
          </Button>
        </div>

        {/* Decks grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decksLoading ? (
            // Loading skeleton
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-6 rounded-xl bg-secondary/50 border border-border animate-pulse">
                <div className="w-10 h-10 rounded-lg bg-secondary mb-3" />
                <div className="h-5 bg-secondary rounded w-3/4 mb-2" />
                <div className="h-4 bg-secondary rounded w-full mb-3" />
                <div className="h-3 bg-secondary rounded w-1/4" />
              </div>
            ))
          ) : (
            filteredDecks.map((deck) => (
              <div
                key={deck.id}
                className="p-6 rounded-xl bg-secondary/50 border border-border hover:border-primary/50 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group relative"
              >
                <button
                  onClick={() => setSelectedDeck(deck)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      getCategoryColor(deck.category)
                    )}>
                      {deck.source === "ai_generated" ? (
                        <Brain className="w-5 h-5" />
                      ) : (
                        getCategoryIcon(deck.category)
                      )}
                    </div>
                    <div className="flex gap-2">
                      {deck.source === "ai_generated" && (
                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-0">
                          AI Generated
                        </Badge>
                      )}
                      {deck.source === "manual" && (
                        <Badge variant="secondary" className="text-xs bg-accent/20 text-accent border-0">
                          Custom
                        </Badge>
                      )}
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {deck.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {deck.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {deck.cards.length} cards
                    </p>
                    <Badge variant="outline" className="text-xs capitalize">
                      {deck.category}
                    </Badge>
                  </div>
                </button>
                
                {/* Delete button for user-created decks */}
                {deck.source !== "premade" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeckToDelete(deck);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Empty state */}
        {filteredDecks.length === 0 && (
          <div className="text-center py-12">
            <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No decks found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {categoryFilter === "custom" 
                ? "Create your own deck or generate one with AI!" 
                : "No decks in this category yet."}
            </p>
            {categoryFilter === "custom" && (
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Deck
                </Button>
                <Button variant="hero" onClick={() => setShowAIDialog(true)} disabled={!canUseAIGeneration}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate with AI
                  {!canUseAIGeneration && <Badge variant="secondary" className="ml-2 text-xs">Pro+</Badge>}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateDeckDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateDeck={handleCreateDeck}
      />
      <GenerateWithAIDialog
        open={showAIDialog}
        onOpenChange={setShowAIDialog}
        onCreateDeck={handleCreateDeck}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deckToDelete} onOpenChange={() => setDeckToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deck</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deckToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDeck} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

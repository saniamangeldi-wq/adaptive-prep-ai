import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { FlashcardDeck, Flashcard } from "@/lib/flashcard-data";

export function useFlashcardDecks() {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile, refreshProfile } = useAuth();

  const loadDecks = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("flashcard_decks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform database format to FlashcardDeck format
      const transformedDecks: FlashcardDeck[] = (data || []).map(deck => ({
        id: deck.id,
        title: deck.title,
        description: deck.description || "",
        category: (deck.subject?.toLowerCase() as FlashcardDeck["category"]) || "custom",
        cards: (deck.cards as unknown as Flashcard[]) || [],
        source: (deck.source as FlashcardDeck["source"]) || "manual",
        createdAt: new Date(deck.created_at),
      }));

      setDecks(transformedDecks);
    } catch (err) {
      console.error("Error loading flashcard decks:", err);
      toast.error("Failed to load flashcard decks");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  const createDeck = useCallback(async (
    title: string,
    description: string,
    cards: Flashcard[],
    subject: string = "General",
    source: "manual" | "ai_generated" = "manual"
  ): Promise<FlashcardDeck | null> => {
    if (!user) {
      toast.error("You must be logged in to create decks");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("flashcard_decks")
        .insert({
          user_id: user.id,
          title,
          description,
          cards: cards as unknown as any,
          subject,
          source,
          is_public: false,
        })
        .select()
        .single();

      if (error) throw error;

      const newDeck: FlashcardDeck = {
        id: data.id,
        title: data.title,
        description: data.description || "",
        category: (subject.toLowerCase() as FlashcardDeck["category"]) || "custom",
        cards,
        source,
        createdAt: new Date(data.created_at),
      };

      setDecks(prev => [newDeck, ...prev]);

      // Update daily count
      await supabase
        .from("profiles")
        .update({
          flashcards_created_today: (profile?.flashcards_created_today || 0) + cards.length,
        })
        .eq("user_id", user.id);

      refreshProfile();
      toast.success("Deck created successfully!");
      return newDeck;
    } catch (err) {
      console.error("Error creating deck:", err);
      toast.error("Failed to create deck");
      return null;
    }
  }, [user, profile, refreshProfile]);

  const updateDeck = useCallback(async (
    deckId: string,
    updates: Partial<Pick<FlashcardDeck, "title" | "description" | "cards">>
  ) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title) dbUpdates.title = updates.title;
      if (updates.description) dbUpdates.description = updates.description;
      if (updates.cards) dbUpdates.cards = updates.cards as unknown as any;

      const { error } = await supabase
        .from("flashcard_decks")
        .update(dbUpdates)
        .eq("id", deckId);

      if (error) throw error;

      setDecks(prev =>
        prev.map(d => (d.id === deckId ? { ...d, ...updates } : d))
      );

      toast.success("Deck updated");
    } catch (err) {
      console.error("Error updating deck:", err);
      toast.error("Failed to update deck");
    }
  }, []);

  const deleteDeck = useCallback(async (deckId: string) => {
    try {
      const { error } = await supabase
        .from("flashcard_decks")
        .delete()
        .eq("id", deckId);

      if (error) throw error;

      setDecks(prev => prev.filter(d => d.id !== deckId));
      toast.success("Deck deleted");
    } catch (err) {
      console.error("Error deleting deck:", err);
      toast.error("Failed to delete deck");
    }
  }, []);

  const addCardToDeck = useCallback(async (
    deckId: string,
    card: Flashcard
  ) => {
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;

    const updatedCards = [...deck.cards, card];
    await updateDeck(deckId, { cards: updatedCards });
  }, [decks, updateDeck]);

  const recordReview = useCallback(async (
    deckId: string,
    cardIndex: number,
    difficulty: "easy" | "medium" | "hard"
  ) => {
    if (!user) return;

    try {
      await supabase.from("flashcard_reviews").insert({
        user_id: user.id,
        deck_id: deckId,
        card_index: cardIndex,
        difficulty,
      });

      // Update last studied timestamp
      await supabase
        .from("flashcard_decks")
        .update({ last_studied_at: new Date().toISOString() })
        .eq("id", deckId);
    } catch (err) {
      console.error("Error recording review:", err);
    }
  }, [user]);

  return {
    decks,
    loading,
    loadDecks,
    createDeck,
    updateDeck,
    deleteDeck,
    addCardToDeck,
    recordReview,
  };
}

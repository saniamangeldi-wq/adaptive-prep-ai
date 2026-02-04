import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AISuggestion {
  id: string;
  subject: string;
  suggestion_text: string;
  category: string;
}

const DEFAULT_SUGGESTIONS: Record<string, string[]> = {
  SAT: [
    "Create a 2-week SAT study plan for me",
    "Explain how to solve quadratic equations",
    "What are the best strategies for reading comprehension?",
    "Help me understand comma rules in grammar",
  ],
  Math: [
    "Help me solve this calculus problem",
    "Explain derivatives in simple terms",
    "How do I solve systems of equations?",
    "What is the quadratic formula?",
  ],
  English: [
    "Help me brainstorm essay ideas",
    "How do I write a strong thesis?",
    "Explain literary devices",
    "Review my grammar",
  ],
  Science: [
    "Explain photosynthesis",
    "Help me understand chemical bonding",
    "What is Newton's second law?",
    "Explain the cell cycle",
  ],
  History: [
    "Explain the causes of World War I",
    "Help me understand the American Revolution",
    "What were the effects of the Industrial Revolution?",
    "Explain the Cold War",
  ],
  General: [
    "How can I study more effectively?",
    "Help me create a study schedule",
    "What are the best note-taking methods?",
    "How do I stay focused while studying?",
  ],
};

export function useAISuggestions(subject: string = "SAT", count: number = 4) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    
    try {
      // Try to load from database
      const { data, error } = await supabase
        .from("ai_suggestions")
        .select("*")
        .eq("subject", subject);
      
      if (error || !data || data.length === 0) {
        // Fallback to defaults
        const defaults = DEFAULT_SUGGESTIONS[subject] || DEFAULT_SUGGESTIONS.General;
        const shuffled = [...defaults].sort(() => 0.5 - Math.random());
        setSuggestions(
          shuffled.slice(0, count).map((text, i) => ({
            id: `default-${i}`,
            subject,
            suggestion_text: text,
            category: "general",
          }))
        );
        return;
      }

      // Shuffle and pick random suggestions
      const shuffled = [...data].sort(() => 0.5 - Math.random());
      setSuggestions(shuffled.slice(0, count));
    } catch (err) {
      console.error("Error loading suggestions:", err);
      // Use defaults on error
      const defaults = DEFAULT_SUGGESTIONS[subject] || DEFAULT_SUGGESTIONS.General;
      setSuggestions(
        defaults.slice(0, count).map((text, i) => ({
          id: `fallback-${i}`,
          subject,
          suggestion_text: text,
          category: "general",
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [subject, count]);

  // Get contextual suggestions based on time of day
  const getContextualSuggestions = useCallback(() => {
    const hour = new Date().getHours();
    const contextual: string[] = [];

    if (hour >= 6 && hour < 12) {
      contextual.push("Create a focused study plan for today");
      contextual.push("What should I review this morning?");
    } else if (hour >= 18 && hour < 23) {
      contextual.push("Review today's study session");
      contextual.push("What should I focus on tomorrow?");
    }

    return contextual;
  }, []);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const refresh = useCallback(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  return {
    suggestions,
    loading,
    refresh,
    getContextualSuggestions,
  };
}

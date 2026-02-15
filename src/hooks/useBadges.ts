import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface Badge {
  id: string;
  badge_type: string;
  badge_name: string;
  badge_description: string | null;
  badge_icon: string;
  earned_at: string;
}

// All possible badges
export const BADGE_DEFINITIONS = [
  { type: "first_test", name: "First Steps", icon: "🎯", description: "Complete your first practice test" },
  { type: "five_tests", name: "Dedicated Learner", icon: "📚", description: "Complete 5 practice tests" },
  { type: "ten_tests", name: "Test Master", icon: "🏆", description: "Complete 10 practice tests" },
  { type: "perfect_score", name: "Perfect Score", icon: "⭐", description: "Score 100% on a practice test" },
  { type: "streak_3", name: "3-Day Streak", icon: "🔥", description: "Study for 3 days in a row" },
  { type: "streak_7", name: "Week Warrior", icon: "💪", description: "Study for 7 days in a row" },
  { type: "streak_30", name: "Monthly Champion", icon: "👑", description: "Study for 30 days in a row" },
  { type: "first_flashcard", name: "Card Collector", icon: "🃏", description: "Create your first flashcard deck" },
  { type: "ai_explorer", name: "AI Explorer", icon: "🤖", description: "Have 10 AI coach conversations" },
  { type: "score_1000", name: "Breaking 1000", icon: "🚀", description: "Achieve a 1000+ SAT score" },
  { type: "score_1200", name: "High Achiever", icon: "🌟", description: "Achieve a 1200+ SAT score" },
  { type: "score_1400", name: "Elite Scorer", icon: "💎", description: "Achieve a 1400+ SAT score" },
] as const;

export function useBadges() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: earnedBadges = [], isLoading } = useQuery({
    queryKey: ["badges", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("student_badges")
        .select("*")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Badge[];
    },
    enabled: !!user?.id,
  });

  const awardBadge = useMutation({
    mutationFn: async ({ badgeType }: { badgeType: string }) => {
      if (!user?.id) throw new Error("Not logged in");
      
      // Check if already earned
      const alreadyEarned = earnedBadges.some(b => b.badge_type === badgeType);
      if (alreadyEarned) return null;

      const def = BADGE_DEFINITIONS.find(b => b.type === badgeType);
      if (!def) throw new Error("Unknown badge type");

      const { data, error } = await supabase
        .from("student_badges")
        .insert({
          user_id: user.id,
          badge_type: def.type,
          badge_name: def.name,
          badge_description: def.description,
          badge_icon: def.icon,
        })
        .select()
        .single();

      if (error) {
        // Unique constraint violation means already earned
        if (error.code === "23505") return null;
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["badges"] });
        toast({
          title: `🏅 Badge Earned: ${data.badge_name}!`,
          description: data.badge_description,
        });
      }
    },
  });

  // Check and award badges based on current stats
  const checkAndAwardBadges = async (stats: {
    testsTaken: number;
    totalSATScore: number;
    hasPerfectScore: boolean;
    streakDays: number;
    flashcardDecks: number;
    aiConversations: number;
  }) => {
    const earned = new Set(earnedBadges.map(b => b.badge_type));

    if (stats.testsTaken >= 1 && !earned.has("first_test")) {
      awardBadge.mutate({ badgeType: "first_test" });
    }
    if (stats.testsTaken >= 5 && !earned.has("five_tests")) {
      awardBadge.mutate({ badgeType: "five_tests" });
    }
    if (stats.testsTaken >= 10 && !earned.has("ten_tests")) {
      awardBadge.mutate({ badgeType: "ten_tests" });
    }
    if (stats.hasPerfectScore && !earned.has("perfect_score")) {
      awardBadge.mutate({ badgeType: "perfect_score" });
    }
    if (stats.streakDays >= 3 && !earned.has("streak_3")) {
      awardBadge.mutate({ badgeType: "streak_3" });
    }
    if (stats.streakDays >= 7 && !earned.has("streak_7")) {
      awardBadge.mutate({ badgeType: "streak_7" });
    }
    if (stats.streakDays >= 30 && !earned.has("streak_30")) {
      awardBadge.mutate({ badgeType: "streak_30" });
    }
    if (stats.flashcardDecks >= 1 && !earned.has("first_flashcard")) {
      awardBadge.mutate({ badgeType: "first_flashcard" });
    }
    if (stats.aiConversations >= 10 && !earned.has("ai_explorer")) {
      awardBadge.mutate({ badgeType: "ai_explorer" });
    }
    if (stats.totalSATScore >= 1000 && !earned.has("score_1000")) {
      awardBadge.mutate({ badgeType: "score_1000" });
    }
    if (stats.totalSATScore >= 1200 && !earned.has("score_1200")) {
      awardBadge.mutate({ badgeType: "score_1200" });
    }
    if (stats.totalSATScore >= 1400 && !earned.has("score_1400")) {
      awardBadge.mutate({ badgeType: "score_1400" });
    }
  };

  return {
    earnedBadges,
    isLoading,
    checkAndAwardBadges,
    allBadges: BADGE_DEFINITIONS,
  };
}

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CHALLENGE_TEMPLATES, XP_REWARDS } from "@/lib/gamification-config";

export interface DailyChallenge {
  id: string;
  challenge_date: string;
  challenge_type: string;
  title: string;
  description: string | null;
  xp_reward: number;
  requirement_value: number;
  completed?: boolean;
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

// Deterministically pick 3 challenges for a given date
function getChallengesForDate(date: string): typeof CHALLENGE_TEMPLATES[number][] {
  const seed = date.split("-").join("").slice(-4);
  const num = parseInt(seed, 10);
  const shuffled = [...CHALLENGE_TEMPLATES].sort((a, b) => {
    const ha = (num * a.type.length) % 97;
    const hb = (num * b.type.length) % 97;
    return ha - hb;
  });
  return shuffled.slice(0, 3);
}

export function useDailyChallenges() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = getTodayDate();

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ["daily-challenges", today, user?.id],
    queryFn: async (): Promise<DailyChallenge[]> => {
      if (!user?.id) return [];

      // Check if challenges exist for today
      let { data: existing, error } = await supabase
        .from("daily_challenges")
        .select("*")
        .eq("challenge_date", today);

      if (error) throw error;

      // If no challenges for today, we show client-generated ones
      // (In production, a cron job would seed these)
      if (!existing || existing.length === 0) {
        const templates = getChallengesForDate(today);
        // Insert them (service_role needed, so we'll just show client-side)
        return templates.map((t, i) => ({
          id: `local-${today}-${i}`,
          challenge_date: today,
          challenge_type: t.type,
          title: t.title,
          description: t.description,
          xp_reward: XP_REWARDS.daily_challenge,
          requirement_value: t.requirement,
          completed: false,
        }));
      }

      // Get completions
      const { data: completions } = await supabase
        .from("daily_challenge_completions")
        .select("challenge_id")
        .eq("student_id", user.id);

      const completedIds = new Set((completions || []).map(c => c.challenge_id));

      return existing.map(ch => ({
        ...ch,
        completed: completedIds.has(ch.id),
      }));
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const completeChallenge = useMutation({
    mutationFn: async (challengeId: string) => {
      if (!user?.id) throw new Error("Not logged in");
      
      // Skip for local-generated challenges (no DB record)
      if (challengeId.startsWith("local-")) return { xp: XP_REWARDS.daily_challenge };

      const { error } = await supabase
        .from("daily_challenge_completions")
        .insert({ student_id: user.id, challenge_id: challengeId });

      if (error && error.code !== "23505") throw error; // Ignore duplicate

      return { xp: XP_REWARDS.daily_challenge };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-challenges"] });
    },
  });

  const completedCount = challenges.filter(c => c.completed).length;
  const allCompleted = challenges.length > 0 && completedCount === challenges.length;

  return {
    challenges,
    isLoading,
    completeChallenge,
    completedCount,
    allCompleted,
    totalChallenges: challenges.length,
  };
}

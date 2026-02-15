import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface StreakData {
  points: number;
  streakDays: number;
  assignmentsCompleted: number;
  lastActivity: string | null;
}

export function useStreakTracker() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: streakData, isLoading } = useQuery({
    queryKey: ["streak", user?.id],
    queryFn: async (): Promise<StreakData> => {
      if (!user?.id) return { points: 0, streakDays: 0, assignmentsCompleted: 0, lastActivity: null };
      
      const { data, error } = await supabase
        .from("student_points")
        .select("points, streak_days, assignments_completed, last_activity")
        .eq("student_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        return { points: 0, streakDays: 0, assignmentsCompleted: 0, lastActivity: null };
      }

      return {
        points: data.points || 0,
        streakDays: data.streak_days || 0,
        assignmentsCompleted: data.assignments_completed || 0,
        lastActivity: data.last_activity,
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const recordActivity = useMutation({
    mutationFn: async (pointsToAdd: number = 10) => {
      if (!user?.id) throw new Error("Not logged in");

      const now = new Date();
      const today = now.toISOString().split("T")[0];

      // Get current streak data
      const { data: existing } = await supabase
        .from("student_points")
        .select("*")
        .eq("student_id", user.id)
        .maybeSingle();

      if (!existing) {
        // Create new record
        const { error } = await supabase
          .from("student_points")
          .insert({
            student_id: user.id,
            points: pointsToAdd,
            streak_days: 1,
            last_activity: now.toISOString(),
          });
        if (error) throw error;
        return;
      }

      // Calculate streak
      const lastActivity = existing.last_activity ? new Date(existing.last_activity) : null;
      const lastDate = lastActivity ? lastActivity.toISOString().split("T")[0] : null;
      
      let newStreak = existing.streak_days || 0;
      
      if (lastDate === today) {
        // Already active today, just add points
      } else {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        
        if (lastDate === yesterdayStr) {
          newStreak += 1; // Consecutive day
        } else {
          newStreak = 1; // Streak broken, restart
        }
      }

      const { error } = await supabase
        .from("student_points")
        .update({
          points: (existing.points || 0) + pointsToAdd,
          streak_days: newStreak,
          last_activity: now.toISOString(),
        })
        .eq("student_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streak"] });
    },
  });

  return {
    streakData: streakData || { points: 0, streakDays: 0, assignmentsCompleted: 0, lastActivity: null },
    isLoading,
    recordActivity,
  };
}

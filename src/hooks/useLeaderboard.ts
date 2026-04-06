import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export interface LeaderboardEntry {
  student_id: string;
  xp: number;
  level: number;
  rank_title: string;
  full_name: string | null;
  avatar_url: string | null;
}

export function useLeaderboard() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      // Get top 50 by XP
      const { data, error } = await supabase
        .from("student_levels")
        .select("student_id, xp, level, rank_title")
        .order("xp", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Get profile info for these students
      const studentIds = data.map(d => d.student_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", studentIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      return data.map(entry => ({
        ...entry,
        full_name: profileMap.get(entry.student_id)?.full_name || "Student",
        avatar_url: profileMap.get(entry.student_id)?.avatar_url || null,
      }));
    },
    staleTime: 1000 * 60 * 5,
  });

  return { entries, isLoading };
}

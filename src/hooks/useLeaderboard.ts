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
        .select("user_id, full_name, avatar_url, email")
        .in("user_id", studentIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      const deriveName = (id: string, full?: string | null, email?: string | null) => {
        const f = full?.trim();
        if (f) return f;
        const local = email?.split("@")[0]?.trim();
        if (local) {
          return local.charAt(0).toUpperCase() + local.slice(1);
        }
        return `Student #${id.slice(-4).toUpperCase()}`;
      };

      return data.map(entry => {
        const p = profileMap.get(entry.student_id);
        return {
          ...entry,
          full_name: deriveName(entry.student_id, p?.full_name, (p as any)?.email),
          avatar_url: p?.avatar_url || null,
        };
      });
    },
    staleTime: 1000 * 60 * 5,
  });

  return { entries, isLoading };
}

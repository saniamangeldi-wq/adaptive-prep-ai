import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getLevelForXP, getNextLevel, getXPProgress, MILESTONE_REWARDS } from "@/lib/gamification-config";

export interface StudentLevel {
  id: string;
  student_id: string;
  xp: number;
  level: number;
  rank_title: string;
  unlocked_titles: string[];
}

export function useXPLevel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: levelData, isLoading } = useQuery({
    queryKey: ["student-level", user?.id],
    queryFn: async (): Promise<StudentLevel> => {
      if (!user?.id) return { id: "", student_id: "", xp: 0, level: 1, rank_title: "Beginner", unlocked_titles: [] };
      
      const { data, error } = await supabase
        .from("student_levels")
        .select("*")
        .eq("student_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        // Create initial record
        const { data: created, error: createErr } = await supabase
          .from("student_levels")
          .insert({ student_id: user.id })
          .select()
          .single();
        if (createErr) throw createErr;
        return {
          ...created,
          unlocked_titles: (created.unlocked_titles as string[]) || [],
        };
      }

      return {
        ...data,
        unlocked_titles: (data.unlocked_titles as string[]) || [],
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
  });

  const addXP = useMutation({
    mutationFn: async (xpToAdd: number) => {
      if (!user?.id || !levelData) throw new Error("Not ready");
      
      const newXP = levelData.xp + xpToAdd;
      const newLevelDef = getLevelForXP(newXP);
      
      // Check for newly unlocked milestones
      const newTitles = MILESTONE_REWARDS
        .filter(m => newXP >= m.xpThreshold && !levelData.unlocked_titles.includes(m.title))
        .map(m => m.title);

      const allTitles = [...levelData.unlocked_titles, ...newTitles];

      const { error } = await supabase
        .from("student_levels")
        .update({
          xp: newXP,
          level: newLevelDef.level,
          rank_title: newLevelDef.title,
          unlocked_titles: allTitles,
        })
        .eq("student_id", user.id);

      if (error) throw error;

      return { newXP, newLevel: newLevelDef, leveledUp: newLevelDef.level > levelData.level, newTitles };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["student-level"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      
      if (result.leveledUp) {
        toast({
          title: `🎉 Level Up! You're now Level ${result.newLevel.level}!`,
          description: `${result.newLevel.icon} ${result.newLevel.title} — Keep going!`,
        });
      }
      
      if (result.newTitles.length > 0) {
        result.newTitles.forEach(title => {
          const milestone = MILESTONE_REWARDS.find(m => m.title === title);
          if (milestone) {
            toast({
              title: `${milestone.icon} Title Unlocked: ${milestone.title}`,
              description: milestone.description,
            });
          }
        });
      }
    },
  });

  const currentLevel = levelData ? getLevelForXP(levelData.xp) : getLevelForXP(0);
  const nextLevel = getNextLevel(currentLevel.level);
  const xpProgress = getXPProgress(levelData?.xp || 0);

  return {
    levelData: levelData || { id: "", student_id: "", xp: 0, level: 1, rank_title: "Beginner", unlocked_titles: [] },
    isLoading,
    addXP,
    currentLevel,
    nextLevel,
    xpProgress,
  };
}

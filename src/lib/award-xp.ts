import { supabase } from "@/integrations/supabase/client";
import { getLevelForXP, MILESTONE_REWARDS } from "@/lib/gamification-config";

/**
 * Award XP to the current user. Fire-and-forget — errors are silently logged.
 * This is a standalone utility so it can be called from hooks that aren't React components.
 */
export async function awardXP(userId: string, xpToAdd: number): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("student_levels")
      .select("*")
      .eq("student_id", userId)
      .maybeSingle();

    if (error) { console.error("awardXP read error:", error); return; }

    if (!data) {
      // Create initial record with awarded XP
      const level = getLevelForXP(xpToAdd);
      const titles = MILESTONE_REWARDS.filter(m => xpToAdd >= m.xpThreshold).map(m => m.title);
      await supabase.from("student_levels").insert({
        student_id: userId,
        xp: xpToAdd,
        level: level.level,
        rank_title: level.title,
        unlocked_titles: titles,
      });
      return;
    }

    const newXP = (data.xp || 0) + xpToAdd;
    const newLevel = getLevelForXP(newXP);
    const existing = (data.unlocked_titles as string[]) || [];
    const newTitles = MILESTONE_REWARDS
      .filter(m => newXP >= m.xpThreshold && !existing.includes(m.title))
      .map(m => m.title);

    await supabase
      .from("student_levels")
      .update({
        xp: newXP,
        level: newLevel.level,
        rank_title: newLevel.title,
        unlocked_titles: [...existing, ...newTitles],
      })
      .eq("student_id", userId);
  } catch (err) {
    console.error("awardXP error:", err);
  }
}

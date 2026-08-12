import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface RosterStats {
  /** Students linked to this tutor/teacher. */
  activeStudents: number;
  /** Mean (latest score − first score) across students with 2+ scored tests. null when unknown. */
  avgImprovement: number | null;
  /** How many students that average is based on. */
  improvementSample: number;
  /** Completed, non-abandoned attempts in the last 7 days. */
  sessionsThisWeek: number;
  /** Mean accuracy across all completed attempts, or null. */
  avgAccuracy: number | null;
  isLoading: boolean;
}

interface AttemptRow {
  user_id: string;
  score: number | null;
  correct_answers: number | null;
  total_questions: number | null;
  completed_at: string | null;
}

/**
 * Real roster metrics for tutor and teacher dashboards. Everything here comes
 * from completed, non-abandoned attempts — nothing is estimated or hardcoded,
 * so an empty roster honestly reports zero / unknown instead of a fake number.
 */
export function useRosterStats(role: "tutor" | "teacher"): RosterStats {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["roster-stats", role, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return null;

      const links =
        role === "tutor"
          ? (await supabase.from("tutor_students").select("student_id").eq("tutor_id", user.id)).data
          : (await supabase.from("teacher_students").select("student_id").eq("teacher_id", user.id)).data;

      const studentIds = (links ?? []).map((l: { student_id: string }) => l.student_id);
      if (studentIds.length === 0) {
        return { studentIds, attempts: [] as AttemptRow[] };
      }

      const { data: attempts } = await supabase
        .from("test_attempts")
        .select("user_id, score, correct_answers, total_questions, completed_at")
        .in("user_id", studentIds)
        .not("completed_at", "is", null)
        .neq("abandoned", true)
        .order("completed_at", { ascending: true });

      return { studentIds, attempts: (attempts ?? []) as AttemptRow[] };
    },
  });

  if (!data) {
    return {
      activeStudents: 0,
      avgImprovement: null,
      improvementSample: 0,
      sessionsThisWeek: 0,
      avgAccuracy: null,
      isLoading,
    };
  }

  const byStudent = new Map<string, AttemptRow[]>();
  for (const a of data.attempts) {
    if (a.score == null) continue;
    const list = byStudent.get(a.user_id) ?? [];
    list.push(a);
    byStudent.set(a.user_id, list);
  }

  const deltas: number[] = [];
  byStudent.forEach((list) => {
    if (list.length < 2) return;
    deltas.push((list[list.length - 1].score ?? 0) - (list[0].score ?? 0));
  });

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const sessionsThisWeek = data.attempts.filter(
    (a) => a.completed_at && new Date(a.completed_at).getTime() >= weekAgo,
  ).length;

  const accuracyRows = data.attempts.filter((a) => (a.total_questions ?? 0) > 0);
  const avgAccuracy = accuracyRows.length
    ? Math.round(
        accuracyRows.reduce(
          (sum, a) => sum + ((a.correct_answers ?? 0) / (a.total_questions || 1)) * 100,
          0,
        ) / accuracyRows.length,
      )
    : null;

  return {
    activeStudents: data.studentIds.length,
    avgImprovement: deltas.length
      ? Math.round(deltas.reduce((s, d) => s + d, 0) / deltas.length)
      : null,
    improvementSample: deltas.length,
    sessionsThisWeek,
    avgAccuracy,
    isLoading,
  };
}

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface SchoolStats {
  schoolId: string | null;
  schoolName: string | null;
  totalStudents: number;
  totalTeachers: number;
  /** Mean latest score across students with at least one scored test. */
  avgScore: number | null;
  scoreSample: number;
  /** Mean (latest − first) across students with 2+ scored tests. */
  avgImprovement: number | null;
  improvementSample: number;
  isLoading: boolean;
}

interface AttemptRow {
  user_id: string;
  score: number | null;
  completed_at: string | null;
}

/**
 * Real school-wide metrics for the school admin dashboard. Every number is
 * derived from completed, non-abandoned attempts by active school members —
 * nothing is hardcoded, and an empty school honestly reports zero / unknown.
 */
export function useSchoolStats(): SchoolStats {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["school-stats", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: membership } = await supabase
        .from("school_members")
        .select("school_id, schools(id, name)")
        .eq("user_id", user!.id)
        .eq("role", "school_admin")
        .maybeSingle();

      const schoolId = membership?.school_id ?? null;
      const school = membership?.schools as { id: string; name: string } | null | undefined;
      if (!schoolId) {
        return {
          schoolId: null,
          schoolName: null,
          studentIds: [] as string[],
          teacherCount: 0,
          attempts: [] as AttemptRow[],
        };
      }

      const { data: members } = await supabase
        .from("school_members")
        .select("user_id, role, status")
        .eq("school_id", schoolId)
        .eq("status", "active");

      const rows = members ?? [];
      const studentIds = rows.filter((m) => m.role === "student").map((m) => m.user_id);
      const teacherCount = rows.filter((m) => m.role === "teacher").length;

      let attempts: AttemptRow[] = [];
      if (studentIds.length > 0) {
        const { data: a } = await supabase
          .from("test_attempts")
          .select("user_id, score, completed_at")
          .in("user_id", studentIds)
          .not("completed_at", "is", null)
          .neq("abandoned", true)
          .order("completed_at", { ascending: true });
        attempts = (a ?? []) as AttemptRow[];
      }

      return {
        schoolId,
        schoolName: school?.name ?? null,
        studentIds,
        teacherCount,
        attempts,
      };
    },
  });

  if (!data) {
    return {
      schoolId: null,
      schoolName: null,
      totalStudents: 0,
      totalTeachers: 0,
      avgScore: null,
      scoreSample: 0,
      avgImprovement: null,
      improvementSample: 0,
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

  const latest: number[] = [];
  const deltas: number[] = [];
  byStudent.forEach((list) => {
    latest.push(list[list.length - 1].score ?? 0);
    if (list.length >= 2) {
      deltas.push((list[list.length - 1].score ?? 0) - (list[0].score ?? 0));
    }
  });

  return {
    schoolId: data.schoolId,
    schoolName: data.schoolName,
    totalStudents: data.studentIds.length,
    totalTeachers: data.teacherCount,
    avgScore: latest.length ? Math.round(latest.reduce((s, v) => s + v, 0) / latest.length) : null,
    scoreSample: latest.length,
    avgImprovement: deltas.length
      ? Math.round(deltas.reduce((s, d) => s + d, 0) / deltas.length)
      : null,
    improvementSample: deltas.length,
    isLoading,
  };
}

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  id: string;
  user_id: string;
  abandoned_at: string | null;
  penalty_questions: number | null;
  total_questions: number | null;
  studentName?: string;
}

/**
 * Shows practice tests students started and walked away from. Abandoned attempts
 * never count towards progress, and after the first warning the served questions
 * are deducted from the student's question bank.
 */
export function AbandonedTestsPanel({ role }: { role: "tutor" | "teacher" }) {
  const { user } = useAuth();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["abandoned-attempts", role, user?.id],
    queryFn: async (): Promise<Row[]> => {
      if (!user?.id) return [];

      const links =
        role === "tutor"
          ? (await supabase.from("tutor_students").select("student_id").eq("tutor_id", user.id)).data
          : (await supabase.from("teacher_students").select("student_id").eq("teacher_id", user.id)).data;

      const studentIds = (links ?? []).map((l: { student_id: string }) => l.student_id);
      if (studentIds.length === 0) return [];

      const { data: attempts } = await supabase
        .from("test_attempts")
        .select("id, user_id, abandoned_at, penalty_questions, total_questions")
        .in("user_id", studentIds)
        .eq("abandoned", true)
        .order("abandoned_at", { ascending: false })
        .limit(15);

      if (!attempts || attempts.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", attempts.map((a) => a.user_id));

      const nameById = new Map(
        (profiles ?? []).map((p) => [p.user_id, p.full_name || p.email || "Student"]),
      );

      return attempts.map((a) => ({ ...a, studentName: nameById.get(a.user_id) }));
    },
    enabled: !!user?.id,
  });

  if (isLoading || !rows || rows.length === 0) return null;

  return (
    <div className="p-6 rounded-2xl bg-card border border-border/50">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h3 className="font-semibold text-foreground">Abandoned practice tests</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        These tests were started and left unfinished. They are excluded from progress and scores.
      </p>
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 border border-border/40"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{r.studentName}</div>
              <div className="text-xs text-muted-foreground">
                {r.abandoned_at ? new Date(r.abandoned_at).toLocaleString() : "—"} ·{" "}
                {r.total_questions ?? 0} questions served
              </div>
            </div>
            <span
              className={`shrink-0 text-xs px-2 py-1 rounded-lg ${
                (r.penalty_questions ?? 0) > 0
                  ? "bg-destructive/15 text-destructive"
                  : "bg-amber-500/15 text-amber-400"
              }`}
            >
              {(r.penalty_questions ?? 0) > 0
                ? `−${r.penalty_questions} questions`
                : "Warning issued"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

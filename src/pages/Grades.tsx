import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAffiliation } from "@/hooks/useStudentAffiliation";
import { Trophy, TrendingUp, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Grade {
  id: string;
  subject: string;
  grade_value: number | null;
  grade_letter: string | null;
  graded_at: string;
  term: string | null;
  notes: string | null;
}

export default function Grades() {
  const { user } = useAuth();
  const { affiliation, loading: affiliationLoading } = useStudentAffiliation();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedBySubject, setGroupedBySubject] = useState<Record<string, Grade[]>>({});

  useEffect(() => {
    async function loadGrades() {
      if (!user?.id || affiliationLoading) return;

      try {
        let query = supabase
          .from("grades")
          .select("*")
          .eq("student_id", user.id)
          .order("graded_at", { ascending: false });

        if (affiliation?.type === "school") {
          query = query.eq("school_id", affiliation.id);
        } else if (affiliation?.type === "tutor") {
          query = query.eq("tutor_id", affiliation.id);
        }

        const { data, error } = await query;

        if (error) throw error;

        setGrades(data || []);

        // Group by subject
        const grouped: Record<string, Grade[]> = {};
        data?.forEach((grade) => {
          if (!grouped[grade.subject]) {
            grouped[grade.subject] = [];
          }
          grouped[grade.subject].push(grade);
        });
        setGroupedBySubject(grouped);
      } catch (error) {
        console.error("Error loading grades:", error);
      } finally {
        setLoading(false);
      }
    }

    loadGrades();
  }, [user?.id, affiliation, affiliationLoading]);

  // Calculate GPA
  const gpa = grades.length > 0
    ? (grades.reduce((sum, g) => sum + (g.grade_value || 0), 0) / grades.length).toFixed(1)
    : "0.0";

  function getGradeClass(value: number | null): string {
    if (!value) return "bg-muted text-muted-foreground";
    if (value >= 90) return "bg-green-500/20 text-green-400";
    if (value >= 80) return "bg-blue-500/20 text-blue-400";
    if (value >= 70) return "bg-yellow-500/20 text-yellow-400";
    if (value >= 60) return "bg-orange-500/20 text-orange-400";
    return "bg-red-500/20 text-red-400";
  }

  if (loading || affiliationLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid sm:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">📊 My Grades</h1>
            <p className="text-muted-foreground mt-1">
              Track your academic progress
            </p>
          </div>
        </div>

        {/* GPA Overview */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-teal-500/10 border border-primary/30">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-6 h-6 text-primary" />
              <span className="text-sm text-muted-foreground">Overall GPA</span>
            </div>
            <div className="text-4xl font-bold text-foreground">{gpa}</div>
            <p className="text-xs text-muted-foreground mt-1">out of 100</p>
          </div>
          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-6 h-6 text-purple-400" />
              <span className="text-sm text-muted-foreground">Total Grades</span>
            </div>
            <div className="text-4xl font-bold text-foreground">{grades.length}</div>
            <p className="text-xs text-muted-foreground mt-1">across all subjects</p>
          </div>
          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-green-400" />
              <span className="text-sm text-muted-foreground">Subjects</span>
            </div>
            <div className="text-4xl font-bold text-foreground">{Object.keys(groupedBySubject).length}</div>
            <p className="text-xs text-muted-foreground mt-1">being tracked</p>
          </div>
        </div>

        {/* Grades by Subject */}
        {Object.keys(groupedBySubject).length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-card border border-border/50">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No grades yet</h3>
            <p className="text-muted-foreground">
              Your grades will appear here once your teacher or tutor adds them
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedBySubject).map(([subject, subjectGrades]) => (
              <div key={subject} className="rounded-2xl bg-card border border-border/50 overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30">
                  <h3 className="font-semibold text-foreground">{subject}</h3>
                  <p className="text-sm text-muted-foreground">
                    Average: {(subjectGrades.reduce((sum, g) => sum + (g.grade_value || 0), 0) / subjectGrades.length).toFixed(1)}%
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {subjectGrades.map((grade) => (
                    <div key={grade.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(grade.graded_at).toLocaleDateString()}
                        </p>
                        {grade.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{grade.notes}</p>
                        )}
                      </div>
                      <div className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getGradeClass(grade.grade_value)}`}>
                        {grade.grade_letter || `${grade.grade_value}%`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

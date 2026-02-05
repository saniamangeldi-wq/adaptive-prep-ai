import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAffiliation } from "@/hooks/useStudentAffiliation";
import { BookOpen, Target, FileText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface CurriculumItem {
  id: string;
  title: string;
  subject: string;
  grade_level: string | null;
  description: string | null;
  learning_objectives: string[] | null;
  resources: unknown;
  order_index: number;
}

const subjectColors: Record<string, string> = {
  Math: "bg-blue-500/20 text-blue-400",
  English: "bg-green-500/20 text-green-400",
  Science: "bg-purple-500/20 text-purple-400",
  History: "bg-yellow-500/20 text-yellow-400",
  default: "bg-muted text-muted-foreground",
};

export default function Curriculum() {
  const { user } = useAuth();
  const { affiliation, loading: affiliationLoading } = useStudentAffiliation();
  const [curriculum, setCurriculum] = useState<CurriculumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [subjects, setSubjects] = useState<string[]>([]);

  useEffect(() => {
    async function loadCurriculum() {
      if (!user?.id || affiliationLoading) return;

      // Only schools have curriculum
      if (affiliation?.type !== "school") {
        setLoading(false);
        return;
      }

      try {
        let query = supabase
          .from("curriculum_items")
          .select("*")
          .eq("school_id", affiliation.id)
          .order("order_index", { ascending: true });

        if (selectedSubject !== "all") {
          query = query.eq("subject", selectedSubject);
        }

        const { data, error } = await query;

        if (error) throw error;

        setCurriculum(data || []);

        // Get unique subjects
        const uniqueSubjects = [...new Set((data || []).map((item) => item.subject))];
        setSubjects(uniqueSubjects);
      } catch (error) {
        console.error("Error loading curriculum:", error);
      } finally {
        setLoading(false);
      }
    }

    loadCurriculum();
  }, [user?.id, affiliation, affiliationLoading, selectedSubject]);

  if (loading || affiliationLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  // Show message for tutor students
  if (affiliation?.type === "tutor") {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">📚 Curriculum</h1>
            <p className="text-muted-foreground mt-1">
              School curriculum and learning objectives
            </p>
          </div>
          <div className="text-center py-12 rounded-2xl bg-card border border-border/50">
            <Lock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground mb-1">School-only feature</h3>
            <p className="text-muted-foreground">
              Curriculum is only available for students enrolled in a school
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show join prompt if no affiliation
  if (!affiliation) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">📚 Curriculum</h1>
            <p className="text-muted-foreground mt-1">
              School curriculum and learning objectives
            </p>
          </div>
          <div className="text-center py-12 rounded-2xl bg-card border border-border/50">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Join a school first</h3>
            <p className="text-muted-foreground mb-4">
              Use an invite code to join a school and access their curriculum
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">📚 Curriculum</h1>
          <p className="text-muted-foreground mt-1">
            Explore your school's learning objectives and resources
          </p>
        </div>

        {/* Subject Filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedSubject === "all" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setSelectedSubject("all")}
          >
            All Subjects
          </Button>
          {subjects.map((subject) => (
            <Button
              key={subject}
              variant={selectedSubject === subject ? "secondary" : "outline"}
              size="sm"
              onClick={() => setSelectedSubject(subject)}
            >
              {subject}
            </Button>
          ))}
        </div>

        {/* Curriculum List */}
        {curriculum.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-card border border-border/50">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No curriculum items</h3>
            <p className="text-muted-foreground">
              Your school hasn't added any curriculum items yet
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {curriculum.map((item, idx) => (
              <div
                key={item.id}
                className="p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">{item.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              subjectColors[item.subject] || subjectColors.default
                            }`}
                          >
                            {item.subject}
                          </span>
                          {item.grade_level && (
                            <span className="text-xs text-muted-foreground">
                              Grade {item.grade_level}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-muted-foreground mt-3">{item.description}</p>
                    )}

                    {item.learning_objectives && item.learning_objectives.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                          <Target className="w-4 h-4 text-primary" />
                          Learning Objectives
                        </h4>
                        <ul className="space-y-1">
                          {item.learning_objectives.map((objective, i) => (
                            <li
                              key={i}
                              className="text-sm text-muted-foreground flex items-start gap-2"
                            >
                              <span className="text-primary">•</span>
                              {objective}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.resources && Object.keys(item.resources).length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-purple-400" />
                          Resources
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(item.resources).map(([name, url]) => (
                            <a
                              key={name}
                              href={url as string}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm transition-colors"
                            >
                              {name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

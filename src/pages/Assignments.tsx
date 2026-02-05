import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAffiliation } from "@/hooks/useStudentAffiliation";
import { FileText, Clock, CheckCircle, AlertCircle, Send, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  total_points: number;
  subject: string | null;
  status: string;
  created_at: string;
}

interface Submission {
  id: string;
  assignment_id: string;
  submitted_at: string;
  text_content: string | null;
  score: number | null;
  feedback: string | null;
  status: string;
}

export default function Assignments() {
  const { user } = useAuth();
  const { affiliation, loading: affiliationLoading } = useStudentAffiliation();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "submitted" | "graded">("all");

  useEffect(() => {
    async function loadAssignments() {
      if (!user?.id || affiliationLoading) return;

      try {
        let query = supabase
          .from("assignments")
          .select("*")
          .eq("status", "published")
          .order("due_date", { ascending: true });

        if (affiliation?.type === "school") {
          query = query.eq("school_id", affiliation.id);
        } else if (affiliation?.type === "tutor") {
          query = query.eq("tutor_id", affiliation.id);
        }

        const { data: assignmentsData, error: assignmentsError } = await query;

        if (assignmentsError) throw assignmentsError;

        setAssignments(assignmentsData || []);

        // Load submissions
        if (assignmentsData && assignmentsData.length > 0) {
          const { data: submissionsData } = await supabase
            .from("assignment_submissions")
            .select("*")
            .eq("student_id", user.id)
            .in("assignment_id", assignmentsData.map(a => a.id));

          const submissionsMap: Record<string, Submission> = {};
          submissionsData?.forEach(sub => {
            submissionsMap[sub.assignment_id] = sub;
          });
          setSubmissions(submissionsMap);
        }
      } catch (error) {
        console.error("Error loading assignments:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAssignments();
  }, [user?.id, affiliation, affiliationLoading]);

  function getAssignmentStatus(assignment: Assignment): "pending" | "submitted" | "graded" | "overdue" {
    const submission = submissions[assignment.id];
    if (submission?.status === "graded") return "graded";
    if (submission) return "submitted";
    if (assignment.due_date && new Date(assignment.due_date) < new Date()) return "overdue";
    return "pending";
  }

  const filteredAssignments = assignments.filter(assignment => {
    if (filter === "all") return true;
    const status = getAssignmentStatus(assignment);
    if (filter === "pending") return status === "pending" || status === "overdue";
    if (filter === "submitted") return status === "submitted";
    if (filter === "graded") return status === "graded";
    return true;
  });

  if (loading || affiliationLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">📝 Assignments</h1>
          <p className="text-muted-foreground mt-1">
            View and submit your assignments
          </p>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "submitted", "graded"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>

        {/* Assignments List */}
        {filteredAssignments.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-card border border-border/50">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No assignments</h3>
            <p className="text-muted-foreground">
              {filter === "all" 
                ? "You don't have any assignments yet" 
                : `No ${filter} assignments`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAssignments.map((assignment) => {
              const status = getAssignmentStatus(assignment);
              const submission = submissions[assignment.id];

              return (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  status={status}
                  submission={submission}
                  onSubmit={async (content: string) => {
                    const { data, error } = await supabase
                      .from("assignment_submissions")
                      .insert({
                        assignment_id: assignment.id,
                        student_id: user!.id,
                        text_content: content,
                        status: "submitted",
                      })
                      .select()
                      .single();

                    if (error) {
                      toast.error("Failed to submit assignment");
                      return;
                    }

                    setSubmissions(prev => ({
                      ...prev,
                      [assignment.id]: data,
                    }));
                    toast.success("Assignment submitted!");
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function AssignmentCard({
  assignment,
  status,
  submission,
  onSubmit,
}: {
  assignment: Assignment;
  status: "pending" | "submitted" | "graded" | "overdue";
  submission?: Submission;
  onSubmit: (content: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const statusConfig = {
    pending: { icon: Clock, color: "bg-yellow-500/20 text-yellow-400", label: "Pending" },
    submitted: { icon: Send, color: "bg-blue-500/20 text-blue-400", label: "Submitted" },
    graded: { icon: CheckCircle, color: "bg-green-500/20 text-green-400", label: "Graded" },
    overdue: { icon: AlertCircle, color: "bg-red-500/20 text-red-400", label: "Overdue" },
  };

  const StatusIcon = statusConfig[status].icon;

  async function handleSubmit() {
    if (!content.trim()) return;
    setSubmitting(true);
    await onSubmit(content);
    setSubmitting(false);
    setOpen(false);
    setContent("");
  }

  return (
    <div className="p-6 rounded-2xl bg-card border border-border/50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-foreground text-lg">{assignment.title}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig[status].color}`}>
              <StatusIcon className="w-3 h-3" />
              {statusConfig[status].label}
            </span>
          </div>

          {assignment.subject && (
            <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs">
              {assignment.subject}
            </span>
          )}

          {assignment.description && (
            <p className="text-muted-foreground mt-3">{assignment.description}</p>
          )}

          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            {assignment.due_date && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Due: {new Date(assignment.due_date).toLocaleDateString()}
              </span>
            )}
            <span>{assignment.total_points} points</span>
          </div>

          {status === "graded" && submission && (
            <div className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-foreground">Your Score</span>
                <span className="text-2xl font-bold text-green-400">
                  {submission.score}/{assignment.total_points}
                </span>
              </div>
              {submission.feedback && (
                <p className="text-sm text-muted-foreground">{submission.feedback}</p>
              )}
            </div>
          )}
        </div>

        {status === "pending" || status === "overdue" ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm">
                <Upload className="w-4 h-4" />
                Submit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Assignment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Your Response
                  </label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Type your answer here..."
                    rows={6}
                  />
                </div>
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={submitting || !content.trim()}
                >
                  {submitting ? "Submitting..." : "Submit Assignment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
    </div>
  );
}

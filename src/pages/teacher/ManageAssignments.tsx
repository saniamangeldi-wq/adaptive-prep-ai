import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, FileText, Clock, Users, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function ManageAssignments() {
  const { user, profile } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [affiliation, setAffiliation] = useState<{ type: "school" | "tutor"; id: string } | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [totalPoints, setTotalPoints] = useState("100");
  const [subject, setSubject] = useState("");
  const [assignmentType, setAssignmentType] = useState("Homework");
  const [gradeLevel, setGradeLevel] = useState("all");
  const [status, setStatus] = useState("published");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!user?.id) return;

      try {
        // Determine affiliation
        if (profile?.role === "school_admin" || profile?.role === "teacher") {
          const { data: schoolMember } = await supabase
            .from("school_members")
            .select("school_id")
            .eq("user_id", user.id)
            .in("role", ["school_admin", "teacher"])
            .maybeSingle();

          if (schoolMember) {
            setAffiliation({ type: "school", id: schoolMember.school_id });
            
            // Load assignments
            const { data } = await supabase
              .from("assignments")
              .select("*")
              .eq("school_id", schoolMember.school_id)
              .order("created_at", { ascending: false });

            setAssignments(data || []);
          }
        } else if (profile?.role === "tutor") {
          setAffiliation({ type: "tutor", id: user.id });

          const { data } = await supabase
            .from("assignments")
            .select("*")
            .eq("tutor_id", user.id)
            .order("created_at", { ascending: false });

          setAssignments(data || []);
        }
      } catch (error) {
        console.error("Error loading assignments:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user?.id, profile?.role]);

  async function handleCreate() {
    if (!title.trim() || !affiliation) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("assignments")
        .insert({
          title,
          description: description || null,
          due_date: dueDate || null,
        total_points: parseInt(totalPoints) || 100,
        subject: subject || null,
        grade_level: gradeLevel !== "all" ? gradeLevel : null,
        created_by: user!.id,
        school_id: affiliation.type === "school" ? affiliation.id : null,
        tutor_id: affiliation.type === "tutor" ? affiliation.id : null,
        status,
      })
        .select()
        .single();

      if (error) throw error;

      // Create calendar event if due date exists
      if (dueDate) {
        await supabase.from("calendar_events").insert({
          school_id: affiliation.type === "school" ? affiliation.id : null,
          tutor_id: affiliation.type === "tutor" ? affiliation.id : null,
          title: `Assignment Due: ${title}`,
          description,
          event_type: "assignment",
          start_time: dueDate,
          subject: subject || null,
          created_by: user!.id,
        });
      }

      setAssignments(prev => [data, ...prev]);
      setCreateOpen(false);
      resetForm();
      toast.success("Assignment created!");
    } catch (error: any) {
      toast.error(error.message || "Failed to create assignment");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from("assignments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setAssignments(prev => prev.filter(a => a.id !== id));
      toast.success("Assignment deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setDueDate("");
    setTotalPoints("100");
    setSubject("");
    setAssignmentType("Homework");
    setGradeLevel("all");
    setStatus("published");
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">📝 Assignments</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage assignments for your students
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="w-4 h-4" />
                Create Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Assignment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Title <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Assignment title"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Description / Instructions <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detailed instructions for students..."
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Subject</label>
                    <Select value={subject} onValueChange={setSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Math">Math</SelectItem>
                        <SelectItem value="Reading & Writing">Reading & Writing</SelectItem>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Science">Science</SelectItem>
                        <SelectItem value="History">History</SelectItem>
                        <SelectItem value="SAT">SAT Prep</SelectItem>
                        <SelectItem value="ACT">ACT Prep</SelectItem>
                        <SelectItem value="Computer Science">Computer Science</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Type</label>
                    <Select value={assignmentType} onValueChange={setAssignmentType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Homework">Homework</SelectItem>
                        <SelectItem value="Quiz">Quiz</SelectItem>
                        <SelectItem value="Exam">Exam</SelectItem>
                        <SelectItem value="Practice Test">Practice Test</SelectItem>
                        <SelectItem value="Project">Project</SelectItem>
                        <SelectItem value="Essay">Essay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Due Date <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Points</label>
                    <Input
                      type="number"
                      value={totalPoints}
                      onChange={(e) => setTotalPoints(e.target.value)}
                      min="1"
                      max="1000"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Grade Level</label>
                    <Select value={gradeLevel} onValueChange={setGradeLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="All grades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Grades</SelectItem>
                        <SelectItem value="9th">9th Grade</SelectItem>
                        <SelectItem value="10th">10th Grade</SelectItem>
                        <SelectItem value="11th">11th Grade</SelectItem>
                        <SelectItem value="12th">12th Grade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="published">Published (Visible to students)</SelectItem>
                        <SelectItem value="draft">Draft (Save for later)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button
                    variant="hero"
                    className="flex-1"
                    onClick={handleCreate}
                    disabled={creating || !title.trim() || !dueDate}
                  >
                    {creating ? "Creating..." : status === "draft" ? "Save as Draft" : "Create Assignment"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCreateOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Assignments List */}
        {assignments.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-card border border-border/50">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No assignments yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first assignment for students
            </p>
            <Button variant="hero" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" />
              Create Assignment
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="p-5 rounded-2xl bg-card border border-border/50 flex items-start justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-foreground">{assignment.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      assignment.status === "published" 
                        ? "bg-green-500/20 text-green-400"
                        : assignment.status === "draft"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {assignment.status}
                    </span>
                  </div>
                  {assignment.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {assignment.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {assignment.subject && (
                      <span className="px-2 py-0.5 rounded bg-muted text-xs">
                        {assignment.subject}
                      </span>
                    )}
                    {assignment.due_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(assignment.due_date).toLocaleDateString()}
                      </span>
                    )}
                    <span>{assignment.total_points} pts</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(assignment.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

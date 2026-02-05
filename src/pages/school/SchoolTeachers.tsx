import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Mail,
  Trash2,
  BookOpen,
  GraduationCap,
  Pencil,
  Clock,
  Check,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TeacherAssignmentDialog } from "@/components/school/TeacherAssignmentDialog";

interface TeacherAssignment {
  subjects: string[];
  grade_levels: string[];
}

interface Teacher {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string;
  };
  assignment?: TeacherAssignment;
}

interface PendingRequest {
  id: string;
  student_user_id: string;
  student_name: string | null;
  student_email: string | null;
  created_at: string;
  status: string;
}

export default function SchoolTeachers() {
  const { profile } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [approvingTeacher, setApprovingTeacher] = useState<PendingRequest | null>(null);

  const fetchData = async () => {
    if (!profile?.user_id) return;

    try {
      // Get school
      const { data: memberData } = await supabase
        .from("school_members")
        .select("school_id")
        .eq("user_id", profile.user_id)
        .eq("role", "school_admin")
        .maybeSingle();

      if (memberData?.school_id) {
        setSchoolId(memberData.school_id);

        // Get pending teacher requests
        const { data: pendingData } = await supabase
          .from("join_requests")
          .select("*")
          .eq("target_id", memberData.school_id)
          .eq("target_type", "school_teacher")
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        setPendingRequests(pendingData || []);

        // Get approved teachers
        const { data: teacherMembers } = await supabase
          .from("school_members")
          .select("*")
          .eq("school_id", memberData.school_id)
          .eq("role", "teacher");

        if (teacherMembers && teacherMembers.length > 0) {
          const teacherIds = teacherMembers.map(t => t.user_id);
          
          const [profilesRes, assignmentsRes] = await Promise.all([
            supabase
              .from("profiles")
              .select("user_id, full_name, email")
              .in("user_id", teacherIds),
            supabase
              .from("teacher_assignments")
              .select("teacher_user_id, subjects, grade_levels")
              .eq("school_id", memberData.school_id)
              .in("teacher_user_id", teacherIds)
          ]);

          const teachersWithData = teacherMembers.map(t => ({
            ...t,
            profile: profilesRes.data?.find(p => p.user_id === t.user_id),
            assignment: assignmentsRes.data?.find(a => a.teacher_user_id === t.user_id) as TeacherAssignment | undefined,
          }));

          setTeachers(teachersWithData);
        } else {
          setTeachers([]);
        }
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.user_id]);

  const handleApproveTeacher = async (request: PendingRequest, subjects: string[], gradeLevels: string[]) => {
    if (!schoolId) return;

    try {
      // Update profile role to teacher
      await supabase
        .from("profiles")
        .update({ role: "teacher" })
        .eq("user_id", request.student_user_id);

      // Add to school_members
      const { error: memberError } = await supabase
        .from("school_members")
        .insert({
          school_id: schoolId,
          user_id: request.student_user_id,
          role: "teacher",
          status: "active"
        });

      if (memberError) throw memberError;

      // Add teacher assignments
      const { error: assignError } = await supabase
        .from("teacher_assignments")
        .insert({
          school_id: schoolId,
          teacher_user_id: request.student_user_id,
          subjects,
          grade_levels: gradeLevels
        });

      if (assignError) throw assignError;

      // Add user_roles entry
      await supabase.from("user_roles").insert({
        user_id: request.student_user_id,
        role: "teacher"
      });

      // Update join request status
      await supabase
        .from("join_requests")
        .update({ status: "approved" })
        .eq("id", request.id);

      toast.success("Teacher approved and added to school!");
      setApprovingTeacher(null);
      fetchData();
    } catch (error: any) {
      console.error("Error approving teacher:", error);
      toast.error("Failed to approve teacher");
    }
  };

  const handleRejectTeacher = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("join_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;

      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success("Request rejected");
    } catch (error: any) {
      toast.error("Failed to reject request");
    }
  };

  const handleRemoveTeacher = async (memberId: string, teacherUserId: string) => {
    try {
      const { error } = await supabase
        .from("school_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      await supabase
        .from("teacher_assignments")
        .delete()
        .eq("school_id", schoolId)
        .eq("teacher_user_id", teacherUserId);

      setTeachers(prev => prev.filter(t => t.id !== memberId));
      toast.success("Teacher removed from school");
    } catch (error: any) {
      toast.error("Failed to remove teacher");
    }
  };

  const handleUpdateAssignment = async (teacher: Teacher, subjects: string[], gradeLevels: string[]) => {
    if (!schoolId) return;

    try {
      const { error } = await supabase
        .from("teacher_assignments")
        .upsert({
          school_id: schoolId,
          teacher_user_id: teacher.user_id,
          subjects,
          grade_levels: gradeLevels,
        }, {
          onConflict: "school_id,teacher_user_id"
        });

      if (error) throw error;

      toast.success("Teacher assignment updated");
      setEditingTeacher(null);
      fetchData();
    } catch (error: any) {
      console.error("Error updating assignment:", error);
      toast.error("Failed to update assignment");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Edit Assignment Dialog */}
        {editingTeacher && (
          <TeacherAssignmentDialog
            open={!!editingTeacher}
            onOpenChange={(open) => !open && setEditingTeacher(null)}
            teacherName={editingTeacher.profile?.full_name || "Teacher"}
            initialSubjects={editingTeacher.assignment?.subjects || []}
            initialGradeLevels={editingTeacher.assignment?.grade_levels || []}
            onSave={(subjects, gradeLevels) => 
              handleUpdateAssignment(editingTeacher, subjects, gradeLevels)
            }
            mode="edit"
          />
        )}

        {/* Approve Teacher Dialog */}
        {approvingTeacher && (
          <TeacherAssignmentDialog
            open={!!approvingTeacher}
            onOpenChange={(open) => !open && setApprovingTeacher(null)}
            teacherName={approvingTeacher.student_name || "Teacher"}
            initialSubjects={[]}
            initialGradeLevels={[]}
            onSave={(subjects, gradeLevels) => 
              handleApproveTeacher(approvingTeacher, subjects, gradeLevels)
            }
            mode="approve"
          />
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Teachers</h1>
            <p className="text-muted-foreground mt-1">
              Manage teachers and their subject/grade assignments
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-sm text-muted-foreground">
              Teachers can join using your school invite code
            </p>
          </div>
        </div>

        {/* Pending Teacher Requests */}
        <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-muted/30">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              Pending Teacher Requests
              {pendingRequests.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingRequests.length}
                </Badge>
              )}
            </h2>
          </div>
          
          {pendingRequests.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <p>No pending teacher requests</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pendingRequests.map((request) => (
                <div key={request.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-warning to-accent flex items-center justify-center text-sm font-medium text-primary-foreground">
                      {request.student_name?.[0] || request.student_email?.[0]?.toUpperCase() || "T"}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {request.student_name || "Unknown Teacher"}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {request.student_email || "No email"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Requested {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setApprovingTeacher(request)}
                      className="bg-success hover:bg-success/90"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRejectTeacher(request.id)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approved Teachers List */}
        <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-muted/30">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Approved Teachers
              {teachers.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {teachers.length}
                </Badge>
              )}
            </h2>
          </div>

          {teachers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No teachers yet</p>
              <p className="text-sm mt-1">Share your school invite code with teachers to let them join</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {teachers.map((teacher) => (
                <div key={teacher.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-medium text-primary-foreground">
                        {teacher.profile?.full_name?.[0] || teacher.profile?.email?.[0]?.toUpperCase() || "T"}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {teacher.profile?.full_name || "Unknown Teacher"}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {teacher.profile?.email || "No email"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        teacher.status === "active" 
                          ? "bg-success/20 text-success" 
                          : "bg-warning/20 text-warning"
                      }`}>
                        {teacher.status}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingTeacher(teacher)}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveTeacher(teacher.id, teacher.user_id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Assignment Info */}
                  <div className="pl-14 space-y-2">
                    {teacher.assignment ? (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <BookOpen className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Subjects:</span>
                          {teacher.assignment.subjects.map((subject) => (
                            <Badge key={subject} variant="secondary" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <GraduationCap className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Grades:</span>
                          {teacher.assignment.grade_levels.map((grade) => (
                            <Badge key={grade} variant="outline" className="text-xs">
                              {grade}
                            </Badge>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-warning flex items-center gap-1">
                        <span>⚠️</span>
                        No subjects/grades assigned yet
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="text-primary p-0 h-auto"
                          onClick={() => setEditingTeacher(teacher)}
                        >
                          Assign now
                        </Button>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

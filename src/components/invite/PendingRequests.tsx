import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, X, Clock, User, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { TeacherAssignmentDialog } from "@/components/school/TeacherAssignmentDialog";

interface JoinRequest {
  id: string;
  student_user_id: string;
  student_email: string | null;
  student_name: string | null;
  target_type: string;
  status: string;
  created_at: string;
}

interface PendingRequestsProps {
  targetType: "tutor" | "school" | "school_teacher";
  targetId: string;
  onApprove?: () => void;
}

export function PendingRequests({ targetType, targetId, onApprove }: PendingRequestsProps) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacherRequest, setSelectedTeacherRequest] = useState<JoinRequest | null>(null);

  const fetchRequests = async () => {
    if (!targetId) return;

    // For school admins, fetch both student and teacher requests
    if (targetType === "school") {
      const { data, error } = await supabase
        .from("join_requests")
        .select("*")
        .eq("target_id", targetId)
        .in("target_type", ["school", "school_teacher"])
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching requests:", error);
      } else {
        setRequests(data || []);
      }
    } else {
      const { data, error } = await supabase
        .from("join_requests")
        .select("*")
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching requests:", error);
      } else {
        setRequests(data || []);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [targetId, targetType]);

  const handleApproveStudent = async (request: JoinRequest) => {
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from("join_requests")
        .update({ status: "approved" })
        .eq("id", request.id);

      if (updateError) throw updateError;

      // Add to appropriate relationship table
      if (request.target_type === "tutor") {
        const { error: relationError } = await supabase
          .from("tutor_students")
          .insert({ tutor_id: targetId, student_id: request.student_user_id });
        if (relationError && !relationError.message.includes("duplicate")) throw relationError;
      } else if (request.target_type === "school") {
        const { error: memberError } = await supabase
          .from("school_members")
          .insert({ school_id: targetId, user_id: request.student_user_id, role: "student", status: "active" });
        if (memberError && !memberError.message.includes("duplicate")) throw memberError;
      }

      toast.success("Student approved!");
      fetchRequests();
      onApprove?.();
    } catch (error: any) {
      console.error("Error approving:", error);
      toast.error(error.message || "Failed to approve");
    }
  };

  const handleApproveTeacher = async (request: JoinRequest, subjects: string[], gradeLevels: string[]) => {
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from("join_requests")
        .update({ status: "approved" })
        .eq("id", request.id);

      if (updateError) throw updateError;

      // Add to school_members
      const { error: memberError } = await supabase
        .from("school_members")
        .insert({ school_id: targetId, user_id: request.student_user_id, role: "teacher", status: "active" });
      if (memberError && !memberError.message.includes("duplicate")) throw memberError;

      // Create teacher assignment with subjects and grades
      const { error: assignmentError } = await supabase
        .from("teacher_assignments")
        .insert({
          school_id: targetId,
          teacher_user_id: request.student_user_id,
          subjects,
          grade_levels: gradeLevels,
        });
      if (assignmentError) throw assignmentError;

      // Update the user's role in profiles
      await supabase
        .from("profiles")
        .update({ role: "teacher" })
        .eq("user_id", request.student_user_id);

      toast.success("Teacher approved and assigned!");
      setSelectedTeacherRequest(null);
      fetchRequests();
      onApprove?.();
    } catch (error: any) {
      console.error("Error approving teacher:", error);
      toast.error(error.message || "Failed to approve teacher");
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("join_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;
      toast.success("Request rejected");
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject");
    }
  };

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-card border border-border/50">
        <div className="animate-pulse h-20 bg-muted rounded" />
      </div>
    );
  }

  // Separate student and teacher requests for display
  const studentRequests = requests.filter(r => r.target_type === "school" || r.target_type === "tutor");
  const teacherRequests = requests.filter(r => r.target_type === "school_teacher");

  return (
    <div className="space-y-4">
      {/* Teacher Assignment Dialog */}
      {selectedTeacherRequest && (
        <TeacherAssignmentDialog
          open={!!selectedTeacherRequest}
          onOpenChange={(open) => !open && setSelectedTeacherRequest(null)}
          teacherName={selectedTeacherRequest.student_name || "Teacher"}
          onSave={(subjects, gradeLevels) => 
            handleApproveTeacher(selectedTeacherRequest, subjects, gradeLevels)
          }
          mode="approve"
        />
      )}

      {/* Teacher Requests (for school admins) */}
      {teacherRequests.length > 0 && (
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-foreground">Pending Teacher Requests</h3>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-500 text-xs font-medium">
              {teacherRequests.length}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Click approve to assign subjects and grade levels to each teacher.
          </p>
          <div className="space-y-3">
            {teacherRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{request.student_name || "Teacher"}</p>
                    <p className="text-sm text-muted-foreground">{request.student_email || "No email"}</p>
                    <span className="text-xs text-purple-400">Teacher Request</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleReject(request.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={() => setSelectedTeacherRequest(request)}>
                    <Check className="w-4 h-4 mr-1" />
                    Assign & Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Requests */}
      <div className="p-6 rounded-2xl bg-card border border-border/50">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-foreground">Pending Student Requests</h3>
          {studentRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-xs font-medium">
              {studentRequests.length}
            </span>
          )}
        </div>

        {studentRequests.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No pending student requests</p>
        ) : (
          <div className="space-y-3">
            {studentRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{request.student_name || "Student"}</p>
                    <p className="text-sm text-muted-foreground">{request.student_email || "No email"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleReject(request.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={() => handleApproveStudent(request)}>
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
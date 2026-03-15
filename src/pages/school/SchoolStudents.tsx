import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PendingRequests } from "@/components/invite/PendingRequests";
import { 
  GraduationCap, 
  UserPlus, 
  Mail,
  Trash2,
  TrendingUp,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Student {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string;
  };
}

export default function SchoolStudents() {
  const { profile, user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isTutor = profile?.role === "tutor";

  const fetchStudents = async () => {
    if (!profile?.user_id) return;

    try {
      if (isTutor) {
        // Tutor: fetch from tutor_students
        const { data: tutorStudents } = await supabase
          .from("tutor_students")
          .select("student_id, created_at, id")
          .eq("tutor_id", profile.user_id);

        if (tutorStudents && tutorStudents.length > 0) {
          const studentIds = tutorStudents.map(s => s.student_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, email")
            .in("user_id", studentIds);

          const studentsWithProfiles = tutorStudents.map(s => ({
            id: s.id,
            user_id: s.student_id,
            status: "active",
            created_at: s.created_at,
            profile: profiles?.find(p => p.user_id === s.student_id),
          }));
          setStudents(studentsWithProfiles);
        } else {
          setStudents([]);
        }

        // Fetch tutor invite code
        const { data: codeData } = await supabase
          .from("tutor_invite_codes")
          .select("invite_code")
          .eq("tutor_user_id", profile.user_id)
          .maybeSingle();

        if (codeData) {
          setInviteCode(codeData.invite_code);
        } else {
          // Create one
          const { data: newCode } = await supabase
            .from("tutor_invite_codes")
            .insert({ tutor_user_id: profile.user_id })
            .select("invite_code")
            .single();
          if (newCode) setInviteCode(newCode.invite_code);
        }
      } else {
        // School admin flow
        const { data: memberData } = await supabase
          .from("school_members")
          .select("school_id")
          .eq("user_id", profile.user_id)
          .eq("role", "school_admin")
          .maybeSingle();

        if (memberData?.school_id) {
          setSchoolId(memberData.school_id);
          
          // Get school invite code
          const { data: school } = await supabase
            .from("schools")
            .select("invite_code")
            .eq("id", memberData.school_id)
            .single();
          if (school) setInviteCode(school.invite_code);

          const { data: studentMembers } = await supabase
            .from("school_members")
            .select("*")
            .eq("school_id", memberData.school_id)
            .eq("role", "student");

          if (studentMembers && studentMembers.length > 0) {
            const studentIds = studentMembers.map(s => s.user_id);
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, full_name, email")
              .in("user_id", studentIds);

            setStudents(studentMembers.map(s => ({
              ...s,
              profile: profiles?.find(p => p.user_id === s.user_id),
            })));
          } else {
            setStudents([]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [profile?.user_id]);

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const handleRemoveStudent = async (memberId: string) => {
    try {
      if (isTutor) {
        const { error } = await supabase
          .from("tutor_students")
          .delete()
          .eq("id", memberId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("school_members")
          .delete()
          .eq("id", memberId);
        if (error) throw error;
      }
      setStudents(prev => prev.filter(s => s.id !== memberId));
      toast.success("Student removed");
    } catch (error: any) {
      toast.error("Failed to remove student");
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

  const inviteHref = isTutor ? "/dashboard/students/add" : "/dashboard/school/invite";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Students</h1>
            <p className="text-muted-foreground mt-1">
              Manage students and approve join requests
            </p>
          </div>
          <Button variant="hero" asChild>
            <a href={inviteHref}>
              <UserPlus className="w-4 h-4" />
              Invite Student
            </a>
          </Button>
        </div>

        {/* Pending Requests */}
        {isTutor && user?.id && (
          <PendingRequests 
            targetType="tutor" 
            targetId={user.id} 
            onApprove={fetchStudents}
          />
        )}
        {!isTutor && schoolId && (
          <PendingRequests 
            targetType="school" 
            targetId={schoolId} 
            onApprove={fetchStudents}
          />
        )}

        {/* Students List */}
        <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
          {students.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-lg font-semibold text-foreground mb-2">No students yet</p>

              {/* Prominent invite code */}
              {inviteCode && (
                <div className="max-w-sm mx-auto mb-4">
                  <button
                    onClick={handleCopyCode}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-full bg-muted border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">📋</span>
                      <span className="text-sm text-muted-foreground">Your Invite Code:</span>
                      <code className="font-mono font-bold text-foreground tracking-wider">{inviteCode}</code>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      {copied ? (
                        <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Copied!</span>
                      ) : (
                        <span className="flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</span>
                      )}
                    </span>
                  </button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Share this code with students so they can join your class
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {students.map((student) => (
                <div key={student.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center text-sm font-medium text-white">
                      {student.profile?.full_name?.[0] || student.profile?.email?.[0]?.toUpperCase() || "S"}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {student.profile?.full_name || "Unknown Student"}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {student.profile?.email || "No email"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm text-muted-foreground">Progress</p>
                      <p className="font-medium text-foreground flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        --
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      student.status === "active" 
                        ? "bg-green-500/20 text-green-400" 
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {student.status}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveStudent(student.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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

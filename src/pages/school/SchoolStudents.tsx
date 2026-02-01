import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  GraduationCap, 
  UserPlus, 
  Mail,
  Trash2,
  TrendingUp
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
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
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
          // Get students
          const { data: studentMembers } = await supabase
            .from("school_members")
            .select("*")
            .eq("school_id", memberData.school_id)
            .eq("role", "student");

          if (studentMembers) {
            // Get profiles
            const studentIds = studentMembers.map(s => s.user_id);
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, full_name, email")
              .in("user_id", studentIds);

            const studentsWithProfiles = studentMembers.map(s => ({
              ...s,
              profile: profiles?.find(p => p.user_id === s.user_id),
            }));

            setStudents(studentsWithProfiles);
          }
        }
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [profile?.user_id]);

  const handleRemoveStudent = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("school_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      setStudents(prev => prev.filter(s => s.id !== memberId));
      toast.success("Student removed from school");
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Students</h1>
            <p className="text-muted-foreground mt-1">
              View all students in your school
            </p>
          </div>
          <Button variant="hero" asChild>
            <a href="/dashboard/school/invite">
              <UserPlus className="w-4 h-4" />
              Invite Student
            </a>
          </Button>
        </div>

        {/* Students List */}
        <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
          {students.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No students yet</p>
              <p className="text-sm mt-1">Students can join using your school invite code</p>
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

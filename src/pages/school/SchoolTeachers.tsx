import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Mail,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";

interface Teacher {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string;
  };
}

export default function SchoolTeachers() {
  const { profile } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeachers = async () => {
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

          // Get teachers
          const { data: teacherMembers } = await supabase
            .from("school_members")
            .select("*")
            .eq("school_id", memberData.school_id)
            .eq("role", "teacher");

          if (teacherMembers) {
            // Get profiles for teachers
            const teacherIds = teacherMembers.map(t => t.user_id);
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, full_name, email")
              .in("user_id", teacherIds);

            const teachersWithProfiles = teacherMembers.map(t => ({
              ...t,
              profile: profiles?.find(p => p.user_id === t.user_id),
            }));

            setTeachers(teachersWithProfiles);
          }
        }
      } catch (error) {
        console.error("Error fetching teachers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, [profile?.user_id]);

  const handleRemoveTeacher = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("school_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      setTeachers(prev => prev.filter(t => t.id !== memberId));
      toast.success("Teacher removed from school");
    } catch (error: any) {
      toast.error("Failed to remove teacher");
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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Teachers</h1>
            <p className="text-muted-foreground mt-1">
              Manage teachers in your school
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-sm text-muted-foreground">
              Teachers can join using your school invite code
            </p>
          </div>
        </div>

        {/* Teachers List */}
        <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
          {teachers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No teachers yet</p>
              <p className="text-sm mt-1">Share your school invite code with teachers to let them join</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {teachers.map((teacher) => (
                <div key={teacher.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center text-sm font-medium text-white">
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
                        ? "bg-green-500/20 text-green-400" 
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {teacher.status}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveTeacher(teacher.id)}
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

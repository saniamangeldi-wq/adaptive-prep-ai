import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Building2, 
  Users, 
  GraduationCap, 
  TrendingUp,
  Calendar,
  Award
} from "lucide-react";

interface SchoolData {
  id: string;
  name: string;
  invite_code: string;
  tier: string;
  created_at: string;
}

export default function SchoolOverview() {
  const { profile } = useAuth();
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    testsCompleted: 0,
    avgImprovement: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchoolData = async () => {
      if (!profile?.user_id) return;

      try {
        // Get school membership
        const { data: memberData } = await supabase
          .from("school_members")
          .select("school_id")
          .eq("user_id", profile.user_id)
          .eq("role", "school_admin")
          .maybeSingle();

        if (memberData?.school_id) {
          // Get school info
          const { data: schoolData } = await supabase
            .from("schools")
            .select("*")
            .eq("id", memberData.school_id)
            .single();

          if (schoolData) {
            setSchool(schoolData);

            // Get member counts
            const { data: members } = await supabase
              .from("school_members")
              .select("role")
              .eq("school_id", memberData.school_id);

            if (members) {
              setStats({
                totalStudents: members.filter(m => m.role === "student").length,
                totalTeachers: members.filter(m => m.role === "teacher").length,
                testsCompleted: 0,
                avgImprovement: 0,
              });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching school data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolData();
  }, [profile?.user_id]);

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
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {school?.name || "School Overview"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete overview of your school's performance
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={GraduationCap}
            label="Total Students"
            value={stats.totalStudents.toString()}
            color="from-primary to-teal-400"
          />
          <StatCard
            icon={Users}
            label="Teachers"
            value={stats.totalTeachers.toString()}
            color="from-purple-500 to-pink-400"
          />
          <StatCard
            icon={Award}
            label="Tests Completed"
            value={stats.testsCompleted.toString()}
            color="from-green-500 to-emerald-400"
          />
          <StatCard
            icon={TrendingUp}
            label="Avg. Improvement"
            value={stats.avgImprovement > 0 ? `+${stats.avgImprovement}` : "--"}
            color="from-accent to-orange-400"
          />
        </div>

        {/* School Info */}
        {school && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">School Details</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">School Name</span>
                  <span className="font-medium text-foreground">{school.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invite Code</span>
                  <code className="font-mono text-primary">{school.invite_code}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium text-foreground">
                    {school.tier === "tier_3" ? "Pro" : school.tier === "tier_2" ? "Plus" : "Starter"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium text-foreground">
                    {new Date(school.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Recent Activity</h3>
              </div>
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No recent activity</p>
                <p className="text-sm mt-1">Activity will appear here as your school grows</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string;
  color: string;
}) {
  return (
    <div className="p-5 rounded-xl bg-card border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} p-0.5`}>
          <div className="w-full h-full rounded-[6px] bg-card flex items-center justify-center">
            <Icon className="w-5 h-5 text-foreground" />
          </div>
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

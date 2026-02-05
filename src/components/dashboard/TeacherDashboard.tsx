import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  TrendingUp, 
  ClipboardList,
  BookOpen,
  BarChart3,
  FileText,
  Award,
  MessageSquare,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { JoinCodeEntry } from "@/components/invite/JoinCodeEntry";

interface SchoolInfo {
  id: string;
  name: string;
}

export function TeacherDashboard() {
  const { profile, user } = useAuth();
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSchoolInfo() {
      if (!user?.id) return;

      try {
        const { data: membership } = await supabase
          .from("school_members")
          .select("school_id, schools(id, name)")
          .eq("user_id", user.id)
          .eq("role", "teacher")
          .maybeSingle();

        if (membership?.schools) {
          const school = membership.schools as { id: string; name: string };
          setSchoolInfo({ id: school.id, name: school.name });
        }
      } catch (error) {
        console.error("Error loading school info:", error);
      } finally {
        setLoading(false);
      }
    }

    loadSchoolInfo();
  }, [user?.id]);

  return (
    <div className="space-y-8">
      {/* School affiliation banner */}
      {!loading && (
        <>
          {schoolInfo ? (
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-purple-400" />
                <div>
                  <p className="text-sm text-muted-foreground">You're teaching at</p>
                  <h2 className="text-lg font-semibold text-foreground">{schoolInfo.name}</h2>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="w-6 h-6 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Not affiliated with a school yet</p>
                    <p className="text-sm text-muted-foreground">Join a school using an invite code</p>
                  </div>
                </div>
                <JoinCodeEntry userRole="teacher" />
              </div>
            </div>
          )}
        </>
      )}

      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Welcome, {profile?.full_name?.split(" ")[0] || "Teacher"}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your classroom and track student performance
          </p>
        </div>
        <Button variant="hero" asChild>
          <Link to="/dashboard/manage-assignments">
            <ClipboardList className="w-4 h-4" />
            Create Assignment
          </Link>
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Students"
          value="0"
          subtext="in class"
          color="from-primary to-teal-400"
        />
        <StatCard
          icon={FileText}
          label="Tests Assigned"
          value="0"
          subtext="this month"
          color="from-purple-500 to-pink-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Class Average"
          value="--"
          subtext="score"
          color="from-green-500 to-emerald-400"
        />
        <StatCard
          icon={Award}
          label="Top Performer"
          value="--"
          subtext="this week"
          color="from-accent to-orange-400"
        />
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickAction
          icon={Users}
          title="My Classroom"
          description="View students in your class"
          href="/dashboard/classroom"
          color="from-primary to-teal-400"
        />
        <QuickAction
          icon={MessageSquare}
          title="AI Coach"
          description="Get AI assistance for teaching"
          href="/dashboard/coach"
          color="from-purple-500 to-pink-400"
        />
        <QuickAction
          icon={ClipboardList}
          title="Assignments"
          description="Create and manage assignments"
          href="/dashboard/manage-assignments"
          color="from-green-500 to-emerald-400"
        />
        <QuickAction
          icon={BarChart3}
          title="Class Analytics"
          description="View performance trends and insights"
          href="/dashboard/analytics"
          color="from-blue-500 to-blue-400"
        />
      </div>

      {/* Class performance */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <h3 className="font-semibold text-foreground mb-4">Students Needing Attention</h3>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No students in your class yet</p>
            <p className="text-sm mt-1">Students are assigned by your school admin</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <h3 className="font-semibold text-foreground mb-4">Recent Test Results</h3>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No tests assigned yet</p>
            <p className="text-sm mt-1">Create an assignment to get started</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link to="/dashboard/manage-assignments">
                <ClipboardList className="w-4 h-4" />
                Create Assignment
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext,
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  subtext: string;
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
      <div className="flex items-center justify-between mt-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground/70">{subtext}</span>
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
  href,
  color,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  color: string;
}) {
  return (
    <Link 
      to={href}
      className="group p-5 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} p-0.5 mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <div className="w-full h-full rounded-[10px] bg-card flex items-center justify-center">
          <Icon className="w-6 h-6 text-foreground" />
        </div>
      </div>
      <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

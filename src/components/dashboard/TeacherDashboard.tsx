import { AbandonedTestsPanel } from "@/components/dashboard/AbandonedTestsPanel";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useRosterStats } from "@/hooks/useRosterStats";
import { 
  Users, 
  TrendingUp, 
  ClipboardList,
  BookOpen,
  BarChart3,
  FileText,
  Clock,
  Target,
  MessageSquare,
  Building2,
  Info
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
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
  const stats = useRosterStats("teacher");

  const { data: roster } = useQuery({
    queryKey: ["teacher-roster", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: links } = await supabase
        .from("teacher_students")
        .select("student_id")
        .eq("teacher_id", user!.id);
      const ids = (links ?? []).map((l: { student_id: string }) => l.student_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", ids);
      return profiles ?? [];
    },
  });


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

      {/* Stats cards — all values come from completed, non-abandoned attempts */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Students"
          value={stats.isLoading ? "—" : String(stats.activeStudents)}
          subtext="in class"
          color="from-primary to-teal-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg. Improvement"
          value={
            stats.avgImprovement == null
              ? "—"
              : `${stats.avgImprovement > 0 ? "+" : ""}${stats.avgImprovement}`
          }
          subtext={
            stats.improvementSample > 0
              ? `${stats.improvementSample} student${stats.improvementSample === 1 ? "" : "s"}`
              : "needs 2+ tests"
          }
          color="from-green-500 to-emerald-400"
          tooltip="Latest score minus first score, averaged over students who have completed at least two scored tests."
        />
        <StatCard
          icon={Clock}
          label="Tests This Week"
          value={stats.isLoading ? "—" : String(stats.sessionsThisWeek)}
          subtext="completed"
          color="from-purple-500 to-pink-400"
        />
        <StatCard
          icon={Target}
          label="Avg. Accuracy"
          value={stats.avgAccuracy == null ? "—" : `${stats.avgAccuracy}%`}
          subtext="all tests"
          color="from-accent to-orange-400"
          tooltip="Correct answers divided by questions served, averaged across every completed test in your class."
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

      {/* Class roster */}
      <div className="p-6 rounded-2xl bg-card border border-border/50">
        <h3 className="font-semibold text-foreground mb-4">Your Students</h3>
        {roster && roster.length > 0 ? (
          <div className="space-y-2">
            {roster.map((s: { user_id: string; full_name: string | null; email: string | null }) => (
              <Link
                key={s.user_id}
                to={`/dashboard/classroom/${s.user_id}`}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 hover:border-primary/40 transition-colors"
              >
                <span className="text-sm text-foreground truncate">
                  {s.full_name || s.email || "Student"}
                </span>
                <span className="text-xs text-primary shrink-0">View progress</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No students assigned to you yet</p>
            <p className="text-sm mt-1">
              {schoolInfo
                ? "Your school admin assigns students to your classes."
                : "Join your school with an invite code to get your class roster."}
            </p>
            {!schoolInfo && (
              <div className="mt-4 flex justify-center">
                <JoinCodeEntry userRole="teacher" />
              </div>
            )}
          </div>
        )}
      </div>


      <AbandonedTestsPanel role="teacher" />
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext,
  color,
  tooltip
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  subtext: string;
  color: string;
  tooltip?: string;
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
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          {label}
          {tooltip && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px] text-xs bg-[hsl(228,20%,12%)] border-[hsl(220,15%,25%)] text-white rounded-lg p-2">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </span>
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

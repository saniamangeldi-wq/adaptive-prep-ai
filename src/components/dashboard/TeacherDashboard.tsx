import { useAuth } from "@/contexts/AuthContext";
import { 
  Users, 
  TrendingUp, 
  ClipboardList,
  BookOpen,
  UserPlus,
  BarChart3,
  FileText,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function TeacherDashboard() {
  const { profile } = useAuth();

  return (
    <div className="space-y-8">
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
          <Link to="/dashboard/classroom/assign">
            <ClipboardList className="w-4 h-4" />
            Assign Test
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
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickAction
          icon={Users}
          title="My Classroom"
          description="View students and their progress"
          href="/dashboard/classroom"
          color="from-primary to-teal-400"
        />
        <QuickAction
          icon={ClipboardList}
          title="Assignments"
          description="Create and manage test assignments"
          href="/dashboard/assignments"
          color="from-purple-500 to-pink-400"
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
            <p>No students added yet</p>
            <p className="text-sm mt-1">Add students to track their progress</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link to="/dashboard/classroom/add">
                <UserPlus className="w-4 h-4" />
                Add Students
              </Link>
            </Button>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <h3 className="font-semibold text-foreground mb-4">Recent Test Results</h3>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No tests assigned yet</p>
            <p className="text-sm mt-1">Assign a test to your class to get started</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link to="/dashboard/classroom/assign">
                <ClipboardList className="w-4 h-4" />
                Assign First Test
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

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { 
  BarChart3, 
  TrendingUp,
  Users,
  Target,
  Calendar,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function SchoolAnalytics() {
  const { profile } = useAuth();

  const studentsHref = profile?.role === "tutor" ? "/dashboard/students" : "/dashboard/school/students";

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track {profile?.role === "tutor" ? "student" : "school-wide"} performance and insights
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Active Learners"
            value="0"
            change=""
            color="from-primary to-teal-400"
          />
          <StatCard
            icon={Target}
            label="Tests Taken"
            value="0"
            change=""
            color="from-purple-500 to-pink-400"
          />
          <StatCard
            icon={TrendingUp}
            label="Avg. Score"
            value="--"
            change=""
            color="from-green-500 to-emerald-400"
          />
          <StatCard
            icon={BarChart3}
            label="Improvement"
            value="--"
            change=""
            color="from-accent to-orange-400"
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <h3 className="font-semibold text-foreground mb-4">Score Distribution</h3>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <span className="text-4xl mb-3 block">📊</span>
                <p className="font-medium text-foreground">No analytics yet — add your first student to get started</p>
                <Button variant="hero" size="sm" className="mt-4" asChild>
                  <Link to={studentsHref}>
                    <UserPlus className="w-4 h-4" />
                    Add Student
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <h3 className="font-semibold text-foreground mb-4">Weekly Activity</h3>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <span className="text-4xl mb-3 block">📊</span>
                <p className="font-medium text-foreground">No analytics yet — add your first student to get started</p>
                <Button variant="hero" size="sm" className="mt-4" asChild>
                  <Link to={studentsHref}>
                    <UserPlus className="w-4 h-4" />
                    Add Student
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Topic Performance */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <h3 className="font-semibold text-foreground mb-4">Performance by Topic</h3>
          <div className="text-center py-8 text-muted-foreground">
            <span className="text-4xl mb-3 block">📊</span>
            <p className="font-medium text-foreground">No analytics yet — add your first student to get started</p>
            <Button variant="hero" size="sm" className="mt-4" asChild>
              <Link to={studentsHref}>
                <UserPlus className="w-4 h-4" />
                Add Student
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  change,
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string;
  change: string;
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
        {change && (
          <span className="text-xs text-green-500">{change}</span>
        )}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { 
  BarChart3, 
  TrendingUp,
  Users,
  Target,
  Calendar
} from "lucide-react";

export default function SchoolAnalytics() {
  const { profile } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track school-wide performance and insights
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

        {/* Charts Placeholder */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <h3 className="font-semibold text-foreground mb-4">Score Distribution</h3>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No data available yet</p>
                <p className="text-sm mt-1">Charts will appear as students take tests</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <h3 className="font-semibold text-foreground mb-4">Weekly Activity</h3>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No activity data</p>
                <p className="text-sm mt-1">Activity trends will show here</p>
              </div>
            </div>
          </div>
        </div>

        {/* Topic Performance */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <h3 className="font-semibold text-foreground mb-4">Performance by Topic</h3>
          <div className="text-center py-8 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No topic data available</p>
            <p className="text-sm mt-1">See which topics students struggle with most</p>
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

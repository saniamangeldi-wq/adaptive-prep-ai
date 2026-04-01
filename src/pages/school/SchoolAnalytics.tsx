import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  TrendingUp,
  Users,
  Target,
  UserPlus,
  Clock,
  Brain,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserActivity {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  tier: string;
  joined: string;
  last_active: string;
  credits_remaining: number;
  questions_used_today: number;
  tests_taken: number;
  tests_completed: number;
  total_questions_answered: number;
  total_correct: number;
  total_time_seconds: number;
  ai_conversations: number;
  ai_credits_used: number;
  best_score: number;
  avg_accuracy: number;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export default function SchoolAnalytics() {
  const { profile } = useAuth();

  const studentsHref = profile?.role === "tutor" ? "/dashboard/students" : "/dashboard/school/students";

  const { data: activityData, isLoading } = useQuery({
    queryKey: ["admin-user-activity"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("admin-user-activity", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      return response.data as { users: UserActivity[] };
    },
    staleTime: 1000 * 60 * 2,
  });

  const users = activityData?.users || [];
  const totalTests = users.reduce((s, u) => s + u.tests_completed, 0);
  const totalTime = users.reduce((s, u) => s + u.total_time_seconds, 0);
  const avgAccuracy = users.length > 0
    ? Math.round(users.reduce((s, u) => s + u.avg_accuracy, 0) / users.filter(u => u.total_questions_answered > 0).length || 0)
    : 0;

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
            label="Active Users"
            value={String(users.length)}
            color="from-primary to-teal-400"
          />
          <StatCard
            icon={Target}
            label="Tests Completed"
            value={String(totalTests)}
            color="from-purple-500 to-pink-400"
          />
          <StatCard
            icon={TrendingUp}
            label="Avg. Accuracy"
            value={avgAccuracy > 0 ? `${avgAccuracy}%` : "--"}
            color="from-green-500 to-emerald-400"
          />
          <StatCard
            icon={Clock}
            label="Total Study Time"
            value={totalTime > 0 ? formatTime(totalTime) : "--"}
            color="from-accent to-orange-400"
          />
        </div>

        {/* User Activity Table */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">User Activity</h3>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>

          {users.length === 0 && !isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium text-foreground">No users yet</p>
              <p className="text-sm mt-1">Invite students and teachers to start tracking activity</p>
              <Button variant="hero" size="sm" className="mt-4" asChild>
                <Link to={studentsHref}>
                  <UserPlus className="w-4 h-4" />
                  Add Student
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Tests</TableHead>
                    <TableHead className="text-right">Questions</TableHead>
                    <TableHead className="text-right">Accuracy</TableHead>
                    <TableHead className="text-right">Time Spent</TableHead>
                    <TableHead className="text-right">AI Chats</TableHead>
                    <TableHead className="text-right">Best Score</TableHead>
                    <TableHead>Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">
                        {user.full_name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground capitalize">
                          {user.role === "school_admin" ? "Admin" : user.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {user.tests_completed}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {user.total_questions_answered}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {user.total_questions_answered > 0 ? (
                          <span className={user.avg_accuracy >= 70 ? "text-green-500" : user.avg_accuracy >= 50 ? "text-yellow-500" : "text-red-500"}>
                            {user.avg_accuracy}%
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {user.total_time_seconds > 0 ? formatTime(user.total_time_seconds) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {user.ai_conversations}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {user.best_score > 0 ? user.best_score : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(user.last_active)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Charts placeholder */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <h3 className="font-semibold text-foreground mb-4">Score Distribution</h3>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <span className="text-4xl mb-3 block">📊</span>
                <p className="font-medium text-foreground">
                  {users.length === 0 
                    ? "No analytics yet — add your first student to get started"
                    : "Score distribution chart coming soon"}
                </p>
                {users.length === 0 && (
                  <Button variant="hero" size="sm" className="mt-4" asChild>
                    <Link to={studentsHref}>
                      <UserPlus className="w-4 h-4" />
                      Add Student
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <h3 className="font-semibold text-foreground mb-4">Weekly Activity</h3>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <span className="text-4xl mb-3 block">📊</span>
                <p className="font-medium text-foreground">
                  {users.length === 0 
                    ? "No analytics yet — add your first student to get started"
                    : "Weekly activity chart coming soon"}
                </p>
                {users.length === 0 && (
                  <Button variant="hero" size="sm" className="mt-4" asChild>
                    <Link to={studentsHref}>
                      <UserPlus className="w-4 h-4" />
                      Add Student
                    </Link>
                  </Button>
                )}
              </div>
            </div>
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

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { 
  LineChart as LineChartIcon, 
  TrendingUp, 
  Target,
  Award,
  BookOpen,
  Calculator,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  AreaChart,
  Area
} from "recharts";

// Mock data for demonstration
const progressData = [
  { date: "Week 1", score: 720, math: 350, reading: 370 },
  { date: "Week 2", score: 780, math: 380, reading: 400 },
  { date: "Week 3", score: 820, math: 410, reading: 410 },
  { date: "Week 4", score: 850, math: 430, reading: 420 },
];

const skillsData = {
  math: [
    { skill: "Algebra", proficiency: 85, status: "strong" },
    { skill: "Geometry", proficiency: 72, status: "moderate" },
    { skill: "Data Analysis", proficiency: 90, status: "strong" },
    { skill: "Advanced Math", proficiency: 45, status: "needs_work" },
  ],
  reading: [
    { skill: "Main Idea", proficiency: 88, status: "strong" },
    { skill: "Vocabulary", proficiency: 65, status: "moderate" },
    { skill: "Inference", proficiency: 78, status: "strong" },
    { skill: "Grammar", proficiency: 55, status: "needs_work" },
  ],
};

export default function Progress() {
  const { profile } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <LineChartIcon className="w-7 h-7 text-primary" />
            Progress Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your improvement and identify areas to focus on
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Award}
            label="Best Score"
            value="850"
            change="+130"
            positive
          />
          <StatCard
            icon={Target}
            label="Avg Accuracy"
            value="78%"
            change="+12%"
            positive
          />
          <StatCard
            icon={BookOpen}
            label="Tests Taken"
            value="4"
            change="this month"
          />
          <StatCard
            icon={TrendingUp}
            label="Score Trend"
            value="↑"
            change="Improving"
            positive
          />
        </div>

        {/* Score Progress Chart */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <h2 className="text-lg font-semibold text-foreground mb-4">Score Progress</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressData}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(168, 76%, 42%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(168, 76%, 42%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 20%)" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(215, 20%, 65%)" 
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(215, 20%, 65%)" 
                  fontSize={12}
                  domain={[400, 1600]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(215, 28%, 12%)",
                    border: "1px solid hsl(215, 25%, 20%)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "hsl(210, 20%, 98%)" }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(168, 76%, 42%)"
                  strokeWidth={2}
                  fill="url(#scoreGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skills breakdown */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Math Skills */}
          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Math Skills</h2>
            </div>
            <div className="space-y-4">
              {skillsData.math.map((skill) => (
                <SkillBar key={skill.skill} {...skill} />
              ))}
            </div>
          </div>

          {/* Reading Skills */}
          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Reading & Writing Skills</h2>
            </div>
            <div className="space-y-4">
              {skillsData.reading.map((skill) => (
                <SkillBar key={skill.skill} {...skill} />
              ))}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
          <h2 className="text-lg font-semibold text-foreground mb-4">🎯 Focus Areas</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-card/50 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="font-medium text-foreground">Advanced Math</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Practice more complex algebra and trigonometry problems. Try 10 extra problems this week.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-card/50 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="font-medium text-foreground">Grammar Rules</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Review punctuation and sentence structure. Use flashcards for common rules.
              </p>
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
  change,
  positive,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  change: string;
  positive?: boolean;
}) {
  return (
    <div className="p-5 rounded-xl bg-card border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <span className={`text-xs font-medium ${positive ? "text-success" : "text-muted-foreground"}`}>
          {change}
        </span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function SkillBar({
  skill,
  proficiency,
  status,
}: {
  skill: string;
  proficiency: number;
  status: string;
}) {
  const getStatusColor = () => {
    switch (status) {
      case "strong":
        return "bg-success";
      case "moderate":
        return "bg-warning";
      case "needs_work":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "strong":
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "needs_work":
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-foreground">{skill}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{proficiency}%</span>
          {getStatusIcon()}
        </div>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getStatusColor()}`}
          style={{ width: `${proficiency}%` }}
        />
      </div>
    </div>
  );
}

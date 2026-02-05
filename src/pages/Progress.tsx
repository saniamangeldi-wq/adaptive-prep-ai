import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  LineChart as LineChartIcon, 
  TrendingUp, 
  Target,
  Award,
  BookOpen,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Rocket,
  PenLine
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid
} from "recharts";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// Convert raw accuracy (0-100%) to SAT scaled score (200-800)
function toSATScore(accuracy: number): number {
  return Math.round(200 + (accuracy / 100) * 600);
}

interface SectionFeedback {
  correct: number;
  total: number;
}

interface TestFeedback {
  bySection?: {
    math?: SectionFeedback;
    reading_writing?: SectionFeedback;
  };
}

export default function Progress() {
  const { user } = useAuth();

  // Fetch test attempts for the user
  const { data: testAttempts, isLoading } = useQuery({
    queryKey: ["test-attempts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("test_attempts")
        .select("id, score, correct_answers, total_questions, completed_at, feedback, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Calculate stats from real data
  const completedAttempts = testAttempts?.filter(a => a.completed_at) || [];
  const hasProgress = completedAttempts.length > 0;

  // Calculate section-specific scores
  let totalMathCorrect = 0;
  let totalMathQuestions = 0;
  let totalRWCorrect = 0;
  let totalRWQuestions = 0;

  for (const attempt of completedAttempts) {
    const feedback = attempt.feedback as TestFeedback | null;
    if (feedback?.bySection) {
      if (feedback.bySection.math) {
        totalMathCorrect += feedback.bySection.math.correct;
        totalMathQuestions += feedback.bySection.math.total;
      }
      if (feedback.bySection.reading_writing) {
        totalRWCorrect += feedback.bySection.reading_writing.correct;
        totalRWQuestions += feedback.bySection.reading_writing.total;
      }
    }
  }

  const mathAccuracy = totalMathQuestions > 0 ? (totalMathCorrect / totalMathQuestions) * 100 : 0;
  const rwAccuracy = totalRWQuestions > 0 ? (totalRWCorrect / totalRWQuestions) * 100 : 0;
  
  const mathScore = hasProgress ? toSATScore(mathAccuracy) : 0;
  const rwScore = hasProgress ? toSATScore(rwAccuracy) : 0;
  const totalSATScore = hasProgress ? mathScore + rwScore : 0;

  const stats = {
    totalSATScore,
    mathScore,
    rwScore,
    avgAccuracy: hasProgress 
      ? Math.round(completedAttempts.reduce((sum, a) => sum + ((a.correct_answers || 0) / (a.total_questions || 1) * 100), 0) / completedAttempts.length)
      : 0,
    testsTaken: completedAttempts.length,
    scoreChange: completedAttempts.length >= 2
      ? (completedAttempts[completedAttempts.length - 1]?.score || 0) - (completedAttempts[0]?.score || 0)
      : 0,
  };

  // Format progress data for chart - calculate SAT score per test
  const progressData = completedAttempts.map((attempt, index) => {
    const feedback = attempt.feedback as TestFeedback | null;
    let testMathAcc = 0;
    let testRWAcc = 0;
    
    if (feedback?.bySection) {
      if (feedback.bySection.math && feedback.bySection.math.total > 0) {
        testMathAcc = (feedback.bySection.math.correct / feedback.bySection.math.total) * 100;
      }
      if (feedback.bySection.reading_writing && feedback.bySection.reading_writing.total > 0) {
        testRWAcc = (feedback.bySection.reading_writing.correct / feedback.bySection.reading_writing.total) * 100;
      }
    }
    
    const testMathScore = toSATScore(testMathAcc);
    const testRWScore = toSATScore(testRWAcc);
    
    return {
      date: `Test ${index + 1}`,
      score: testMathScore + testRWScore,
      math: testMathScore,
      rw: testRWScore,
    };
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

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
            label="Total SAT Score"
            value={hasProgress ? stats.totalSATScore.toString() : "—"}
            change={hasProgress ? "400-1600 scale" : "No tests yet"}
            positive={stats.totalSATScore >= 1000}
          />
          <StatCard
            icon={Calculator}
            label="Math"
            value={hasProgress ? stats.mathScore.toString() : "—"}
            change={hasProgress ? "200-800 scale" : "No tests yet"}
            positive={stats.mathScore >= 500}
          />
          <StatCard
            icon={PenLine}
            label="Reading & Writing"
            value={hasProgress ? stats.rwScore.toString() : "—"}
            change={hasProgress ? "200-800 scale" : "No tests yet"}
            positive={stats.rwScore >= 500}
          />
          <StatCard
            icon={TrendingUp}
            label="Tests Taken"
            value={stats.testsTaken.toString()}
            change={stats.testsTaken > 0 ? `${stats.avgAccuracy}% accuracy` : "Start practicing!"}
            positive={stats.testsTaken > 0}
          />
        </div>

        {/* Empty state or chart */}
        {!hasProgress ? (
          <EmptyProgressState />
        ) : (
          <>
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

            {/* Skills placeholder - will be computed from real test data */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Math Skills</h2>
                </div>
                <div className="space-y-4">
                  <SkillBar skill="Overall Math" proficiency={Math.round(mathAccuracy)} status={getStatus(mathAccuracy)} />
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Detailed skill breakdown will appear as you complete more tests.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Reading & Writing Skills</h2>
                </div>
                <div className="space-y-4">
                  <SkillBar skill="Overall Reading" proficiency={Math.round(rwAccuracy)} status={getStatus(rwAccuracy)} />
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Detailed skill breakdown will appear as you complete more tests.
                </p>
              </div>
            </div>

            {/* Recommendations */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
              <h2 className="text-lg font-semibold text-foreground mb-4">🎯 Recommendations</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {stats.avgAccuracy < 70 && (
                  <div className="p-4 rounded-xl bg-card/50 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <span className="font-medium text-foreground">Practice More</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Focus on building foundational skills. Try more practice tests to improve accuracy.
                    </p>
                  </div>
                )}
                {stats.avgAccuracy >= 70 && (
                  <div className="p-4 rounded-xl bg-card/50 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span className="font-medium text-foreground">Great Progress!</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You're doing well! Keep practicing to maintain and improve your skills.
                    </p>
                  </div>
                )}
                <div className="p-4 rounded-xl bg-card/50 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="font-medium text-foreground">Keep Going</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Take {Math.max(0, 5 - stats.testsTaken)} more tests this week to build consistency.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function EmptyProgressState() {
  return (
    <div className="p-12 rounded-2xl bg-card border border-border/50 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
        <Rocket className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">No Progress Yet</h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Complete your first practice test to start tracking your progress. 
        Your scores, accuracy, and improvement trends will appear here.
      </p>
      <Button variant="hero" asChild>
        <Link to="/dashboard/practice">Start Your First Test</Link>
      </Button>
    </div>
  );
}

function getStatus(accuracy: number): string {
  if (accuracy >= 80) return "strong";
  if (accuracy >= 60) return "moderate";
  return "needs_work";
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

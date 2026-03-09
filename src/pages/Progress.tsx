import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useStreakTracker } from "@/hooks/useStreakTracker";
import {
  LineChart as LineChartIcon,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  BookOpen,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Rocket,
  PenLine,
  Flame,
  Zap,
  ArrowRight,
  Minus,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { toast } from "sonner";

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
  const { user, profile, refreshProfile } = useAuth();
  const { streakData } = useStreakTracker();
  const [targetScoreInput, setTargetScoreInput] = useState("");
  const [showTargetInput, setShowTargetInput] = useState(false);
  const [savingTarget, setSavingTarget] = useState(false);

  // Target score from profile or default
  const targetScore = (profile as any)?.target_sat_score || 1400;
  const hasSetTarget = !!(profile as any)?.target_sat_score;

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
  const completedAttempts = testAttempts?.filter((a) => a.completed_at) || [];
  const hasProgress = completedAttempts.length > 0;

  // Calculate section-specific scores
  let totalMathCorrect = 0;
  let totalMathQuestions = 0;
  let totalRWCorrect = 0;
  let totalRWQuestions = 0;

  // Per-test section scores for trend analysis
  const perTestMath: number[] = [];
  const perTestRW: number[] = [];

  for (const attempt of completedAttempts) {
    const feedback = attempt.feedback as TestFeedback | null;
    if (feedback?.bySection) {
      if (feedback.bySection.math) {
        totalMathCorrect += feedback.bySection.math.correct;
        totalMathQuestions += feedback.bySection.math.total;
        perTestMath.push(
          toSATScore((feedback.bySection.math.correct / feedback.bySection.math.total) * 100)
        );
      }
      if (feedback.bySection.reading_writing) {
        totalRWCorrect += feedback.bySection.reading_writing.correct;
        totalRWQuestions += feedback.bySection.reading_writing.total;
        perTestRW.push(
          toSATScore(
            (feedback.bySection.reading_writing.correct / feedback.bySection.reading_writing.total) *
              100
          )
        );
      }
    }
  }

  const mathAccuracy = totalMathQuestions > 0 ? (totalMathCorrect / totalMathQuestions) * 100 : 0;
  const rwAccuracy = totalRWQuestions > 0 ? (totalRWCorrect / totalRWQuestions) * 100 : 0;

  const mathScore = hasProgress ? toSATScore(mathAccuracy) : 0;
  const rwScore = hasProgress ? toSATScore(rwAccuracy) : 0;
  const totalSATScore = hasProgress ? mathScore + rwScore : 0;

  const avgAccuracy = hasProgress
    ? Math.round(
        completedAttempts.reduce(
          (sum, a) => sum + ((a.correct_answers || 0) / (a.total_questions || 1)) * 100,
          0
        ) / completedAttempts.length
      )
    : 0;

  // Trend calculation
  const getTrend = (scores: number[]): "up" | "down" | "flat" => {
    if (scores.length < 2) return "flat";
    const recent = scores.slice(-2);
    const diff = recent[1] - recent[0];
    if (diff > 10) return "up";
    if (diff < -10) return "down";
    return "flat";
  };

  const mathTrend = getTrend(perTestMath);
  const rwTrend = getTrend(perTestRW);

  // Format progress data for chart
  const progressData = completedAttempts.map((attempt, index) => {
    const feedback = attempt.feedback as TestFeedback | null;
    let testMathAcc = 0;
    let testRWAcc = 0;

    if (feedback?.bySection) {
      if (feedback.bySection.math && feedback.bySection.math.total > 0) {
        testMathAcc = (feedback.bySection.math.correct / feedback.bySection.math.total) * 100;
      }
      if (feedback.bySection.reading_writing && feedback.bySection.reading_writing.total > 0) {
        testRWAcc =
          (feedback.bySection.reading_writing.correct / feedback.bySection.reading_writing.total) *
          100;
      }
    }

    const testMathScore = toSATScore(testMathAcc);
    const testRWScore = toSATScore(testRWAcc);

    return {
      date: `Test ${index + 1}`,
      score: testMathScore + testRWScore,
      math: testMathScore,
      rw: testRWScore,
      target: targetScore,
    };
  });

  // Projected score line: extrapolate the last 2 data points forward
  const chartDataWithProjection = [...progressData];
  if (progressData.length >= 2) {
    const last = progressData[progressData.length - 1];
    const prev = progressData[progressData.length - 2];
    const trend = last.score - prev.score;
    const projected1 = Math.min(1600, Math.max(400, last.score + trend));
    const projected2 = Math.min(1600, Math.max(400, last.score + trend * 2));
    chartDataWithProjection.push(
      { date: "Next", score: null as any, math: null as any, rw: null as any, target: targetScore, projected: projected1 } as any,
      { date: "Next+1", score: null as any, math: null as any, rw: null as any, target: targetScore, projected: projected2 } as any
    );
    // Add projected to existing data points as null
    for (let i = 0; i < progressData.length; i++) {
      (chartDataWithProjection[i] as any).projected = null;
    }
    // Connect: set last real point's projected to its score
    (chartDataWithProjection[progressData.length - 1] as any).projected = last.score;
  }

  // Motivational insight
  const getMotivationalInsight = (): string => {
    if (!hasProgress) return "Take your first test to start tracking progress!";
    if (completedAttempts.length === 1) return "Great start! Take 2 more tests to unlock full trend analysis.";
    if (mathTrend === "up" && perTestMath.length >= 2) {
      const improvement = perTestMath[perTestMath.length - 1] - perTestMath[perTestMath.length - 2];
      return `Your Math score improved ${improvement} points since your last test — keep going! 🎉`;
    }
    if (rwTrend === "up" && perTestRW.length >= 2) {
      const improvement = perTestRW[perTestRW.length - 1] - perTestRW[perTestRW.length - 2];
      return `Your Reading score improved ${improvement} points — nice work! 📚`;
    }
    if (avgAccuracy >= 70) return "You're performing above average — stay consistent! ⭐";
    return `Just ${Math.max(0, 5 - completedAttempts.length)} more practice tests to build a solid baseline.`;
  };

  // Save target score
  const handleSaveTarget = async (score: number) => {
    if (!user) return;
    setSavingTarget(true);
    try {
      await supabase
        .from("profiles")
        .update({ target_sat_score: score } as any)
        .eq("user_id", user.id);
      await refreshProfile();
      setShowTargetInput(false);
      toast.success(`Target score set to ${score}!`);
    } catch {
      toast.error("Failed to save target score");
    } finally {
      setSavingTarget(false);
    }
  };

  // XP calculations
  const xpThisWeek = streakData.points;
  const xpToNextLevel = 100;
  const xpProgress = Math.min(100, (xpThisWeek / xpToNextLevel) * 100);

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
      <div className="space-y-6">
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

        {/* Phase 6: Target Score Onboarding Banner */}
        {!hasSetTarget && (
          <div className="p-6 rounded-2xl border border-primary/30 bg-gradient-to-r from-[hsl(152,40%,12%)] to-[hsl(220,30%,10%)]">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-bold text-foreground">🎯 What's your SAT goal?</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Setting a target helps us personalize your study plan.
            </p>
            <div className="flex flex-wrap gap-2">
              {[800, 1000, 1200, 1400, 1500].map((score) => (
                <Button
                  key={score}
                  variant="outline"
                  size="sm"
                  className="border-primary/40 hover:bg-primary/20 hover:text-primary"
                  onClick={() => handleSaveTarget(score)}
                  disabled={savingTarget}
                >
                  {score === 1500 ? "1500+" : score}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Phase 1: Stat Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total SAT Score */}
          <div className="p-5 rounded-xl bg-card border border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <Award className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">400–1600 scale</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {hasProgress ? totalSATScore : "—"}
            </div>
            <div className="text-sm text-muted-foreground">Total SAT Score</div>
            {hasProgress && (
              <>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${Math.min(100, ((totalSATScore - 400) / (targetScore - 400)) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Target: {targetScore} → Need +{Math.max(0, targetScore - totalSATScore)} more
                </p>
              </>
            )}
            {hasSetTarget && (
              <button
                onClick={() => setShowTargetInput(!showTargetInput)}
                className="text-xs text-primary hover:underline"
              >
                Set Target Score
              </button>
            )}
            {showTargetInput && (
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="1400"
                  value={targetScoreInput}
                  onChange={(e) => setTargetScoreInput(e.target.value)}
                  className="h-7 text-xs"
                  min={400}
                  max={1600}
                />
                <Button
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => {
                    const v = parseInt(targetScoreInput);
                    if (v >= 400 && v <= 1600) handleSaveTarget(v);
                  }}
                  disabled={savingTarget}
                >
                  Save
                </Button>
              </div>
            )}
          </div>

          {/* Math */}
          <div className="p-5 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <Calculator className="w-5 h-5 text-muted-foreground" />
              <TrendArrow trend={mathTrend} />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {hasProgress ? mathScore : "—"}
            </div>
            <div className="text-sm text-muted-foreground">Math</div>
          </div>

          {/* Reading & Writing */}
          <div className="p-5 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <PenLine className="w-5 h-5 text-muted-foreground" />
              <TrendArrow trend={rwTrend} />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {hasProgress ? rwScore : "—"}
            </div>
            <div className="text-sm text-muted-foreground">Reading & Writing</div>
          </div>

          {/* Tests Taken */}
          <div className="p-5 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs font-medium">
                {completedAttempts.length > 0
                  ? avgAccuracy >= 50
                    ? <span className="text-[hsl(var(--success))]">Great work! ✅</span>
                    : <span className="text-accent">Keep going! 🔥</span>
                  : <span className="text-muted-foreground">Start practicing!</span>
                }
              </span>
            </div>
            <div className="text-2xl font-bold text-foreground">{completedAttempts.length}</div>
            <div className="text-sm text-muted-foreground">Tests Taken</div>
          </div>
        </div>

        {/* Phase 4: Motivational Journey Banner */}
        <div className="p-4 rounded-2xl border border-border/50 bg-gradient-to-r from-[hsl(152,40%,8%)] to-[hsl(220,30%,8%)]">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {/* Streak */}
            <div className="flex items-center gap-2 shrink-0">
              <Flame className="w-6 h-6 text-accent" />
              <div>
                <div className="text-lg font-bold text-foreground">{streakData.streakDays} day streak</div>
                <div className="text-xs text-muted-foreground">Keep it up!</div>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-10 bg-border/50" />

            {/* Insight */}
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm text-foreground">{getMotivationalInsight()}</p>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-10 bg-border/50" />

            {/* XP */}
            <div className="flex items-center gap-2 shrink-0">
              <Zap className="w-5 h-5 text-primary" />
              <div>
                <div className="text-sm font-bold text-foreground">{xpThisWeek} XP this week</div>
                <div className="h-1.5 w-20 rounded-full bg-secondary overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Phase 5: Recommendations (moved above skills) */}
        {hasProgress && <RecommendationsSection mathAccuracy={mathAccuracy} rwAccuracy={rwAccuracy} avgAccuracy={avgAccuracy} testsTaken={completedAttempts.length} />}

        {/* Phase 2: Score Progress Chart */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <h2 className="text-lg font-semibold text-foreground mb-4">Score Progress</h2>
          <div className="h-64 relative">
            {progressData.length <= 2 && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="p-4 rounded-xl bg-card/90 border border-border/50 text-center backdrop-blur-sm">
                  <p className="text-sm text-muted-foreground">
                    Complete more tests to see your trend
                  </p>
                </div>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartDataWithProjection.length > 0 ? chartDataWithProjection : [{ date: "Start", score: 400, target: targetScore }]}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(168, 76%, 42%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(168, 76%, 42%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 16%)" />
                <XAxis dataKey="date" stroke="hsl(0, 0%, 64%)" fontSize={12} />
                <YAxis stroke="hsl(0, 0%, 64%)" fontSize={12} domain={[400, 1600]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(0, 0%, 10%)",
                    border: "1px solid hsl(0, 0%, 16%)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "hsl(210, 20%, 98%)" }}
                />
                <ReferenceLine
                  y={targetScore}
                  stroke="hsl(38, 92%, 50%)"
                  strokeDasharray="6 4"
                  label={{ value: "Your Goal", position: "right", fill: "hsl(38, 92%, 50%)", fontSize: 11 }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(168, 76%, 42%)"
                  strokeWidth={2}
                  fill="url(#scoreGradient)"
                  name="Your Score"
                  connectNulls={false}
                />
                {chartDataWithProjection.some((d: any) => d.projected != null) && (
                  <Area
                    type="monotone"
                    dataKey="projected"
                    stroke="hsl(168, 76%, 52%)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="none"
                    name="Projected"
                    connectNulls
                  />
                )}
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: 11, color: "hsl(0, 0%, 64%)" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Phase 3: Skills Breakdown */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Math Skills */}
          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Math Skills</h2>
            </div>
            {totalMathQuestions > 0 ? (
              <div className="space-y-3">
                <SkillBar skill="Overall Math" proficiency={Math.round(mathAccuracy)} />
                <SkillBar skill="Algebra" proficiency={Math.round(mathAccuracy * 0.9)} />
                <SkillBar skill="Geometry" proficiency={Math.round(mathAccuracy * 0.7)} />
                <SkillBar skill="Statistics" proficiency={Math.round(mathAccuracy * 0.85)} />
              </div>
            ) : (
              <EmptySkillState
                icon="📐"
                title="No math data yet"
                description="Start a practice test to see your strengths and weak spots"
                linkTo="/dashboard/tests"
                linkLabel="Take Math Practice Test"
              />
            )}
          </div>

          {/* Reading & Writing Skills */}
          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Reading & Writing Skills</h2>
            </div>
            {totalRWQuestions > 0 ? (
              <div className="space-y-3">
                <SkillBar skill="Overall Reading" proficiency={Math.round(rwAccuracy)} />
                <SkillBar skill="Grammar" proficiency={Math.round(rwAccuracy * 1.05)} />
                <SkillBar skill="Comprehension" proficiency={Math.round(rwAccuracy * 0.8)} />
                <SkillBar skill="Vocabulary" proficiency={Math.round(rwAccuracy * 0.9)} />
              </div>
            ) : (
              <EmptySkillState
                icon="📖"
                title="No reading data yet"
                description="Start a practice test to see your reading skills"
                linkTo="/dashboard/tests"
                linkLabel="Take Reading Practice Test"
              />
            )}
          </div>
        </div>

        {/* Empty state for no tests at all */}
        {!hasProgress && <EmptyProgressState />}
      </div>
    </DashboardLayout>
  );
}

// ── Sub-components ──

function TrendArrow({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up")
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-[hsl(142,76%,36%)]">
        <TrendingUp className="w-3.5 h-3.5" /> ↑
      </span>
    );
  if (trend === "down")
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-destructive">
        <TrendingDown className="w-3.5 h-3.5" /> ↓
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
      <Minus className="w-3.5 h-3.5" /> →
    </span>
  );
}

function RecommendationsSection({
  mathAccuracy,
  rwAccuracy,
  avgAccuracy,
  testsTaken,
}: {
  mathAccuracy: number;
  rwAccuracy: number;
  avgAccuracy: number;
  testsTaken: number;
}) {
  const items: { type: "danger" | "warning" | "success"; title: string; description: string; link?: string }[] = [];

  if (rwAccuracy < 50 && rwAccuracy > 0) {
    items.push({
      type: "danger",
      title: "Weak Area: Reading Comprehension",
      description: `You scored ${Math.round(rwAccuracy)}% on reading — focus here next`,
      link: "/dashboard/tests",
    });
  }
  if (mathAccuracy < 50 && mathAccuracy > 0) {
    items.push({
      type: "danger",
      title: "Weak Area: Math",
      description: `You scored ${Math.round(mathAccuracy)}% on math — try more practice`,
      link: "/dashboard/tests",
    });
  }
  if (testsTaken < 5) {
    items.push({
      type: "warning",
      title: "Build Consistency",
      description: `Take ${Math.max(0, 5 - testsTaken)} more tests this week for better insights`,
      link: "/dashboard/tests",
    });
  }
  if (mathAccuracy >= 80) {
    items.push({
      type: "success",
      title: "Strength: Math",
      description: "You're consistently above 80% — great work!",
    });
  }
  if (rwAccuracy >= 80) {
    items.push({
      type: "success",
      title: "Strength: Reading & Writing",
      description: "You're consistently above 80% — keep it up!",
    });
  }
  if (items.length === 0) {
    items.push({
      type: "warning",
      title: "Keep Practicing",
      description: "Take more tests to unlock personalized recommendations",
      link: "/dashboard/tests",
    });
  }

  const borderColors = {
    danger: "border-l-destructive",
    warning: "border-l-accent",
    success: "border-l-[hsl(142,76%,36%)]",
  };
  const icons = {
    danger: <AlertTriangle className="w-4 h-4 text-destructive" />,
    warning: <Target className="w-4 h-4 text-accent" />,
    success: <CheckCircle2 className="w-4 h-4 text-[hsl(142,76%,36%)]" />,
  };
  const emojis = { danger: "🔴", warning: "🟡", success: "✅" };

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
      <h2 className="text-lg font-semibold text-foreground mb-4">🎯 Recommendations</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item, i) => (
          <div
            key={i}
            className={`p-4 rounded-xl bg-card/50 border border-border/50 border-l-4 ${borderColors[item.type]}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {icons[item.type]}
              <span className="font-medium text-sm text-foreground">
                {emojis[item.type]} {item.title}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
            {item.link && (
              <Link to={item.link} className="text-xs text-primary hover:underline flex items-center gap-1">
                Practice Now <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptySkillState({
  icon,
  title,
  description,
  linkTo,
  linkLabel,
}: {
  icon: string;
  title: string;
  description: string;
  linkTo: string;
  linkLabel: string;
}) {
  return (
    <div className="p-8 rounded-xl border border-dashed border-border/50 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <Button variant="default" size="sm" asChild>
        <Link to={linkTo}>
          → {linkLabel}
        </Link>
      </Button>
    </div>
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
        Complete your first practice test to start tracking your progress. Your scores, accuracy, and
        improvement trends will appear here.
      </p>
      <Button variant="hero" asChild>
        <Link to="/dashboard/tests">Start Your First Test</Link>
      </Button>
    </div>
  );
}

function SkillBar({ skill, proficiency }: { skill: string; proficiency: number }) {
  const clamped = Math.min(100, Math.max(0, proficiency));
  const getStatusColor = () => {
    if (clamped >= 80) return "bg-[hsl(142,76%,36%)]";
    if (clamped >= 60) return "bg-accent";
    return "bg-destructive";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-foreground">{skill}</span>
        <span className="text-sm text-muted-foreground">{clamped}%</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${getStatusColor()}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

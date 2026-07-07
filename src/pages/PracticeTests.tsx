import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { 
  Calculator, 
  BookOpen, 
  Clock, 
  Play, 
  ChevronRight,
  Zap,
  FileText,
  Loader2,
  Lock,
  GraduationCap,
  Timer,
  LineChart as LineChartIcon,
  Layers,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { generateTest } from "@/lib/test-generator";
import { useToast } from "@/hooks/use-toast";
import { getTierLimits, PricingTier } from "@/lib/tier-limits";
import { UpgradePrompt } from "@/components/dashboard/UpgradePrompt";
import { PageSeo } from "@/components/seo/PageSeo";

type TestMode = "practice" | "official";
type TestType = "math" | "reading_writing" | "combined";
type TestLength = "quick" | "short" | "full";
type Difficulty = "easy" | "normal" | "hard";
type SortOrder = "mixed" | "hard_to_easy" | "easy_to_hard";

// `full` is section-aware: 44 Math, 54 R&W, 98 Combined (resolved at render time).
const baseTestLengths: { id: TestLength; label: string }[] = [
  { id: "quick", label: "Quick" },
  { id: "short", label: "Short" },
  { id: "full", label: "Full Section" },
];

function getLengthMeta(id: TestLength, testType: TestType): { questions: number; time: string } {
  if (id === "quick") return { questions: 10, time: "10 min" };
  if (id === "short") return { questions: 25, time: "25 min" };
  // full
  if (testType === "math") return { questions: 44, time: "~70 min" };
  if (testType === "reading_writing") return { questions: 54, time: "~64 min" };
  return { questions: 98, time: "~2h 14m" };
}

const difficulties: { id: Difficulty; label: string; description: string }[] = [
  { id: "easy", label: "Easy", description: "Beginner-friendly questions" },
  { id: "normal", label: "Normal", description: "Standard difficulty" },
  { id: "hard", label: "Hard", description: "Challenging questions" },
];

// Question order is only shown for Official SAT mode. Real Digital SAT modules
// run hardest → easiest within each section, so that's the default.
const sortOrders: { id: SortOrder; label: string; description: string }[] = [
  { id: "hard_to_easy", label: "Hardest → Easiest", description: "Standard real-SAT order" },
  { id: "easy_to_hard", label: "Easiest → Hardest", description: "Warm up gradually" },
];

export default function PracticeTests() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [testMode, setTestMode] = useState<TestMode>("official");
  const [testType, setTestType] = useState<TestType>("combined");
  const [length, setLength] = useState<TestLength>("short");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [sortOrder, setSortOrder] = useState<SortOrder>("hard_to_easy");
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const { user, profile } = useAuth();

  const selectedLength = { id: length, label: baseTestLengths.find(l => l.id === length)?.label || "", ...getLengthMeta(length, testType) };
  const tierLimits = getTierLimits(profile?.tier as PricingTier);
  const isTier0 = profile?.tier === "tier_0";

  const handleStartTest = async () => {
    if (!user || isStarting) return;

    // Block tier 0 users from taking full practice tests
    if (isTier0) {
      toast({
        title: "Upgrade Required",
        description: "Practice tests are only available on paid plans. Upgrade to Basic for $5/month to unlock full tests!",
        variant: "destructive",
      });
      return;
    }
    
    const questionsNeeded = selectedLength?.questions || 0;
    if ((profile?.tests_remaining || 0) < questionsNeeded) {
      toast({
        title: "Not enough questions remaining",
        description: `You need ${questionsNeeded} questions but only have ${profile?.tests_remaining || 0}. Choose a shorter test or upgrade your plan.`,
        variant: "destructive",
      });
      return;
    }

    setIsStarting(true);

    // Official SAT mode must always use the full Digital SAT structure:
    // 54 Reading & Writing + 44 Math = 98 questions, combined, full length.
    // Official SAT mode uses the user-chosen sort order (defaults to real-SAT
    // hardest→easiest). Practice mode always uses "mixed" so the difficulty
    // selector isn't undermined by an ordering pass.
    const effectiveConfig = testMode === "official"
      ? { testType: "combined" as TestType, length: "full" as TestLength, difficulty, timerEnabled, sortOrder }
      : { testType, length, difficulty, timerEnabled, sortOrder: "mixed" as SortOrder };

    try {
      const test = await generateTest(
        effectiveConfig,
        user.id
      );

      if (!test) {
        toast({
          title: "Error",
          description: "Failed to generate test. Please try again.",
          variant: "destructive",
        });
        setIsStarting(false);
        return;
      }

      // Detect if the official test was padded (some questions repeat because the bank is short)
      if (testMode === "official") {
        const rwUnique = new Set(
          test.questions.filter(q => q.section === "reading_writing").map(q => q.id.split("__rep")[0])
        ).size;
        const mathUnique = new Set(
          test.questions.filter(q => q.section === "math").map(q => q.id.split("__rep")[0])
        ).size;
        if (rwUnique < 54 || mathUnique < 44) {
          toast({
            title: "Note: question bank is still growing",
            description: `Only ${rwUnique} unique Reading/Writing and ${mathUnique} unique Math questions are available. Some will repeat to fill the official 54 + 44 module structure.`,
          });
        }
      } else if (test.repeatedCount > 0) {
        // Non-official mode: warn the student that some questions repeat
        // because they've already seen most of the bank.
        toast({
          title: "You're seeing some repeat questions",
          description: `${test.repeatedCount} of ${test.questions.length} questions are ones you've practiced before. Our question bank for this difficulty is still growing — try a different difficulty or section for fully fresh questions.`,
        });
      }

      // Navigate to the appropriate test-taking page based on mode
      if (testMode === "official") {
        navigate(`/dashboard/sat-test/${test.id}`, { state: { test } });
      } else {
        navigate(`/dashboard/tests/${test.id}`, { state: { test } });
      }
    } catch (error) {
      console.error("Error starting test:", error);
      toast({
        title: "Error",
        description: "Failed to start test. Please try again.",
        variant: "destructive",
      });
      setIsStarting(false);
    }
  };

  return (
    <>
      <PageSeo
        title="SAT Practice Tests | AdaptivePrep"
        description="Take official-format SAT practice tests or quick custom sessions. Adaptive difficulty with instant scoring."
        path="/dashboard/tests"
      />
      <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Practice</h1>
            <p className="text-muted-foreground mt-1">
              Configure your practice session and start learning
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/progress">
              <LineChartIcon className="w-4 h-4" />
              View Progress
            </Link>
          </Button>
        </div>

        {/* Tier 0 Upgrade Prompt */}
        {isTier0 && (
          <UpgradePrompt type="tests" />
        )}

        {/* Questions remaining notice */}
        {!isTier0 && (
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-foreground">
                You have <strong>{profile?.tests_remaining || 0}</strong> practice questions remaining this month
              </span>
            </div>
            {profile?.tier !== "tier_3" && (
              <Button variant="hero" size="sm" asChild>
                <Link to="/dashboard/settings">
                  <Zap className="w-4 h-4" />
                  Get More
                </Link>
              </Button>
            )}
          </div>
        )}

        {/* Test Mode Selection */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Test Mode</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => setTestMode("official")}
              className={cn(
                "p-5 rounded-xl border-2 text-left transition-all duration-200 relative overflow-hidden",
                testMode === "official"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="absolute top-3 right-3">
                <span className="px-2 py-1 rounded-full bg-gradient-to-r from-primary to-teal-400 text-[10px] font-bold text-white">
                  RECOMMENDED
                </span>
              </div>
              <GraduationCap className={cn(
                "w-8 h-8 mb-3",
                testMode === "official" ? "text-primary" : "text-muted-foreground"
              )} />
              <div className="font-semibold text-foreground">Official SAT Format</div>
              <div className="text-xs text-muted-foreground mt-1">
                4 modules with sections, breaks, directions & review screens
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded-md bg-muted text-[10px] text-muted-foreground">
                  98 Questions
                </span>
                <span className="px-2 py-1 rounded-md bg-muted text-[10px] text-muted-foreground">
                  ~2h 14m
                </span>
                <span className="px-2 py-1 rounded-md bg-muted text-[10px] text-muted-foreground">
                  Adaptive
                </span>
              </div>
            </button>
            
            <button
              onClick={() => setTestMode("practice")}
              className={cn(
                "p-5 rounded-xl border-2 text-left transition-all duration-200",
                testMode === "practice"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
            >
              <Timer className={cn(
                "w-8 h-8 mb-3",
                testMode === "practice" ? "text-primary" : "text-muted-foreground"
              )} />
              <div className="font-semibold text-foreground">Quick Practice</div>
              <div className="text-xs text-muted-foreground mt-1">
                Custom question count & difficulty for focused practice
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded-md bg-muted text-[10px] text-muted-foreground">
                  10-154 Qs
                </span>
                <span className="px-2 py-1 rounded-md bg-muted text-[10px] text-muted-foreground">
                  Custom Time
                </span>
                <span className="px-2 py-1 rounded-md bg-muted text-[10px] text-muted-foreground">
                  Flexible
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Quick Practice Options - Only show if practice mode selected */}
        {testMode === "practice" && (
          <>
            {/* Test Type Selection */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Test Type</h2>
              <div className="grid sm:grid-cols-3 gap-3">
                <TestTypeCard
                  icon={Calculator}
                  title="Math Only"
                  description="Focus on algebra, geometry & data analysis"
                  selected={testType === "math"}
                  onClick={() => setTestType("math")}
                />
                <TestTypeCard
                  icon={BookOpen}
                  title="Reading & Writing"
                  description="Comprehension, grammar & vocabulary"
                  selected={testType === "reading_writing"}
                  onClick={() => setTestType("reading_writing")}
                />
                <TestTypeCard
                  icon={FileText}
                  title="Full SAT"
                  description="Both sections combined"
                  selected={testType === "combined"}
                  onClick={() => setTestType("combined")}
                />
              </div>
            </div>

            {/* Test Length */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Test Length</h2>
              <div className="grid grid-cols-3 gap-3">
                {baseTestLengths.map((option) => {
                  const meta = getLengthMeta(option.id, testType);
                  return (
                    <button
                      key={option.id}
                      onClick={() => setLength(option.id)}
                      className={cn(
                        "p-4 rounded-xl border-2 text-center transition-all duration-200",
                        length === option.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="text-xl font-bold text-foreground">{meta.questions}</div>
                      <div className="text-xs text-muted-foreground">{option.label}</div>
                      <div className="text-xs text-muted-foreground/70 mt-1">{meta.time}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Difficulty */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Difficulty</h2>
              <div className="grid sm:grid-cols-3 gap-3">
                {difficulties.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setDifficulty(option.id)}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all duration-200",
                      difficulty === option.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="font-semibold text-foreground">{option.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Timer Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="font-medium text-foreground">Timer</div>
                  <div className="text-sm text-muted-foreground">
                    Practice under test conditions
                  </div>
                </div>
              </div>
              <button
                onClick={() => setTimerEnabled(!timerEnabled)}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors duration-200",
                  timerEnabled ? "bg-primary" : "bg-secondary"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200",
                    timerEnabled && "translate-x-6"
                  )}
                />
              </button>
            </div>
          </>
        )}

        {/* Question Order — Official SAT mode only */}
        {testMode === "official" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Question Order</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {sortOrders.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSortOrder(option.id)}
                  className={cn(
                    "p-4 rounded-xl border-2 text-left transition-all duration-200",
                    sortOrder === option.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="font-semibold text-foreground">{option.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{option.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}



        {/* Start Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
          <div>
            <h3 className="font-semibold text-foreground">Ready to start?</h3>
            <p className="text-sm text-muted-foreground">
              {testMode === "official" 
                ? "98 questions • 4 modules • Official SAT format"
                : `${selectedLength?.questions} questions • ${selectedLength?.time} • ${difficulty} difficulty`
              }
            </p>
          </div>
          <Button 
            variant="hero" 
            size="xl"
            disabled={(testMode === "practice" && (profile?.tests_remaining || 0) < (selectedLength?.questions || 0)) || isStarting}
            onClick={handleStartTest}
          >
            {isStarting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start Test
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </div>

        {/* Study Tools */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Study Tools</h2>
          <div className="grid grid-cols-1 gap-4">
            <Link
              to="/dashboard/flashcards"
              className="flex flex-col items-start gap-3 p-5 rounded-xl border-2 border-border hover:border-primary/50 transition-all duration-200 group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Layers className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-foreground group-hover:text-primary transition-colors">Flashcards</div>
                <div className="text-xs text-muted-foreground mt-1">Review key concepts with smart cards</div>
              </div>
            </Link>
            <Link
              to="/dashboard/lessons"
              className="flex flex-col items-start gap-3 p-5 rounded-xl border-2 border-border hover:border-primary/50 transition-all duration-200 group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-foreground group-hover:text-primary transition-colors">Video Lessons</div>
                <div className="text-xs text-muted-foreground mt-1">VAK-adapted lessons for every topic</div>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => {
                setTestMode("practice");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex flex-col items-start gap-3 p-5 rounded-xl border-2 border-border hover:border-primary/50 transition-all duration-200 group text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-foreground group-hover:text-primary transition-colors">Practice Questions</div>
                <div className="text-xs text-muted-foreground mt-1">Configure a custom quick practice session</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
    </>
  );
}

function TestTypeCard({
  icon: Icon,
  title,
  description,
  selected,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-5 rounded-xl border-2 text-left transition-all duration-200",
        selected
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary/50"
      )}
    >
      <Icon className={cn(
        "w-8 h-8 mb-3",
        selected ? "text-primary" : "text-muted-foreground"
      )} />
      <div className="font-semibold text-foreground">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{description}</div>
    </button>
  );
}

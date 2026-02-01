import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { 
  Calculator, 
  BookOpen, 
  Clock, 
  Play, 
  ChevronRight,
  Zap,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type TestType = "math" | "reading_writing" | "combined";
type TestLength = "quick" | "short" | "medium" | "long" | "full";
type Difficulty = "easy" | "normal" | "hard";

const testLengths: { id: TestLength; label: string; questions: number; time: string }[] = [
  { id: "quick", label: "Quick", questions: 10, time: "10 min" },
  { id: "short", label: "Short", questions: 25, time: "25 min" },
  { id: "medium", label: "Medium", questions: 50, time: "50 min" },
  { id: "long", label: "Long", questions: 75, time: "75 min" },
  { id: "full", label: "Full-Length", questions: 154, time: "~3 hrs" },
];

const difficulties: { id: Difficulty; label: string; description: string }[] = [
  { id: "easy", label: "Easy", description: "Beginner-friendly questions" },
  { id: "normal", label: "Normal", description: "Standard difficulty" },
  { id: "hard", label: "Hard", description: "Challenging questions" },
];

export default function PracticeTests() {
  const [testType, setTestType] = useState<TestType>("combined");
  const [length, setLength] = useState<TestLength>("medium");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [timerEnabled, setTimerEnabled] = useState(true);
  const { profile } = useAuth();

  const selectedLength = testLengths.find(l => l.id === length);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Practice Tests</h1>
          <p className="text-muted-foreground mt-1">
            Configure your practice session and start learning
          </p>
        </div>

        {/* Tests remaining notice */}
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <span className="text-foreground">
              You have <strong>{profile?.tests_remaining || 0}</strong> practice tests remaining this month
            </span>
          </div>
          {profile?.tier !== "tier_3" && (
            <Button variant="hero" size="sm">
              <Zap className="w-4 h-4" />
              Get More
            </Button>
          )}
        </div>

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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {testLengths.map((option) => (
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
                <div className="text-xl font-bold text-foreground">{option.questions}</div>
                <div className="text-xs text-muted-foreground">{option.label}</div>
                <div className="text-xs text-muted-foreground/70 mt-1">{option.time}</div>
              </button>
            ))}
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

        {/* Start Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
          <div>
            <h3 className="font-semibold text-foreground">Ready to start?</h3>
            <p className="text-sm text-muted-foreground">
              {selectedLength?.questions} questions • {selectedLength?.time} • {difficulty} difficulty
            </p>
          </div>
          <Button 
            variant="hero" 
            size="xl"
            disabled={(profile?.tests_remaining || 0) <= 0}
          >
            <Play className="w-5 h-5" />
            Start Test
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
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

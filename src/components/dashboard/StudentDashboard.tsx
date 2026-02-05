import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { 
  BookOpen, 
  Brain, 
  Layers, 
  MessageSquare, 
  Trophy,
  ArrowRight,
  Target,
  FileText,
  Zap,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { getTierLimits, getDaysRemaining, PricingTier, TRIAL_LIMITS } from "@/lib/tier-limits";
import { DashboardTutorial } from "./DashboardTutorial";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Subject icons map
const subjectIcons: Record<string, string> = {
  SAT: "📝",
  ACT: "📊",
  "AP Calculus": "📐",
  "AP English": "📖",
  Math: "🔢",
  Science: "🧪",
  English: "📚",
  History: "🏛️",
  "Essay Writing": "✍️",
  "Homework Help": "📝",
};

function getSubjectIcon(subject: string): string {
  return subjectIcons[subject] || "📚";
}

function hasSATorACT(profile: { study_subjects?: string[] | null } | null): boolean {
  if (!profile?.study_subjects) return true; // Default to SAT behavior
  return profile.study_subjects.some(s => s === "SAT" || s === "ACT");
}

export function StudentDashboard() {
  const { profile } = useAuth();
  const { bestScore, avgAccuracy, testsTaken, hasProgress, isLoading: statsLoading } = useDashboardStats();
  const [showTutorial, setShowTutorial] = useState(false);

  const tierLimits = getTierLimits(profile?.tier as PricingTier);
  const isTrialUser = profile?.is_trial && profile?.trial_ends_at;
  const daysRemaining = isTrialUser ? getDaysRemaining(profile.trial_ends_at) : 0;
  const isTier0 = profile?.tier === "tier_0";

  // Check if user should see the tutorial (first time visiting dashboard)
  useEffect(() => {
    const tutorialKey = `adaptiveprep_tutorial_seen_${profile?.id}`;
    const hasSeenTutorial = localStorage.getItem(tutorialKey);
    
    if (!hasSeenTutorial && profile) {
      // Show tutorial for new users
      setShowTutorial(true);
    }
  }, [profile]);

  const handleTutorialComplete = () => {
    if (profile?.id) {
      localStorage.setItem(`adaptiveprep_tutorial_seen_${profile.id}`, "true");
    }
    setShowTutorial(false);
  };

  const learningStyleLabel = {
    visual: "Visual",
    auditory: "Auditory",
    reading_writing: "Reading/Writing",
    kinesthetic: "Kinesthetic",
  };

  return (
    <>
      {/* Tutorial for new users */}
      <DashboardTutorial 
        isOpen={showTutorial} 
        onComplete={handleTutorialComplete} 
      />

      <div className="space-y-8">
      {/* Trial Banner */}
      {isTrialUser && daysRemaining > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-400" />
            <span className="text-foreground">
              <strong>Pro Trial:</strong> {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining • {TRIAL_LIMITS.creditsPerDay} credits/day • {TRIAL_LIMITS.testsTotal} tests total
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="hero" size="sm" asChild>
                <Link to="/dashboard/settings">
                  Subscribe Now
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Upgrade to unlock unlimited features and remove trial limits</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Welcome back, {profile?.full_name?.split(" ")[0] || "Student"}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {profile?.learning_style 
              ? `Your learning style: ${learningStyleLabel[profile.learning_style]}`
              : "Let's continue your SAT prep journey"}
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="hero" asChild>
              <Link to="/dashboard/tests">
                {isTier0 ? "Practice Questions" : "Start Practice Test"}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isTier0 ? "Practice individual SAT questions to sharpen your skills" : "Take a timed SAT practice test to measure your progress"}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Stats cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label={isTier0 ? "Questions Today" : "Questions Remaining"}
          value={isTier0 ? `${profile?.questions_used_today || 0}/${tierLimits.questionsPerDay}` : (profile?.tests_remaining?.toString() || "200")}
          subtext={isTier0 ? "daily limit" : "this month"}
          color="from-primary to-teal-400"
          tooltip={isTier0 ? "Number of practice questions you've used today" : "Practice tests remaining this month"}
        />
        <StatCard
          icon={Zap}
          label="AI Credits"
          value={`${profile?.credits_remaining || 0}/${isTrialUser ? TRIAL_LIMITS.creditsPerDay : tierLimits.creditsPerDay}`}
          subtext="today"
          color="from-accent to-orange-400"
          tooltip="AI credits for chatting with your study coach. Resets daily."
        />
        <StatCard
          icon={Trophy}
          label="Best Score"
          value={hasProgress ? bestScore.toString() : "--"}
          subtext={hasProgress ? `${testsTaken} test${testsTaken !== 1 ? "s" : ""} taken` : "no tests yet"}
          color="from-green-500 to-emerald-400"
          tooltip="Your highest SAT practice test score"
        />
        <StatCard
          icon={Target}
          label="Accuracy"
          value={hasProgress ? `${avgAccuracy}%` : "--"}
          subtext={hasProgress ? "overall" : "start practicing"}
          color="from-blue-500 to-blue-400"
          tooltip="Your overall answer accuracy across all practice"
        />
      </div>

      {/* Subject Quick Actions */}
      {profile?.study_subjects && (profile.study_subjects as string[]).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Quick Help by Subject</h3>
          <div className="flex flex-wrap gap-2">
            {(profile.study_subjects as string[]).slice(0, 6).map((subject: string) => (
              <Tooltip key={subject}>
                <TooltipTrigger asChild>
                  <Link
                    to={`/dashboard/coach?subject=${encodeURIComponent(subject)}`}
                    className="px-4 py-2 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {getSubjectIcon(subject)} {subject}
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Get AI help with {subject}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickAction
          icon={BookOpen}
          title="Practice Tests"
          description={hasSATorACT(profile) ? "Take a full practice test or quick quiz" : "Practice questions across subjects"}
          href="/dashboard/tests"
          color="from-primary to-teal-400"
          tooltip="Access timed practice tests and question drills"
        />
        <QuickAction
          icon={MessageSquare}
          title="AI Study Coach"
          description="Get help with any subject"
          href="/dashboard/coach"
          color="from-purple-500 to-pink-400"
          tooltip="Chat with your AI tutor for personalized help"
        />
        <QuickAction
          icon={Layers}
          title="Flashcards"
          description="Review key concepts with smart flashcards"
          href="/dashboard/flashcards"
          color="from-accent to-orange-400"
          tooltip="Study vocabulary, formulas, and more"
        />
      </div>

      {/* Learning tip */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">Today's Study Tip</h3>
            <p className="text-muted-foreground text-sm">
              {profile?.learning_style === "visual" && "Try creating mind maps for complex concepts. Visual learners retain information better when they can see relationships between ideas."}
              {profile?.learning_style === "auditory" && "Read your notes out loud or explain concepts to someone else. Hearing information helps auditory learners remember it better."}
              {profile?.learning_style === "reading_writing" && "Rewrite your notes in your own words. Writing helps reinforce learning for reading/writing learners."}
              {profile?.learning_style === "kinesthetic" && "Take short breaks every 25 minutes to move around. Kinesthetic learners focus better when they incorporate movement."}
              {!profile?.learning_style && "Complete your learning style quiz to get personalized study tips tailored to how you learn best!"}
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
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
  const content = (
    <div className="p-5 rounded-xl bg-card border border-border/50 cursor-default">
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

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

function QuickAction({
  icon: Icon,
  title,
  description,
  href,
  color,
  tooltip,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  color: string;
  tooltip?: string;
}) {
  const content = (
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

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

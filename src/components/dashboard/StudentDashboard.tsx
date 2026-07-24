import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useStreakTracker } from "@/hooks/useStreakTracker";
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
  Clock,
  Calculator,
  PenLine,
  Flame,
  LineChart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { getTierLimits, getDaysRemaining, PricingTier, TRIAL_LIMITS } from "@/lib/tier-limits";
import { DashboardTutorial } from "./DashboardTutorial";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { JoinCodeEntry } from "@/components/invite/JoinCodeEntry";
import { StudentAffiliationBanner } from "./StudentAffiliationBanner";
import { useDueReviews } from "@/hooks/useDueReviews";




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
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { totalSATScore, mathScore, rwScore, testsTaken, hasProgress, avgAccuracy } = useDashboardStats();
  const { earnedBadges, checkAndAwardBadges, allBadges } = useBadges();
  const { streakData } = useStreakTracker();
  const { dueCount: reviewsDue } = useDueReviews();
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

  const learningStyleLabel: Record<string, string> = {
    visual: t("dashboard.style_visual"),
    auditory: t("dashboard.style_auditory"),
    reading_writing: t("dashboard.style_reading_writing"),
    kinesthetic: t("dashboard.style_kinesthetic"),
  };

  return (
    <>
      {/* Tutorial for new users */}
      <DashboardTutorial 
        isOpen={showTutorial} 
        onComplete={handleTutorialComplete} 
      />

    <div className="space-y-8">
      {/* Affiliation Banner */}
      <StudentAffiliationBanner />
      {/* Trial Banner */}
      {isTrialUser && daysRemaining > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-400" />
            <span className="text-foreground">
              <strong>{t("dashboard.trial_prefix")}</strong> {daysRemaining} {daysRemaining === 1 ? t("dashboard.days_remaining_one") : t("dashboard.days_remaining_other")} • {TRIAL_LIMITS.creditsPerDay} {t("dashboard.credits_per_day")} • {TRIAL_LIMITS.questionsTotal} {t("dashboard.questions_total")}
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="hero" size="sm" asChild>
                <Link to="/dashboard/billing">
                  {t("dashboard.subscribe_now")}
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("dashboard.trial_tooltip")}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t("dashboard.welcome_back")}, {profile?.full_name?.split(" ")[0] || t("dashboard.student_fallback")}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {profile?.learning_style 
              ? `${t("dashboard.learning_style_prefix")} ${learningStyleLabel[profile.learning_style]}`
              : t("dashboard.continue_journey")}
          </p>
        </div>
         <div className="flex items-center gap-2">
           <JoinCodeEntry />
           <Tooltip>
             <TooltipTrigger asChild>
               <Button variant="hero" asChild>
                 <Link to="/dashboard/tests">
                   {isTier0 ? t("dashboard.practice_questions_btn") : t("dashboard.start_practice_test")}
                   <ArrowRight className="w-4 h-4" />
                 </Link>
               </Button>
             </TooltipTrigger>
             <TooltipContent>
               <p>{isTier0 ? t("dashboard.tooltip_practice_questions") : t("dashboard.tooltip_practice_test")}</p>
             </TooltipContent>
           </Tooltip>
         </div>
      </div>

      {/* Stats cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={FileText}
          label={isTier0 ? t("dashboard.questions_today") : t("dashboard.questions_remaining")}
          value={isTier0 ? `${profile?.questions_used_today || 0}/${tierLimits.questionsPerDay}` : `${profile?.tests_remaining || 0}/${tierLimits.questionsPerMonth}`}
          subtext={isTier0 ? t("dashboard.daily_limit") : t("dashboard.monthly_quota")}
          color="from-primary to-teal-400"
          tooltip={isTier0 ? t("dashboard.tooltip_questions_today") : t("dashboard.tooltip_questions_remaining")}
        />
        <StatCard
          icon={Trophy}
          label={t("dashboard.sat_score")}
          value={hasProgress ? totalSATScore.toString() : "--"}
          subtext={hasProgress ? t("dashboard.scale_400_1600") : t("dashboard.no_tests_yet")}
          color="from-yellow-500 to-amber-400"
          tooltip={t("dashboard.tooltip_sat_score")}
        />
        <StatCard
          icon={Calculator}
          label={t("dashboard.math")}
          value={hasProgress ? mathScore.toString() : "--"}
          subtext={hasProgress ? t("dashboard.range_200_800") : t("dashboard.start_practicing")}
          color="from-primary to-teal-400"
          tooltip={t("dashboard.tooltip_math")}
        />
        <StatCard
          icon={PenLine}
          label={t("dashboard.reading_writing")}
          value={hasProgress ? rwScore.toString() : "--"}
          subtext={hasProgress ? t("dashboard.range_200_800") : t("dashboard.start_practicing")}
          color="from-purple-500 to-pink-400"
          tooltip={t("dashboard.tooltip_rw")}
        />
        <StatCard
          icon={Flame}
          label={t("dashboard.streak")}
          value={streakData.streakDays > 0 ? `${streakData.streakDays}d` : "--"}
          subtext={streakData.points > 0 ? `${streakData.points} pts` : t("dashboard.start_studying")}
          color="from-orange-500 to-red-400"
          tooltip={t("dashboard.tooltip_streak")}
        />
      </div>

      {/* Evidence-based study engine: spaced repetition due today */}
      <Link
        to="/dashboard/flashcards"
        className="flex items-center justify-between gap-4 p-4 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 to-accent/5 hover:border-primary/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">
              {reviewsDue > 0
                ? `${reviewsDue} card${reviewsDue === 1 ? "" : "s"} due for review today`
                : "No cards due for review — you're caught up"}
            </div>
            <div className="text-xs text-muted-foreground">
              Spaced repetition · part of your evidence-based study engine
            </div>
          </div>
        </div>
        <span className="text-xs font-medium text-primary hidden sm:inline">
          {reviewsDue > 0 ? "Start review →" : "Study more →"}
        </span>
      </Link>

      {/* Your Progress summary */}
      <Link
        to="/dashboard/progress"
        className="block group p-5 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-teal-400 p-0.5 shrink-0">
              <div className="w-full h-full rounded-[10px] bg-card flex items-center justify-center">
                <LineChart className="w-6 h-6 text-foreground" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {t("dashboard.your_progress")}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {hasProgress ? `${avgAccuracy}%` : t("dashboard.start_practicing")}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("dashboard.overall_progress")}</span>
                  <span>{hasProgress ? `${avgAccuracy}%` : "0%"}</span>
                </div>
                <Progress value={hasProgress ? avgAccuracy : 0} className="h-2" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-sm">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-muted-foreground">{t("dashboard.sat_score")}:</span>
              <span className="font-semibold text-foreground">{hasProgress ? totalSATScore : "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">{t("dashboard.tests_completed")}:</span>
              <span className="font-semibold text-foreground">{testsTaken}</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-accent" />
              <span className="font-semibold text-foreground">{streakData.streakDays > 0 ? `${streakData.streakDays}d` : "—"}</span>
            </div>
          </div>
          <div className="shrink-0 hidden sm:block">
            <span className="text-sm font-medium text-primary group-hover:underline">
              {t("dashboard.view_full_progress")}
            </span>
          </div>
        </div>
      </Link>

      {/* Achievement Badges */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Star className="w-4 h-4" /> {t("dashboard.achievement_badges")}
          </h3>
          <span className="text-xs text-muted-foreground">
            {earnedBadges.length}/{allBadges.length} {t("dashboard.earned")}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {allBadges.map((badge) => {
            const isEarned = earnedBadges.some(b => b.badge_type === badge.type);
            return (
              <Tooltip key={badge.type}>
                <TooltipTrigger asChild>
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all ${
                      isEarned
                        ? "bg-primary/20 border border-primary/40 shadow-sm"
                        : "bg-secondary/50 border border-border/30 opacity-40 grayscale"
                    }`}
                  >
                    {badge.icon}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                  {!isEarned && <p className="text-xs text-muted-foreground italic mt-1">{t("dashboard.not_yet_earned")}</p>}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Subject Quick Actions */}
      {profile?.study_subjects && (profile.study_subjects as string[]).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">{t("dashboard.quick_help_by_subject")}</h3>
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
                  <p>{t("dashboard.get_ai_help_with")} {subject}</p>
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
          title={t("dashboard.quick_practice_tests_title")}
          description={hasSATorACT(profile) ? t("dashboard.quick_practice_tests_desc_sat") : t("dashboard.quick_practice_tests_desc_other")}
          href="/dashboard/tests"
          color="from-primary to-teal-400"
          tooltip={t("dashboard.quick_practice_tests_tooltip")}
        />
        <QuickAction
          icon={MessageSquare}
          title={t("dashboard.quick_ai_coach_title")}
          description={t("dashboard.quick_ai_coach_desc")}
          href="/dashboard/coach"
          color="from-purple-500 to-pink-400"
          tooltip={t("dashboard.quick_ai_coach_tooltip")}
        />
        <QuickAction
          icon={Layers}
          title={t("dashboard.quick_flashcards_title")}
          description={t("dashboard.quick_flashcards_desc")}
          href="/dashboard/flashcards"
          color="from-accent to-orange-400"
          tooltip={t("dashboard.quick_flashcards_tooltip")}
        />
      </div>

      {/* Learning tip */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">{t("dashboard.todays_tip")}</h3>
            <p className="text-muted-foreground text-sm">
              {profile?.learning_style === "visual" && t("dashboard.tip_visual")}
              {profile?.learning_style === "auditory" && t("dashboard.tip_auditory")}
              {profile?.learning_style === "reading_writing" && t("dashboard.tip_reading_writing")}
              {profile?.learning_style === "kinesthetic" && t("dashboard.tip_kinesthetic")}
              {!profile?.learning_style && t("dashboard.tip_no_style")}
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

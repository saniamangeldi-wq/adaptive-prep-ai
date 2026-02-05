import { AlertTriangle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getTierLimits, getDaysRemaining, TRIAL_LIMITS } from "@/lib/tier-limits";
import { Button } from "@/components/ui/button";

interface UpgradePromptProps {
  type: "credits" | "questions" | "tests" | "feature";
  featureName?: string;
  className?: string;
}

export function UpgradePrompt({ type, featureName, className }: UpgradePromptProps) {
  const { profile } = useAuth();
  
  if (!profile) return null;

  const tierLimits = getTierLimits(profile.tier);
  const isTrialUser = profile.is_trial && profile.trial_ends_at;
  const daysRemaining = isTrialUser ? getDaysRemaining(profile.trial_ends_at) : 0;

  const getMessage = () => {
    switch (type) {
      case "credits":
        if (isTrialUser) {
          return `You've used your ${TRIAL_LIMITS.creditsPerDay} trial credits for today. Resets at midnight!`;
        }
        return `You've used your ${tierLimits.creditsPerDay} daily credits. Upgrade to get more!`;
      case "questions":
        return `You've used your ${tierLimits.questionsPerDay} daily questions. Upgrade for unlimited access!`;
      case "tests":
        if (profile.tier === "tier_0") {
          return "Practice questions are only available on paid plans.";
        }
        if (isTrialUser) {
          return `You've used your ${TRIAL_LIMITS.testsTotal * 100} trial questions. Upgrade to continue!`;
        }
        return "You've used all your practice questions this month.";
      case "feature":
        return `${featureName || "This feature"} is only available on higher plans.`;
      default:
        return "Upgrade to unlock more features!";
    }
  };

  const getUpgradeText = () => {
    if (profile.tier === "tier_0") {
      return "Upgrade to Starter - $7/month";
    }
    if (profile.tier === "tier_1") {
      return "Upgrade to Pro - $10/month";
    }
    if (profile.tier === "tier_2") {
      return "Upgrade to Elite - $21/month";
    }
    return "View Plans";
  };

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/20">
          <AlertTriangle className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground mb-1">
            {type === "credits" ? "Daily Limit Reached" : 
             type === "questions" ? "Question Limit Reached" :
             type === "tests" ? "Question Quota Reached" : "Feature Locked"}
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            {getMessage()}
          </p>
          
          {isTrialUser && daysRemaining > 0 && (
            <p className="text-xs text-yellow-400 mb-3">
              Your trial ends in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}.
            </p>
          )}
          
          <Button variant="hero" size="sm" asChild>
            <Link to="/dashboard/settings">
              <Sparkles className="w-4 h-4" />
              {getUpgradeText()}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

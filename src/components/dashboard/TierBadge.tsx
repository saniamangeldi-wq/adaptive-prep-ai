import { Link } from "react-router-dom";
import { Crown, Sparkles, Clock, Zap, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getTierLimits, getDaysRemaining, TRIAL_LIMITS, PricingTier } from "@/lib/tier-limits";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { SchoolTierBadge } from "./SchoolTierBadge";

export function TierBadge() {
  const { profile } = useAuth();
  
  if (!profile) return null;

  // School admins see school subscription instead
  if (profile.role === "school_admin") {
    return <SchoolTierBadge />;
  }

  // Teachers don't need to see subscription badge (they're part of school)
  if (profile.role === "teacher") {
    return null;
  }

  const tierLimits = getTierLimits(profile.tier as PricingTier);
  const isTrialUser = profile.is_trial && profile.trial_ends_at;
  const daysRemaining = isTrialUser ? getDaysRemaining(profile.trial_ends_at) : 0;
  const showUpgrade = profile.tier === "tier_0" || profile.tier === "tier_1" || profile.tier === "tier_2";

  // Calculate credits usage
  const maxCredits = isTrialUser ? TRIAL_LIMITS.creditsPerDay : tierLimits.creditsPerDay;
  const creditsUsed = maxCredits - (profile.credits_remaining || 0);
  const creditsPercentage = Math.min(100, (creditsUsed / maxCredits) * 100);

  const getBillingPath = () => {
    if (profile.role === "tutor") return "/dashboard/billing";
    return "/dashboard/billing";
  };

  const getBadgeColor = () => {
    if (isTrialUser) return "from-yellow-500/20 to-orange-500/20 border-yellow-500/30";
    switch (profile.tier) {
      case "tier_3":
        return "from-purple-500/20 to-pink-500/20 border-purple-500/30";
      case "tier_2":
        return "from-primary/20 to-teal-500/20 border-primary/30";
      case "tier_1":
        return "from-blue-500/20 to-cyan-500/20 border-blue-500/30";
      default:
        return "from-muted/50 to-muted/30 border-border";
    }
  };

  const getIcon = () => {
    if (isTrialUser) return <Clock className="w-4 h-4 text-yellow-400" />;
    if (profile.tier === "tier_3") return <Crown className="w-4 h-4 text-purple-400" />;
    if (profile.tier === "tier_2") return <Sparkles className="w-4 h-4 text-primary" />;
    if (profile.tier === "tier_1") return <CreditCard className="w-4 h-4 text-blue-400" />;
    return <Zap className="w-4 h-4 text-muted-foreground" />;
  };

  const getPriceDisplay = () => {
    if (isTrialUser) return "7-day trial";
    if (profile.tier === "tier_0") return "Free forever";
    return `$${tierLimits.price}/month`;
  };

  return (
    <div className="p-3 border-t border-sidebar-border">
      <div className={cn(
        "p-3 rounded-lg bg-gradient-to-r border",
        getBadgeColor()
      )}>
        {/* Plan name and price */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getIcon()}
            <div>
              <p className="text-sm font-semibold text-sidebar-foreground">
                {isTrialUser ? "Pro Trial" : tierLimits.displayName}
              </p>
              <p className="text-xs text-sidebar-foreground/60">
                {getPriceDisplay()}
              </p>
            </div>
          </div>
        </div>

        {/* Credits usage */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-sidebar-foreground/70">AI Credits</span>
            <span className="text-xs font-medium text-sidebar-foreground">
              {profile.credits_remaining}/{maxCredits}
            </span>
          </div>
          <Progress value={100 - creditsPercentage} className="h-1.5" />
        </div>

        {/* Trial countdown */}
        {isTrialUser && daysRemaining > 0 && (
          <div className="flex items-center justify-between py-2 border-t border-sidebar-border/30">
            <span className="text-xs text-yellow-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left
            </span>
          </div>
        )}

        {isTrialUser && daysRemaining === 0 && (
          <div className="py-2 border-t border-sidebar-border/30">
            <span className="text-xs text-red-400">Trial expired</span>
          </div>
        )}

        {/* Upgrade button */}
        {showUpgrade && (
          <Link
            to={getBillingPath()}
            className={cn(
              "block w-full mt-2 py-2 px-3 rounded-md text-center text-xs font-medium transition-colors",
              isTrialUser 
                ? "bg-yellow-500 hover:bg-yellow-600 text-black"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}
          >
            {isTrialUser ? "Subscribe Now" : "Upgrade Plan"}
          </Link>
        )}

        {profile.tier === "tier_3" && !isTrialUser && (
          <div className="mt-2 py-2 text-center">
            <span className="text-xs text-purple-400 flex items-center justify-center gap-1">
              <Crown className="w-3 h-3" />
              Premium Member
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

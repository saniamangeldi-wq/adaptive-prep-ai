import { Link } from "react-router-dom";
import { Crown, Sparkles, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getTierLimits, getDaysRemaining } from "@/lib/tier-limits";
import { cn } from "@/lib/utils";

export function TierBadge() {
  const { profile } = useAuth();
  
  if (!profile) return null;

  const tierLimits = getTierLimits(profile.tier);
  const isTrialUser = profile.is_trial && profile.trial_ends_at;
  const daysRemaining = isTrialUser ? getDaysRemaining(profile.trial_ends_at) : 0;
  const showUpgrade = profile.tier === "tier_0" || profile.tier === "tier_1";

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
    if (isTrialUser) return <Clock className="w-3.5 h-3.5 text-yellow-400" />;
    if (profile.tier === "tier_3") return <Crown className="w-3.5 h-3.5 text-purple-400" />;
    if (profile.tier === "tier_2") return <Sparkles className="w-3.5 h-3.5 text-primary" />;
    return null;
  };

  return (
    <div className="p-3 border-t border-sidebar-border">
      <div className={cn(
        "p-3 rounded-lg bg-gradient-to-r border",
        getBadgeColor()
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getIcon()}
            <div>
              <p className="text-xs text-sidebar-foreground/70">Current Plan</p>
              <p className="text-sm font-semibold text-sidebar-foreground">
                {isTrialUser ? "Pro Trial" : tierLimits.displayName}
              </p>
            </div>
          </div>
          {showUpgrade && !isTrialUser && (
            <Link
              to="/dashboard/settings"
              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Upgrade
            </Link>
          )}
        </div>
        
        {isTrialUser && daysRemaining > 0 && (
          <div className="mt-2 pt-2 border-t border-sidebar-border/30">
            <div className="flex items-center justify-between">
              <span className="text-xs text-yellow-400">
                {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left
              </span>
              <Link
                to="/dashboard/settings"
                className="text-xs text-yellow-400 hover:text-yellow-300 font-medium"
              >
                Subscribe now
              </Link>
            </div>
          </div>
        )}
        
        {isTrialUser && daysRemaining === 0 && (
          <div className="mt-2 pt-2 border-t border-sidebar-border/30">
            <span className="text-xs text-red-400">Trial expired</span>
          </div>
        )}
      </div>
    </div>
  );
}

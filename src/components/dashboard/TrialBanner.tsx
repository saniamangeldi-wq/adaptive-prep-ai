import { useAuth } from "@/contexts/AuthContext";
import { getDaysRemaining } from "@/lib/tier-limits";
import { X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export function TrialBanner() {
  const { profile } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  
  if (!profile || !profile.is_trial || !profile.trial_ends_at || dismissed) {
    return null;
  }

  const daysRemaining = getDaysRemaining(profile.trial_ends_at);
  
  // Don't show banner if more than 3 days left (not urgent)
  if (daysRemaining > 3) return null;

  const getBannerStyle = () => {
    if (daysRemaining === 0) {
      return "from-red-500/90 to-red-600/90 text-white";
    }
    if (daysRemaining === 1) {
      return "from-orange-500/90 to-orange-600/90 text-white";
    }
    return "from-yellow-500/90 to-yellow-600/90 text-black";
  };

  return (
    <div className={`relative px-4 py-2.5 bg-gradient-to-r ${getBannerStyle()}`}>
      <div className="container mx-auto flex items-center justify-center gap-3 text-sm">
        <span className="font-medium">
          {daysRemaining === 0 
            ? "Your trial has expired!" 
            : daysRemaining === 1 
              ? "Your trial expires tomorrow!" 
              : `Your trial expires in ${daysRemaining} days!`}
        </span>
        <Link 
          to="/dashboard/settings" 
          className="underline font-semibold hover:no-underline"
        >
          {daysRemaining === 0 ? "Subscribe now" : "Keep your Pro access"}
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

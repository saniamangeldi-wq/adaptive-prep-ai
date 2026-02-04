import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Zap, MessageSquare, FileText, BarChart3, Sparkles, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";

interface CreditsInfoPopoverProps {
  creditsRemaining: number;
  dailyLimit: number;
  children: React.ReactNode;
}

const CREDIT_COSTS = [
  {
    action: "AI Chat Message",
    cost: 1,
    icon: MessageSquare,
    description: "Each message to Study Coach",
  },
  {
    action: "Generate Flashcards",
    cost: 2,
    icon: Sparkles,
    description: "AI-generated flashcard deck",
  },
  {
    action: "Progress Report",
    cost: 5,
    icon: FileText,
    description: "Detailed student report (teachers)",
  },
  {
    action: "School Analytics",
    cost: 10,
    icon: BarChart3,
    description: "School-wide analysis (admins)",
  },
];

// Get hours until midnight reset
const getHoursUntilReset = () => {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60));
};

export function CreditsInfoPopover({ creditsRemaining, dailyLimit, children }: CreditsInfoPopoverProps) {
  const { profile } = useAuth();
  const usagePercentage = ((dailyLimit - creditsRemaining) / dailyLimit) * 100;
  const hoursUntilReset = getHoursUntilReset();

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" />
              Daily AI Credits
            </h4>
            <span className="text-sm font-medium text-foreground">
              {creditsRemaining}/{dailyLimit}
            </span>
          </div>
          <Progress value={100 - usagePercentage} className="h-2 mb-2" />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Resets in {hoursUntilReset} hour{hoursUntilReset !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="p-4">
          <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Credit Costs
          </h5>
          <div className="space-y-3">
            {CREDIT_COSTS.map((item) => (
              <div key={item.action} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {item.action}
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      {item.cost} credit{item.cost !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {profile?.tier !== "tier_3" && (
          <div className="p-3 bg-primary/5 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              <span className="font-medium text-primary">Upgrade</span> to get up to 300 credits/day
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

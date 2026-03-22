import { Volume2, AlertTriangle, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useVoiceMinutes } from "@/hooks/useVoiceMinutes";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function VoiceMinutesBar() {
  const {
    minutesUsed,
    minutesLimit,
    percentUsed,
    isWarning,
    isExhausted,
    hasVoiceAccess,
    resetDateStr,
    isLoading,
  } = useVoiceMinutes();

  // Don't show for plans without voice access
  if (!hasVoiceAccess || isLoading) return null;

  return (
    <div className="space-y-2">
      {/* Usage bar */}
      <div className="p-4 rounded-xl bg-card border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Volume2 className="w-4 h-4 text-primary" />
            Voice Minutes Used
          </div>
          <span className={cn(
            "text-sm font-mono",
            isExhausted ? "text-destructive" : isWarning ? "text-warning" : "text-muted-foreground"
          )}>
            {minutesUsed} / {minutesLimit}
          </span>
        </div>
        <Progress 
          value={percentUsed} 
          className={cn(
            "h-2",
            isExhausted ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-warning" : "[&>div]:bg-primary"
          )}
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Resets {resetDateStr}
        </p>
      </div>

      {/* Warning banner */}
      {isWarning && !isExhausted && (
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
          <p className="text-xs text-foreground">
            You've used {percentUsed}% of your voice minutes this month.{" "}
            <Link to="/dashboard/billing" className="text-primary hover:underline">
              Upgrade to get more.
            </Link>
          </p>
        </div>
      )}

      {/* Exhausted banner */}
      {isExhausted && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
          <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
          <p className="text-xs text-foreground">
            Voice minutes used up for this month. Resets on {resetDateStr}.
          </p>
        </div>
      )}
    </div>
  );
}

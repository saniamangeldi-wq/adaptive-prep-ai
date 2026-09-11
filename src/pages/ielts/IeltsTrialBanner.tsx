import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock } from "lucide-react";
import type { IeltsTrial } from "@/hooks/useIeltsAccess";
import { IELTS_TRIAL_DAYS } from "@/lib/ielts";
import { Link } from "react-router-dom";

interface Props {
  trial: IeltsTrial | null;
  onStart: () => void | Promise<void>;
}

/** Free-trial state for the IELTS module: start it, count it down, then ask for the upgrade. */
export function IeltsTrialBanner({ trial, onStart }: Props) {
  if (!trial) {
    return (
      <Card className="flex flex-col gap-3 border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-foreground">
              Start your {IELTS_TRIAL_DAYS}-day IELTS trial
            </p>
            <p className="text-sm text-muted-foreground">
              Full Reading and Writing practice, no card needed.
            </p>
          </div>
        </div>
        <Button onClick={() => void onStart()}>Start free trial</Button>
      </Card>
    );
  }

  if (trial.converted) return null;

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(trial.ends_at).getTime() - Date.now()) / 86400000),
  );

  if (daysLeft === 0) {
    return (
      <Card className="flex flex-col gap-3 border-destructive/40 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-foreground">Your IELTS trial has ended</p>
          <p className="text-sm text-muted-foreground">
            Your past reports stay available. Upgrade to keep practising.
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/billing">See plans</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Clock className="h-5 w-5 text-primary" />
        <p className="text-sm text-foreground">
          {daysLeft} {daysLeft === 1 ? "day" : "days"} left in your IELTS trial
        </p>
      </div>
      <Button variant="outline" asChild>
        <Link to="/dashboard/billing">Upgrade</Link>
      </Button>
    </Card>
  );
}

export default IeltsTrialBanner;

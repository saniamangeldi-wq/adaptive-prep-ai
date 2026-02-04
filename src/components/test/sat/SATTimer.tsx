import { useState, useEffect } from "react";
import { Clock, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SATTimerProps {
  initialSeconds: number;
  onTimeUp: () => void;
}

export function SATTimer({ initialSeconds, onTimeUp }: SATTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [showTimer, setShowTimer] = useState(true);

  useEffect(() => {
    if (isPaused || secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, secondsRemaining, onTimeUp]);

  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  const percentRemaining = (secondsRemaining / initialSeconds) * 100;
  const isLowTime = percentRemaining < 20;
  const isCriticalTime = percentRemaining < 10;

  const formatTime = () => {
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300",
          isCriticalTime
            ? "bg-destructive/10 border-destructive/50"
            : isLowTime
            ? "bg-yellow-500/10 border-yellow-500/50"
            : "bg-muted border-border"
        )}
      >
        <Clock
          className={cn(
            "w-4 h-4",
            isCriticalTime
              ? "text-destructive"
              : isLowTime
              ? "text-yellow-500"
              : "text-muted-foreground"
          )}
        />
        {showTimer ? (
          <span
            className={cn(
              "font-mono text-sm font-semibold min-w-[60px]",
              isCriticalTime
                ? "text-destructive animate-pulse"
                : isLowTime
                ? "text-yellow-500"
                : "text-foreground"
            )}
          >
            {formatTime()}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground min-w-[60px]">Hidden</span>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setShowTimer(!showTimer)}
        title={showTimer ? "Hide timer" : "Show timer"}
      >
        {showTimer ? (
          <Pause className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <Play className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
}

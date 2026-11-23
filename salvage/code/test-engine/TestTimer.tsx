import { useState, useEffect, useCallback } from "react";
import { Clock, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface TestTimerProps {
  initialMinutes: number;
  onTimeUp: () => void;
  isPaused?: boolean;
  onTogglePause?: () => void;
}

export function TestTimer({ initialMinutes, onTimeUp, isPaused = false, onTogglePause }: TestTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialMinutes * 60);

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

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const percentRemaining = (secondsRemaining / (initialMinutes * 60)) * 100;

  const isLowTime = percentRemaining < 20;
  const isCriticalTime = percentRemaining < 10;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-300",
        isCriticalTime
          ? "bg-destructive/10 border-destructive/50 animate-pulse"
          : isLowTime
          ? "bg-yellow-500/10 border-yellow-500/50"
          : "bg-card border-border/50"
      )}
    >
      <Clock
        className={cn(
          "w-5 h-5",
          isCriticalTime
            ? "text-destructive"
            : isLowTime
            ? "text-yellow-500"
            : "text-muted-foreground"
        )}
      />
      <span
        className={cn(
          "font-mono text-lg font-semibold",
          isCriticalTime
            ? "text-destructive"
            : isLowTime
            ? "text-yellow-500"
            : "text-foreground"
        )}
      >
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
      {onTogglePause && (
        <button
          onClick={onTogglePause}
          className="p-1 hover:bg-accent rounded-md transition-colors"
          aria-label={isPaused ? "Resume timer" : "Pause timer"}
        >
          {isPaused ? (
            <Play className="w-4 h-4 text-primary" />
          ) : (
            <Pause className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      )}
    </div>
  );
}

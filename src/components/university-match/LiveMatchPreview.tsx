import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface MiniMatch {
  name: string;
  flag: string;
  score: number;
}

interface LiveMatchPreviewProps {
  matchCount: number;
  topMatches: MiniMatch[];
  onSeeAll: () => void;
  loading?: boolean;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const diff = value - start;
    if (diff === 0) return;

    const duration = 600;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
    prevRef.current = value;
  }, [value]);

  return <span>{display}</span>;
}

export function LiveMatchPreview({
  matchCount,
  topMatches,
  onSeeAll,
  loading,
}: LiveMatchPreviewProps) {
  const [pulse, setPulse] = useState(false);
  const prevCount = useRef(matchCount);

  useEffect(() => {
    if (matchCount !== prevCount.current) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 800);
      prevCount.current = matchCount;
      return () => clearTimeout(t);
    }
  }, [matchCount]);

  return (
    <div className="space-y-6">
      {/* Match Counter */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-medium">
          <TrendingUp className="w-3.5 h-3.5" />
          Live Match Preview
        </div>
        <div
          className={cn(
            "text-6xl font-bold text-primary tabular-nums transition-transform duration-300",
            pulse && "scale-110"
          )}
        >
          <AnimatedNumber value={matchCount} />
        </div>
        <p className="text-sm text-muted-foreground">universities match your profile</p>
      </div>

      {/* Top 3 Matches */}
      {topMatches.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Top Matches
          </h4>
          <div className="space-y-2">
            {topMatches.slice(0, 3).map((match, i) => (
              <div
                key={match.name}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30"
              >
                <span className="text-lg">{match.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {match.name}
                  </p>
                </div>
                <div
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-bold",
                    match.score >= 90
                      ? "bg-emerald-500/15 text-emerald-400"
                      : match.score >= 70
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {match.score}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <Button
        onClick={onSeeAll}
        className="w-full gap-2"
        size="lg"
        disabled={loading || matchCount === 0}
      >
        <Sparkles className="w-4 h-4" />
        See All Matches
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

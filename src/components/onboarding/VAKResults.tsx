import { useEffect, useState } from "react";
import { Eye, Ear, Hand, ChevronRight, Sparkles, Bot, MessageSquare, Crown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { VAKResult } from "@/lib/vak-scoring";
import type { VAKStyle } from "@/lib/vak-questions";
import { cn } from "@/lib/utils";

const STYLE_COLORS: Record<VAKStyle, string> = {
  visual: "from-blue-500 to-cyan-400",
  auditory: "from-purple-500 to-pink-400",
  kinesthetic: "from-orange-500 to-amber-400",
};

const STYLE_BAR_COLORS: Record<VAKStyle, string> = {
  visual: "bg-blue-500",
  auditory: "bg-purple-500",
  kinesthetic: "bg-orange-500",
};

const STYLE_ICONS: Record<VAKStyle, typeof Eye> = {
  visual: Eye,
  auditory: Ear,
  kinesthetic: Hand,
};

const STYLE_EMOJI: Record<VAKStyle, string> = {
  visual: "👁️",
  auditory: "👂",
  kinesthetic: "✋",
};

interface VAKResultsProps {
  result: VAKResult;
  tier: string;
  selectedSubjects: string[];
  onComplete: () => void;
  loading: boolean;
}

export function VAKResults({
  result,
  tier,
  selectedSubjects,
  onComplete,
  loading,
}: VAKResultsProps) {
  const navigate = useNavigate();
  const [animatedScores, setAnimatedScores] = useState({ visual: 0, auditory: 0, kinesthetic: 0 });
  const PrimaryIcon = STYLE_ICONS[result.primaryStyle];

  // Animate bars on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScores(result.scores);
    }, 100);
    return () => clearTimeout(timer);
  }, [result.scores]);

  const showUpsell = tier === "tier_0" || tier === "tier_1" || tier === "tier_2";
  const isFree = tier === "tier_0" || tier === "tier_1";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-8 dark">
      <div className="max-w-lg w-full space-y-6 animate-fade-in">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div
            className={cn(
              "w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br flex items-center justify-center",
              STYLE_COLORS[result.primaryStyle]
            )}
          >
            <PrimaryIcon className="w-10 h-10 text-white" />
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Your Learning Style</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {STYLE_EMOJI[result.primaryStyle]} {result.label}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {result.description}
          </p>
        </div>

        {/* Bar Chart */}
        <div className="space-y-3 p-4 rounded-xl bg-secondary/30 border border-border">
          {(["visual", "auditory", "kinesthetic"] as VAKStyle[]).map((style) => (
            <div key={style} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground font-medium capitalize flex items-center gap-1.5">
                  {STYLE_EMOJI[style]} {style}
                </span>
                <span className="text-muted-foreground font-mono">
                  {result.scores[style]}%
                </span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 ease-out",
                    STYLE_BAR_COLORS[style]
                  )}
                  style={{ width: `${animatedScores[style]}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Sub-type badge (Elite only) */}
        {result.subType && tier === "tier_3" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Crown className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm text-foreground">
              <strong>Elite Sub-type:</strong> {result.label}
            </span>
          </div>
        )}

        {/* Adaptations */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">
            Your platform is now set up for you:
          </h3>
          <ul className="space-y-2">
            {result.adaptations.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="text-primary mt-0.5">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Subjects */}
        {selectedSubjects.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {selectedSubjects.map((s) => (
              <span
                key={s}
                className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {/* AI Coach Welcome */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 text-left">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                Meet your AI Study Coach!
                <MessageSquare className="w-4 h-4 text-primary" />
              </h3>
              <p className="text-sm text-muted-foreground">
                As a {result.primaryStyle} learner, I'll adapt my explanations
                to match your style.{" "}
                {selectedSubjects.length > 0 &&
                  `Let's tackle ${selectedSubjects.slice(0, 2).join(", ")}${
                    selectedSubjects.length > 2
                      ? ` and ${selectedSubjects.length - 2} more`
                      : ""
                  }!`}
              </p>
            </div>
          </div>
        </div>

        {/* Upsell Block */}
        {showUpsell && (
          <>
            <div className="border-t border-border" />
            <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-3">
              {isFree ? (
                <>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <h3 className="font-semibold text-foreground">
                      Want a more accurate profile?
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate("/billing")}
                    >
                      <ChevronRight className="w-4 h-4 mr-2" />
                      Upgrade to Pro → 30 questions, sub-categories
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate("/billing")}
                    >
                      <Crown className="w-4 h-4 mr-2 text-yellow-500" />
                      Upgrade to Elite → 50 questions + PDF Report
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    <h3 className="font-semibold text-foreground">
                      Want the deepest profile?
                    </h3>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate("/billing")}
                  >
                    <Crown className="w-4 h-4 mr-2 text-yellow-500" />
                    Upgrade to Elite → 50 questions + sub-types + PDF Report
                  </Button>
                </>
              )}
            </div>
          </>
        )}

        {/* Continue Button */}
        <Button
          variant="hero"
          size="xl"
          onClick={onComplete}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Saving..." : showUpsell ? "Continue with Current Profile" : "Start Learning"}
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

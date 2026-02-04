import { useState, useEffect } from "react";
import { Coffee, Activity, Eye, Brain, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BREAK_DURATION_SECONDS } from "@/lib/sat-test-config";

interface BreakScreenProps {
  onContinue: () => void;
}

export function BreakScreen({ onContinue }: BreakScreenProps) {
  const [timeLeft, setTimeLeft] = useState(BREAK_DURATION_SECONDS);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((BREAK_DURATION_SECONDS - timeLeft) / BREAK_DURATION_SECONDS) * 100;

  const tips = [
    { icon: Activity, text: "Stretch and move around" },
    { icon: Coffee, text: "Get a snack or water" },
    { icon: Eye, text: "Rest your eyes" },
    { icon: Brain, text: "Clear your mind" },
  ];

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-8 text-center">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Coffee className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            Break Time
          </h1>
          <p className="text-muted-foreground">
            You've completed the Reading and Writing section!
          </p>
        </div>

        {/* Timer */}
        <div className="relative">
          <div className="relative w-48 h-48 mx-auto">
            {/* Progress Ring */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={2 * Math.PI * 88}
                strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)}
                className="text-primary transition-all duration-1000"
                strokeLinecap="round"
              />
            </svg>
            {/* Time Display */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-mono font-bold text-foreground">
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>

        {/* Tips Card */}
        <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
          <h3 className="font-semibold text-foreground">Use this time to:</h3>
          <div className="grid grid-cols-2 gap-3">
            {tips.map((tip, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
              >
                <tip.icon className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm text-muted-foreground">{tip.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Next Section Preview */}
        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span>Next up: Math Section (44 questions, 70 minutes)</span>
        </div>

        {/* Continue Button */}
        <Button variant="hero" size="xl" onClick={onContinue}>
          I'm Ready - Continue to Math Section
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

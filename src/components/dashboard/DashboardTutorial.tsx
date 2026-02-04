import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, BookOpen, MessageSquare, Layers, Trophy, Brain, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  highlight?: string; // CSS selector or element identifier
  position: "center" | "top-right" | "bottom-left";
}

const tutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to AdaptivePrep! 🎉",
    description: "Let's take a quick tour to help you get started with your SAT preparation journey. This will only take a minute!",
    icon: Sparkles,
    position: "center",
  },
  {
    id: "practice-tests",
    title: "Practice Tests",
    description: "Take full-length SAT practice tests or quick quizzes. Track your progress and identify areas for improvement. Tests adapt to your skill level!",
    icon: BookOpen,
    position: "center",
  },
  {
    id: "ai-coach",
    title: "AI Study Coach",
    description: "Get personalized help from your AI tutor! Ask questions about any concept, get study tips, and receive guidance tailored to your learning style.",
    icon: MessageSquare,
    position: "center",
  },
  {
    id: "flashcards",
    title: "Smart Flashcards",
    description: "Review key concepts with our flashcard system. Use pre-made SAT decks or generate custom cards with AI based on your weak areas.",
    icon: Layers,
    position: "center",
  },
  {
    id: "progress",
    title: "Track Your Progress",
    description: "Monitor your scores, accuracy, and improvement over time. The dashboard shows your stats at a glance, helping you stay motivated!",
    icon: Trophy,
    position: "center",
  },
  {
    id: "learning-style",
    title: "Personalized Learning",
    description: "Complete the learning style quiz to get content adapted to how you learn best—visual, auditory, reading/writing, or kinesthetic!",
    icon: Brain,
    position: "center",
  },
  {
    id: "tips",
    title: "You're All Set! 🚀",
    description: "Start with a practice test to benchmark your skills, then use the AI Coach for help with tricky concepts. Good luck with your SAT prep!",
    icon: Lightbulb,
    position: "center",
  },
];

interface DashboardTutorialProps {
  onComplete: () => void;
  isOpen: boolean;
}

export function DashboardTutorial({ onComplete, isOpen }: DashboardTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const step = tutorialSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
      return;
    }
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
      setIsAnimating(false);
    }, 150);
  };

  const handlePrev = () => {
    if (isFirstStep) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep((prev) => prev - 1);
      setIsAnimating(false);
    }, 150);
  };

  const handleSkip = () => {
    onComplete();
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowRight" || e.key === "Enter") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "Escape") {
        handleSkip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const StepIcon = step.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleSkip}
      />
      
      {/* Tutorial Card */}
      <div 
        className={cn(
          "relative z-10 w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden transition-all duration-300",
          isAnimating && "opacity-50 scale-95"
        )}
      >
        {/* Progress bar */}
        <div className="h-1 bg-secondary">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="p-6 pt-8">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  index === currentStep 
                    ? "bg-primary w-6" 
                    : index < currentStep 
                      ? "bg-primary/50" 
                      : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className={cn(
              "w-20 h-20 rounded-2xl flex items-center justify-center",
              "bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30"
            )}>
              <StepIcon className="w-10 h-10 text-primary" />
            </div>
          </div>

          {/* Title & Description */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-foreground mb-3">
              {step.title}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {!isFirstStep && (
              <Button
                variant="ghost"
                onClick={handlePrev}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            
            {isFirstStep && (
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="flex-1 text-muted-foreground"
              >
                Skip Tour
              </Button>
            )}

            <Button
              variant="hero"
              onClick={handleNext}
              className="flex-1"
            >
              {isLastStep ? "Get Started" : "Next"}
              {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="px-6 pb-4 text-center">
          <p className="text-xs text-muted-foreground/60">
            Use arrow keys to navigate • Esc to skip
          </p>
        </div>
      </div>
    </div>
  );
}

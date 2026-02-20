import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { GradeLevelStep } from "@/components/onboarding/GradeLevelStep";
import { PrimaryGoalStep } from "@/components/onboarding/PrimaryGoalStep";
import { SubjectSelectionStep } from "@/components/onboarding/SubjectSelectionStep";
import { VAKAssessment } from "@/components/onboarding/VAKAssessment";
import { VAKResults } from "@/components/onboarding/VAKResults";
import { calculateVAKResult, type VAKResult } from "@/lib/vak-scoring";
import { getQuestionCountForTier, type VAKStyle } from "@/lib/vak-questions";

type OnboardingPhase = "grade" | "goal" | "subjects" | "vak" | "results";

export default function Onboarding() {
  const [phase, setPhase] = useState<OnboardingPhase>("grade");
  const [gradeLevel, setGradeLevel] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(["SAT"]);
  const [vakResult, setVakResult] = useState<VAKResult | null>(null);
  const [savedVAKProgress, setSavedVAKProgress] = useState<{
    answers: Record<number, VAKStyle>;
    currentIndex: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const userTier = profile?.tier || "tier_0";

  // Check for saved VAK progress on mount
  useEffect(() => {
    if (user && profile?.vak_progress) {
      const progress = profile.vak_progress as any;
      if (progress?.answers && typeof progress.currentIndex === "number") {
        setSavedVAKProgress({
          answers: progress.answers,
          currentIndex: progress.currentIndex,
        });
      }
    }
  }, [user, profile]);

  // Progress calculation
  const totalSteps = 4; // grade, goal, subjects, vak
  const getCurrentStep = () => {
    switch (phase) {
      case "grade": return 1;
      case "goal": return 2;
      case "subjects": return 3;
      case "vak": return 3.5;
      case "results": return 4;
      default: return 1;
    }
  };
  const progress = (getCurrentStep() / totalSteps) * 100;

  const canProceed = () => {
    switch (phase) {
      case "grade": return gradeLevel !== "";
      case "goal": return primaryGoal !== "";
      case "subjects": return selectedSubjects.length > 0;
      default: return false;
    }
  };

  const handleNext = () => {
    switch (phase) {
      case "grade": setPhase("goal"); break;
      case "goal": setPhase("subjects"); break;
      case "subjects": setPhase("vak"); break;
    }
  };

  const handleBack = () => {
    switch (phase) {
      case "goal": setPhase("grade"); break;
      case "subjects": setPhase("goal"); break;
      case "vak": setPhase("subjects"); break;
    }
  };

  const handleVAKProgressSave = async (
    answers: Record<number, VAKStyle>,
    currentIndex: number
  ) => {
    if (!user) return;
    // Save to DB (fire-and-forget)
    supabase
      .from("profiles")
      .update({ vak_progress: { answers, currentIndex } } as any)
      .eq("user_id", user.id)
      .then(({ error }) => {
        if (error) console.error("Error saving VAK progress:", error);
      });
  };

  const handleVAKComplete = (answers: Record<number, VAKStyle>) => {
    const result = calculateVAKResult(answers, userTier);
    setVakResult(result);
    setPhase("results");
  };

  const handleComplete = async () => {
    if (!user || !vakResult) return;

    setLoading(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          learning_style: vakResult.primaryStyle as any,
          grade_level: gradeLevel,
          primary_goal: primaryGoal,
          study_subjects: selectedSubjects,
          onboarding_completed: true,
          vak_visual_pct: vakResult.scores.visual,
          vak_auditory_pct: vakResult.scores.auditory,
          vak_kinesthetic_pct: vakResult.scores.kinesthetic,
          vak_primary_style: vakResult.primaryStyle,
          vak_secondary_style: vakResult.secondaryStyle,
          vak_sub_type: vakResult.subType,
          vak_tier_taken: userTier,
          vak_last_taken_at: new Date().toISOString(),
          vak_progress: null, // Clear saved progress
        } as any)
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Save detailed responses
      const answersObj = savedVAKProgress?.answers ?? {};
      const { error: quizError } = await supabase
        .from("learning_style_responses")
        .insert({
          user_id: user.id,
          responses: answersObj,
          calculated_style: vakResult.primaryStyle,
          confidence_scores: {
            visual: vakResult.scores.visual,
            auditory: vakResult.scores.auditory,
            kinesthetic: vakResult.scores.kinesthetic,
          },
        });

      if (quizError) throw quizError;

      await refreshProfile();
      toast.success(
        `✅ Your platform is now personalized for ${vakResult.label}s!`
      );
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  // Results screen (full-screen)
  if (phase === "results" && vakResult) {
    return (
      <VAKResults
        result={vakResult}
        tier={userTier}
        selectedSubjects={selectedSubjects}
        onComplete={handleComplete}
        loading={loading}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col dark">
      {/* Progress bar */}
      <div className="h-1 bg-secondary">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="max-w-xl w-full space-y-8">
          {/* Step indicator for pre-VAK phases */}
          {phase !== "vak" && (
            <div className="text-center text-sm text-muted-foreground">
              Step {getCurrentStep()} of {totalSteps}
            </div>
          )}

          {phase === "grade" && (
            <GradeLevelStep value={gradeLevel} onChange={setGradeLevel} />
          )}

          {phase === "goal" && (
            <PrimaryGoalStep value={primaryGoal} onChange={setPrimaryGoal} />
          )}

          {phase === "subjects" && (
            <SubjectSelectionStep
              value={selectedSubjects}
              onChange={setSelectedSubjects}
            />
          )}

          {phase === "vak" && (
            <VAKAssessment
              tier={userTier}
              savedProgress={savedVAKProgress}
              onComplete={handleVAKComplete}
              onProgressSave={handleVAKProgressSave}
            />
          )}

          {/* Navigation (only for pre-VAK phases) */}
          {phase !== "vak" && (
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={phase === "grade"}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <Button
                variant="hero"
                onClick={handleNext}
                disabled={!canProceed()}
              >
                {phase === "subjects" ? "Start Assessment" : "Next"}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

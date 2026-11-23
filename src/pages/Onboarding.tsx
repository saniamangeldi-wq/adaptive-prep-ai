import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { GradeLevelStep } from "@/components/onboarding/GradeLevelStep";
import { SubjectSelectionStep } from "@/components/onboarding/SubjectSelectionStep";
import { PageSeo } from "@/components/seo/PageSeo";

type OnboardingPhase = "grade" | "subjects";
const TOTAL_STEPS = 2;

export default function Onboarding() {
  const [phase, setPhase] = useState<OnboardingPhase>("grade");
  const [gradeLevel, setGradeLevel] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(["SAT"]);
  const [loading, setLoading] = useState(false);

  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Already onboarded: don't strand the user here after a session refresh.
  useEffect(() => {
    if (profile?.onboarding_completed) {
      navigate("/dashboard", { replace: true });
    }
  }, [profile?.onboarding_completed, navigate]);

  const step = phase === "grade" ? 1 : 2;
  const canProceed = phase === "grade" ? gradeLevel !== "" : selectedSubjects.length > 0;

  const finish = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          grade_level: gradeLevel,
          primary_goal: "SAT",
          study_subjects: selectedSubjects,
          onboarding_completed: true,
        } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (phase === "grade") setPhase("subjects");
    else void finish();
  };

  return (
    <>
      <PageSeo
        title="Get Started | AdaptivePrep"
        description="Complete your AdaptivePrep setup. Tell us your grade and subjects to start your SAT prep."
        path="/onboarding"
      />
      <div className="min-h-screen bg-background flex flex-col dark">
        <div className="h-1 bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        <div className="flex-1 flex items-center justify-center p-4 md:p-8">
          <div className="max-w-xl w-full space-y-8">
            <div className="text-center text-sm text-muted-foreground">
              Step {step} of {TOTAL_STEPS}
            </div>

            {phase === "grade" && <GradeLevelStep value={gradeLevel} onChange={setGradeLevel} />}
            {phase === "subjects" && (
              <SubjectSelectionStep value={selectedSubjects} onChange={setSelectedSubjects} />
            )}

            <div className="flex items-center justify-between pt-4">
              <Button variant="ghost" onClick={() => setPhase("grade")} disabled={phase === "grade" || loading}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button variant="hero" onClick={handleNext} disabled={!canProceed || loading}>
                {phase === "subjects" ? (loading ? "Saving..." : "Finish") : "Next"}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

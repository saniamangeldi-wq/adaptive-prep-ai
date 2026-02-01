import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useSchoolStudent } from "@/hooks/useSchoolStudent";
import { LockedFeatureModal } from "@/components/university-match/LockedFeatureModal";
import { PortfolioUpload } from "@/components/university-match/PortfolioUpload";
import { PreferenceQuestionnaire } from "@/components/university-match/PreferenceQuestionnaire";
import { UniversityMatches } from "@/components/university-match/UniversityMatches";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type Step = "portfolio" | "preferences" | "matches";

export default function UniversityMatch() {
  const { isSchoolStudent, loading: schoolLoading } = useSchoolStudent();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>("portfolio");
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(true);

  // Check existing progress
  useEffect(() => {
    async function checkProgress() {
      if (!user || !isSchoolStudent) {
        setLoadingProgress(false);
        return;
      }

      try {
        // Check if user has portfolio
        const { data: portfolio } = await supabase
          .from("student_portfolios")
          .select("id, academic_docs, extracurricular_docs, essays")
          .eq("student_id", user.id)
          .maybeSingle();

        // Check if user has preferences
        const { data: preferences } = await supabase
          .from("university_preferences")
          .select("id")
          .eq("student_id", user.id)
          .maybeSingle();

        // Check if user has matches
        const { data: matches } = await supabase
          .from("student_university_matches")
          .select("id")
          .eq("student_id", user.id)
          .limit(1);

        if (matches && matches.length > 0) {
          setCurrentStep("matches");
        } else if (preferences) {
          setCurrentStep("matches");
        } else if (portfolio && (
          (portfolio.academic_docs as any[])?.length > 0 || 
          (portfolio.extracurricular_docs as any[])?.length > 0 || 
          portfolio.essays
        )) {
          setCurrentStep("preferences");
        }
      } catch (err) {
        console.error("Error checking progress:", err);
      } finally {
        setLoadingProgress(false);
      }
    }

    if (!schoolLoading && isSchoolStudent) {
      checkProgress();
    } else if (!schoolLoading) {
      setLoadingProgress(false);
    }
  }, [user, isSchoolStudent, schoolLoading]);

  useEffect(() => {
    if (!schoolLoading && isSchoolStudent === false) {
      setShowLockedModal(true);
    }
  }, [isSchoolStudent, schoolLoading]);

  const getProgress = () => {
    switch (currentStep) {
      case "portfolio": return 33;
      case "preferences": return 66;
      case "matches": return 100;
      default: return 0;
    }
  };

  const stepLabels = {
    portfolio: "Build Your Profile",
    preferences: "Your Preferences",
    matches: "Your Matches"
  };

  if (schoolLoading || loadingProgress) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <LockedFeatureModal 
        open={showLockedModal} 
        onOpenChange={setShowLockedModal} 
      />

      {isSchoolStudent && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Progress Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-foreground">
                University Match
              </h1>
              <span className="text-sm text-muted-foreground">
                Step {currentStep === "portfolio" ? 1 : currentStep === "preferences" ? 2 : 3} of 3
              </span>
            </div>
            
            <Progress value={getProgress()} className="h-2" />
            
            <div className="flex justify-between text-sm">
              <button
                onClick={() => setCurrentStep("portfolio")}
                className={`transition-colors ${currentStep === "portfolio" ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                1. Build Profile
              </button>
              <button
                onClick={() => currentStep !== "portfolio" && setCurrentStep("preferences")}
                className={`transition-colors ${currentStep === "preferences" ? "text-primary font-medium" : currentStep === "portfolio" ? "text-muted-foreground/50 cursor-not-allowed" : "text-muted-foreground hover:text-foreground"}`}
                disabled={currentStep === "portfolio"}
              >
                2. Preferences
              </button>
              <button
                onClick={() => currentStep === "matches" && setCurrentStep("matches")}
                className={`transition-colors ${currentStep === "matches" ? "text-primary font-medium" : "text-muted-foreground/50 cursor-not-allowed"}`}
                disabled={currentStep !== "matches"}
              >
                3. Matches
              </button>
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              {stepLabels[currentStep]}
            </h2>

            {currentStep === "portfolio" && (
              <PortfolioUpload 
                onComplete={() => setCurrentStep("preferences")} 
              />
            )}

            {currentStep === "preferences" && (
              <PreferenceQuestionnaire 
                onComplete={() => setCurrentStep("matches")}
                onBack={() => setCurrentStep("portfolio")}
              />
            )}

            {currentStep === "matches" && (
              <UniversityMatches 
                onRestart={() => setCurrentStep("portfolio")}
              />
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

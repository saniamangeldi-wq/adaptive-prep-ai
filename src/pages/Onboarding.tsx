import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { GradeLevelStep } from "@/components/onboarding/GradeLevelStep";
import { PrimaryGoalStep } from "@/components/onboarding/PrimaryGoalStep";
import { SubjectSelectionStep } from "@/components/onboarding/SubjectSelectionStep";
import { 
  LearningStyleStep, 
  calculateLearningStyle, 
  LEARNING_STYLE_QUESTIONS_COUNT,
  type LearningStyle 
} from "@/components/onboarding/LearningStyleStep";
import { OnboardingComplete } from "@/components/onboarding/OnboardingComplete";

type OnboardingPhase = 
  | "grade" 
  | "goal" 
  | "subjects" 
  | "learning_style" 
  | "complete";

export default function Onboarding() {
  const [phase, setPhase] = useState<OnboardingPhase>("grade");
  const [gradeLevel, setGradeLevel] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(["SAT"]);
  const [learningStyleQuestionIndex, setLearningStyleQuestionIndex] = useState(0);
  const [learningStyleAnswers, setLearningStyleAnswers] = useState<Record<number, LearningStyle>>({});
  const [calculatedStyle, setCalculatedStyle] = useState<LearningStyle | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Calculate total steps for progress bar
  const getTotalSteps = () => 3 + LEARNING_STYLE_QUESTIONS_COUNT; // grade + goal + subjects + learning style questions
  
  const getCurrentStep = () => {
    switch (phase) {
      case "grade": return 1;
      case "goal": return 2;
      case "subjects": return 3;
      case "learning_style": return 4 + learningStyleQuestionIndex;
      case "complete": return getTotalSteps();
      default: return 1;
    }
  };

  const progress = (getCurrentStep() / getTotalSteps()) * 100;

  const handleLearningStyleAnswer = (questionIndex: number, style: LearningStyle) => {
    setLearningStyleAnswers({ ...learningStyleAnswers, [questionIndex]: style });
  };

  const canProceed = () => {
    switch (phase) {
      case "grade": return gradeLevel !== "";
      case "goal": return primaryGoal !== "";
      case "subjects": return selectedSubjects.length > 0;
      case "learning_style": return learningStyleAnswers[learningStyleQuestionIndex] !== undefined;
      default: return false;
    }
  };

  const handleNext = () => {
    switch (phase) {
      case "grade":
        setPhase("goal");
        break;
      case "goal":
        setPhase("subjects");
        break;
      case "subjects":
        setPhase("learning_style");
        setLearningStyleQuestionIndex(0);
        break;
      case "learning_style":
        if (learningStyleQuestionIndex < LEARNING_STYLE_QUESTIONS_COUNT - 1) {
          setLearningStyleQuestionIndex(learningStyleQuestionIndex + 1);
        } else {
          const style = calculateLearningStyle(learningStyleAnswers);
          setCalculatedStyle(style);
          setPhase("complete");
        }
        break;
    }
  };

  const handleBack = () => {
    switch (phase) {
      case "goal":
        setPhase("grade");
        break;
      case "subjects":
        setPhase("goal");
        break;
      case "learning_style":
        if (learningStyleQuestionIndex > 0) {
          setLearningStyleQuestionIndex(learningStyleQuestionIndex - 1);
        } else {
          setPhase("subjects");
        }
        break;
    }
  };

  const handleComplete = async () => {
    if (!user || !calculatedStyle) return;
    
    setLoading(true);
    try {
      // Save all preferences to profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          learning_style: calculatedStyle,
          grade_level: gradeLevel,
          primary_goal: primaryGoal,
          study_subjects: selectedSubjects,
          onboarding_completed: true 
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Save learning style quiz responses
      const { error: quizError } = await supabase
        .from("learning_style_responses")
        .insert({
          user_id: user.id,
          responses: learningStyleAnswers,
          calculated_style: calculatedStyle,
          confidence_scores: {
            visual: Object.values(learningStyleAnswers).filter(a => a === "visual").length,
            auditory: Object.values(learningStyleAnswers).filter(a => a === "auditory").length,
            reading_writing: Object.values(learningStyleAnswers).filter(a => a === "reading_writing").length,
            kinesthetic: Object.values(learningStyleAnswers).filter(a => a === "kinesthetic").length,
          },
        });

      if (quizError) throw quizError;

      await refreshProfile();
      toast.success("Profile complete! Let's start learning.");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  // Show completion screen
  if (phase === "complete" && calculatedStyle) {
    return (
      <OnboardingComplete
        learningStyle={calculatedStyle}
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

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-xl w-full space-y-8">
          {/* Render current step */}
          {phase === "grade" && (
            <GradeLevelStep 
              value={gradeLevel} 
              onChange={setGradeLevel} 
            />
          )}
          
          {phase === "goal" && (
            <PrimaryGoalStep 
              value={primaryGoal} 
              onChange={setPrimaryGoal} 
            />
          )}
          
          {phase === "subjects" && (
            <SubjectSelectionStep 
              value={selectedSubjects} 
              onChange={setSelectedSubjects} 
            />
          )}
          
          {phase === "learning_style" && (
            <LearningStyleStep
              questionIndex={learningStyleQuestionIndex}
              answers={learningStyleAnswers}
              onAnswer={handleLearningStyleAnswer}
            />
          )}

          {/* Navigation */}
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
              {phase === "learning_style" && learningStyleQuestionIndex === LEARNING_STYLE_QUESTIONS_COUNT - 1 
                ? "See Results" 
                : "Next"}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

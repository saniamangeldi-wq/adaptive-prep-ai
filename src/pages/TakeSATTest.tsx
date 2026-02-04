import { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { calculateScore, type Question, type GeneratedTest } from "@/lib/test-generator";
import { 
  TestStartScreen, 
  ModuleDirections, 
  BreakScreen, 
  ModuleReviewScreen, 
  SATTestInterface 
} from "@/components/test/sat";
import { 
  TestFlowState, 
  INITIAL_TEST_FLOW, 
  getNextFlowState,
  SAT_TEST_STRUCTURE 
} from "@/lib/sat-test-config";

interface ModuleData {
  questions: Question[];
  answers: Record<string, string>;
  flaggedQuestions: Set<string>;
  score?: number;
  timeSpent?: number;
}

interface TestSessionData {
  testId: string;
  reading_writing: {
    module1: ModuleData;
    module2: ModuleData;
  };
  math: {
    module1: ModuleData;
    module2: ModuleData;
  };
}

export default function TakeSATTest() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [flowState, setFlowState] = useState<TestFlowState>(INITIAL_TEST_FLOW);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testSession, setTestSession] = useState<TestSessionData | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());

  // Get test data from navigation state
  const testData = location.state?.test as GeneratedTest | undefined;

  useEffect(() => {
    if (!testData) {
      navigate("/dashboard/tests");
      return;
    }

    // Initialize test session with questions split into modules
    const allQuestions = testData.questions;
    const rwQuestions = allQuestions.filter(q => q.section === "reading_writing");
    const mathQuestions = allQuestions.filter(q => q.section === "math");

    // Split into modules (approximately)
    const rwMod1 = rwQuestions.slice(0, Math.ceil(rwQuestions.length / 2));
    const rwMod2 = rwQuestions.slice(Math.ceil(rwQuestions.length / 2));
    const mathMod1 = mathQuestions.slice(0, Math.ceil(mathQuestions.length / 2));
    const mathMod2 = mathQuestions.slice(Math.ceil(mathQuestions.length / 2));

    setTestSession({
      testId: testData.id,
      reading_writing: {
        module1: { questions: rwMod1, answers: {}, flaggedQuestions: new Set() },
        module2: { questions: rwMod2, answers: {}, flaggedQuestions: new Set() },
      },
      math: {
        module1: { questions: mathMod1, answers: {}, flaggedQuestions: new Set() },
        module2: { questions: mathMod2, answers: {}, flaggedQuestions: new Set() },
      },
    });
  }, [testData, navigate]);

  const getCurrentModule = useCallback((): ModuleData | null => {
    if (!testSession) return null;
    const section = flowState.currentSection;
    const moduleKey = `module${flowState.currentModule}` as "module1" | "module2";
    return testSession[section][moduleKey];
  }, [testSession, flowState]);

  const updateCurrentModuleAnswers = useCallback((questionId: string, answer: string) => {
    if (!testSession) return;
    const section = flowState.currentSection;
    const moduleKey = `module${flowState.currentModule}` as "module1" | "module2";

    setTestSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [moduleKey]: {
            ...prev[section][moduleKey],
            answers: {
              ...prev[section][moduleKey].answers,
              [questionId]: answer,
            },
          },
        },
      };
    });
  }, [flowState, testSession]);

  const toggleCurrentModuleFlag = useCallback((questionId: string) => {
    if (!testSession) return;
    const section = flowState.currentSection;
    const moduleKey = `module${flowState.currentModule}` as "module1" | "module2";

    setTestSession(prev => {
      if (!prev) return prev;
      const currentFlagged = new Set(prev[section][moduleKey].flaggedQuestions);
      if (currentFlagged.has(questionId)) {
        currentFlagged.delete(questionId);
      } else {
        currentFlagged.add(questionId);
      }
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [moduleKey]: {
            ...prev[section][moduleKey],
            flaggedQuestions: currentFlagged,
          },
        },
      };
    });
  }, [flowState, testSession]);

  const handleStartTest = useCallback(() => {
    setFlowState(getNextFlowState(INITIAL_TEST_FLOW));
    setStartTime(Date.now());
  }, []);

  const handleStartModule = useCallback(() => {
    setFlowState(prev => getNextFlowState(prev));
    setStartTime(Date.now());
  }, []);

  const handleTimeUp = useCallback(() => {
    toast({
      title: "Time's up!",
      description: "Moving to the review screen.",
      variant: "destructive",
    });
    setFlowState(prev => ({ ...prev, phase: "review" }));
  }, [toast]);

  const handleShowReview = useCallback(() => {
    setFlowState(prev => ({ ...prev, phase: "review" }));
  }, []);

  const handleReturnToTest = useCallback((index: number) => {
    setFlowState(prev => ({ ...prev, phase: "test" }));
  }, []);

  const handleSubmitModule = useCallback(async () => {
    setIsSubmitting(true);

    // Calculate module score
    const currentModule = getCurrentModule();
    if (currentModule) {
      const result = calculateScore(currentModule.questions, currentModule.answers);
      const timeSpent = Math.round((Date.now() - startTime) / 1000);

      // Update module with score
      const section = flowState.currentSection;
      const moduleKey = `module${flowState.currentModule}` as "module1" | "module2";
      setTestSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [moduleKey]: {
              ...prev[section][moduleKey],
              score: result.score,
              timeSpent,
            },
          },
        };
      });
    }

    // Move to next phase
    const nextState = getNextFlowState(flowState);
    setFlowState(nextState);
    setStartTime(Date.now());
    setIsSubmitting(false);

    // If test is complete, submit everything
    if (nextState.phase === "complete") {
      await submitFinalResults();
    }
  }, [flowState, getCurrentModule, startTime]);

  const handleContinueFromBreak = useCallback(() => {
    setFlowState(prev => getNextFlowState(prev));
  }, []);

  const submitFinalResults = async () => {
    if (!testSession || !user) return;

    try {
      // Combine all answers
      const allAnswers = {
        ...testSession.reading_writing.module1.answers,
        ...testSession.reading_writing.module2.answers,
        ...testSession.math.module1.answers,
        ...testSession.math.module2.answers,
      };

      // Combine all questions
      const allQuestions = [
        ...testSession.reading_writing.module1.questions,
        ...testSession.reading_writing.module2.questions,
        ...testSession.math.module1.questions,
        ...testSession.math.module2.questions,
      ];

      const result = calculateScore(allQuestions, allAnswers);
      const totalTimeSpent = 
        (testSession.reading_writing.module1.timeSpent || 0) +
        (testSession.reading_writing.module2.timeSpent || 0) +
        (testSession.math.module1.timeSpent || 0) +
        (testSession.math.module2.timeSpent || 0);

      // Update test attempt
      const { error } = await supabase
        .from("test_attempts")
        .update({
          answers: allAnswers,
          score: result.score,
          correct_answers: result.correct,
          total_questions: result.total,
          time_spent_seconds: totalTimeSpent,
          completed_at: new Date().toISOString(),
          feedback: {
            byTopic: result.byTopic,
            bySection: result.bySection,
          },
        })
        .eq("id", testSession.testId);

      if (error) throw error;

      // Update questions remaining
      const questionsUsed = allQuestions.length;
      const { data: profile } = await supabase
        .from("profiles")
        .select("tests_remaining")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({ tests_remaining: Math.max(0, (profile.tests_remaining || 0) - questionsUsed) })
          .eq("user_id", user.id);
      }

      await refreshProfile();

      // Navigate to results
      navigate(`/dashboard/tests/${testSession.testId}/results`, {
        state: {
          test: testData,
          answers: allAnswers,
          result,
          timeSpent: totalTimeSpent,
        },
      });
    } catch (error) {
      console.error("Error submitting test:", error);
      toast({
        title: "Error",
        description: "Failed to submit test. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Loading state
  if (!testSession) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  const currentModule = getCurrentModule();
  const moduleConfig = SAT_TEST_STRUCTURE[flowState.currentSection].modules[flowState.currentModule - 1];

  // Render based on current phase
  switch (flowState.phase) {
    case "start":
      return (
        <DashboardLayout>
          <TestStartScreen onStart={handleStartTest} isLoading={isLoading} />
        </DashboardLayout>
      );

    case "directions":
      return (
        <DashboardLayout>
          <ModuleDirections
            section={flowState.currentSection}
            moduleNumber={flowState.currentModule}
            onStart={handleStartModule}
          />
        </DashboardLayout>
      );

    case "test":
      if (!currentModule) return null;
      return (
        <SATTestInterface
          questions={currentModule.questions}
          section={flowState.currentSection}
          moduleNumber={flowState.currentModule}
          timeLimitSeconds={moduleConfig.timeSeconds}
          answers={currentModule.answers}
          flaggedQuestions={currentModule.flaggedQuestions}
          onAnswerChange={updateCurrentModuleAnswers}
          onToggleFlag={toggleCurrentModuleFlag}
          onTimeUp={handleTimeUp}
          onReview={handleShowReview}
        />
      );

    case "review":
      if (!currentModule) return null;
      return (
        <DashboardLayout>
          <ModuleReviewScreen
            questions={currentModule.questions}
            answers={currentModule.answers}
            flaggedQuestions={currentModule.flaggedQuestions}
            section={flowState.currentSection}
            moduleNumber={flowState.currentModule}
            onReturnToQuestion={handleReturnToTest}
            onSubmit={handleSubmitModule}
            isSubmitting={isSubmitting}
          />
        </DashboardLayout>
      );

    case "break":
      return (
        <DashboardLayout>
          <BreakScreen onContinue={handleContinueFromBreak} />
        </DashboardLayout>
      );

    case "complete":
      return (
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-muted-foreground">Calculating your results...</p>
            </div>
          </div>
        </DashboardLayout>
      );

    default:
      return null;
  }
}

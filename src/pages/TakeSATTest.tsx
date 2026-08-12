import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useXPLevel } from "@/hooks/useXPLevel";
import { XP_REWARDS } from "@/lib/gamification-config";
import { supabase } from "@/integrations/supabase/client";
import { calculateScore, type Question, type GeneratedTest } from "@/lib/test-generator";
import { PageSeo } from "@/components/seo/PageSeo";
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
import {
  saveSession,
  clearSession,
  loadResumableSession,
  deadlineFromNow,
  type PersistedSession,
} from "@/lib/test-session";

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
  const { addXP } = useXPLevel();

  const [flowState, setFlowState] = useState<TestFlowState>(INITIAL_TEST_FLOW);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testSession, setTestSession] = useState<TestSessionData | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [poolWarningDismissed, setPoolWarningDismissed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [moduleTimeLeft, setModuleTimeLeft] = useState<number | null>(null);
  const [resumedTest, setResumedTest] = useState<GeneratedTest | null>(null);
  const [restoring, setRestoring] = useState(true);

  const deadlineRef = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Test data comes either from navigation state (fresh test) or from a
  // persisted snapshot (resuming after a refresh / crash / navigation away).
  const testData = (location.state?.test as GeneratedTest | undefined) ?? resumedTest ?? undefined;

  useEffect(() => {
    let cancelled = false;

    const initFresh = (test: GeneratedTest) => {
      const allQuestions = test.questions;
      const rwQuestions = allQuestions.filter(q => q.section === "reading_writing");
      const mathQuestions = allQuestions.filter(q => q.section === "math");

      const rwMod1 = rwQuestions.slice(0, Math.ceil(rwQuestions.length / 2));
      const rwMod2 = rwQuestions.slice(Math.ceil(rwQuestions.length / 2));
      const mathMod1 = mathQuestions.slice(0, Math.ceil(mathQuestions.length / 2));
      const mathMod2 = mathQuestions.slice(Math.ceil(mathQuestions.length / 2));

      setTestSession({
        testId: test.id,
        reading_writing: {
          module1: { questions: rwMod1, answers: {}, flaggedQuestions: new Set() },
          module2: { questions: rwMod2, answers: {}, flaggedQuestions: new Set() },
        },
        math: {
          module1: { questions: mathMod1, answers: {}, flaggedQuestions: new Set() },
          module2: { questions: mathMod2, answers: {}, flaggedQuestions: new Set() },
        },
      });
      setRestoring(false);
    };

    const fresh = location.state?.test as GeneratedTest | undefined;
    if (fresh) {
      initFresh(fresh);
      return;
    }

    // No navigation state: try to restore an interrupted attempt.
    if (!user) return;
    (async () => {
      const payload = await loadResumableSession(user.id);
      if (cancelled) return;
      if (!payload) {
        navigate("/dashboard/tests");
        return;
      }
      const s = payload.session;
      const toModule = (m: PersistedSession["math"]["module1"]): ModuleData => ({
        questions: m.questions,
        answers: m.answers ?? {},
        flaggedQuestions: new Set(m.flagged ?? []),
        score: m.score,
        timeSpent: m.timeSpent,
      });
      setResumedTest(s.test);
      setTestSession({
        testId: payload.attemptId,
        reading_writing: {
          module1: toModule(s.reading_writing.module1),
          module2: toModule(s.reading_writing.module2),
        },
        math: {
          module1: toModule(s.math.module1),
          module2: toModule(s.math.module2),
        },
      });
      setFlowState(s.flowState);
      setCurrentIndex(s.currentIndex ?? 0);
      if (s.flowState.phase === "test") {
        const full = SAT_TEST_STRUCTURE[s.flowState.currentSection].modules[s.flowState.currentModule - 1].timeSeconds;
        setModuleTimeLeft(payload.remainingSeconds ?? full);
      }
      setStartTime(Date.now());
      setRestoring(false);
      toast({
        title: "Test resumed",
        description: "We restored your answers and the time you had left.",
      });
    })();

    return () => { cancelled = true; };
  }, [location.state, user, navigate, toast]);

  const getCurrentModule = useCallback((): ModuleData | null => {
    if (!testSession) return null;
    const section = flowState.currentSection;
    const moduleKey = `module${flowState.currentModule}` as "module1" | "module2";
    return testSession[section][moduleKey];
  }, [testSession, flowState]);

  // ---- Snapshot persistence -------------------------------------------------
  const buildSnapshot = useCallback((): PersistedSession | null => {
    if (!testSession || !testData) return null;
    const pack = (m: ModuleData) => ({
      questions: m.questions,
      answers: m.answers,
      flagged: Array.from(m.flaggedQuestions),
      score: m.score,
      timeSpent: m.timeSpent,
    });
    return {
      version: 1,
      test: testData,
      flowState,
      currentIndex,
      reading_writing: {
        module1: pack(testSession.reading_writing.module1),
        module2: pack(testSession.reading_writing.module2),
      },
      math: {
        module1: pack(testSession.math.module1),
        module2: pack(testSession.math.module2),
      },
    };
  }, [testSession, testData, flowState, currentIndex]);

  useEffect(() => {
    if (!testSession || restoring) return;
    if (flowState.phase === "complete" || flowState.phase === "start") return;
    const snapshot = buildSnapshot();
    if (!snapshot) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveSession(testSession.testId, snapshot, deadlineRef.current);
    }, 700);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [buildSnapshot, testSession, flowState.phase, restoring]);

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

  /** Arms the server-side deadline for the module that is about to start. */
  const armModuleTimer = useCallback((next: TestFlowState) => {
    if (next.phase !== "test") return;
    const seconds = SAT_TEST_STRUCTURE[next.currentSection].modules[next.currentModule - 1].timeSeconds;
    deadlineRef.current = deadlineFromNow(seconds);
    setModuleTimeLeft(seconds);
  }, []);

  const handleStartTest = useCallback(() => {
    const next = getNextFlowState(INITIAL_TEST_FLOW);
    setFlowState(next);
    armModuleTimer(next);
    setStartTime(Date.now());
  }, [armModuleTimer]);

  const handleStartModule = useCallback(() => {
    setFlowState(prev => {
      const next = getNextFlowState(prev);
      armModuleTimer(next);
      return next;
    });
    setCurrentIndex(0);
    setStartTime(Date.now());
  }, [armModuleTimer]);

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
    setCurrentIndex(index);
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
    setCurrentIndex(0);
    deadlineRef.current = null;
    setModuleTimeLeft(null);
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
          session_state: null,
          module_deadline_at: null,
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

      // Award XP for completing SAT test
      addXP.mutate(XP_REWARDS.complete_test);

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
      await clearSession(testSession.testId).catch(() => undefined);
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
      <PageSeo title="Official Digital SAT | AdaptivePrep" description="Take a full-length adaptive Digital SAT practice test with realistic timing and modules." path="/dashboard/sat-test" />
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
        <>
          {testData?.poolWarning && !poolWarningDismissed && (
            <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/15 border-b border-yellow-500/40 px-4 py-2 flex items-center justify-between text-sm text-yellow-200">
              <span>{testData.poolWarning}</span>
              <button
                onClick={() => setPoolWarningDismissed(true)}
                className="ml-4 px-2 py-0.5 rounded hover:bg-yellow-500/20"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          )}
          <SATTestInterface
            key={`${flowState.currentSection}-${flowState.currentModule}`}
            questions={currentModule.questions}
            section={flowState.currentSection}
            moduleNumber={flowState.currentModule}
            timeLimitSeconds={moduleTimeLeft ?? moduleConfig.timeSeconds}
            answers={currentModule.answers}
            flaggedQuestions={currentModule.flaggedQuestions}
            initialQuestionIndex={currentIndex}
            onQuestionIndexChange={setCurrentIndex}
            onAnswerChange={updateCurrentModuleAnswers}
            onToggleFlag={toggleCurrentModuleFlag}
            onTimeUp={handleTimeUp}
            onReview={handleShowReview}
          />
        </>
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

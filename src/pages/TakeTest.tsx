import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { QuestionCard } from "@/components/test/QuestionCard";
import { QuestionNav } from "@/components/test/QuestionNav";
import { TestTimer } from "@/components/test/TestTimer";
import { ChevronLeft, ChevronRight, Send, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { calculateScore, type Question, type GeneratedTest } from "@/lib/test-generator";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TakeTest() {
  const { testId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [test, setTest] = useState<GeneratedTest | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    // Get test data from navigation state
    const testData = location.state?.test as GeneratedTest | undefined;
    if (testData) {
      setTest(testData);
    } else if (!testId) {
      navigate("/dashboard/tests");
    }
  }, [location.state, testId, navigate]);

  const handleAnswerChange = useCallback((answer: string) => {
    if (!test) return;
    const questionId = test.questions[currentIndex].id;
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }, [test, currentIndex]);

  const handleToggleFlag = useCallback(() => {
    if (!test) return;
    const questionId = test.questions[currentIndex].id;
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }, [test, currentIndex]);

  const handleNavigate = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    if (!test) return;
    setCurrentIndex((prev) => Math.min(test.questions.length - 1, prev + 1));
  }, [test]);

  const handleTimeUp = useCallback(() => {
    toast({
      title: "Time's up!",
      description: "Your test will be submitted automatically.",
      variant: "destructive",
    });
    handleSubmit();
  }, []);

  const handleSubmit = async () => {
    if (!test || !user || isSubmitting) return;
    
    setIsSubmitting(true);
    setShowSubmitDialog(false);

    try {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      const result = calculateScore(test.questions, answers);

      // Update the test attempt
      const { error } = await supabase
        .from("test_attempts")
        .update({
          answers: answers,
          score: result.score,
          correct_answers: result.correct,
          total_questions: result.total,
          time_spent_seconds: timeSpent,
          completed_at: new Date().toISOString(),
          feedback: {
            byTopic: result.byTopic,
            bySection: result.bySection,
          },
        })
        .eq("id", test.id);

      if (error) throw error;

      // Decrement questions remaining by the number of questions taken
      const questionsUsed = test.questions.length;
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
      navigate(`/dashboard/tests/${test.id}/results`, {
        state: {
          test,
          answers,
          result,
          timeSpent,
        },
      });
    } catch (error) {
      console.error("Error submitting test:", error);
      toast({
        title: "Error",
        description: "Failed to submit test. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  if (!test) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  const currentQuestion = test.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = test.questions.length - answeredCount;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Practice Test</h1>
            <p className="text-muted-foreground">
              {answeredCount} of {test.questions.length} answered
            </p>
          </div>
          <div className="flex items-center gap-4">
            {test.timeLimit && (
              <TestTimer
                initialMinutes={test.timeLimit}
                onTimeUp={handleTimeUp}
                isPaused={isPaused}
                onTogglePause={() => setIsPaused(!isPaused)}
              />
            )}
            <Button
              variant="hero"
              onClick={() => setShowSubmitDialog(true)}
              disabled={isSubmitting}
            >
              <Send className="w-4 h-4" />
              Submit Test
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          {/* Question Card */}
          <div className="space-y-4">
            <QuestionCard
              question={currentQuestion}
              questionNumber={currentIndex + 1}
              totalQuestions={test.questions.length}
              selectedAnswer={answers[currentQuestion.id]}
              onAnswerChange={handleAnswerChange}
              isFlagged={flaggedQuestions.has(currentQuestion.id)}
              onToggleFlag={handleToggleFlag}
            />

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {test.questions.length}
              </span>
              <Button
                variant="outline"
                onClick={handleNext}
                disabled={currentIndex === test.questions.length - 1}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Question Navigation Sidebar */}
          <div className="hidden lg:block">
            <QuestionNav
              questions={test.questions}
              currentIndex={currentIndex}
              answers={answers}
              flaggedQuestions={flaggedQuestions}
              onNavigate={handleNavigate}
            />
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Submit Test?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {unansweredCount > 0 ? (
                <>
                  You have <strong>{unansweredCount} unanswered question{unansweredCount > 1 ? "s" : ""}</strong>.
                  {flaggedQuestions.size > 0 && (
                    <> and <strong>{flaggedQuestions.size} flagged question{flaggedQuestions.size > 1 ? "s" : ""}</strong></>
                  )}
                  {" "}Are you sure you want to submit?
                </>
              ) : flaggedQuestions.size > 0 ? (
                <>
                  You have <strong>{flaggedQuestions.size} flagged question{flaggedQuestions.size > 1 ? "s" : ""}</strong> to review.
                  Are you sure you want to submit?
                </>
              ) : (
                "You've answered all questions. Ready to submit?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Review Answers</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Test"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

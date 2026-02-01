import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { QuestionCard } from "@/components/test/QuestionCard";
import { 
  Trophy, 
  Target, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  RotateCcw,
  Home,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Question, GeneratedTest } from "@/lib/test-generator";

interface ResultData {
  score: number;
  correct: number;
  total: number;
  byTopic: Record<string, { correct: number; total: number }>;
  bySection: Record<string, { correct: number; total: number }>;
}

export default function TestResults() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { test, answers, result, timeSpent } = location.state as {
    test: GeneratedTest;
    answers: Record<string, string>;
    result: ResultData;
    timeSpent: number;
  } || {};

  const [reviewIndex, setReviewIndex] = useState<number | null>(null);

  if (!test || !result) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">No test results found.</p>
          <Button asChild>
            <Link to="/dashboard/tests">Back to Tests</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90) return "Excellent work! 🎉";
    if (score >= 80) return "Great job! Keep it up! 💪";
    if (score >= 70) return "Good effort! Room to improve.";
    if (score >= 60) return "Not bad. Keep practicing!";
    return "Keep studying. You'll get there! 📚";
  };

  // Review mode
  if (reviewIndex !== null) {
    const currentQuestion = test.questions[reviewIndex];
    const isCorrect = answers[currentQuestion.id]?.toLowerCase().trim() === currentQuestion.correct_answer.toLowerCase().trim();

    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setReviewIndex(null)}>
              <ChevronLeft className="w-4 h-4" />
              Back to Results
            </Button>
            <div className="flex items-center gap-2">
              {isCorrect ? (
                <span className="flex items-center gap-1 text-green-500 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Correct
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-500 text-sm font-medium">
                  <XCircle className="w-4 h-4" /> Incorrect
                </span>
              )}
            </div>
          </div>

          {/* Question Review */}
          <QuestionCard
            question={currentQuestion}
            questionNumber={reviewIndex + 1}
            totalQuestions={test.questions.length}
            selectedAnswer={answers[currentQuestion.id]}
            onAnswerChange={() => {}}
            isFlagged={false}
            onToggleFlag={() => {}}
            showCorrectAnswer={true}
          />

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setReviewIndex(Math.max(0, reviewIndex - 1))}
              disabled={reviewIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {reviewIndex + 1} / {test.questions.length}
            </span>
            <Button
              variant="outline"
              onClick={() => setReviewIndex(Math.min(test.questions.length - 1, reviewIndex + 1))}
              disabled={reviewIndex === test.questions.length - 1}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Score Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-2">
            <Trophy className={cn("w-10 h-10", getScoreColor(result.score))} />
          </div>
          <h1 className={cn("text-5xl font-bold", getScoreColor(result.score))}>
            {result.score}%
          </h1>
          <p className="text-xl text-muted-foreground">{getScoreMessage(result.score)}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border border-border/50 p-6 text-center">
            <Target className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">
              {result.correct}/{result.total}
            </div>
            <div className="text-sm text-muted-foreground">Correct Answers</div>
          </div>
          <div className="bg-card rounded-xl border border-border/50 p-6 text-center">
            <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">
              {formatTime(timeSpent)}
            </div>
            <div className="text-sm text-muted-foreground">Time Spent</div>
          </div>
          <div className="bg-card rounded-xl border border-border/50 p-6 text-center">
            <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground capitalize">
              {test.config.difficulty}
            </div>
            <div className="text-sm text-muted-foreground">Difficulty</div>
          </div>
        </div>

        {/* Section Breakdown */}
        {Object.keys(result.bySection).length > 0 && (
          <div className="bg-card rounded-xl border border-border/50 p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Score by Section</h2>
            <div className="space-y-4">
              {Object.entries(result.bySection).map(([section, data]) => {
                const percentage = Math.round((data.correct / data.total) * 100);
                return (
                  <div key={section} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground capitalize">
                        {section === "math" ? "Math" : "Reading & Writing"}
                      </span>
                      <span className={cn("font-semibold", getScoreColor(percentage))}>
                        {data.correct}/{data.total} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          percentage >= 80 ? "bg-green-500" : percentage >= 60 ? "bg-yellow-500" : "bg-red-500"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Topic Breakdown */}
        {Object.keys(result.byTopic).length > 0 && (
          <div className="bg-card rounded-xl border border-border/50 p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Score by Topic</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {Object.entries(result.byTopic).map(([topic, data]) => {
                const percentage = Math.round((data.correct / data.total) * 100);
                return (
                  <div key={topic} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-foreground capitalize">{topic.replace("_", " ")}</span>
                    <span className={cn("font-semibold", getScoreColor(percentage))}>
                      {data.correct}/{data.total}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Question Review Grid */}
        <div className="bg-card rounded-xl border border-border/50 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Review Questions</h2>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {test.questions.map((question, index) => {
              const userAnswer = answers[question.id];
              const isCorrect = userAnswer?.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
              const isUnanswered = !userAnswer;

              return (
                <button
                  key={question.id}
                  onClick={() => setReviewIndex(index)}
                  className={cn(
                    "w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105",
                    isUnanswered
                      ? "bg-muted text-muted-foreground"
                      : isCorrect
                      ? "bg-green-500/20 text-green-600 border border-green-500/50"
                      : "bg-red-500/20 text-red-600 border border-red-500/50"
                  )}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-green-500/20 border border-green-500/50" />
              <span>Correct</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-red-500/20 border border-red-500/50" />
              <span>Incorrect</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-muted" />
              <span>Unanswered</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="outline" asChild>
            <Link to="/dashboard">
              <Home className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </Button>
          <Button variant="hero" asChild>
            <Link to="/dashboard/tests">
              <RotateCcw className="w-4 h-4" />
              Take Another Test
            </Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

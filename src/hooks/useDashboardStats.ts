 import { useAuth } from "@/contexts/AuthContext";
 import { supabase } from "@/integrations/supabase/client";
 import { useQuery } from "@tanstack/react-query";
 
// Convert raw accuracy (0-100%) to SAT scaled score (200-800)
function toSATScore(accuracy: number): number {
  // Linear approximation: 0% = 200, 100% = 800
  return Math.round(200 + (accuracy / 100) * 600);
}

interface SectionFeedback {
  correct: number;
  total: number;
}

interface TestFeedback {
  bySection?: {
    math?: SectionFeedback;
    reading_writing?: SectionFeedback;
  };
}

 export interface DashboardStats {
   bestScore: number;
   avgAccuracy: number;
   testsTaken: number;
   scoreChange: number;
   hasProgress: boolean;
   isLoading: boolean;
  // SAT-style scores
  mathScore: number;
  rwScore: number;
  totalSATScore: number;
 }
 
 export function useDashboardStats(): DashboardStats {
   const { user } = useAuth();
 
   const { data: testAttempts, isLoading } = useQuery({
     queryKey: ["dashboard-stats", user?.id],
     queryFn: async () => {
       if (!user?.id) return [];
       const { data, error } = await supabase
         .from("test_attempts")
        .select("score, correct_answers, total_questions, completed_at, feedback")
         .eq("user_id", user.id)
         .not("completed_at", "is", null)
         .order("created_at", { ascending: true });
       
       if (error) throw error;
       return data || [];
     },
     enabled: !!user?.id,
     staleTime: 1000 * 60 * 5, // 5 minutes
   });
 
   const completedAttempts = testAttempts || [];
   const hasProgress = completedAttempts.length > 0;
 
   const avgAccuracy = hasProgress 
     ? Math.round(
         completedAttempts.reduce(
           (sum, a) => sum + ((a.correct_answers || 0) / (a.total_questions || 1) * 100), 
           0
         ) / completedAttempts.length
       )
     : 0;
   
   const testsTaken = completedAttempts.length;
   
   const scoreChange = completedAttempts.length >= 2
     ? (completedAttempts[completedAttempts.length - 1]?.score || 0) - (completedAttempts[0]?.score || 0)
     : 0;
 
  // Calculate section-specific scores from feedback
  let totalMathCorrect = 0;
  let totalMathQuestions = 0;
  let totalRWCorrect = 0;
  let totalRWQuestions = 0;

  for (const attempt of completedAttempts) {
    const feedback = attempt.feedback as TestFeedback | null;
    if (feedback?.bySection) {
      if (feedback.bySection.math) {
        totalMathCorrect += feedback.bySection.math.correct;
        totalMathQuestions += feedback.bySection.math.total;
      }
      if (feedback.bySection.reading_writing) {
        totalRWCorrect += feedback.bySection.reading_writing.correct;
        totalRWQuestions += feedback.bySection.reading_writing.total;
      }
    }
  }

  const mathAccuracy = totalMathQuestions > 0 ? (totalMathCorrect / totalMathQuestions) * 100 : 0;
  const rwAccuracy = totalRWQuestions > 0 ? (totalRWCorrect / totalRWQuestions) * 100 : 0;
  
  const mathScore = hasProgress ? toSATScore(mathAccuracy) : 0;
  const rwScore = hasProgress ? toSATScore(rwAccuracy) : 0;
  const totalSATScore = hasProgress ? mathScore + rwScore : 0;
  
  // Best score is now based on SAT total
  const bestScore = totalSATScore;

   return {
     bestScore,
     avgAccuracy,
     testsTaken,
     scoreChange,
     hasProgress,
     isLoading,
    mathScore,
    rwScore,
    totalSATScore,
   };
 }
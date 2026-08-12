 import { useAuth } from "@/contexts/AuthContext";
 import { supabase } from "@/integrations/supabase/client";
 import { useQuery } from "@tanstack/react-query";
 import { sectionScore, totalScore } from "@/lib/sat-score";
 


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
   /** null when no completed attempt yields a usable score. */
   bestScore: number | null;
   avgAccuracy: number;
   testsTaken: number;
   scoreChange: number;
   hasProgress: boolean;
   isLoading: boolean;
  // SAT-style scores. null = section never attempted (render "—", not 200).
  mathScore: number | null;
  rwScore: number | null;
  totalSATScore: number | null;
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
         .eq("abandoned", false)
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

  // A section with no attempted questions has NO score — it must stay null so
  // the UI renders "—" instead of the misleading 200 floor.
  const mathScore = sectionScore(totalMathCorrect, totalMathQuestions, "math");
  const rwScore = sectionScore(totalRWCorrect, totalRWQuestions, "reading_writing");

  // Older attempts predate per-section feedback: fall back to the overall
  // correct/total so those students still see a real total instead of "—".
  let totalSATScore = totalScore(mathScore, rwScore);
  if (totalSATScore === null && hasProgress) {
    const overallCorrect = completedAttempts.reduce((s, a) => s + (a.correct_answers || 0), 0);
    const overallTotal = completedAttempts.reduce((s, a) => s + (a.total_questions || 0), 0);
    const projected = sectionScore(overallCorrect, overallTotal, "math");
    totalSATScore = projected === null ? null : Math.min(1600, projected * 2);
  }

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
 import { useAuth } from "@/contexts/AuthContext";
 import { supabase } from "@/integrations/supabase/client";
 import { useQuery } from "@tanstack/react-query";
 
 export interface DashboardStats {
   bestScore: number;
   avgAccuracy: number;
   testsTaken: number;
   scoreChange: number;
   hasProgress: boolean;
   isLoading: boolean;
 }
 
 export function useDashboardStats(): DashboardStats {
   const { user } = useAuth();
 
   const { data: testAttempts, isLoading } = useQuery({
     queryKey: ["dashboard-stats", user?.id],
     queryFn: async () => {
       if (!user?.id) return [];
       const { data, error } = await supabase
         .from("test_attempts")
         .select("score, correct_answers, total_questions, completed_at")
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
 
   const bestScore = hasProgress 
     ? Math.max(...completedAttempts.map(a => a.score || 0)) 
     : 0;
   
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
 
   return {
     bestScore,
     avgAccuracy,
     testsTaken,
     scoreChange,
     hasProgress,
     isLoading,
   };
 }
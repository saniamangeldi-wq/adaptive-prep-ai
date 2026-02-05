 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 // Tier credit limits for daily reset
 const TIER_CREDIT_LIMITS: Record<string, number> = {
   tier_0: 20,
   tier_1: 50,
   tier_2: 150,
   tier_3: 300,
 };
 
 const TRIAL_CREDITS_PER_DAY = 100;
 const ADVISOR_CREDIT_COST = 2; // University advisor costs 2 credits per message
 
 // Check if credits should be reset (new day)
 function shouldResetCredits(creditsResetAt: string | null): boolean {
   if (!creditsResetAt) return true;
   
   const resetDate = new Date(creditsResetAt);
   const now = new Date();
   
   return now.toDateString() !== resetDate.toDateString();
 }
 
 // Get daily credit limit based on tier and trial status
 function getDailyCredits(tier: string, isTrial: boolean): number {
   if (isTrial) return TRIAL_CREDITS_PER_DAY;
   return TIER_CREDIT_LIMITS[tier] || TIER_CREDIT_LIMITS.tier_0;
 }
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
     if (!LOVABLE_API_KEY) {
       throw new Error("LOVABLE_API_KEY is not configured");
     }
 
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
     
     // Use service role for data access
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     const { student_id, target_university, messages = [] } = await req.json();
 
     if (!student_id) {
       return new Response(
         JSON.stringify({ error: "student_id is required" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Get user profile for credits
     const { data: userProfile, error: profileError } = await supabase
       .from("profiles")
       .select("tier, credits_remaining, credits_reset_at, is_trial")
       .eq("user_id", student_id)
       .single();
 
     if (profileError || !userProfile) {
       return new Response(
         JSON.stringify({ error: "Profile not found" }),
         { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Check if credits need to be reset (new day)
     let currentCredits = userProfile.credits_remaining;
     const needsReset = shouldResetCredits(userProfile.credits_reset_at);
     
     if (needsReset) {
       const dailyLimit = getDailyCredits(userProfile.tier, userProfile.is_trial);
       currentCredits = dailyLimit;
       
       // Reset credits in database
       await supabase
         .from("profiles")
         .update({ 
           credits_remaining: dailyLimit,
           credits_reset_at: new Date().toISOString()
         })
         .eq("user_id", student_id);
     }
 
     // Check if user has enough credits
     if (currentCredits < ADVISOR_CREDIT_COST) {
       return new Response(
         JSON.stringify({ 
           error: `Not enough credits. University advisor requires ${ADVISOR_CREDIT_COST} credits per message.`,
           credits_remaining: currentCredits
         }),
         { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Deduct credits
     const { error: updateError } = await supabase
       .from("profiles")
       .update({ credits_remaining: currentCredits - ADVISOR_CREDIT_COST })
       .eq("user_id", student_id);
 
     if (updateError) {
       console.error("Failed to deduct credits:", updateError);
     }
 
    // Get student's matches
     const { data: matches } = await supabase
       .from("student_university_matches")
       .select(`
         match_score,
         match_reason,
         university:university_database (
           name,
           country,
           ranking_global,
           acceptance_rate,
           avg_sat_score,
           tuition_usd,
           programs,
           application_deadline
         )
       `)
       .eq("student_id", student_id)
       .order("match_score", { ascending: false })
       .limit(10);
 
     // Get student's portfolio
     const { data: portfolio } = await supabase
       .from("student_portfolios")
       .select("*")
       .eq("student_id", student_id)
       .maybeSingle();
 
     // Get student's preferences
     const { data: preferences } = await supabase
       .from("university_preferences")
       .select("*")
       .eq("student_id", student_id)
       .maybeSingle();
 
     // Get student profile
     const { data: profile } = await supabase
       .from("profiles")
       .select("full_name, grade_level, study_subjects, primary_goal")
       .eq("user_id", student_id)
       .maybeSingle();
 
     const matchesSummary = matches?.map(m => ({
       name: (m.university as any)?.name,
       country: (m.university as any)?.country,
       ranking: (m.university as any)?.ranking_global,
       acceptance_rate: (m.university as any)?.acceptance_rate,
       sat_score: (m.university as any)?.avg_sat_score,
       programs: (m.university as any)?.programs?.slice(0, 5),
       match_score: m.match_score,
       deadline: (m.university as any)?.application_deadline
     }));
 
    // Get current date info for planning
    const now = new Date();
    const currentDate = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const currentMonth = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

     const systemPrompt = `You are a university admissions advisor AI assistant for AdaptivePrep, a comprehensive educational platform. Your role is to help students create personalized 1-year plans to get accepted into their dream universities.
 
CURRENT DATE: ${currentDate}
CURRENT MONTH: ${currentMonth}

Use this date information when creating timelines and plans. All deadlines and milestones should be based on real calendar dates starting from today.

 STUDENT PROFILE:
 - Name: ${profile?.full_name || "Student"}
 - Grade Level: ${profile?.grade_level || "Not specified"}
 - Study Subjects: ${profile?.study_subjects?.join(", ") || "Various"}
 - Primary Goal: ${profile?.primary_goal || "University admission"}
 
 STUDENT'S TOP UNIVERSITY MATCHES:
 ${JSON.stringify(matchesSummary, null, 2)}
 
 STUDENT PREFERENCES:
 - Preferred Countries: ${preferences?.preferred_countries?.join(", ") || "Not specified"}
 - Fields of Interest: ${preferences?.fields_of_interest?.join(", ") || "Not specified"}
 - Scholarship Need: ${preferences?.scholarship_need || "Not specified"}
 - University Size: ${preferences?.university_size || "No preference"}
 
 ${target_university ? `TARGET UNIVERSITY: ${target_university}` : ""}
 
 YOUR RESPONSIBILITIES:
 1. If the student hasn't specified a target university, ask them which university from their matches they want to focus on.
 2. Once a target is set, create a detailed 12-month action plan covering:
    - Academic preparation (SAT/ACT prep, GPA improvement)
    - Extracurricular activities to strengthen application
    - Essay writing timeline
    - Recommendation letter requests
    - Application deadlines and milestones
    - Scholarship application deadlines
    - Interview preparation
 3. Provide monthly goals and weekly action items.
 4. Be encouraging but realistic about admission chances.
 5. Consider the student's current profile and what gaps need to be filled.
 
 COMMUNICATION STYLE:
 - Be warm, encouraging, and professional
 - Use clear structure with headers and bullet points
 - Break down complex tasks into actionable steps
 - Celebrate progress and acknowledge challenges
 - Keep responses focused and under 600 words unless creating a full plan
 - When creating a full 12-month plan, structure it clearly by month`;
 
     const aiMessages = [
       { role: "system", content: systemPrompt },
       ...messages
     ];
 
     const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
       method: "POST",
       headers: {
         Authorization: `Bearer ${LOVABLE_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         model: "google/gemini-3-flash-preview",
         messages: aiMessages,
         stream: true,
       }),
     });
 
     if (!response.ok) {
       if (response.status === 429) {
         return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
           status: 429,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
       }
       if (response.status === 402) {
         return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
           status: 402,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
       }
       const t = await response.text();
       console.error("AI gateway error:", response.status, t);
       return new Response(JSON.stringify({ error: "AI gateway error" }), {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     return new Response(response.body, {
       headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
     });
   } catch (error) {
     console.error("University advisor error:", error);
     return new Response(
       JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });
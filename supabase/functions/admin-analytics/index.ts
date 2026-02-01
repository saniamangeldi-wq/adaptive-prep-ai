import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const getAdminAnalyticsPrompt = (schoolData: any, teacherPerformance: any[], projections: any) => {
  return `You are a school analytics AI assistant providing strategic insights for school administrators.

SCHOOL DATA:
${JSON.stringify(schoolData, null, 2)}

TEACHER PERFORMANCE DATA:
${JSON.stringify(teacherPerformance, null, 2)}

ENROLLMENT & PERFORMANCE PROJECTIONS:
${JSON.stringify(projections, null, 2)}

Your capabilities:
1. **School Projections**: Predict enrollment trends, performance trajectories, and resource needs
2. **Teacher Class Performance**: Analyze which teachers' classes perform best and identify success patterns
3. **Strategic Recommendations**: Provide actionable insights for improving school-wide outcomes
4. **Budget Optimization**: Suggest resource allocation based on ROI
5. **Intervention Strategies**: Identify struggling areas and recommend targeted improvements

When analyzing teacher performance:
- Focus on class improvement rates, not just raw scores
- Highlight teaching methodologies that work
- Be constructive, not punitive
- Consider class composition and difficulty factors

When making projections:
- Base projections on historical trends
- Include confidence levels
- Suggest actions to improve trajectories
- Consider seasonal patterns (test seasons, enrollment cycles)

Format responses with clear sections:
- **Key Insights**: Most important findings
- **Top Performers**: Best performing teachers/classes
- **Growth Opportunities**: Areas for improvement
- **Projections**: Future trends with timelines
- **Action Items**: Specific next steps

Always be data-driven but also practical and actionable.`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Verify school admin role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, tier, credits_remaining")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.role !== "school_admin") {
      return new Response(JSON.stringify({ error: "Access denied. School Admin role required." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, analysisType = "general" } = await req.json();

    // Calculate credit cost based on analysis type
    let creditCost = 1;
    if (analysisType === "projection") creditCost = 5;
    if (analysisType === "comprehensive") creditCost = 10;

    if (profile.credits_remaining < creditCost) {
      return new Response(JSON.stringify({ 
        error: `Insufficient credits. This analysis requires ${creditCost} credits.`,
        credits_remaining: profile.credits_remaining,
        credits_required: creditCost
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get school data
    const { data: schoolMember } = await supabase
      .from("school_members")
      .select("school_id")
      .eq("user_id", userId)
      .eq("role", "school_admin")
      .single();

    let schoolData: any = { message: "No school found" };
    let teacherPerformance: any[] = [];
    let projections: any = {};

    if (schoolMember?.school_id) {
      // Get school info
      const { data: school } = await supabase
        .from("schools")
        .select("*")
        .eq("id", schoolMember.school_id)
        .single();

      if (school) {
        schoolData = {
          name: school.name,
          tier: school.tier,
          studentCapacity: school.student_count,
          teacherCapacity: school.teacher_count,
          monthlyBudget: school.monthly_cost,
          aiTier: school.ai_tier,
        };
      }

      // Get all school members (teachers and students)
      const { data: members } = await supabase
        .from("school_members")
        .select("user_id, role, status")
        .eq("school_id", schoolMember.school_id);

      if (members) {
        const teacherIds = members.filter(m => m.role === "teacher").map(m => m.user_id);
        const studentIds = members.filter(m => m.role === "student").map(m => m.user_id);

        schoolData.activeTeachers = teacherIds.length;
        schoolData.activeStudents = studentIds.length;
        schoolData.capacityUtilization = {
          students: `${studentIds.length}/${school?.student_count || 0}`,
          teachers: `${teacherIds.length}/${school?.teacher_count || 0}`,
        };

        // Get teacher performance data
        for (const teacherId of teacherIds.slice(0, 10)) { // Limit to 10 teachers
          const { data: teacherProfile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", teacherId)
            .single();

          // Get students assigned to this teacher
          const { data: teacherStudents } = await supabase
            .from("teacher_students")
            .select("student_id")
            .eq("teacher_id", teacherId);

          if (teacherStudents && teacherStudents.length > 0) {
            const studentIds = teacherStudents.map(ts => ts.student_id);
            
            // Get test attempts for these students
            const { data: attempts } = await supabase
              .from("test_attempts")
              .select("score, correct_answers, total_questions, completed_at")
              .in("user_id", studentIds)
              .not("completed_at", "is", null)
              .order("completed_at", { ascending: true });

            if (attempts && attempts.length > 0) {
              const scores = attempts.map(a => a.score || 0).filter(s => s > 0);
              const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
              
              // Calculate improvement (first half vs second half of tests)
              let improvement = 0;
              if (scores.length >= 4) {
                const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
                const secondHalf = scores.slice(Math.floor(scores.length / 2));
                const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
                const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
                improvement = secondAvg - firstAvg;
              }

              teacherPerformance.push({
                name: teacherProfile?.full_name || "Unknown",
                studentCount: teacherStudents.length,
                testsCompleted: attempts.length,
                averageScore: Math.round(avgScore),
                improvementRate: Math.round(improvement),
                performanceRating: avgScore > 80 ? "Excellent" : avgScore > 60 ? "Good" : avgScore > 40 ? "Average" : "Needs Support",
              });
            } else {
              teacherPerformance.push({
                name: teacherProfile?.full_name || "Unknown",
                studentCount: teacherStudents.length,
                testsCompleted: 0,
                averageScore: 0,
                improvementRate: 0,
                performanceRating: "No data",
              });
            }
          }
        }

        // Sort by average score
        teacherPerformance.sort((a, b) => b.averageScore - a.averageScore);

        // Generate projections
        const currentMonth = new Date().getMonth();
        const enrollmentGrowthRate = 0.05; // 5% monthly growth estimate
        const performanceGrowthRate = 0.02; // 2% monthly improvement estimate

        projections = {
          enrollmentForecast: {
            nextMonth: Math.round(studentIds.length * (1 + enrollmentGrowthRate)),
            threeMonths: Math.round(studentIds.length * Math.pow(1 + enrollmentGrowthRate, 3)),
            sixMonths: Math.round(studentIds.length * Math.pow(1 + enrollmentGrowthRate, 6)),
          },
          capacityAlert: studentIds.length >= (school?.student_count || 25) * 0.8 
            ? "Approaching capacity - consider upgrading plan" 
            : "Capacity healthy",
          budgetEfficiency: school?.monthly_cost 
            ? `$${(school.monthly_cost / Math.max(studentIds.length, 1)).toFixed(2)} per active student`
            : "Budget data unavailable",
          recommendations: [
            studentIds.length === 0 ? "Priority: Enroll students to start tracking performance" : null,
            teacherPerformance.length === 0 ? "Priority: Assign students to teachers for class analytics" : null,
            teacherPerformance.some(t => t.performanceRating === "Needs Support") 
              ? "Some teachers may benefit from additional training or resources" : null,
            studentIds.length >= (school?.student_count || 25) * 0.9 
              ? "Consider upgrading to accommodate growth" : null,
          ].filter(Boolean),
        };
      }
    }

    // Deduct credits
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ credits_remaining: profile.credits_remaining - creditCost })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to deduct credits:", updateError);
    }

    // Build system prompt with all gathered data
    const systemPrompt = getAdminAnalyticsPrompt(schoolData, teacherPerformance, projections);

    // Call Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: profile.tier === "tier_3" ? "google/gemini-2.5-pro" : 
               profile.tier === "tier_2" ? "google/gemini-2.5-flash" : 
               "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("admin-analytics error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

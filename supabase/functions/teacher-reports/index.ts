import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const getTeacherSystemPrompt = (role: string) => {
  const basePrompt = `You are an educational analytics assistant helping ${role === 'tutor' ? 'tutors' : 'teachers'} understand student performance and create actionable insights.

CRITICAL OUTPUT RULES:
- NEVER use <think> tags or expose internal reasoning. Only output the final answer.
- DO NOT wrap any part of your response in <think>...</think> blocks.
- Keep responses concise (2-4 paragraphs) unless generating a formal report.
- For quick questions, give quick answers. Match response length to question complexity.
- If the user says "FAST" or mentions a deadline, keep response under 200 words.

Your capabilities:
1. Analyze student performance data
2. Identify struggling students and recommend interventions
3. Create progress reports
4. Suggest lesson focus areas based on class weaknesses
5. Generate individualized learning recommendations
6. Help with teaching strategies and best practices

When generating reports, format them with:
- **Summary**: Brief overview of performance
- **Strengths**: What the student/class is doing well
- **Areas for Improvement**: Topics needing more practice
- **Recommendations**: Specific action items
- **Comparison**: How they compare to averages (when data available)

For chat questions, be helpful and professional. Reference specific data when available.
You can also help ${role === 'tutor' ? 'tutors' : 'teachers'} with their own SAT knowledge - explain concepts, suggest teaching approaches, etc.`;

  return basePrompt;
};

const getAdminSystemPrompt = () => {
  return `You are a school management analytics assistant providing strategic insights for school administrators.

CRITICAL OUTPUT RULES:
- NEVER use <think> tags or expose internal reasoning. Only output the final answer.
- DO NOT wrap any part of your response in <think>...</think> blocks.
- Keep responses concise unless generating a formal report.

Your capabilities:
1. Analyze school-wide performance trends
2. Compare teacher and class effectiveness
3. Generate executive-level reports for stakeholders
4. Provide budget and resource allocation recommendations
5. Identify enrollment and capacity optimization opportunities
6. Track ROI on educational investments

When generating reports, format them professionally:
- **Executive Summary**: Key metrics and takeaways
- **Performance Overview**: School-wide statistics
- **Teacher Insights**: Comparative analysis (without being punitive)
- **Student Outcomes**: Improvement rates and goal tracking
- **Recommendations**: Strategic action items
- **Resource Considerations**: Budget and capacity notes

Focus on data-driven insights that help administrators make informed decisions.`;
};

// Transform stream to strip <think>...</think> blocks
function stripThinkTagsFromStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let insideThink = false;
  let buffer = "";
  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { controller.close(); return; }
        buffer += decoder.decode(value, { stream: true });
        let output = "";
        while (buffer.length > 0) {
          if (insideThink) {
            const endIdx = buffer.indexOf("</think>");
            if (endIdx === -1) { if (buffer.length > 100) buffer = ""; break; }
            buffer = buffer.slice(endIdx + 8);
            insideThink = false;
          } else {
            const startIdx = buffer.indexOf("<think>");
            if (startIdx === -1) {
              let safeEnd = buffer.length;
              for (let i = 1; i < 7 && i <= buffer.length; i++) {
                if ("<think>".startsWith(buffer.slice(-i))) { safeEnd = buffer.length - i; break; }
              }
              output += buffer.slice(0, safeEnd);
              buffer = buffer.slice(safeEnd);
              break;
            }
            output += buffer.slice(0, startIdx);
            buffer = buffer.slice(startIdx + 7);
            insideThink = true;
          }
        }
        if (output) { controller.enqueue(encoder.encode(output)); return; }
      }
    },
  });
}

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

    // Get user profile
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

    // Check if user has appropriate role
    if (!["tutor", "teacher", "school_admin"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Access denied. Teacher/Tutor/Admin role required." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, isReport = false, reportContext } = await req.json();

    // Calculate credit cost (1 for chat, 5 for report, 10 for school-wide report)
    let creditCost = 1;
    if (isReport) {
      creditCost = profile.role === "school_admin" ? 10 : 5;
    }

    if (profile.credits_remaining < creditCost) {
      return new Response(JSON.stringify({ 
        error: `Insufficient credits. This action requires ${creditCost} credits.`,
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

    // Get relevant student data for context
    let studentContext = "";
    
    if (profile.role === "tutor") {
      // Get tutor's students and their test attempts
      const { data: students } = await supabase
        .from("tutor_students")
        .select(`
          student_id,
          profiles!tutor_students_student_id_fkey(full_name, email)
        `)
        .eq("tutor_id", userId);

      if (students && students.length > 0) {
        const studentIds = students.map(s => s.student_id);
        const { data: attempts } = await supabase
          .from("test_attempts")
          .select("user_id, score, correct_answers, total_questions, completed_at")
          .in("user_id", studentIds)
          .order("completed_at", { ascending: false })
          .limit(50);

        studentContext = `\n\nYour students: ${students.length}\nRecent test attempts available: ${attempts?.length || 0}`;
        if (attempts && attempts.length > 0) {
          studentContext += `\nRecent test data: ${JSON.stringify(attempts.slice(0, 10))}`;
        }
      }
    } else if (profile.role === "teacher") {
      const { data: students } = await supabase
        .from("teacher_students")
        .select(`
          student_id,
          profiles!teacher_students_student_id_fkey(full_name, email)
        `)
        .eq("teacher_id", userId);

      if (students && students.length > 0) {
        const studentIds = students.map(s => s.student_id);
        const { data: attempts } = await supabase
          .from("test_attempts")
          .select("user_id, score, correct_answers, total_questions, completed_at")
          .in("user_id", studentIds)
          .order("completed_at", { ascending: false })
          .limit(50);

        studentContext = `\n\nYour students: ${students.length}\nRecent test attempts available: ${attempts?.length || 0}`;
        if (attempts && attempts.length > 0) {
          studentContext += `\nRecent test data: ${JSON.stringify(attempts.slice(0, 10))}`;
        }
      }
    } else if (profile.role === "school_admin") {
      // Get school-wide data
      const { data: school } = await supabase
        .from("school_members")
        .select("school_id, schools(name, student_count, teacher_count)")
        .eq("user_id", userId)
        .single();

      if (school && school.schools) {
        // Handle the joined data - schools comes as an object from single() relation
        const schoolData = school.schools as unknown as { name: string; student_count: number; teacher_count: number };
        studentContext = `\n\nSchool: ${schoolData.name}\nRegistered students: ${schoolData.student_count}\nTeachers: ${schoolData.teacher_count}`;
      }
    }

    // Deduct credits
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ credits_remaining: profile.credits_remaining - creditCost })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to deduct credit:", updateError);
    }

    // Build system prompt
    const systemPrompt = profile.role === "school_admin" 
      ? getAdminSystemPrompt() + studentContext
      : getTeacherSystemPrompt(profile.role) + studentContext;

    // Add report context if generating a report
    let enhancedMessages = [...messages];
    if (isReport && reportContext) {
      enhancedMessages = [
        { role: "user", content: `Generate a ${reportContext.type} report. ${reportContext.instructions || ''}` },
        ...messages
      ];
    }

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
          ...enhancedMessages,
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

    const transformedBody = stripThinkTagsFromStream(response.body!);

    return new Response(transformedBody, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("teacher-reports error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

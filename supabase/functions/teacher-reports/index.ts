import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiChat, AI_MODELS, refundCredits, SKILL_LABELS, masteryPct, type MasteryRow } from "../_shared/ai.ts";

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

PARENT REPORTS:
When asked for a parent report or weekly update, write one short message per student that a parent can read in under a minute:
- Opening line: the student's name and the headline (improving / steady / needs attention).
- 2-3 facts from the roster: tests done, accuracy change, latest estimate range, strongest skill.
- One focus for next week (their weakest skill) and one concrete action.
- Write it in the language the tutor asks for (Russian or Kazakh are common); default to the language of the request.
- Never present an estimate as an official SAT score.

DATA RULES:
- Use only the numbers in the roster. If a student has no tests, say so and suggest a diagnostic test; don't guess.
- Skill names are the official Digital SAT domains; keep them in English in brackets when writing in Russian or Kazakh.

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

// Compact, per-student summary for the report prompt: tests taken, latest
// accuracy and estimate, weakest and strongest skills.
async function buildRoster(supabase: any, students: any[]): Promise<string> {
  const ids = students.map((s) => s.student_id);
  const [{ data: attempts }, { data: mastery }] = await Promise.all([
    supabase
      .from("test_attempts")
      .select("user_id, correct_answers, total_questions, completed_at, feedback")
      .in("user_id", ids)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(300),
    supabase.from("skill_mastery").select("user_id, skill, section, rating, attempts, correct").in("user_id", ids),
  ]);

  const lines: string[] = [];
  for (const s of students) {
    const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles ?? Object.values(s).find((v) => v && typeof v === "object");
    const name = p?.full_name || p?.email || "Unnamed student";
    const own = (attempts ?? []).filter((a: any) => a.user_id === s.student_id);
    const rows = ((mastery ?? []) as (MasteryRow & { user_id: string })[])
      .filter((m) => m.user_id === s.student_id && m.attempts >= 3)
      .sort((x, y) => x.rating - y.rating);
    const parts: string[] = [`${own.length} tests`];
    if (own[0]) {
      const a = own[0];
      const acc = a.total_questions ? Math.round((a.correct_answers / a.total_questions) * 100) : 0;
      parts.push(`latest ${a.correct_answers}/${a.total_questions} (${acc}%) on ${String(a.completed_at).slice(0, 10)}`);
      const est = a.feedback?.scoreEstimate;
      if (est?.total) parts.push(`latest estimate ${est.low}-${est.high}`);
    }
    if (own.length >= 2) {
      const acc = (a: any) => (a.total_questions ? a.correct_answers / a.total_questions : 0);
      const delta = Math.round((acc(own[0]) - acc(own[own.length - 1])) * 100);
      parts.push(`accuracy change since first test: ${delta >= 0 ? "+" : ""}${delta} pts`);
    }
    if (rows.length > 0) {
      parts.push("weakest: " + rows.slice(0, 2).map((r) => `${SKILL_LABELS[r.skill]} ${masteryPct(r.rating)}%`).join(", "));
      const best = rows[rows.length - 1];
      parts.push(`strongest: ${SKILL_LABELS[best.skill]} ${masteryPct(best.rating)}%`);
    }
    lines.push(`- ${name}: ${parts.join("; ")}`);
  }
  return `\n\nSTUDENT ROSTER (${students.length} students; % = skill mastery, the estimated chance of getting a medium question right; estimates are unofficial):\n${lines.join("\n")}\nUse these numbers. Don't invent data for students with no tests; suggest a diagnostic for them.`;
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

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




    // Get relevant student data for context
    let studentContext = "";
    
    if (profile.role === "tutor" || profile.role === "teacher") {
      // Per-student roster with skill mastery, so reports name real weak spots.
      const link = profile.role === "tutor"
        ? { table: "tutor_students", owner: "tutor_id", fk: "profiles!tutor_students_student_id_fkey" }
        : { table: "teacher_students", owner: "teacher_id", fk: "profiles!teacher_students_student_id_fkey" };
      const { data: students } = await supabase
        .from(link.table)
        .select(`student_id, ${link.fk}(full_name, email)`)
        .eq(link.owner, userId)
        .limit(40);

      if (students && students.length > 0) {
        studentContext = await buildRoster(supabase, students as any[]);
      } else {
        studentContext = "\n\nNo students are linked to this account yet.";
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

    // Deduct credits atomically (daily reset included); -1 means not enough.
    const { data: creditsLeft, error: creditError } = await supabase.rpc("consume_ai_credits", { p_cost: creditCost });
    if (creditError) {
      console.error("Failed to consume credits:", creditError);
      return new Response(JSON.stringify({ error: "Could not check your credits. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (creditsLeft === -1) {
      return new Response(JSON.stringify({
        error: `Insufficient credits. This action requires ${creditCost} credits.`,
        credits_required: creditCost
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    // Call the AI provider (see ../_shared/ai.ts)
    const response = await aiChat({
        model: profile.tier === "tier_3" ? AI_MODELS.deep : AI_MODELS.fast,
        messages: [
          { role: "system", content: systemPrompt },
          ...enhancedMessages,
        ],
        stream: true,
      });

    if (!response.ok) {
      await refundCredits(userId, creditCost);
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

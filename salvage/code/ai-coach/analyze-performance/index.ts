import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, test_attempt_id } = await req.json();

    // Fetch recent test attempts for this user and subject
    let query = supabase
      .from("test_attempts")
      .select("*, sat_tests!inner(title, section, test_type)")
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(10);

    if (test_attempt_id) {
      query = supabase
        .from("test_attempts")
        .select("*, sat_tests!inner(title, section, test_type)")
        .eq("id", test_attempt_id)
        .eq("user_id", user.id);
    }

    const { data: attempts, error: attemptsError } = await query;
    if (attemptsError) {
      console.error("Error fetching attempts:", attemptsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch test data" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!attempts || attempts.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No completed tests found",
          checkpoints: [],
          recommendations: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Also fetch module attempts for more granular data
    const attemptIds = attempts.map((a: any) => a.id);
    const { data: moduleAttempts } = await supabase
      .from("module_attempts")
      .select("*")
      .in("test_attempt_id", attemptIds);

    // Use AI to analyze performance and identify weak areas
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user's profile for VAK style
    const { data: profile } = await supabase
      .from("profiles")
      .select("vak_primary_style, vak_secondary_style, grade_level, study_subjects")
      .eq("user_id", user.id)
      .single();

    const analysisPrompt = `Analyze the following student test performance data and identify:
1. Weak areas that need improvement (specific topics/skills)
2. Strong areas the student excels at
3. Recommended topics for video lessons (prioritized by weakness)
4. Suggested difficulty level for each topic

Student profile:
- Grade level: ${profile?.grade_level || "unknown"}
- Learning style: ${profile?.vak_primary_style || "unknown"} (primary), ${profile?.vak_secondary_style || "unknown"} (secondary)
- Study subjects: ${JSON.stringify(profile?.study_subjects || [])}

Test attempts (${attempts.length} recent):
${JSON.stringify(
  attempts.map((a: any) => ({
    test: a.sat_tests?.title,
    section: a.sat_tests?.section,
    type: a.sat_tests?.test_type,
    score: a.score,
    correct: a.correct_answers,
    total: a.total_questions,
    time_spent: a.time_spent_seconds,
  })),
  null,
  2
)}

Module-level breakdown:
${JSON.stringify(
  (moduleAttempts || []).map((m: any) => ({
    section: m.section,
    module: m.module_number,
    score: m.score,
    correct: m.correct_answers,
    total: m.total_questions,
    time_spent: m.time_spent_seconds,
  })),
  null,
  2
)}

Return a JSON object with:
{
  "overall_score_pct": number,
  "weak_areas": [{"topic": string, "score_pct": number, "priority": "high"|"medium"|"low"}],
  "strong_areas": [{"topic": string, "score_pct": number}],
  "recommended_lessons": [{"topic": string, "subject": string, "difficulty": "easy"|"medium"|"hard", "reason": string}],
  "summary": string
}`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "You are an educational performance analyst. Analyze test data and provide actionable insights for personalized learning. Always respond with valid JSON only.",
            },
            { role: "user", content: analysisPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "performance_analysis",
                description: "Return structured performance analysis",
                parameters: {
                  type: "object",
                  properties: {
                    overall_score_pct: { type: "number" },
                    weak_areas: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          topic: { type: "string" },
                          score_pct: { type: "number" },
                          priority: {
                            type: "string",
                            enum: ["high", "medium", "low"],
                          },
                        },
                        required: ["topic", "score_pct", "priority"],
                      },
                    },
                    strong_areas: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          topic: { type: "string" },
                          score_pct: { type: "number" },
                        },
                        required: ["topic", "score_pct"],
                      },
                    },
                    recommended_lessons: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          topic: { type: "string" },
                          subject: { type: "string" },
                          difficulty: {
                            type: "string",
                            enum: ["easy", "medium", "hard"],
                          },
                          reason: { type: "string" },
                        },
                        required: ["topic", "subject", "difficulty", "reason"],
                      },
                    },
                    summary: { type: "string" },
                  },
                  required: [
                    "overall_score_pct",
                    "weak_areas",
                    "strong_areas",
                    "recommended_lessons",
                    "summary",
                  ],
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "performance_analysis" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const analysis = toolCall
      ? JSON.parse(toolCall.function.arguments)
      : { overall_score_pct: 0, weak_areas: [], strong_areas: [], recommended_lessons: [], summary: "Analysis unavailable" };

    // Save performance checkpoints
    const checkpoints = analysis.weak_areas.map((area: any) => ({
      user_id: user.id,
      subject: subject || "SAT",
      topic: area.topic,
      score_pct: area.score_pct,
      weak_areas: [area.topic],
      strong_areas: [],
      source_type: test_attempt_id ? "test_attempt" : "aggregate",
      source_id: test_attempt_id || null,
    }));

    if (checkpoints.length > 0) {
      const { error: insertError } = await supabase
        .from("performance_checkpoints")
        .insert(checkpoints);
      if (insertError) {
        console.error("Error saving checkpoints:", insertError);
      }
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-performance error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

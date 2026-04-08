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

    const { topic, subject, difficulty, vak_style: requestVakStyle } = await req.json();

    if (!topic || !subject) {
      return new Response(
        JSON.stringify({ error: "topic and subject are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user profile for personalization
    const { data: profile } = await supabase
      .from("profiles")
      .select("vak_primary_style, vak_secondary_style, grade_level, preferred_language, full_name")
      .eq("user_id", user.id)
      .single();

    const vakStyle = requestVakStyle || profile?.vak_primary_style || "visual";
    const gradeLevel = profile?.grade_level || "high school";
    const language = profile?.preferred_language || "en";

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

    // VAK-specific teaching strategies
    const vakStrategies: Record<string, string> = {
      visual:
        "Use diagrams, charts, color-coded explanations, spatial metaphors, and 'picture this' language. Describe visuals the viewer should imagine. Reference on-screen graphics frequently.",
      auditory:
        "Use rhythmic explanations, mnemonics, verbal repetition, analogies to sounds/music. Explain concepts conversationally as if in dialogue. Use 'listen' and 'hear' language.",
      reading_writing:
        "Structure content with clear headings, numbered steps, definitions, and written examples. Reference on-screen text. Use precise academic vocabulary. Include note-taking cues.",
      kinesthetic:
        "Use action verbs, real-world scenarios, hands-on examples, physical metaphors. Encourage the viewer to try things. Use 'feel' and 'do' language. Include practice pauses.",
    };

    const scriptPrompt = `Generate a detailed video lesson script for a ${gradeLevel} student.

TOPIC: ${topic}
SUBJECT: ${subject}
DIFFICULTY: ${difficulty || "medium"}
LEARNING STYLE: ${vakStyle}
LANGUAGE: ${language === "en" ? "English" : language === "ru" ? "Russian" : language === "kk" ? "Kazakh" : "English"}

VAK Teaching Strategy:
${vakStrategies[vakStyle] || vakStrategies.visual}

Requirements:
1. Duration: 7-15 minutes of narration (approximately 1000-2000 words)
2. Start with a hook that grabs attention in the first 10 seconds
3. Break content into 4-6 clear sections with transitions
4. Include 2-3 interactive checkpoint questions (pause and think moments)
5. End with a summary and 3 key takeaways
6. Use age-appropriate language for ${gradeLevel}
7. Include specific examples and practice problems
8. Add visual/scene descriptions in [brackets] for video production

Format the script as a JSON object.`;

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
                "You are an expert educational content creator specializing in personalized video lesson scripts. Create engaging, clear, and pedagogically sound content adapted to the student's learning style.",
            },
            { role: "user", content: scriptPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_lesson_script",
                description: "Generate a structured video lesson script",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Engaging lesson title" },
                    sections: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          section_title: { type: "string" },
                          narration: { type: "string", description: "Full narration text for this section" },
                          visual_description: { type: "string", description: "What should appear on screen" },
                          duration_estimate_seconds: { type: "number" },
                        },
                        required: ["section_title", "narration", "visual_description", "duration_estimate_seconds"],
                      },
                    },
                    checkpoint_questions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          question: { type: "string" },
                          options: {
                            type: "array",
                            items: { type: "string" },
                          },
                          correct_index: { type: "number" },
                          explanation: { type: "string" },
                          after_section: { type: "number", description: "0-indexed section number after which this question appears" },
                        },
                        required: ["question", "options", "correct_index", "explanation", "after_section"],
                      },
                    },
                    key_takeaways: {
                      type: "array",
                      items: { type: "string" },
                    },
                    estimated_duration_seconds: { type: "number" },
                  },
                  required: ["title", "sections", "checkpoint_questions", "key_takeaways", "estimated_duration_seconds"],
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "generate_lesson_script" },
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
        JSON.stringify({ error: "AI content generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: "AI did not return structured content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lessonContent = JSON.parse(toolCall.function.arguments);

    // Save the lesson to the database
    const { data: lesson, error: lessonError } = await supabase
      .from("video_lessons")
      .insert({
        user_id: user.id,
        title: lessonContent.title,
        subject,
        topic,
        difficulty_level: difficulty || "medium",
        script_content: JSON.stringify(lessonContent),
        duration_seconds: lessonContent.estimated_duration_seconds,
        status: "draft",
        vak_style: vakStyle,
      })
      .select()
      .single();

    if (lessonError) {
      console.error("Error saving lesson:", lessonError);
      return new Response(
        JSON.stringify({ error: "Failed to save lesson" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        lesson_id: lesson.id,
        content: lessonContent,
        status: "draft",
        message: "Lesson content generated. Ready for audio narration and video rendering.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("generate-lesson-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

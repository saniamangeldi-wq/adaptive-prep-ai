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
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vakStrategies: Record<string, string> = {
      visual: "Use diagrams, charts, color-coded explanations, spatial metaphors.",
      auditory: "Use rhythmic explanations, mnemonics, verbal repetition, analogies.",
      reading_writing: "Structure with clear headings, numbered steps, definitions.",
      kinesthetic: "Use action verbs, real-world scenarios, hands-on examples.",
    };

    const scriptPrompt = `Generate a slide-based lesson presentation for a ${gradeLevel} student.

TOPIC: ${topic}
SUBJECT: ${subject}
DIFFICULTY: ${difficulty || "medium"}
LEARNING STYLE: ${vakStyle}
LANGUAGE: ${language === "en" ? "English" : language === "ru" ? "Russian" : language === "kk" ? "Kazakh" : "English"}

VAK Strategy: ${vakStrategies[vakStyle] || vakStrategies.visual}

Create 4-6 sections. Each section has ONE slide and narration text the AI will read aloud.
Each slide should have:
- A clear heading
- 2-5 bullet points (short, concise)
- Optional: key terms to highlight during narration
- Optional: an equation or formula
- A slide_type: "title" for intro, "content" for regular, "example" for worked examples, "summary" for recap

The narration should be conversational and explain what's on the slide in detail (100-250 words per section).
Include 2-3 checkpoint questions between sections.
End with 3 key takeaways.`;

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
              content: "You are an expert educational content creator. Create engaging slide-based lessons adapted to learning styles.",
            },
            { role: "user", content: scriptPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_lesson_script",
                description: "Generate a slide-based lesson",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Engaging lesson title" },
                    subtitle: { type: "string", description: "Brief subtitle or tagline" },
                    sections: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          section_title: { type: "string" },
                          narration: { type: "string", description: "Full narration text (100-250 words)" },
                          slide: {
                            type: "object",
                            properties: {
                              slide_type: { type: "string", enum: ["title", "content", "example", "summary"] },
                              heading: { type: "string" },
                              subheading: { type: "string" },
                              bullets: { type: "array", items: { type: "string" } },
                              highlight_terms: { type: "array", items: { type: "string" }, description: "Key terms to highlight on the slide" },
                              equation: { type: "string", description: "Optional math equation or formula" },
                              code_snippet: { type: "string", description: "Optional code example" },
                              note: { type: "string", description: "Optional tip or important note" },
                            },
                            required: ["slide_type", "heading", "bullets"],
                          },
                          duration_estimate_seconds: { type: "number" },
                        },
                        required: ["section_title", "narration", "slide", "duration_estimate_seconds"],
                      },
                    },
                    checkpoint_questions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          question: { type: "string" },
                          options: { type: "array", items: { type: "string" } },
                          correct_index: { type: "number" },
                          explanation: { type: "string" },
                          after_section: { type: "number" },
                        },
                        required: ["question", "options", "correct_index", "explanation", "after_section"],
                      },
                    },
                    key_takeaways: { type: "array", items: { type: "string" } },
                    estimated_duration_seconds: { type: "number" },
                  },
                  required: ["title", "sections", "checkpoint_questions", "key_takeaways", "estimated_duration_seconds"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "generate_lesson_script" } },
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
        message: "Lesson generated. Ready for narration.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-lesson-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

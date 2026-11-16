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
      .select("vak_primary_style, vak_secondary_style, grade_level, preferred_language, full_name, vak_visual_pct, vak_auditory_pct, vak_kinesthetic_pct")
      .eq("user_id", user.id)
      .single();

    const vakStyle = requestVakStyle || profile?.vak_primary_style || "visual";
    const gradeLevel = profile?.grade_level || "high school";
    const language = profile?.preferred_language || "en";

    // Detect multimodal: if top two styles are within 10%
    const vakScores = {
      visual: profile?.vak_visual_pct || 0,
      auditory: profile?.vak_auditory_pct || 0,
      kinesthetic: profile?.vak_kinesthetic_pct || 0,
    };
    const sorted = Object.entries(vakScores).sort((a, b) => b[1] - a[1]);
    const isMultimodal = sorted.length >= 2 && (sorted[0][1] - sorted[1][1]) <= 10;
    const secondaryStyle = isMultimodal ? sorted[1][0] : null;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vakInstructions = buildVAKInstructions(vakStyle, secondaryStyle);

    const scriptPrompt = `Generate a slide-based lesson presentation for a ${gradeLevel} student.

TOPIC: ${topic}
SUBJECT: ${subject}
DIFFICULTY: ${difficulty || "medium"}
LEARNING STYLE: ${vakStyle}${secondaryStyle ? ` (multimodal with ${secondaryStyle})` : ""}
LANGUAGE: ${language === "en" ? "English" : language === "ru" ? "Russian" : language === "kk" ? "Kazakh" : "English"}

${vakInstructions}

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

    const slideSchema: any = {
      type: "object",
      properties: {
        slide_type: { type: "string", enum: ["title", "content", "example", "summary"] },
        heading: { type: "string" },
        subheading: { type: "string" },
        bullets: { type: "array", items: { type: "string" } },
        highlight_terms: { type: "array", items: { type: "string" } },
        equation: { type: "string" },
        code_snippet: { type: "string" },
        note: { type: "string" },
      },
      required: ["slide_type", "heading", "bullets"],
    };

    // Add VAK-specific schema fields
    if (vakStyle === "visual" || secondaryStyle === "visual") {
      slideSchema.properties.diagram = {
        type: "object",
        properties: {
          type: { type: "string", enum: ["flowchart", "comparison_table", "concept_map", "timeline", "bar_chart", "pie_chart"] },
          title: { type: "string" },
          description: { type: "string" },
          data: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                value: { type: "number" },
                color: { type: "string" },
                children: { type: "array", items: { type: "string" } },
                connections: { type: "array", items: { type: "string" } },
              },
              required: ["label"],
            },
          },
        },
        required: ["type", "title", "description", "data"],
      };
    }

    if (vakStyle === "kinesthetic" || secondaryStyle === "kinesthetic") {
      slideSchema.properties.interactive_scenario = {
        type: "object",
        properties: {
          setup: { type: "string" },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                instruction: { type: "string" },
                action_type: { type: "string", enum: ["click", "drag", "order", "select"] },
                options: { type: "array", items: { type: "string" } },
                correct_index: { type: "number" },
              },
              required: ["instruction", "action_type"],
            },
          },
          real_world_connection: { type: "string" },
        },
        required: ["setup", "steps", "real_world_connection"],
      };
    }

    if (vakStyle === "reading_writing" || secondaryStyle === "reading_writing") {
      slideSchema.properties.notes_layout = {
        type: "object",
        properties: {
          summary_sentence: { type: "string" },
          key_terms: {
            type: "array",
            items: {
              type: "object",
              properties: { term: { type: "string" }, definition: { type: "string" } },
              required: ["term", "definition"],
            },
          },
          structured_notes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                heading: { type: "string" },
                sub_points: { type: "array", items: { type: "string" } },
              },
              required: ["heading", "sub_points"],
            },
          },
          memory_tip: { type: "string" },
        },
        required: ["summary_sentence", "key_terms", "structured_notes", "memory_tip"],
      };
    }

    if (vakStyle === "auditory" || secondaryStyle === "auditory") {
      slideSchema.properties.audio_emphasis = {
        type: "object",
        properties: {
          rhetorical_questions: { type: "array", items: { type: "string" } },
          analogies: { type: "array", items: { type: "string" } },
          rhythm_phrases: { type: "array", items: { type: "string" } },
        },
        required: ["rhetorical_questions", "analogies", "rhythm_phrases"],
      };
    }

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
              content: "You are an expert educational content creator. Create engaging slide-based lessons adapted to learning styles. Generate VAK-specific content fields as instructed.",
            },
            { role: "user", content: scriptPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_lesson_script",
                description: "Generate a slide-based lesson with VAK-adapted content",
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
                          slide: slideSchema,
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
        vak_style: vakStyle,
        is_multimodal: isMultimodal,
        secondary_style: secondaryStyle,
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

function buildVAKInstructions(primaryStyle: string, secondaryStyle: string | null): string {
  const instructions: string[] = [];

  const styleInstructions: Record<string, string> = {
    visual: `VISUAL LEARNER INSTRUCTIONS:
- For EVERY non-title slide, generate a "diagram" field.
- Choose diagram type based on content: comparison_table for comparing, flowchart for processes, concept_map for relationships, timeline for sequences, bar_chart/pie_chart for data.
- Each diagram must have a title, description, and data array with at least 3 items.
- Use color-coded explanations, spatial metaphors in narration.`,

    kinesthetic: `KINESTHETIC LEARNER INSTRUCTIONS:
- For EVERY non-title slide, generate an "interactive_scenario" field.
- Scenarios must be hands-on, real-world, using active verbs.
- Each scenario needs a setup, at least 2 interactive steps with action_type (select, order, click, or drag), and a real_world_connection.
- For "select" steps, provide 3-4 options with a correct_index.
- Use action verbs, real-world examples in narration.`,

    reading_writing: `READING-WRITING LEARNER INSTRUCTIONS:
- For EVERY non-title slide, generate a "notes_layout" field.
- key_terms must have at least 3 entries per slide.
- structured_notes must mirror bullet content in hierarchical outline format.
- Include a concise summary_sentence and a memory_tip (mnemonic or memory device).
- Use clear headings, numbered steps, formal definitions in narration.`,

    auditory: `AUDITORY LEARNER INSTRUCTIONS:
- For EVERY non-title slide, generate an "audio_emphasis" field.
- Include 1-2 rhetorical_questions per slide.
- Include at least 1 analogy.
- Include 1-2 rhythm_phrases (short, punchy, memorable).
- Write bullets as conversational spoken sentences, not written prose.
- Use rhythmic explanations, verbal repetition, analogies in narration.`,
  };

  if (styleInstructions[primaryStyle]) {
    instructions.push(styleInstructions[primaryStyle]);
  }

  if (secondaryStyle && styleInstructions[secondaryStyle]) {
    instructions.push(`\nSECONDARY STYLE (${secondaryStyle.toUpperCase()}) — also generate these fields for multimodal adaptation:`);
    instructions.push(styleInstructions[secondaryStyle]);
  }

  return instructions.join("\n\n");
}

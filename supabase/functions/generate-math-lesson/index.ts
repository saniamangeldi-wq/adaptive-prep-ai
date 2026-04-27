import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STYLES = ["visual", "auditory", "kinesthetic", "reading_writing"] as const;
type Style = typeof STYLES[number];

const STYLE_GUIDANCE: Record<Style, string> = {
  visual:
    "Use diagrams in words, color-coded steps, geometric reasoning, and 'see this on graph paper' framing. Bullet points should describe what a learner SEES (shapes, graphs, color highlights).",
  auditory:
    "Write the narration like a tutor talking out loud. Use rhythm, mnemonics, call-and-response phrases. Slides are minimal — narration carries the lesson. Include 'say this in your head' lines.",
  kinesthetic:
    "Frame everything as a physical action: 'plug in', 'move the term', 'flip the inequality'. Include hands-on micro-exercises in narration. Bullets are imperatives ('Try this on scratch paper').",
  reading_writing:
    "Dense, well-structured prose. Use definitions, numbered procedures, and worked solutions with full sentences. Bullets are formal mini-paragraphs. Show every algebraic step.",
};

function buildPrompt(topicTitle: string, topicDesc: string, targetSkill: string, style: Style) {
  return `You are an elite SAT Math tutor creating a 700+ difficulty lesson.

TOPIC: ${topicTitle}
DESCRIPTION: ${topicDesc}
TARGET SKILL: ${targetSkill}
LEARNING STYLE: ${style}

STYLE GUIDANCE:
${STYLE_GUIDANCE[style]}

Produce a complete lesson as STRICT JSON with this exact shape:
{
  "title": "string (the lesson title — keep it punchy)",
  "hook": "string (1 sentence opening hook in quotes-style, ~20 words)",
  "summary": "string (2-3 sentence end-of-lesson recap)",
  "estimated_minutes": 12,
  "sections": [
    {
      "section_title": "string",
      "narration": "100-220 words, conversational, tutor voice",
      "slide": {
        "slide_type": "title | content | example | summary",
        "heading": "string",
        "subheading": "optional string",
        "bullets": ["3-5 short bullets"],
        "highlight_terms": ["optional key terms"],
        "equation": "optional LaTeX-free equation, e.g. y = mx + b",
        "note": "optional pro tip"
      },
      "duration_estimate_seconds": 60
    }
  ],
  "checkpoint_questions": [
    {
      "question": "SAT-style multiple choice question at 700+ level",
      "options": ["A","B","C","D"],
      "correct_index": 0,
      "explanation": "Why the right answer is right and the traps are wrong (3-5 sentences)",
      "after_section": 1
    }
  ]
}

REQUIREMENTS:
- 6 sections total (title intro, 3 concept sections, 1 worked example, 1 summary).
- 3 checkpoint questions, placed after_section = 2, 4, and 5.
- Difficulty: 700+ SAT Math. Distractors must be plausible (off-by-one, sign error, common misconception).
- Use real numbers / algebra / geometry. Do NOT use LaTeX — write equations in plain text (e.g. "x^2 + 3x - 4 = 0", "sqrt(2)").
- Output ONLY the JSON object. No markdown fences, no commentary.`;
}

async function callAI(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are an elite SAT Math curriculum writer. Output strict JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { topic_id, topic_slug, styles } = await req.json().catch(() => ({}));
    const admin = createClient(supabaseUrl, serviceKey);

    // Resolve topic
    let topicQuery = admin.from("math_topics").select("*");
    if (topic_id) topicQuery = topicQuery.eq("id", topic_id);
    else if (topic_slug) topicQuery = topicQuery.eq("slug", topic_slug);
    else {
      return new Response(JSON.stringify({ error: "topic_id or topic_slug required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: topic, error: topicErr } = await topicQuery.single();
    if (topicErr || !topic) {
      return new Response(JSON.stringify({ error: "Topic not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetStyles: Style[] = (Array.isArray(styles) && styles.length > 0
      ? styles
      : STYLES) as Style[];

    const results: any[] = [];
    for (const style of targetStyles) {
      // Skip if already exists
      const { data: existing } = await admin
        .from("math_lessons")
        .select("id")
        .eq("topic_id", topic.id)
        .eq("learning_style", style)
        .maybeSingle();
      if (existing) {
        results.push({ style, status: "exists", lesson_id: existing.id });
        continue;
      }

      try {
        const prompt = buildPrompt(topic.title, topic.description || "", topic.target_skill || "", style);
        const raw = await callAI(prompt, lovableKey);
        const parsed = JSON.parse(raw);

        const { data: inserted, error: insErr } = await admin
          .from("math_lessons")
          .insert({
            topic_id: topic.id,
            learning_style: style,
            title: parsed.title || topic.title,
            hook: parsed.hook || null,
            sections: parsed.sections || [],
            checkpoint_questions: parsed.checkpoint_questions || [],
            summary: parsed.summary || null,
            estimated_minutes: parsed.estimated_minutes || topic.estimated_minutes || 15,
          })
          .select("id")
          .single();

        if (insErr) throw insErr;
        results.push({ style, status: "created", lesson_id: inserted.id });
      } catch (e) {
        console.error(`generate-math-lesson [${style}] error:`, e);
        results.push({ style, status: "failed", error: e instanceof Error ? e.message : "Unknown" });
      }
    }

    return new Response(
      JSON.stringify({ topic: { id: topic.id, slug: topic.slug, title: topic.title }, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-math-lesson error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

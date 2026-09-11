import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const QUESTION_TYPES = [
  "multiple_choice",
  "true_false_not_given",
  "yes_no_not_given",
  "matching_headings",
  "matching_information",
  "sentence_completion",
  "summary_completion",
  "short_answer",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: hasAccess } = await admin.rpc("has_ielts_access", { _user_id: user.id });
    if (!hasAccess) return json({ error: "Not found" }, 404);

    const body = await req.json().catch(() => ({}));
    const variant = body.variant === "general" ? "general" : "academic";
    const passageCount = body.passageCount === 3 ? 3 : 1;
    const topic = typeof body.topic === "string" ? body.topic.slice(0, 120) : "";

    const cost = passageCount === 3 ? 6 : 2;
    const { data: remaining, error: creditError } = await admin.rpc("consume_ai_credits", {
      _user_id: user.id,
      _cost: cost,
    });
    if (creditError) return json({ error: "Could not verify credits" }, 500);
    if (typeof remaining !== "number" || remaining < 0) {
      return json({ error: "No credits remaining" }, 402);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const questionsPerPassage = 13;
    const prompt = `Create an original IELTS ${variant === "general" ? "General Training" : "Academic"} Reading practice set with exactly ${passageCount} passage(s).
${topic ? `Preferred subject area: ${topic}.` : ""}

Requirements:
- Each passage is 700-900 words of original prose written by you. Never reproduce copyrighted or published text.
- ${variant === "general" ? "General Training passages: everyday notices, workplace documents and general-interest articles." : "Academic passages: research-style articles on science, history, environment, technology or social science."}
- Each passage has exactly ${questionsPerPassage} questions, mixing at least four of these types: ${QUESTION_TYPES.join(", ")}.
- Every question has a single unambiguous correct answer supported by the passage.
- For multiple choice, matching_headings and matching_information provide "options".
- For true_false_not_given / yes_no_not_given the answer must be exactly TRUE, FALSE, NOT GIVEN (or YES, NO, NOT GIVEN).
- For completion and short answer types the answer must be words taken from the passage, max three words.
- Every question needs an "explanation" and a short "evidence" quote from the passage.

Return JSON only, no prose, in this exact shape:
{"title":"set title","passages":[{"number":1,"title":"...","text":"...","questions":[{"id":"p1q1","type":"...","prompt":"...","options":["..."],"answer":"...","explanation":"...","evidence":"..."}]}]}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          {
            role: "system",
            content:
              "You are an experienced IELTS item writer. You write original passages and questions that match the official IELTS Reading format exactly. You always answer with valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text();
      console.error("AI gateway error", aiRes.status, detail);
      if (aiRes.status === 429) return json({ error: "Too many requests, try again shortly." }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted for this workspace." }, 402);
      return json({ error: "Could not generate the reading set." }, 502);
    }

    const payload = await aiRes.json();
    const raw = payload?.choices?.[0]?.message?.content ?? "";
    let set: any;
    try {
      set = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return json({ error: "Could not read the generated set." }, 502);
      set = JSON.parse(match[0]);
    }

    const passages = Array.isArray(set?.passages) ? set.passages : [];
    if (passages.length === 0) return json({ error: "Could not generate the reading set." }, 502);

    // Normalise ids so answers can be keyed reliably.
    passages.forEach((p: any, pi: number) => {
      p.number = pi + 1;
      p.questions = Array.isArray(p.questions) ? p.questions : [];
      p.questions.forEach((q: any, qi: number) => {
        q.id = `p${pi + 1}q${qi + 1}`;
        if (!Array.isArray(q.options)) q.options = [];
      });
    });

    return json({
      title: set.title ?? "IELTS Reading practice",
      variant,
      passages,
      creditsRemaining: remaining,
    });
  } catch (error) {
    console.error("ielts-generate-reading failed", error);
    return json({ error: "Unexpected error" }, 500);
  }
});

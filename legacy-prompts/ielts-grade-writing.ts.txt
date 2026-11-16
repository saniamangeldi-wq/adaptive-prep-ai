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

const clampBand = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 5;
  return Math.min(9, Math.max(1, Math.round(n * 2) / 2));
};

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
    const taskType: string = ["task1_academic", "task1_general", "task2"].includes(body.taskType)
      ? body.taskType
      : "task2";
    const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 4000) : "";
    const essay = typeof body.essay === "string" ? body.essay.trim() : "";
    const chart = body.chart ?? null;
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;

    if (!prompt) return json({ error: "The task prompt is missing." }, 400);
    if (essay.length < 40) return json({ error: "Write a longer answer before submitting." }, 400);
    if (essay.length > 20000) return json({ error: "That answer is too long." }, 400);

    const { data: remaining, error: creditError } = await admin.rpc("consume_ai_credits", {
      _user_id: user.id,
      _cost: 5,
    });
    if (creditError) return json({ error: "Could not verify credits" }, 500);
    if (typeof remaining !== "number" || remaining < 0) {
      return json({ error: "No credits remaining" }, 402);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const wordCount = essay.split(/\s+/).filter(Boolean).length;
    const minWords = taskType === "task2" ? 250 : 150;
    const criterionOne =
      taskType === "task2" ? "Task Response" : "Task Achievement";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({
        model: "google/gemini-3.1-pro-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a trained IELTS Writing examiner. You apply the public IELTS band descriptors strictly and consistently, in whole or half bands. You never inflate scores. You always answer with valid JSON only.",
          },
          {
            role: "user",
            content: `Assess this candidate answer.

TASK TYPE: ${taskType}
TASK PROMPT: ${prompt}
${chart ? `TASK DATA: ${JSON.stringify(chart).slice(0, 3000)}` : ""}
MINIMUM WORDS: ${minWords}
WORD COUNT: ${wordCount}

CANDIDATE ANSWER:
"""
${essay}
"""

Score each criterion 1-9 in half bands: ${criterionOne}, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy. Penalise under-length answers under ${criterionOne}. The overall band is the average of the four, rounded to the nearest half band.

Return JSON only:
{"criteria":{"task":{"band":6.5,"comment":"..."},"coherence":{"band":6,"comment":"..."},"lexical":{"band":6,"comment":"..."},"grammar":{"band":6,"comment":"..."}},"overall":6,"summary":"2-3 sentence overview","strengths":["..."],"improvements":["..."],"corrections":[{"original":"exact quote from the answer","suggestion":"improved version","reason":"..."}],"modelAnswer":"a full model answer one to two bands higher"}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text();
      console.error("AI gateway error", aiRes.status, detail);
      if (aiRes.status === 429) return json({ error: "Too many requests, try again shortly." }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted for this workspace." }, 402);
      return json({ error: "Could not mark this answer." }, 502);
    }

    const payload = await aiRes.json();
    const raw = payload?.choices?.[0]?.message?.content ?? "";
    let report: any;
    try {
      report = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return json({ error: "Could not read the marking result." }, 502);
      report = JSON.parse(match[0]);
    }

    const criteria = {
      task: {
        band: clampBand(report?.criteria?.task?.band),
        comment: String(report?.criteria?.task?.comment ?? ""),
        label: criterionOne,
      },
      coherence: {
        band: clampBand(report?.criteria?.coherence?.band),
        comment: String(report?.criteria?.coherence?.comment ?? ""),
        label: "Coherence and Cohesion",
      },
      lexical: {
        band: clampBand(report?.criteria?.lexical?.band),
        comment: String(report?.criteria?.lexical?.comment ?? ""),
        label: "Lexical Resource",
      },
      grammar: {
        band: clampBand(report?.criteria?.grammar?.band),
        comment: String(report?.criteria?.grammar?.comment ?? ""),
        label: "Grammatical Range and Accuracy",
      },
    };

    const average =
      (criteria.task.band + criteria.coherence.band + criteria.lexical.band + criteria.grammar.band) / 4;
    const overall = Math.round(average * 2) / 2;

    const comments = {
      summary: String(report?.summary ?? ""),
      strengths: Array.isArray(report?.strengths) ? report.strengths.map(String).slice(0, 8) : [],
      improvements: Array.isArray(report?.improvements) ? report.improvements.map(String).slice(0, 8) : [],
      corrections: Array.isArray(report?.corrections)
        ? report.corrections.slice(0, 12).map((c: any) => ({
            original: String(c?.original ?? ""),
            suggestion: String(c?.suggestion ?? ""),
            reason: String(c?.reason ?? ""),
          }))
        : [],
    };

    const { data: saved, error: saveError } = await admin
      .from("ielts_writing_reports")
      .insert({
        user_id: user.id,
        session_id: sessionId,
        task_type: taskType,
        prompt,
        chart,
        essay,
        word_count: wordCount,
        criteria,
        overall_band: overall,
        comments,
        model_answer: String(report?.modelAnswer ?? ""),
      })
      .select()
      .single();

    if (saveError) console.error("Could not save IELTS report", saveError);

    return json({
      id: saved?.id ?? null,
      taskType,
      wordCount,
      criteria,
      overall,
      comments,
      modelAnswer: String(report?.modelAnswer ?? ""),
      creditsRemaining: remaining,
    });
  } catch (error) {
    console.error("ielts-grade-writing failed", error);
    return json({ error: "Unexpected error" }, 500);
  }
});

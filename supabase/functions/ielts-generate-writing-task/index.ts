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
    const topic = typeof body.topic === "string" ? body.topic.slice(0, 120) : "";

    const { data: remaining, error: creditError } = await admin.rpc("consume_ai_credits", {
      _user_id: user.id,
      _cost: 2,
    });
    if (creditError) return json({ error: "Could not verify credits" }, 500);
    if (typeof remaining !== "number" || remaining < 0) {
      return json({ error: "No credits remaining" }, 402);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const taskBrief =
      taskType === "task1_academic"
        ? `IELTS Academic Writing Task 1. Produce a data description task with a real dataset.
Include a "chart" object: {"kind":"bar"|"line"|"pie"|"table","title":"...","unit":"...","categoryKey":"label","series":["Series A","Series B"],"data":[{"label":"2010","Series A":12,"Series B":9}]}.
The prompt must say: "The chart below shows ... Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words."`
        : taskType === "task1_general"
          ? `IELTS General Training Writing Task 1: a letter task with a situation and three bullet points to cover. Write at least 150 words. No chart.`
          : `IELTS Writing Task 2: a discursive essay question (opinion, discussion, problem/solution or two-part). Write at least 250 words. No chart.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          {
            role: "system",
            content:
              "You are an experienced IELTS item writer. You produce original writing tasks matching the official IELTS format. You always answer with valid JSON only.",
          },
          {
            role: "user",
            content: `${taskBrief}
${topic ? `Preferred subject area: ${topic}.` : ""}
Return JSON only: {"prompt":"the full task wording","bullets":["..."],"minWords":150,"timeMinutes":20,"chart":null}`,
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
      return json({ error: "Could not generate the writing task." }, 502);
    }

    const payload = await aiRes.json();
    const raw = payload?.choices?.[0]?.message?.content ?? "";
    let task: any;
    try {
      task = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return json({ error: "Could not read the generated task." }, 502);
      task = JSON.parse(match[0]);
    }

    if (!task?.prompt) return json({ error: "Could not generate the writing task." }, 502);

    return json({
      taskType,
      prompt: String(task.prompt),
      bullets: Array.isArray(task.bullets) ? task.bullets.map(String) : [],
      minWords: taskType === "task2" ? 250 : 150,
      timeMinutes: taskType === "task2" ? 40 : 20,
      chart: taskType === "task1_academic" ? (task.chart ?? null) : null,
      creditsRemaining: remaining,
    });
  } catch (error) {
    console.error("ielts-generate-writing-task failed", error);
    return json({ error: "Unexpected error" }, 500);
  }
});

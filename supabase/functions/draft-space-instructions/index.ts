// Drafts AI instructions for a new Conversation Space based on user answers.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { name, description, answers, freeText } = await req.json();

    const context = freeText && String(freeText).trim().length > 0
      ? `The user described the space as:\n"${freeText}"`
      : `The user answered guided questions:\n${(answers || [])
          .map((a: { q: string; a: string }) => `Q: ${a.q}\nA: ${a.a || "(skipped)"}`)
          .join("\n\n")}`;

    const systemPrompt = `You write concise "AI Instructions" for a study workspace called a Space in AdaptivePrep. Output ONLY the instructions text (no preamble, no markdown headers, no quotes). 4-8 short sentences or bullet lines. Second-person voice addressed to the AI assistant. Cover: focus/subject, audience, tone, boundaries, and how to use references if mentioned. Keep it tight and practical.`;

    const userPrompt = `Space name: ${name || "(untitled)"}\nDescription: ${description || "(none)"}\n\n${context}\n\nWrite the AI instructions now.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`draft-space-instructions failed [${response.status}]: ${errorBody}`);
      return new Response(JSON.stringify({ error: "AI request failed", details: errorBody }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const draft = (data.choices?.[0]?.message?.content ?? "").trim();
    return new Response(JSON.stringify({ draft }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("draft-space-instructions error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

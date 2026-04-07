import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { rawText } = await req.json();
    if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
      return new Response(JSON.stringify({ cleaned: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content:
                "You are a text cleanup assistant. You receive raw speech-to-text output that may lack punctuation, have incorrect capitalization, or contain filler words. Clean it up into proper, natural-sounding text while preserving the original meaning exactly. Do NOT add, remove, or change any substantive content — only fix grammar, punctuation, and capitalization. Return ONLY the cleaned text, nothing else.",
            },
            { role: "user", content: rawText },
          ],
        }),
      }
    );

    if (!response.ok) {
      // If AI fails, return the raw text as fallback
      console.error("AI cleanup failed:", response.status);
      return new Response(JSON.stringify({ cleaned: rawText.trim() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const cleaned =
      data.choices?.[0]?.message?.content?.trim() || rawText.trim();

    return new Response(JSON.stringify({ cleaned }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cleanup-stt error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

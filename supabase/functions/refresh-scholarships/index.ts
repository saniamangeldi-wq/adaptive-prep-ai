import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractJSON(text: string): any[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {
      try { return JSON.parse(match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}')); } catch { return []; }
    }
  }
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) {
      return new Response(JSON.stringify({ error: "Perplexity API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const currentYear = new Date().getFullYear();
    const refreshQuery = `Which universities in the top 500 QS rankings currently offer full scholarships, full financial aid, or full tuition waivers for international students as of ${currentYear}? Include university name, country, scholarship name, coverage details, scholarship_open_to, and application deadline. Return ONLY a valid JSON array with fields: name, country, scholarship_name, scholarship_coverage, scholarship_open_to, scholarship_deadline, offers_full_scholarship (boolean).`;

    const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          { role: "system", content: "You are a scholarship data researcher. Return ONLY valid JSON arrays." },
          { role: "user", content: refreshQuery },
        ],
        max_tokens: 8000,
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      return new Response(JSON.stringify({ error: `Perplexity API error: ${errorText}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await perplexityResponse.json();
    const content = data.choices?.[0]?.message?.content || "";
    const scholarships = extractJSON(content);

    let updated = 0;
    for (const s of scholarships) {
      if (!s.name || !s.country) continue;
      const { error } = await supabaseAdmin
        .from("university_database")
        .update({
          offers_full_scholarship: s.offers_full_scholarship ?? true,
          scholarship_name: s.scholarship_name || null,
          scholarship_coverage: s.scholarship_coverage || null,
          scholarship_open_to: s.scholarship_open_to || null,
          scholarship_deadline: s.scholarship_deadline || null,
          last_refreshed_at: new Date().toISOString(),
          data_source: 'perplexity_refresh',
        })
        .eq("name", s.name)
        .eq("country", s.country);
      
      if (!error) updated++;
    }

    return new Response(JSON.stringify({
      message: `Scholarship data updated for ${updated} universities`,
      updated,
      total: scholarships.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Refresh error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

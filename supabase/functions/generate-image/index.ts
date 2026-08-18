import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hidden (never surfaced in the UI) daily generation allowance per tier.
const DAILY_IMAGE_LIMIT: Record<string, number> = {
  tier_2: 8,
  tier_3: 25,
};

const CREDIT_COST = 3;

// Theme-matched art direction so generated pictures blend into the app surface.
const THEME_STYLE: Record<string, string> = {
  dark:
    "Colour palette locked to the AdaptivePrep dark theme: near-black charcoal background (#0F1117), " +
    "elevated card grey (#1A1D27), emerald-teal accent (#10B981), soft slate-grey text tones. " +
    "Flat modern editorial illustration, subtle glow, no white background.",
  midnight:
    "Colour palette locked to the AdaptivePrep midnight theme: deep indigo-navy background (#0B1020), " +
    "indigo surfaces (#181D33), luminous indigo/violet accents (#6366F1), cool blue highlights. " +
    "Flat modern editorial illustration, subtle glow, no white background.",
  sepia:
    "Colour palette locked to the AdaptivePrep sepia theme: warm dark brown background (#1B1510), " +
    "toasted amber surfaces (#2A2118), golden amber accents (#F59E0B), warm cream text tones. " +
    "Flat modern editorial illustration, warm soft light, no white background.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const rawPrompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const theme = typeof body.theme === "string" && THEME_STYLE[body.theme] ? body.theme : "dark";

    if (!rawPrompt || rawPrompt.length < 3) {
      return new Response(JSON.stringify({ error: "Please describe the picture you want." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (rawPrompt.length > 600) {
      return new Response(JSON.stringify({ error: "Description is too long (max 600 characters)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Tier gate: Pro and above only ──
    const { data: profile } = await admin
      .from("profiles")
      .select("tier")
      .eq("user_id", user.id)
      .maybeSingle();

    const tier = (profile?.tier as string) || "tier_0";
    const limit = DAILY_IMAGE_LIMIT[tier];
    if (!limit) {
      return new Response(
        JSON.stringify({ error: "Image generation is available on the Pro plan and above.", upgrade: true }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Hidden daily allowance ──
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const { count } = await admin
      .from("generated_images")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since.toISOString());

    if ((count ?? 0) >= limit) {
      return new Response(
        JSON.stringify({ error: "You've reached today's image generation limit. It resets tomorrow." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Credits ──
    const { data: remainingCredits, error: creditError } = await admin.rpc("consume_ai_credits", {
      _user_id: user.id,
      _cost: CREDIT_COST,
    });
    if (creditError) {
      console.error("Credit deduction failed:", creditError);
      return new Response(JSON.stringify({ error: "Could not verify credits" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof remainingCredits !== "number" || remainingCredits < 0) {
      return new Response(JSON.stringify({ error: "No credits remaining. Please upgrade your plan." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Image generation is not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullPrompt =
      `${rawPrompt}\n\nArt direction: ${THEME_STYLE[theme]} ` +
      `Educational, clean, high contrast against a dark UI, no watermarks, no gibberish text.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image",
        messages: [{ role: "user", content: fullPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text().catch(() => "");
      console.error("Image gateway error:", aiRes.status, detail);
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 502;
      return new Response(
        JSON.stringify({
          error:
            aiRes.status === 429
              ? "The image service is busy. Try again in a moment."
              : aiRes.status === 402
              ? "Image generation is temporarily unavailable."
              : "Could not generate the picture. Try rephrasing your description.",
        }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const json = await aiRes.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) {
      console.error("No image payload in gateway response");
      return new Response(JSON.stringify({ error: "The image could not be created. Try a different description." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("generated_images").insert({
      user_id: user.id,
      prompt: rawPrompt.slice(0, 600),
      theme,
    });

    return new Response(
      JSON.stringify({
        image: `data:image/png;base64,${b64}`,
        credits_remaining: remainingCredits,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("generate-image error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error generating the picture." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

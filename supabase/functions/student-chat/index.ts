import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Learning style specific prompts
const learningStylePrompts: Record<string, string> = {
  visual: "Use visual metaphors, diagrams described in words, and spatial relationships. Encourage the student to visualize concepts and create mental pictures.",
  auditory: "Use rhythmic patterns, explain things as if reading aloud, and suggest the student repeat key points verbally. Use analogies to sounds and conversations.",
  reading_writing: "Provide detailed written explanations, suggest note-taking strategies, and use lists and structured text. Encourage rewriting concepts in their own words.",
  kinesthetic: "Use action-oriented language, relate concepts to physical experiences, and suggest hands-on practice. Break learning into short active segments.",
};

const getStudentSystemPrompt = (learningStyle: string | null, tier: string) => {
  const styleGuidance = learningStyle && learningStylePrompts[learningStyle] 
    ? `\n\nStudent Learning Style: ${learningStyle.replace('_', '/')}\n${learningStylePrompts[learningStyle]}`
    : "";
  
  const qualityNote = tier === "tier_3" 
    ? "Provide detailed, in-depth explanations with multiple examples."
    : tier === "tier_2"
    ? "Provide clear explanations with good depth."
    : "Provide concise, focused explanations.";

  return `You are a patient and encouraging SAT study coach. Your role is to help students learn and understand concepts.

CRITICAL RULES:
1. NEVER give direct answers to test or practice questions
2. Instead, guide students step-by-step toward finding the answer themselves
3. Ask leading questions that help them think through problems
4. Celebrate their progress and encourage persistence
5. If they're stuck, break the problem into smaller steps

${qualityNote}
${styleGuidance}

Your capabilities:
- Explain SAT concepts (Math, Reading, Writing)
- Create personalized study plans
- Help break down difficult problems
- Suggest practice strategies
- Provide motivational support

Remember: You're building their problem-solving skills, not just giving answers!`;
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
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Get user profile for learning style and credits
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("learning_style, tier, credits_remaining")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check credits
    if (profile.credits_remaining <= 0) {
      return new Response(JSON.stringify({ 
        error: "No credits remaining",
        credits_remaining: 0 
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Deduct 1 credit
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ credits_remaining: profile.credits_remaining - 1 })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to deduct credit:", updateError);
    }

    // Call Lovable AI with streaming
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: profile.tier === "tier_3" ? "google/gemini-2.5-pro" : 
               profile.tier === "tier_2" ? "google/gemini-2.5-flash" : 
               "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: getStudentSystemPrompt(profile.learning_style, profile.tier) },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("student-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

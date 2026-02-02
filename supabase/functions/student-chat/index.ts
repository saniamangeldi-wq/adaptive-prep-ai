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

// AI Model selection based on tier
type AIProvider = "gemini" | "openai" | "perplexity";

interface AIModelConfig {
  provider: AIProvider;
  model: string;
  displayName: string;
  qualityNote: string;
}

// Detect if message requires complex reasoning (for Elite tier routing)
function isComplexReasoning(message: string): boolean {
  const complexPatterns = [
    /step.?by.?step/i,
    /explain.*(how|why)/i,
    /solve.*(problem|equation)/i,
    /analyze/i,
    /compare.*contrast/i,
    /create.*(plan|strategy|schedule)/i,
    /study.?plan/i,
    /what.*(best|optimal)/i,
    /multiple.*(steps|parts)/i,
  ];
  return complexPatterns.some(pattern => pattern.test(message));
}

function getAIModelForTier(tier: string, taskType?: string, message?: string): AIModelConfig {
  switch (tier) {
    case "tier_3": {
      // Elite tier - GPT-5.2 for complex reasoning, GPT-5 for regular chat
      const needsAdvancedReasoning = message && isComplexReasoning(message);
      const isStudyPlan = taskType === 'study_plan';
      
      if (needsAdvancedReasoning || isStudyPlan) {
        return {
          provider: "openai",
          model: "openai/gpt-5.2", // Latest model with enhanced reasoning (o1/o3 equivalent)
          displayName: "GPT-5.2 Reasoning",
          qualityNote: "You have access to advanced reasoning capabilities. Break down complex problems into clear steps. Provide thorough, multi-step explanations with strategic insights.",
        };
      }
      return {
        provider: "openai",
        model: "openai/gpt-5", // GPT-4o equivalent for regular chat
        displayName: "GPT-5",
        qualityNote: "Provide detailed, in-depth explanations with multiple examples. You have access to premium AI capabilities.",
      };
    }
    case "tier_2":
      return {
        provider: "openai",
        model: "openai/gpt-5", // GPT-4o equivalent
        displayName: "GPT-5",
        qualityNote: "Provide clear explanations with good depth and enhanced reasoning.",
      };
    case "tier_1":
      return {
        provider: "openai",
        model: "openai/gpt-5-mini", // GPT-4 Turbo equivalent
        displayName: "GPT-5 Mini",
        qualityNote: "Provide clear, focused explanations with good detail. You have access to capable AI for complex SAT problems.",
      };
    case "tier_0":
    default:
      return {
        provider: "gemini",
        model: "google/gemini-2.5-flash-lite", // Fast & free tier
        displayName: "Gemini Flash",
        qualityNote: "Provide concise, focused explanations.",
      };
  }
}

// Detect if message needs research (for Perplexity routing)
function needsResearch(message: string): boolean {
  const researchPatterns = [
    /tell me about/i,
    /what is/i,
    /who is/i,
    /when did/i,
    /where is/i,
    /explain the history/i,
    /current events/i,
    /latest news/i,
    /research on/i,
    /facts about/i,
  ];
  return researchPatterns.some(pattern => pattern.test(message));
}

const getStudentSystemPrompt = (learningStyle: string | null, qualityNote: string) => {
  const styleGuidance = learningStyle && learningStylePrompts[learningStyle] 
    ? `\n\nStudent Learning Style: ${learningStyle.replace('_', '/')}\n${learningStylePrompts[learningStyle]}`
    : "";

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

// Call Perplexity API for research-based questions
async function callPerplexity(messages: Array<{role: string; content: string}>, systemPrompt: string): Promise<Response> {
  const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
  if (!PERPLEXITY_API_KEY) {
    throw new Error("PERPLEXITY_API_KEY is not configured");
  }

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { role: "system", content: systemPrompt + "\n\nProvide factual, well-sourced information. Cite sources when relevant." },
        ...messages,
      ],
      stream: true,
    }),
  });

  return response;
}

// Call Lovable AI Gateway (supports both OpenAI and Gemini models)
async function callLovableAI(
  messages: Array<{role: string; content: string}>, 
  systemPrompt: string, 
  model: string
): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    }),
  });

  return response;
}

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
        error: "No credits remaining. Please upgrade your plan for more credits.",
        credits_remaining: 0 
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, taskType } = await req.json();

    // Deduct 1 credit
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ credits_remaining: profile.credits_remaining - 1 })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to deduct credit:", updateError);
    }

    // Get the last user message to determine routing
    const lastUserMessage = messages.filter((m: {role: string}) => m.role === "user").pop()?.content || "";

    // Get AI model config based on tier, task type, and message complexity
    const modelConfig = getAIModelForTier(profile.tier, taskType, lastUserMessage);
    const systemPrompt = getStudentSystemPrompt(profile.learning_style, modelConfig.qualityNote);

    let response: Response;

    // Route to appropriate AI provider
    // Use Perplexity for research if user has tier 1 or higher
    if (taskType === "research" || (needsResearch(lastUserMessage) && profile.tier !== "tier_0")) {
      console.log("Routing to Perplexity for research query");
      try {
        response = await callPerplexity(messages, systemPrompt);
      } catch (e) {
        // Fallback to Lovable AI if Perplexity fails
        console.error("Perplexity failed, falling back to Lovable AI:", e);
        response = await callLovableAI(messages, systemPrompt, modelConfig.model);
      }
    } else {
      // Default: Use Lovable AI with tier-appropriate model
      console.log(`Routing to Lovable AI with model: ${modelConfig.model} (${modelConfig.displayName})`);
      response = await callLovableAI(messages, systemPrompt, modelConfig.model);
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service credits exhausted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI service error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error. Please try again." }), {
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

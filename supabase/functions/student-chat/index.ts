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
      // Elite tier - Perplexity Pro with access to ALL premium models
      // Use sonar-reasoning-pro for complex reasoning (based on DeepSeek R1)
      // Use sonar-deep-research for research queries
      // Use sonar-pro for general chat
      const needsAdvancedReasoning = message && isComplexReasoning(message);
      const needsResearchMode = message && needsResearch(message);
      
      if (needsResearchMode || taskType === "research") {
        return {
          provider: "perplexity",
          model: "sonar-deep-research", // Expert research with multi-query analysis
          displayName: "Perplexity Deep Research",
          qualityNote: "You have access to expert-level research capabilities. Provide comprehensive, well-sourced responses with citations.",
        };
      }
      
      if (needsAdvancedReasoning || taskType === 'study_plan') {
        return {
          provider: "perplexity",
          model: "sonar-reasoning-pro", // Advanced reasoning based on DeepSeek R1
          displayName: "Perplexity Reasoning Pro",
          qualityNote: "You have access to advanced chain-of-thought reasoning. Break down complex problems into clear steps with strategic insights.",
        };
      }
      
      return {
        provider: "perplexity",
        model: "sonar-pro", // Multi-step reasoning with 2x more citations
        displayName: "Perplexity Pro",
        qualityNote: "Provide detailed, in-depth explanations with multiple examples. You have access to premium AI capabilities.",
      };
    }
    case "tier_2": {
      // Pro tier - Perplexity Pro (sonar-pro only, sonar-reasoning is deprecated)
      const needsResearchMode = message && needsResearch(message);
      
      // Use sonar-pro for all tier_2 requests (reasoning and research)
      return {
        provider: "perplexity",
        model: "sonar-pro", // Multi-step reasoning with 2x more citations
        displayName: "Perplexity Pro",
        qualityNote: needsResearchMode 
          ? "Provide well-researched, factual responses with citations."
          : "Provide clear explanations with good depth and enhanced reasoning.",
      };
    }
    case "tier_1":
      // Starter tier - GPT-4o via Lovable AI
      return {
        provider: "openai",
        model: "openai/gpt-5-mini", // Maps to GPT-4o equivalent
        displayName: "GPT-4o",
        qualityNote: "Provide clear, focused explanations with good detail.",
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

  return `You are a friendly and encouraging SAT study coach named "Study Coach."

CRITICAL RULES:
1. NEVER give direct answers to test or practice questions - guide students to find answers themselves
2. Keep responses concise (2-3 paragraphs maximum) unless the student asks for more detail
3. DO NOT use citation brackets like [1][2][3] - write naturally without references
4. Ask follow-up questions to engage the student in a conversation
5. If they're stuck, break the problem into smaller steps
6. Celebrate their progress and encourage persistence

${qualityNote}
${styleGuidance}

Your capabilities:
- Explain SAT concepts (Math, Reading, Writing)
- Create personalized study plans
- Help break down difficult problems
- Suggest practice strategies
- Provide motivational support

Example good response:
"Great question! Let's break this down step by step. First, do you remember how to identify the main idea in a passage? Once we nail that, the answer becomes much clearer. What part feels most confusing to you right now?"

Example bad response (DON'T do this):
"The answer is B because... [1][2][3]"

Remember: You're building their problem-solving skills through conversation, not dumping information!`;
};

// Call Perplexity API with specified model
async function callPerplexity(
  messages: Array<{role: string; content: string}>, 
  systemPrompt: string,
  model: string = "sonar"
): Promise<Response> {
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
      model: model,
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

    // Validate user token
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

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

    // Route based on provider from model config
    if (modelConfig.provider === "perplexity") {
      // Pro and Elite tiers use Perplexity Pro models
      console.log(`Routing to Perplexity with model: ${modelConfig.model} (${modelConfig.displayName})`);
      try {
        response = await callPerplexity(messages, systemPrompt, modelConfig.model);
      } catch (e) {
        // Fallback to Lovable AI if Perplexity fails
        console.error("Perplexity failed, falling back to Lovable AI:", e);
        response = await callLovableAI(messages, systemPrompt, "google/gemini-2.5-flash");
      }
    } else {
      // Free and Starter tiers use Lovable AI (Gemini/OpenAI)
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

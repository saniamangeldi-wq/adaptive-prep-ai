import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Tier credit limits for daily reset
const TIER_CREDIT_LIMITS: Record<string, number> = {
  tier_0: 15,
  tier_1: 40,
  tier_2: 100,
  tier_3: 200,
};

const TRIAL_CREDITS_PER_DAY = 75;

// Check if credits should be reset (new day)
function shouldResetCredits(creditsResetAt: string | null): boolean {
  if (!creditsResetAt) return true;
  
  const resetDate = new Date(creditsResetAt);
  const now = new Date();
  
  // Check if it's a new day (compare dates in UTC)
  return now.toDateString() !== resetDate.toDateString();
}

// Get daily credit limit based on tier and trial status
function getDailyCredits(tier: string, isTrial: boolean): number {
  if (isTrial) return TRIAL_CREDITS_PER_DAY;
  return TIER_CREDIT_LIMITS[tier] || TIER_CREDIT_LIMITS.tier_0;
}

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

// Subject-specific system prompts
const subjectPrompts: Record<string, string> = {
  SAT: `You are a specialized SAT tutor. Help students prepare for the Digital SAT with:
- Math strategies for both calculator and no-calculator sections
- Reading and Writing passage analysis techniques
- Time management tips for the test
- Common trap answer patterns to avoid
Never give direct answers to practice questions - guide students to find answers themselves.`,
  
  ACT: `You are a specialized ACT tutor. Help students prepare for the ACT with:
- Strategies for Science, Reading, English, and Math sections
- Time management (the ACT is faster-paced than SAT)
- Understanding ACT-specific question types
Never give direct answers to practice questions - guide students to find answers themselves.`,
  
  Math: `You are a friendly math tutor. Help students understand mathematical concepts:
- Algebra, geometry, pre-calculus, and calculus
- Break down complex problems into manageable steps
- Use visual explanations and real-world examples when helpful
- Show multiple solution approaches when applicable`,
  
  Science: `You are a science tutor covering biology, chemistry, and physics:
- Explain scientific concepts using real-world examples
- Help with understanding experiments and the scientific method
- Connect abstract concepts to everyday observations
- Clarify the "why" behind scientific principles`,
  
  English: `You are an English and writing tutor:
- Help with grammar, punctuation, and sentence structure
- Guide essay writing and thesis development
- Assist with literary analysis and reading comprehension
- Provide constructive feedback on writing samples`,
  
  History: `You are a history tutor:
- Help students understand historical events, causes, and effects
- Connect past events to present-day relevance
- Assist with analyzing primary sources
- Help with essay structure for history assignments`,
  
  "AP Calculus": `You are an AP Calculus tutor:
- Help with derivatives, integrals, and limits
- Prepare students for the AP exam format
- Explain concepts using visual and intuitive approaches
- Practice problem-solving strategies for free response questions`,
  
  "AP English": `You are an AP English tutor:
- Help with rhetorical analysis and argument essays
- Prepare students for multiple choice and free response sections
- Guide literary analysis and close reading skills
- Provide feedback on writing style and argument structure`,
  
  "Essay Writing": `You are a writing coach specializing in essays:
- Help with college application essays
- Guide creative writing and personal narratives
- Assist with thesis development and argument structure
- Provide constructive feedback without writing for the student`,
  
  "Homework Help": `You are a versatile homework helper:
- Assist with any subject the student needs help with
- Guide students to find answers without doing the work for them
- Break down complex problems into steps
- Explain concepts clearly and check for understanding`,
  
  General: `You are a versatile study coach:
- Adapt to whatever subject the student needs help with
- Ask clarifying questions to understand their needs
- Provide clear explanations and study strategies
- Encourage active learning and problem-solving`,
};

// AI Model selection based on tier
type AIProvider = "gemini" | "openai" | "perplexity";

interface AIModelConfig {
  provider: AIProvider;
  model: string;
  displayName: string;
  qualityNote: string;
}

// Detect subject from user message
function detectSubject(message: string, userSubjects: string[]): string {
  const subjectKeywords: Record<string, string[]> = {
    'SAT': ['sat', 'sat question', 'sat practice', 'reading and writing', 'sat math', 'sat strategy', 'digital sat', 'bluebook'],
    'ACT': ['act', 'act question', 'act practice', 'act science', 'act reading'],
    'Math': ['algebra', 'equation', 'geometry', 'calculus', 'derivative', 'integral', 'solve for x', 'polynomial', 'quadratic', 'trigonometry', 'sine', 'cosine'],
    'Science': ['chemistry', 'physics', 'biology', 'molecule', 'atom', 'cell', 'force', 'energy', 'chemical', 'organism', 'evolution'],
    'English': ['essay', 'grammar', 'paragraph', 'sentence', 'write', 'literature', 'author', 'punctuation', 'thesis'],
    'History': ['war', 'president', 'ancient', 'civilization', 'treaty', 'revolution', 'historical', 'century', 'empire'],
    'AP Calculus': ['ap calc', 'ap calculus', 'derivatives', 'integrals', 'limits'],
    'AP English': ['ap english', 'ap lit', 'ap lang', 'rhetorical', 'literary analysis'],
    'Essay Writing': ['college essay', 'personal statement', 'application essay', 'write my essay'],
    'Homework Help': ['homework', 'assignment', 'due tomorrow', 'help with my'],
  };
  
  const lowerMessage = message.toLowerCase();
  
  // First, check for explicit subject matches
  for (const [subject, keywords] of Object.entries(subjectKeywords)) {
    if (keywords.some(kw => lowerMessage.includes(kw))) {
      return subject;
    }
  }
  
  // If no explicit match, default to user's primary subject or General
  if (userSubjects && userSubjects.length > 0) {
    return userSubjects[0]; // Use their first/primary subject
  }
  
  return 'General';
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

function getAIModelForTier(tier: string, taskType?: string, message?: string): AIModelConfig {
  switch (tier) {
    case "tier_3": {
      const needsAdvancedReasoning = message && isComplexReasoning(message);
      const needsResearchMode = message && needsResearch(message);
      
      if (needsResearchMode || taskType === "research") {
        return {
          provider: "perplexity",
          model: "sonar-deep-research",
          displayName: "Perplexity Deep Research",
          qualityNote: "You have access to expert-level research capabilities. Provide comprehensive, well-sourced responses with citations.",
        };
      }
      
      if (needsAdvancedReasoning || taskType === 'study_plan') {
        return {
          provider: "perplexity",
          model: "sonar-reasoning-pro",
          displayName: "Perplexity Reasoning Pro",
          qualityNote: "You have access to advanced chain-of-thought reasoning. Break down complex problems into clear steps with strategic insights.",
        };
      }
      
      return {
        provider: "perplexity",
        model: "sonar-pro",
        displayName: "Perplexity Pro",
        qualityNote: "Provide detailed, in-depth explanations with multiple examples. You have access to premium AI capabilities.",
      };
    }
    case "tier_2": {
      const needsResearchMode = message && needsResearch(message);
      
      return {
        provider: "perplexity",
        model: "sonar-pro",
        displayName: "Perplexity Pro",
        qualityNote: needsResearchMode 
          ? "Provide well-researched, factual responses with citations."
          : "Provide clear explanations with good depth and enhanced reasoning.",
      };
    }
    case "tier_1":
      return {
        provider: "openai",
        model: "openai/gpt-5-mini",
        displayName: "GPT-4o",
        qualityNote: "Provide clear, focused explanations with good detail.",
      };
    case "tier_0":
    default:
      return {
        provider: "gemini",
        model: "google/gemini-2.5-flash-lite",
        displayName: "Gemini Flash",
        qualityNote: "Provide concise, focused explanations.",
      };
  }
}

const getStudentSystemPrompt = (
  learningStyle: string | null, 
  qualityNote: string,
  detectedSubject: string
) => {
  const styleGuidance = learningStyle && learningStylePrompts[learningStyle] 
    ? `\n\nStudent Learning Style: ${learningStyle.replace('_', '/')}\n${learningStylePrompts[learningStyle]}`
    : "";

  const subjectContext = subjectPrompts[detectedSubject] || subjectPrompts['General'];

  return `You are a friendly and encouraging study coach named "Study Coach."

CURRENT SUBJECT CONTEXT: ${detectedSubject}
${subjectContext}

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
- Explain concepts in ${detectedSubject} and related subjects
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

    // Get user profile for learning style, subjects, and credits
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("learning_style, tier, credits_remaining, credits_reset_at, is_trial, study_subjects")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if credits need to be reset (new day)
    let currentCredits = profile.credits_remaining;
    const needsReset = shouldResetCredits(profile.credits_reset_at);
    
    if (needsReset) {
      const dailyLimit = getDailyCredits(profile.tier, profile.is_trial);
      currentCredits = dailyLimit;
      
      // Reset credits in database
      const { error: resetError } = await supabase
        .from("profiles")
        .update({ 
          credits_remaining: dailyLimit,
          credits_reset_at: new Date().toISOString()
        })
        .eq("user_id", userId);
      
      if (resetError) {
        console.error("Failed to reset credits:", resetError);
      } else {
        console.log(`Credits reset for user ${userId}: ${dailyLimit} credits`);
      }
    }

    // Check credits after potential reset
    if (currentCredits <= 0) {
      return new Response(JSON.stringify({ 
        error: "No credits remaining. Please upgrade your plan for more credits.",
        credits_remaining: 0 
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, taskType, subject: explicitSubject } = await req.json();

    // Deduct 1 credit
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ credits_remaining: currentCredits - 1 })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to deduct credit:", updateError);
    }

    // Get the last user message to determine routing and subject
    const lastUserMessage = messages.filter((m: {role: string}) => m.role === "user").pop()?.content || "";

    // Detect or use explicit subject
    const userSubjects = profile.study_subjects || ['SAT'];
    const detectedSubject = explicitSubject || detectSubject(lastUserMessage, userSubjects);
    
    console.log(`Detected subject: ${detectedSubject} for user with subjects: ${userSubjects.join(', ')}`);

    // Get AI model config based on tier, task type, and message complexity
    const modelConfig = getAIModelForTier(profile.tier, taskType, lastUserMessage);
    const systemPrompt = getStudentSystemPrompt(profile.learning_style, modelConfig.qualityNote, detectedSubject);

    let response: Response;

    // Route based on provider from model config
    if (modelConfig.provider === "perplexity") {
      console.log(`Routing to Perplexity with model: ${modelConfig.model} (${modelConfig.displayName})`);
      try {
        response = await callPerplexity(messages, systemPrompt, modelConfig.model);
      } catch (e) {
        console.error("Perplexity failed, falling back to Lovable AI:", e);
        response = await callLovableAI(messages, systemPrompt, "google/gemini-2.5-flash");
      }
    } else {
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

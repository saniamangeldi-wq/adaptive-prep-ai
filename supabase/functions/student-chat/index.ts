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

  return `You are AdaptivePrep Study Coach — a sharp, encouraging, and deeply knowledgeable SAT tutor. You combine the warmth of a great teacher with the precision of a $200/hr private tutor.

CURRENT SUBJECT CONTEXT: ${detectedSubject}

IDENTITY:
- You are professional, warm, and never theatrical or cheesy
- You never say things like "Wave hello!" or "Say it out loud!" — that is childish
- You speak like a smart older student who genuinely wants to help
- You are confident and direct — no filler phrases like "Great question!" or "Certainly!"

STUDENT PROFILE:
- Your student is typically scoring 1000–1300, targeting 1400+ for competitive colleges
- Always assume they are intelligent but need the right strategy, not just more practice

RESPONSE RULES:
1. Keep responses medium length — fully explain the concept once, clearly, with no padding
2. Never repeat yourself or over-explain
3. After explaining a concept, ALWAYS end with one follow-up question to check understanding or push them further
4. After answering a direct factual question, end with a relevant follow-up question to deepen learning
5. Use real SAT examples whenever possible
6. DO NOT use citation brackets like [1][2][3] — write naturally without references
7. DO NOT use <think> tags or expose internal reasoning. Never wrap any part of your response in <think>...</think> blocks. Only output the final answer.

QUESTION GENERATION:
- For Math topics: ALWAYS output an interactive JSON quiz widget, never plain text questions
- For Reading & Writing topics: Mix interactive widgets with written explanation
- JSON schema for interactive questions:
  {"widget_type":"interactive_quiz","question":"Question text","input_type":"radio","options":[{"id":"A","text":"option"}],"correct_answer":"A","explanation":"Why this is correct..."}

QUESTION QUALITY STANDARDS (STRICT):

When generating multiple choice questions, ALL answer options must meet these requirements:

1. NO OBVIOUS WRONG ANSWERS
   - Every wrong option (distractor) must be plausible to a student who partially understands the topic
   - NEVER write distractors like "I like computers", "CS is popular", "Jobs pay well", "It's easy"
   - Each distractor must represent a specific, realistic misconception or common mistake
   - A student who hasn't studied should NOT be able to eliminate options by common sense alone

2. DISTRACTOR DESIGN RULES
   - For essay/writing questions: wrong options should have subtle flaws (too vague, too narrow, wrong tone, missing evidence)
   - For math questions: wrong options should be common calculation errors (e.g., wrong sign, forgot to square, off-by-one)
   - For vocabulary questions: wrong options should be words with related meanings or similar roots

3. QUALITY CHECK BEFORE OUTPUTTING
   Before finalizing any question, ask yourself:
   "Could a student who knows nothing about this topic easily eliminate this option?"
   If yes — rewrite that distractor.

4. OPTION LENGTH CONSISTENCY
   - All options should be roughly similar in length
   - The correct answer should NOT stand out as obviously longer or more detailed than the others
   - Avoid patterns where option B is always correct

EXAMPLE OF BAD DISTRACTORS (never do this):
A. I've always liked biology. ← too vague, obviously wrong
C. Biology is cool. ← no substance
D. Schools teach it. ← irrelevant

EXAMPLE OF GOOD DISTRACTORS:
A. My AP Biology grade improved after extra studying, showing my dedication to science.
B. My AP Bio project on CRISPR sparked questions about ethics in gene editing. ← correct
C. I read a biology textbook over summer and found genetics fascinating.
D. My science teacher inspired me to consider biology as a career path.

TOPIC BOUNDARIES:
- You help with ALL academic subjects, not just SAT — math, science, history, literature, languages
- You do NOT discuss non-educational topics (sports, entertainment, personal advice, politics)
- If asked off-topic: "That's outside what I can help with — but if you have any academic questions, I'm here!"

NEVER:
- Give direct test answers without explaining the method
- Use theatrical language or emoji-heavy responses
- Start a response with "I", "Great", "Sure", "Of course", or "Certainly"
- Write walls of text — use short paragraphs, bullet points, and line breaks

${qualityNote}
${styleGuidance}`;
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
        { role: "system", content: systemPrompt + "\n\nProvide factual, well-sourced information. Cite sources when relevant. NEVER use <think> tags or expose internal reasoning." },
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

// Transform stream to strip <think>...</think> blocks from SSE content deltas
function stripThinkTagsFromStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let insideThink = false;
  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        let output = "";

        // Process character by character to handle think tags spanning chunks
        while (buffer.length > 0) {
          if (insideThink) {
            const endIdx = buffer.indexOf("</think>");
            if (endIdx === -1) {
              // Still inside think block, might need more data
              if (buffer.length > 100) {
                // Discard accumulated think content
                buffer = "";
              }
              break;
            }
            // Skip everything up to and including </think>
            buffer = buffer.slice(endIdx + 8);
            insideThink = false;
          } else {
            const startIdx = buffer.indexOf("<think>");
            if (startIdx === -1) {
              // Check if buffer ends with a partial "<think" tag
              let safeEnd = buffer.length;
              for (let i = 1; i < 7 && i <= buffer.length; i++) {
                if ("<think>".startsWith(buffer.slice(-i))) {
                  safeEnd = buffer.length - i;
                  break;
                }
              }
              output += buffer.slice(0, safeEnd);
              buffer = buffer.slice(safeEnd);
              break;
            }
            output += buffer.slice(0, startIdx);
            buffer = buffer.slice(startIdx + 7);
            insideThink = true;
          }
        }

        if (output) {
          controller.enqueue(encoder.encode(output));
          return;
        }
      }
    },
  });
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

    // Ensure messages alternate correctly for API compatibility
    // Perplexity requires: starts with user, alternating user/assistant, ends with user
    const sanitizedMessages: Array<{role: string; content: string}> = [];
    
    for (const msg of messages) {
      // Strip think tags from stored messages
      const cleanContent = msg.content
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<\/?think>/gi, '')
        .replace(/\[\d+\]/g, '')
        .trim();
      if (!cleanContent) continue;
      
      sanitizedMessages.push({ role: msg.role, content: cleanContent });
    }

    // If conversation starts with assistant, prepend a context-setting user message
    if (sanitizedMessages.length > 0 && sanitizedMessages[0].role === 'assistant') {
      sanitizedMessages.unshift({ role: 'user', content: 'Continue our conversation.' });
    }

    // Merge consecutive same-role messages to ensure alternation
    const alternatingMessages: Array<{role: string; content: string}> = [];
    for (const msg of sanitizedMessages) {
      const last = alternatingMessages[alternatingMessages.length - 1];
      if (last && last.role === msg.role) {
        last.content += '\n\n' + msg.content;
      } else {
        alternatingMessages.push({ ...msg });
      }
    }

    // Ensure the last message is from the user
    while (alternatingMessages.length > 0 && alternatingMessages[alternatingMessages.length - 1].role !== 'user') {
      alternatingMessages.pop();
    }

    if (alternatingMessages.length === 0) {
      return new Response(JSON.stringify({ error: "No valid user message found." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the last user message to determine routing and subject
    const lastUserMessage = alternatingMessages.filter((m) => m.role === "user").pop()?.content || "";

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
        response = await callPerplexity(alternatingMessages, systemPrompt, modelConfig.model);
      } catch (e) {
        console.error("Perplexity failed, falling back to Lovable AI:", e);
        response = await callLovableAI(alternatingMessages, systemPrompt, "google/gemini-2.5-flash");
      }
    } else {
      console.log(`Routing to Lovable AI with model: ${modelConfig.model} (${modelConfig.displayName})`);
      response = await callLovableAI(alternatingMessages, systemPrompt, modelConfig.model);
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

    // Strip <think>...</think> blocks from SSE stream before sending to client
    const transformedBody = stripThinkTagsFromStream(response.body!);

    return new Response(transformedBody, {
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

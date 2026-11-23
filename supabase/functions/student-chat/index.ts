import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiChat, AI_MODELS, consumeCredits, refundCredits, describeMastery, type MasteryRow } from "../_shared/ai.ts";

// SAT coach chat. Credits: consume_ai_credits() (atomic, daily reset).
// Provider and models: ../_shared/ai.ts.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AIModelConfig {
  model: string;
  displayName: string;
  qualityNote: string;
}

// One provider, three models. Web search (Perplexity) was removed: an SAT
// coach doesn't need it and it cost more per message than Pro earns.
function getAIModelForTier(tier: string, modelOverride?: string): AIModelConfig {
  if (tier === "tier_3" && modelOverride === "gemini-pro") {
    return { model: AI_MODELS.deep, displayName: "Gemini 2.5 Pro", qualityNote: "Take extra care with multi-step reasoning." };
  }
  if (tier === "tier_0") {
    return { model: AI_MODELS.lite, displayName: "Gemini Flash Lite", qualityNote: "Keep explanations concise." };
  }
  return { model: AI_MODELS.fast, displayName: "Gemini Flash", qualityNote: "Give clear explanations with good depth." };
}

const LANGUAGE_NAMES: Record<string, string> = { ru: "Russian", kk: "Kazakh", en: "English" };

interface StudentProfileContext {
  gradeLevel: string | null;
  fullName: string | null;
  language: string | null;
  targetScore: number | null;
}

const getStudentSystemPrompt = (profileCtx: StudentProfileContext, qualityNote: string) => {
  const { gradeLevel, fullName, language, targetScore } = profileCtx;
  const profileLines: string[] = [];
  if (fullName) profileLines.push(`- Student name: ${fullName}`);
  if (gradeLevel) profileLines.push(`- Grade level: ${gradeLevel}`);
  if (targetScore) profileLines.push(`- Target SAT score: ${targetScore}`);
  const profileBlock = profileLines.length > 0 ? profileLines.join("\n") : "- No profile details yet.";
  const langName = LANGUAGE_NAMES[language ?? ""] ?? null;
  const languageRule = langName && langName !== "English"
    ? `Reply in ${langName} by default (the student's interface language). Keep SAT terms, answer choices and quoted passages in English, since the test is in English. If the student writes in another language, reply in that language.`
    : "Reply in the language the student writes in. Keep SAT terms, answer choices and quoted passages in English.";

  return `You are the AdaptivePrep SAT Coach: a sharp, encouraging tutor for the Digital SAT. Most students are in Kazakhstan and speak Russian or Kazakh; the SAT itself is in English.

STUDENT PROFILE:
${profileBlock}

LANGUAGE:
${languageRule}

HOW YOU TEACH (Socratic by default):
- On a practice question, don't hand over the answer first. Ask what they tried, give the next hint, and let them get there. Give the full solution if they ask for it or are stuck after two hints.
- Explain the method once, clearly. Short paragraphs, no padding, no filler openers ("Great question!", "Sure", "Certainly").
- End with one question that checks understanding or moves them forward.
- Tie advice to the student's data below: their weakest skills come first when they ask what to practise or how they're doing. Quote the actual numbers.

ACCURACY (non-negotiable):
- Math: work the problem step by step and check your final answer (substitute it back, or recompute) before you state it. If you're not sure, say so.
- Never invent official SAT facts (dates, score conversions, College Board policies). If asked, say where to check (satsuite.collegeboard.org).
- The practice percentages below are accuracy on this platform, not official SAT scores.

SCOPE:
- The Digital SAT (Reading and Writing, Math), the skills behind it, study planning and test-day strategy, plus help with English for admissions essays.
- Off-topic requests: "That's outside what I can help with here. Want to work on an SAT skill instead?"

QUESTION GENERATION:
- For Math: ALWAYS output an interactive JSON quiz widget, never plain-text questions.
- For Reading and Writing: mix widgets with short written explanation. Write original passages; never reproduce official College Board questions.
- Multiple choice schema:
  {"widget_type":"interactive_quiz","question":"Question text","input_type":"radio","options":[{"id":"A","text":"option"}],"correct_answer":"A","explanation":"Why this is correct..."}
- Every distractor must be a realistic mistake (wrong sign, forgot to square, too broad, wrong transition logic), similar in length to the correct answer. Vary which letter is correct.
- Free-write schema (thesis practice, explain-in-your-own-words, grid-in math; for math set min_words 1 and correct_answer to the exact number; never reveal sample_answer in your text):
  {"widget_type":"interactive_quiz","question":"Question text","input_type":"free_write","placeholder":"Write here...","min_words":10,"evaluation_criteria":["Criterion 1","Criterion 2","Criterion 3"],"sample_answer":"Example excellent answer"}

REFERENCES:
When the student attaches a document or link, treat it as ground truth for this conversation and say so ("Based on the document you shared..."). Don't make up what isn't in it.

DOCUMENT GENERATION (only when the student explicitly asks for a study plan, slides, spreadsheet or document):
Output one JSON widget block plus a brief explanation. Real content, no placeholders.
- {"widget_type":"document_generator","doc_type":"pptx","title":"...","summary":"...","content":{"title":"...","slides":[{"title":"...","content":"Bullet 1\\nBullet 2"}]}}
- {"widget_type":"document_generator","doc_type":"xlsx","title":"...","summary":"...","content":{"title":"...","sheets":[{"name":"Sheet1","headers":["A","B"],"rows":[["1","2"]]}]}}
- {"widget_type":"document_generator","doc_type":"docx","title":"...","summary":"...","content":{"title":"...","sections":[{"heading":"...","body":"Paragraph."}]}}

FORMAT:
- No citation brackets like [1]. No <think> tags or exposed reasoning.
${qualityNote}`;
};

async function callAI(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  model: string
): Promise<Response> {
  return aiChat({
    model,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    stream: true,
  });
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tier, grade_level, full_name, preferred_language, target_sat_score")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, modelOverride } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap what one request can send, so a long or forged history can't run up
    // token costs: last 20 messages, 8k characters each.
    const MAX_MESSAGES = 20;
    const MAX_CHARS = 8000;
    const sanitizedMessages: Array<{ role: string; content: string }> = [];
    for (const msg of messages.slice(-MAX_MESSAGES)) {
      if (!msg || (msg.role !== "user" && msg.role !== "assistant") || typeof msg.content !== "string") continue;
      const cleanContent = msg.content
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .replace(/<\/?think>/gi, "")
        .replace(/\[\d+\]/g, "")
        .trim()
        .slice(0, MAX_CHARS);
      if (!cleanContent) continue;
      sanitizedMessages.push({ role: msg.role, content: cleanContent });
    }

    if (sanitizedMessages.length > 0 && sanitizedMessages[0].role === "assistant") {
      sanitizedMessages.unshift({ role: "user", content: "Continue our conversation." });
    }

    // Merge consecutive same-role messages so roles alternate
    const alternatingMessages: Array<{ role: string; content: string }> = [];
    for (const msg of sanitizedMessages) {
      const last = alternatingMessages[alternatingMessages.length - 1];
      if (last && last.role === msg.role) last.content += "\n\n" + msg.content;
      else alternatingMessages.push({ ...msg });
    }
    while (alternatingMessages.length > 0 && alternatingMessages[alternatingMessages.length - 1].role !== "user") {
      alternatingMessages.pop();
    }
    if (alternatingMessages.length === 0) {
      return new Response(JSON.stringify({ error: "No valid user message found." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const modelConfig = getAIModelForTier(profile.tier, modelOverride);

    let systemPrompt = getStudentSystemPrompt(
      {
        gradeLevel: profile.grade_level ?? null,
        fullName: profile.full_name ?? null,
        language: profile.preferred_language ?? null,
        targetScore: profile.target_sat_score ?? null,
      },
      modelConfig.qualityNote
    );

    // Student data: skill mastery (from skill_mastery) + recent tests.
    try {
      const [{ data: mastery }, { data: attempts }] = await Promise.all([
        supabase
          .from("skill_mastery")
          .select("skill, section, rating, attempts, correct")
          .eq("user_id", userId),
        supabase
          .from("test_attempts")
          .select("correct_answers, total_questions, completed_at, feedback")
          .eq("user_id", userId)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(5),
      ]);

      const lines: string[] = [];
      const masteryText = describeMastery((mastery ?? []) as MasteryRow[]);
      if (masteryText) {
        lines.push("Skill mastery (weakest first; % = estimated chance of getting a medium question in that skill right):");
        lines.push(masteryText);
      }
      if (attempts && attempts.length > 0) {
        lines.push("Recent practice tests (accuracy on this platform):");
        for (const a of attempts as any[]) {
          const date = a.completed_at ? new Date(a.completed_at).toISOString().slice(0, 10) : "";
          const acc = a.total_questions ? Math.round(((a.correct_answers ?? 0) / a.total_questions) * 100) : null;
          const est = a.feedback?.scoreEstimate;
          const estText = est?.total ? ` • estimated SAT ${est.low}–${est.high} (unofficial estimate)` : "";
          lines.push(`- ${date}: ${a.correct_answers ?? 0}/${a.total_questions ?? 0}${acc !== null ? ` (${acc}%)` : ""}${estText}`);
        }
      }
      if (lines.length > 0) {
        systemPrompt += "\n\nSTUDENT DATA:\n" + lines.join("\n") + "\n";
      } else {
        systemPrompt += "\n\nSTUDENT DATA: none yet. If they ask how they're doing, suggest a diagnostic test first.\n";
      }
    } catch (e) {
      console.error("Could not load student data:", e);
    }

    // Charge after validation so malformed requests cost nothing.
    const credit = await consumeCredits(supabase, 1);
    if (!credit.ok) {
      return new Response(JSON.stringify({ error: credit.error, credits_remaining: 0 }), {
        status: credit.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let response: Response;
    try {
      response = await callAI(alternatingMessages, systemPrompt, modelConfig.model);
    } catch (e) {
      await refundCredits(userId, 1);
      throw e;
    }

    if (!response.ok) {
      await refundCredits(userId, 1);
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

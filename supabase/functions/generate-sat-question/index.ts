import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  section: "Math" | "Reading-Writing";
  domain: string;
  skill: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  mode: "pregenerated" | "generated";
}

interface GeneratedQuestion {
  section: string;
  format: string;
  domain: string;
  skill: string;
  difficulty: number;
  context?: string;
  stem: string;
  choices: { id: string; text: string }[];
  correct_answer: string;
  explanation: string;
}

const GENERATION_PROMPT = `SYSTEM PROMPT

You are an expert SAT practice-item author and verifier.

Create exactly ONE original digital-SAT-style practice question. Do not copy, paraphrase,
or imitate any known College Board question, copyrighted passage, test form, or prep-book item.

The question must match the requested section, domain, skill, and difficulty. Use conventional
SAT wording and avoid trivia, culturally narrow assumptions, unnecessary ambiguity, or facts
that cannot be understood from the provided context.

Important:
- Return valid JSON only. No Markdown, comments, or extra keys.
- For multiple-choice questions, provide exactly four choices with IDs A, B, C, and D.
- There must be exactly one defensibly correct answer.
- Every incorrect choice must be plausible but objectively wrong.
- The explanation must show why the correct answer is correct and why the other choices are wrong.
- Do not mention College Board, this prompt, model limitations, or internal validation.
- Do not use unsupported claims about SAT scoring. This is a practice item, not an official
  score-equating item.

Before returning the JSON, silently perform this checklist:
1. Solve the question independently.
2. Recalculate all arithmetic and algebra.
3. Check units, signs, domains, rounding, and answer-choice transcription.
4. For Reading and Writing, verify that the answer follows from the passage or sentence,
   not from outside knowledge.
5. Verify that exactly one choice is correct.
6. Verify that the explanation agrees with the selected answer.
7. If any check fails, discard the draft and create a corrected question.

Return this exact JSON shape:

{
  "section": "Math" | "Reading-Writing",
  "format": "multiple_choice",
  "domain": "...",
  "skill": "...",
  "difficulty": 1,
  "context": "...",
  "stem": "...",
  "choices": [
    {"id": "A", "text": "..."},
    {"id": "B", "text": "..."},
    {"id": "C", "text": "..."},
    {"id": "D", "text": "..."}
  ],
  "correct_answer": "A",
  "explanation": "..."
}`;

async function callGemini(prompt: string, userPrompt: string): Promise<GeneratedQuestion> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: prompt }] },
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No content in Gemini response");

  const parsed = JSON.parse(text);
  return parsed as GeneratedQuestion;
}

async function callGroq(prompt: string, userPrompt: string): Promise<GeneratedQuestion> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("No content in Groq response");

  const parsed = JSON.parse(text);
  return parsed as GeneratedQuestion;
}

function validateQuestionStructure(q: GeneratedQuestion): string[] {
  const errors: string[] = [];

  if (!q.section || !["Math", "Reading-Writing"].includes(q.section)) {
    errors.push("Invalid or missing section");
  }

  if (q.format !== "multiple_choice") {
    errors.push("Format must be multiple_choice");
  }

  if (!q.choices || q.choices.length !== 4) {
    errors.push("Must have exactly 4 choices");
  } else {
    const ids = q.choices.map((c) => c.id);
    if (ids.join(",") !== "A,B,C,D") {
      errors.push("Choices must have IDs A, B, C, D");
    }
    const uniqueTexts = new Set(q.choices.map((c) => c.text));
    if (uniqueTexts.size !== 4) {
      errors.push("Choice texts must be unique");
    }
  }

  if (!q.correct_answer || !/^[A-D]$/.test(q.correct_answer)) {
    errors.push("correct_answer must be A, B, C, or D");
  }

  if (!q.stem || q.stem.trim().length === 0) {
    errors.push("Stem cannot be empty");
  }

  if (!q.explanation || q.explanation.trim().length === 0) {
    errors.push("Explanation cannot be empty");
  }

  return errors;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
      }
    );

    const { section, domain, skill, difficulty, mode } = await req.json() as GenerateRequest;

    if (mode === "pregenerated") {
      const { data, error } = await supabaseClient
        .from("sat_questions")
        .select("*")
        .eq("source", "pregenerated")
        .eq("active", true)
        .eq("section", section)
        .eq("domain", domain)
        .eq("skill", skill)
        .eq("difficulty", difficulty)
        .limit(1)
        .single();

      if (error || !data) {
        const { data: fallback, error: fallbackError } = await supabaseClient
          .from("sat_questions")
          .select("*")
          .eq("source", "pregenerated")
          .eq("active", true)
          .eq("section", section)
          .limit(1)
          .single();

        if (fallbackError || !fallback) {
          throw new Error("No pregenerated questions available");
        }

        return new Response(JSON.stringify(fallback), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Requested section: ${section}
Requested domain: ${domain}
Requested skill: ${skill}
Target difficulty: ${difficulty} out of 5
Language: English
Additional constraints: None`;

    let question: GeneratedQuestion | null = null;
    let provider: string | null = null;
    let lastError: string | null = null;

    try {
      question = await callGemini(GENERATION_PROMPT, userPrompt);
      provider = "gemini";
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.error("Gemini failed:", lastError);

      try {
        question = await callGroq(GENERATION_PROMPT, userPrompt);
        provider = "groq";
      } catch (e2) {
        lastError = e2 instanceof Error ? e2.message : String(e2);
        console.error("Groq failed:", lastError);
      }
    }

    if (!question) {
      throw new Error(`All providers failed: ${lastError}`);
    }

    const validationErrors = validateQuestionStructure(question);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
    }

    const { data: inserted, error: insertError } = await supabaseClient
      .from("sat_questions")
      .insert({
        schema_version: "1.0",
        section: question.section,
        format: question.format,
        domain: question.domain,
        skill: question.skill,
        difficulty: question.difficulty,
        difficulty_method: "model_estimate",
        difficulty_confidence: 0.7,
        context: question.context,
        stem: question.stem,
        choices_json: question.choices,
        correct_answer: question.correct_answer,
        explanation: question.explanation,
        source: "generated",
        generator_model: "gemini-2.5-flash-lite",
        generator_provider: provider,
        generated_at: new Date().toISOString(),
        prompt_version: "1.0",
        validation_status: "passed",
        validation_json: { passed: true, checked_at: new Date().toISOString() },
        copyright_status: "original",
        active: true,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    return new Response(JSON.stringify(inserted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-sat-question error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

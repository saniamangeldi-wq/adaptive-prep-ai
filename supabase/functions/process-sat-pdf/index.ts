import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuestionTable {
  headers: string[];
  rows: string[][];
  caption?: string;
}

interface QuestionFigure {
  type: "image" | "svg";
  src?: string;
  svg?: string;
  alt: string;
  caption?: string;
}

interface Question {
  id: string;
  type: "multiple_choice" | "grid_in";
  section: "math" | "reading_writing";
  difficulty: "easy" | "normal" | "hard";
  topic: string;
  text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  stimulus?: string;
  table?: QuestionTable;
  figure?: QuestionFigure;
}

interface ParsedTest {
  testName: string;
  testType: "math" | "reading_writing" | "combined";
  difficulty: "easy" | "normal" | "hard";
  timeLimit: number;
  questions: Question[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin (school_admin role)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "school_admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body
    const { fileName, fileBase64 } = await req.json();

    if (!fileName || !fileBase64) {
      return new Response(
        JSON.stringify({ error: "Missing fileName or fileBase64" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode base64 to get PDF content
    const pdfBytes = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));
    const pdfText = await extractPdfText(pdfBytes);

    // Use Lovable AI Gateway to parse the questions
    const parseResult = await parseWithAI(pdfText, fileName);

    // FIX 5: AI returned an error object instead of questions
    if ("error" in parseResult) {
      return new Response(
        JSON.stringify({
          error: "AI could not parse the PDF: " + parseResult.error,
          suggestion: "Please ensure the PDF contains readable SAT question content.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = parseResult;

    // FIX 3: Validate every question before saving
    const validQuestions: Question[] = [];
    const rejectedQuestions: { question: unknown; errors: string[] }[] = [];
    for (let i = 0; i < parsed.questions.length; i++) {
      const q = parsed.questions[i];
      const { valid, errors } = validateQuestion(q, i);
      if (valid) {
        validQuestions.push(q);
      } else {
        console.warn(
          `[validate] Rejected question ${i + 1}:`,
          errors,
          q.text?.slice(0, 80)
        );
        rejectedQuestions.push({ question: q, errors });
      }
    }

    if (validQuestions.length < 5) {
      return new Response(
        JSON.stringify({
          error:
            "Too many invalid questions generated. Only " +
            validQuestions.length +
            " of " +
            parsed.questions.length +
            " passed validation.",
          rejected: rejectedQuestions,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    parsed.questions = validQuestions;

    // FIX 4: Ensure no duplicate ids
    const ids = new Set<string>();
    parsed.questions = parsed.questions.map((q, i) => {
      if (ids.has(q.id)) {
        q.id = `${q.id}_${i}`;
      }
      ids.add(q.id);
      return q;
    });

    // Store in database using service role for inserting official tests
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let testType = "combined";
    if (parsed.testType === "math") testType = "math";
    else if (parsed.testType === "reading_writing") testType = "reading_writing";

    const { data: test, error: insertError } = await supabaseAdmin
      .from("sat_tests")
      .insert({
        title: parsed.testName,
        description: `Uploaded from ${fileName}`,
        test_type: testType,
        difficulty: parsed.difficulty,
        length: categorizeLength(parsed.questions.length),
        questions: parsed.questions,
        time_limit_minutes: parsed.timeLimit,
        is_official: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting test:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save test to database", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        testId: test.id,
        testName: parsed.testName,
        questionsCount: parsed.questions.length,
        rejectedCount: rejectedQuestions.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error processing PDF:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to process PDF";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function extractPdfText(pdfBytes: Uint8Array): Promise<string> {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const rawText = decoder.decode(pdfBytes);

  const textContent: string[] = [];
  const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
  let match;
  while ((match = streamRegex.exec(rawText)) !== null) {
    const content = match[1];
    const filtered = content.replace(/[^\x20-\x7E\n\r]/g, " ").trim();
    if (filtered.length > 10) textContent.push(filtered);
  }

  const textMatches = rawText.match(/\(([^)]+)\)/g);
  if (textMatches) {
    for (const m of textMatches) {
      const text = m.slice(1, -1).trim();
      if (text.length > 2 && /[a-zA-Z]/.test(text)) textContent.push(text);
    }
  }

  return textContent.join("\n").slice(0, 50000);
}

async function parseWithAI(
  pdfText: string,
  fileName: string
): Promise<ParsedTest | { error: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  // FIX 1: Strict new system prompt
  const systemPrompt = `You are an expert SAT question validator and parser.
Extract SAT questions from the provided PDF text.
Return ONLY a valid JSON object — no markdown, no backticks, no explanation outside the JSON.

JSON structure:
{
  "testName": "string",
  "testType": "math" | "reading_writing" | "combined",
  "difficulty": "easy" | "normal" | "hard",
  "timeLimit": number,
  "questions": [
    {
      "id": "unique string e.g. q1",
      "type": "multiple_choice" | "grid_in",
      "section": "math" | "reading_writing",
      "difficulty": "easy" | "normal" | "hard",
      "topic": "algebra" | "geometry" | "data_analysis" | "reading_comprehension" | "grammar" | "vocabulary",
      "text": "Full question text",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A" | "B" | "C" | "D",
      "explanation": "Step by step solution"
    }
  ]
}

STRICT RULES YOU MUST FOLLOW:
1. For every multiple_choice question, you MUST:
   a. Solve the question mathematically yourself
   b. Identify which option (A/B/C/D) contains your computed answer
   c. Set correct_answer to that letter
   d. Write an explanation that matches that letter
   e. Never set correct_answer to a letter whose option text does not match your solution

2. For ratio/proportion questions, ONLY use numbers that produce clean integer answers.
   Test: if answer = given_value × (b/a) and the result is not an integer, change the given value before writing the question.

3. options must always have exactly 4 entries for multiple_choice questions.

4. All 4 options must be different from each other.

5. correct_answer must be exactly one of: "A", "B", "C", or "D"

6. If the PDF text is unreadable, corrupted, or clearly not SAT content, return:
   { "error": "Unable to parse PDF content" }
   Do NOT invent questions. Do NOT guess. Return the error object only.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Parse this SAT practice test content from file "${fileName}":\n\n${pdfText.slice(0, 30000)}\n\nExtract all questions with their answer choices, correct answers, and explanations. If the text is unreadable or clearly not SAT content, return the error object as instructed.`,
        },
      ],
      max_tokens: 8000,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI API error:", errorText);
    throw new Error("Failed to parse PDF with AI");
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  // Extract JSON (handle accidental code fences)
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) jsonStr = jsonMatch[1];

  try {
    const parsed = JSON.parse(jsonStr);

    // AI signaled it could not parse
    if (parsed && typeof parsed === "object" && typeof parsed.error === "string" && !parsed.questions) {
      return { error: parsed.error };
    }

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error("Invalid parsed structure: missing questions array");
    }

    parsed.questions = parsed.questions.map((q: Partial<Question>, i: number) => ({
      id: q.id || `q${i + 1}`,
      type: q.type || "multiple_choice",
      section: q.section || "math",
      difficulty: q.difficulty || "normal",
      topic: q.topic || "general",
      text: q.text || "",
      options: q.options || [],
      correct_answer: q.correct_answer || "",
      explanation: q.explanation || "",
    }));

    return {
      testName: parsed.testName || fileName.replace(".pdf", ""),
      testType: parsed.testType || "combined",
      difficulty: parsed.difficulty || "normal",
      timeLimit: parsed.timeLimit || 60,
      questions: parsed.questions,
    };
  } catch (parseError) {
    // FIX 2: NO fallback dummy questions — surface the failure
    console.error("[process-sat-pdf] Failed to parse AI response:", parseError);
    const message = parseError instanceof Error ? parseError.message : String(parseError);
    throw new Response(
      JSON.stringify({
        error: "Failed to parse questions from PDF. Please check the PDF format and try again.",
        details: message,
      }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }
}

// FIX 3: Real per-question validation
function validateQuestion(q: Question, index: number): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validLetters = ["A", "B", "C", "D"];
  const validDifficulties = ["easy", "normal", "hard"];
  const validSections = ["math", "reading_writing"];
  const validTypes = ["multiple_choice", "grid_in"];

  if (q.type === "multiple_choice") {
    if (!validLetters.includes(q.correct_answer)) {
      errors.push(`correct_answer "${q.correct_answer}" is not A/B/C/D`);
    }

    if (!q.options || q.options.length !== 4) {
      errors.push(`Must have exactly 4 options, got ${q.options?.length}`);
    }

    if (q.options && validLetters.includes(q.correct_answer)) {
      const correctIndex = validLetters.indexOf(q.correct_answer);
      const correctOption = q.options[correctIndex];
      if (!correctOption || correctOption.trim() === "") {
        errors.push(`Option ${q.correct_answer} is empty or missing`);
      }
    }

    if (q.options) {
      const normalized = q.options.map((o: string) => o.trim().toLowerCase());
      if (new Set(normalized).size !== normalized.length) {
        errors.push("Duplicate options detected");
      }
    }
  }

  if (!q.text || q.text.trim() === "" || q.text === `Question ${index + 1}`) {
    errors.push("Question text is empty or generic");
  }

  if (!validDifficulties.includes(q.difficulty)) {
    errors.push(`Invalid difficulty: "${q.difficulty}"`);
  }

  if (!validSections.includes(q.section)) {
    errors.push(`Invalid section: "${q.section}"`);
  }

  if (!validTypes.includes(q.type)) {
    errors.push(`Invalid type: "${q.type}"`);
  }

  if (q.explanation && q.correct_answer) {
    const contradictionPhrases = [
      "should be updated",
      "front-end should",
      "not an integer",
      "not realistic",
      "intended correct",
      "option should be",
    ];
    const hasContradiction = contradictionPhrases.some((phrase) =>
      q.explanation.toLowerCase().includes(phrase)
    );
    if (hasContradiction) {
      errors.push("Explanation contains contradiction phrases");
    }
  }

  return { valid: errors.length === 0, errors };
}

function categorizeLength(questionCount: number): "quick" | "short" | "medium" | "long" | "full" {
  if (questionCount <= 10) return "quick";
  if (questionCount <= 25) return "short";
  if (questionCount <= 50) return "medium";
  if (questionCount <= 100) return "long";
  return "full";
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
// No external PDF libraries — we use a small built-in extractor to avoid
// native canvas/graphics dependencies that break in the edge runtime.

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

interface QuestionTableSpec {
  kind: "table";
  headers: string[];
  rows: string[][];
}

interface QuestionGraphSpec {
  kind: "graph";
  relationship: "linear";
  xVariable: string;
  yVariable: string;
  equation: string;
  slope: number;
  intercept: number;
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
  table_spec?: QuestionTableSpec;
  figure?: QuestionFigure;
  graph_spec?: QuestionGraphSpec;
  visual_unavailable?: boolean;
}

const RAW_VISUAL_MARKUP_RE = /<\/?(?:svg|style|script|foreignObject)\b|\*\s*\{[^}]*\}|\b(?:stroke-linecap|stroke-linejoin|viewBox)\s*:/i;
const VISUAL_REFERENCE_RE = /\b(?:the|this|shown|given|following)\s+(?:graph|chart|figure|diagram|table)\b(?!\s+of\s+(?:this|the|the given)\s+equation)|\bgraph represents\b/i;

function normalizeMathTokens(input: string): string {
  return (input || "")
    .replace(/\bleft parenthesis\b/gi, "(")
    .replace(/\bright parenthesis\b/gi, ")")
    .replace(/\bleft bracket\b/gi, "[")
    .replace(/\bright bracket\b/gi, "]")
    .replace(/\bequals(?: sign)?\b/gi, "=")
    .replace(/\bplus(?: sign)?\b/gi, "+")
    .replace(/\bminus(?: sign)?\b/gi, "−")
    .replace(/\btimes(?: sign)?\b/gi, "×")
    .replace(/\bgreater than or equal to\b/gi, "≥")
    .replace(/\bless than or equal to\b/gi, "≤")
    .replace(/\bnot equal to\b/gi, "≠")
    .replace(/\b([A-Za-z])\s+\(/g, "$1(")
    .replace(/[ \t]+([),.;:?])/g, "$1")
    .replace(/([([])[ \t]+/g, "$1")
    .replace(/[ \t]{2,}/g, " ");
}

function normalizeStoredText(input: string): { text: string; removedVisualMarkup: boolean } {
  const source = input || "";
  const removedVisualMarkup = RAW_VISUAL_MARKUP_RE.test(source);
  const text = source
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<svg\b[\s\S]*?<\/svg\s*>/gi, "")
    .replace(/<foreignObject\b[\s\S]*?<\/foreignObject\s*>/gi, "")
    .replace(/^\s*\*?\s*\{[^}]*\}\s*$/gim, "")
    .replace(/^.*\b(?:stroke-linecap|stroke-linejoin|viewBox)\s*:[^\n]*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text: normalizeMathTokens(text), removedVisualMarkup };
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
  try {
    const text = await extractTextFromPdf(pdfBytes);
    if (text.trim().length > 50) return text.slice(0, 50000);
  } catch (err) {
    console.warn("Built-in PDF extraction failed, using fallback:", err);
  }
  return fallbackExtractPdfText(pdfBytes);
}

/**
 * Lightweight PDF text extractor using only Deno/Web APIs.
 * Works directly with the raw Uint8Array so compressed streams are not
 * corrupted by UTF-8 decoding. It decompresses FlateDecode content streams
 * and reconstructs lines from text positioning operators so tables and
 * aligned values stay readable.
 */
async function extractTextFromPdf(pdfBytes: Uint8Array): Promise<string> {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const pageTexts: string[] = [];

  const streamStart = encode("stream\n");
  const streamStartCR = encode("stream\r\n");
  const streamEnd = encode("endstream");

  let pos = 0;
  while (pos < pdfBytes.length) {
    const startIdx = findNext(pdfBytes, streamStart, pos);
    const startIdxCR = findNext(pdfBytes, streamStartCR, pos);
    let start = -1;
    if (startIdx !== -1 && (startIdxCR === -1 || startIdx < startIdxCR)) {
      start = startIdx + streamStart.length;
    } else if (startIdxCR !== -1) {
      start = startIdxCR + streamStartCR.length;
    }
    if (start === -1) break;

    const end = findNext(pdfBytes, streamEnd, start);
    if (end === -1) break;

    // Trim the trailing newline that usually precedes endstream.
    let contentStart = start;
    let contentEnd = end;
    if (contentEnd > contentStart && pdfBytes[contentEnd - 1] === 0x0A) contentEnd--;
    if (contentEnd > contentStart && pdfBytes[contentEnd - 1] === 0x0D) contentEnd--;

    const rawStream = pdfBytes.slice(contentStart, contentEnd);

    // Read the stream dictionary that precedes "stream" to determine filters.
    const dictStart = findPrevDictStart(pdfBytes, startIdx === -1 ? startIdxCR : startIdx);
    const dictText = decoder.decode(pdfBytes.slice(dictStart, startIdx === -1 ? startIdxCR : startIdx));
    const filters = parseFilters(dictText);

    let streamText = "";
    try {
      const decoded = await applyFilters(rawStream, filters);
      streamText = decoder.decode(decoded);
    } catch {
      streamText = decoder.decode(rawStream);
    }

    const pageText = parseContentStream(streamText);
    if (pageText.trim().length > 10) pageTexts.push(pageText);

    pos = end + streamEnd.length;
  }

  return pageTexts.join("\n\n---PAGE BREAK---\n\n");
}

function encode(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function findNext(haystack: Uint8Array, needle: Uint8Array, start: number): number {
  for (let i = start; i <= haystack.length - needle.length; i++) {
    let found = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        found = false;
        break;
      }
    }
    if (found) return i;
  }
  return -1;
}

function findPrevDictStart(pdfBytes: Uint8Array, before: number): number {
  for (let i = before - 1; i >= 0; i--) {
    if (pdfBytes[i] === 0x3C && pdfBytes[i + 1] === 0x3C) return i;
  }
  return Math.max(0, before - 500);
}

function parseFilters(dictText: string): string[] {
  const filters: string[] = [];
  const single = dictText.match(/\/Filter\s+\/([A-Za-z0-9]+)/);
  if (single) {
    filters.push(single[1]);
  } else {
    const array = dictText.match(/\/Filter\s*\[([^\]]*)\]/);
    if (array) {
      const names = array[1].match(/\/([A-Za-z0-9]+)/g);
      if (names) {
        for (const n of names) filters.push(n.slice(1));
      }
    }
  }
  return filters;
}

async function applyFilters(data: Uint8Array, filters: string[]): Promise<Uint8Array> {
  let current = data;
  for (const filter of filters) {
    if (filter === "FlateDecode") {
      current = await inflateZlib(current);
    } else if (filter === "ASCII85Decode") {
      current = decodeAscii85(current);
    } else if (filter === "ASCIIHexDecode") {
      current = decodeAsciiHex(current);
    } else {
      // Unsupported filter; pass through and hope the next filter works.
    }
  }
  return current;
}

async function inflateZlib(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate");
  const writer = ds.writable.getWriter();
  writer.write(data as unknown as BufferSource);
  writer.close();
  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((a, b) => a + b.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function decodeAscii85(data: Uint8Array): Uint8Array {
  const str = decoderLatin1.decode(data).trim();
  let input = str;
  if (input.endsWith("~>")) input = input.slice(0, -2);
  const out: number[] = [];
  let i = 0;
  while (i < input.length) {
    if (/\s/.test(input[i])) { i++; continue; }
    if (input[i] === "z") {
      out.push(0, 0, 0, 0);
      i++;
      continue;
    }
    const chunk = input.slice(i, i + 5);
    if (chunk.length < 5) break;
    let value = 0;
    for (let k = 0; k < 5; k++) {
      const code = chunk.charCodeAt(k) - 33;
      value = value * 85 + code;
    }
    const bytesToWrite = chunk.trimEnd().length === 5 ? 4 : chunk.trimEnd().length - 1;
    for (let k = 3; k >= 4 - bytesToWrite; k--) {
      out.push((value >>> (k * 8)) & 0xFF);
    }
    i += 5;
  }
  return new Uint8Array(out);
}

function decodeAsciiHex(data: Uint8Array): Uint8Array {
  const str = decoderLatin1.decode(data).replace(/\s/g, "");
  const out: number[] = [];
  for (let i = 0; i < str.length; i += 2) {
    const hex = str.slice(i, i + 2);
    if (hex === ">") break;
    const code = parseInt(hex, 16);
    if (!isNaN(code)) out.push(code);
  }
  return new Uint8Array(out);
}

const decoderLatin1 = new TextDecoder("latin1", { fatal: false });

interface TextItem {
  x: number;
  y: number;
  text: string;
}

function parseContentStream(content: string): string {
  const items: TextItem[] = [];
  const tokens = tokenize(content);

  // Current text matrix (simplified: we track x, y offsets).
  let tx = 0;
  let ty = 0;
  let lineY = 0;
  let fontSize = 12;
  let textBuffer = "";

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token === "BT") {
      tx = 0;
      ty = 0;
      textBuffer = "";
    } else if (token === "ET") {
      flushBuffer();
    } else if (token === "Tj" || token === "'") {
      if (textBuffer) {
        items.push({ x: tx, y: ty, text: textBuffer });
        textBuffer = "";
      }
    } else if (token === "TJ") {
      // Array of strings/numbers: [(text) -120 (more)] TJ
      // We already collected the joined string in textBuffer during tokenization.
      if (textBuffer) {
        items.push({ x: tx, y: ty, text: textBuffer });
        textBuffer = "";
      }
    } else if (token === "Td" || token === "TD") {
      flushBuffer();
      const dy = parseFloat(tokens[i - 1]);
      const dx = parseFloat(tokens[i - 2]);
      tx += dx;
      ty += dy;
      if (token === "TD") {
        lineY = ty;
      }
    } else if (token === "Tm") {
      flushBuffer();
      const y = parseFloat(tokens[i - 1]);
      const x = parseFloat(tokens[i - 2]);
      tx = x;
      ty = y;
      lineY = y;
    } else if (token === "T*") {
      flushBuffer();
      ty -= fontSize * 1.2;
      tx = 0;
    } else if (token === "Tf") {
      flushBuffer();
      const size = parseFloat(tokens[i - 2]);
      if (!isNaN(size) && size > 0) fontSize = size;
    } else if (token.startsWith("(") || token.startsWith("<") || /^-?\d+(\.\d+)?$/.test(token)) {
      // Collect text or numeric adjustments. We only care about the text itself.
      if (token.startsWith("(") || token.startsWith("<")) {
        textBuffer += decodePdfString(token);
      }
    }
  }

  flushBuffer();

  // Group items by line (rounded y) and sort left-to-right.
  const lines = new Map<number, TextItem[]>();
  for (const item of items) {
    const y = Math.round(item.y / 3) * 3;
    if (!lines.has(y)) lines.set(y, []);
    lines.get(y)!.push(item);
  }

  const sortedLines = Array.from(lines.entries())
    .sort((a, b) => b[0] - a[0]) // top-to-bottom (PDF y increases upward)
    .map(([, lineItems]) => {
      lineItems.sort((a, b) => a.x - b.x);
      return lineItems.map((it) => it.text).join(" ");
    });

  return sortedLines.join("\n");

  function flushBuffer() {
    if (textBuffer) {
      items.push({ x: tx, y: ty, text: textBuffer });
      textBuffer = "";
    }
  }
}

function tokenize(content: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < content.length) {
    const ch = content[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "(") {
      // Literal string; handle escaped parentheses.
      let depth = 1;
      let j = i + 1;
      while (j < content.length && depth > 0) {
        if (content[j] === "\\") {
          j += 2;
          continue;
        }
        if (content[j] === "(") depth++;
        if (content[j] === ")") depth--;
        j++;
      }
      tokens.push(content.slice(i, j));
      i = j;
    } else if (ch === "<") {
      // Hex string or dictionary start. We only capture simple hex strings.
      const end = content.indexOf(">", i);
      if (end !== -1 && end - i < 500) {
        tokens.push(content.slice(i, end + 1));
        i = end + 1;
      } else {
        i++;
      }
    } else if (ch === "[") {
      // Array (commonly used in TJ). We tokenize its contents recursively.
      let depth = 1;
      let j = i + 1;
      while (j < content.length && depth > 0) {
        if (content[j] === "[") depth++;
        if (content[j] === "]") depth--;
        j++;
      }
      const inner = content.slice(i + 1, j - 1);
      tokens.push(...tokenize(inner));
      tokens.push("TJ");
      i = j;
    } else if (/[A-Za-z*']/.test(ch)) {
      let j = i;
      while (j < content.length && /[A-Za-z*']/.test(content[j])) j++;
      tokens.push(content.slice(i, j));
      i = j;
    } else if (/[\d\-\.]/.test(ch)) {
      let j = i;
      while (j < content.length && /[\d\-\.]/.test(content[j])) j++;
      tokens.push(content.slice(i, j));
      i = j;
    } else {
      i++;
    }
  }
  return tokens;
}

function decodePdfString(token: string): string {
  if (token.startsWith("(") && token.endsWith(")")) {
    let inner = token.slice(1, -1);
    // Unescape common PDF escapes.
    inner = inner
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\b/g, "\b")
      .replace(/\\f/g, "\f")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\")
      .replace(/\\(\d{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
    return inner;
  }
  if (token.startsWith("<") && token.endsWith(">")) {
    const hex = token.slice(1, -1).replace(/\s/g, "");
    let out = "";
    for (let k = 0; k < hex.length; k += 2) {
      const code = parseInt(hex.slice(k, k + 2), 16);
      if (!isNaN(code)) out += String.fromCharCode(code);
    }
    return out;
  }
  return token;
}

function fallbackExtractPdfText(pdfBytes: Uint8Array): Promise<string> {
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

  return Promise.resolve(textContent.join("\n").slice(0, 50000));
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
      "stimulus": "OPTIONAL passage / intro text shown above the prompt (R&W passages, scenario setup). Omit if none.",
      "table": {                       // OPTIONAL — include ONLY when the source shows tabular data
        "headers": ["x", "f(x)"],
        "rows": [["10", "82"], ["15", "137"]],
        "caption": "optional short caption"
      },
      "figure": {                      // OPTIONAL — include ONLY when the source shows a chart/graph/diagram
        "type": "svg" | "image",
        "svg": "<svg xmlns=... viewBox=...>...</svg>",   // when type == "svg" (preferred for simple charts you can reconstruct)
        "src": "https://... or data:image/...;base64,...", // when type == "image" (only if you have a real image URL)
        "alt": "short accessible description",
        "caption": "optional caption"
      },
      "text": "The question prompt itself, with math in LaTeX using \\( ... \\) delimiters, e.g. \\( f(x) = mx - 28 \\).",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A" | "B" | "C" | "D",
      "explanation": "Step by step solution, also using LaTeX for math."
    }
  ]
}

STRICT RULES YOU MUST FOLLOW:
1. MATH FORMATTING — NEVER spell out math in words. Do NOT write "f left parenthesis x right parenthesis equals m x minus 28"; write \\( f(x) = mx - 28 \\). Use LaTeX inline delimiters \\( ... \\) (or \\[ ... \\] for display) inside "text", "stimulus", "explanation", "options", table cells, and figure captions.

2. TABLES — This is the #1 priority. If the source shows a table (a grid of aligned numbers/labels, e.g. "x    10   15   20" and "f(x)  82  137  192"), you MUST emit it as a structured "table" object with headers[] and rows[][]. Do NOT inline the numbers into the "text" as prose. Do NOT describe the table in words. Cells may contain LaTeX.

   Example input from PDF:
     x      10   15   20
     f(x)   82  137  192
   Required output:
     "table": { "headers": ["x", "f(x)"], "rows": [["10", "82"], ["15", "137"], ["20", "192"]] }

3. FIGURES — If the source describes or shows a chart, graph, coordinate plane, or diagram, emit a "figure". Prefer type "svg" with a clean, minimal inline <svg> (viewBox, no scripts, no external refs) that reproduces the shape/points/axes. Only use type "image" when you have a real image URL/data-URL for that figure. Always include "alt". NEVER replace a figure with a long prose description.

   Example: for a triangle with vertices A, B, C, output a simple SVG with three labeled points and sides, not a paragraph describing the triangle.

4. PARENTHESES/OPERATORS — Never describe them in words ("left parenthesis", "equals", "over", "square root of"). Use the LaTeX symbol.

5. For every multiple_choice question, you MUST:
   a. Solve the question mathematically yourself
   b. Identify which option (A/B/C/D) contains your computed answer
   c. Set correct_answer to that letter
   d. Write an explanation that matches that letter
   e. Never set correct_answer to a letter whose option text does not match your solution

6. For ratio/proportion questions, ONLY use numbers that produce clean integer answers.
   Test: if answer = given_value × (b/a) and the result is not an integer, change the given value before writing the question.

7. options must always have exactly 4 entries for multiple_choice questions.

8. All 4 options must be different from each other.

9. correct_answer must be exactly one of: "A", "B", "C", or "D"

10. If the PDF text is unreadable, corrupted, or clearly not SAT content, return:
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
          content: `Parse this SAT practice test content from file "${fileName}":\n\n${pdfText.slice(0, 30000)}\n\nExtract all questions with their answer choices, correct answers, and explanations. When you see a table of values, output a structured "table" object (never inline the numbers as prose). When you see a chart or diagram, output a "figure" with inline SVG. Write ALL math with LaTeX \\( ... \\) delimiters. If the text is unreadable or clearly not SAT content, return the error object as instructed.`,
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

    parsed.questions = parsed.questions.map((q: Partial<Question>, i: number) => {
      const normalizedPrompt = normalizeStoredText(q.text || "");
      const normalizedStimulus = normalizeStoredText(typeof q.stimulus === "string" ? q.stimulus : "");
      const cleaned: Question = {
        id: q.id || `q${i + 1}`,
        type: q.type || "multiple_choice",
        section: q.section || "math",
        difficulty: q.difficulty || "normal",
        topic: q.topic || "general",
        text: normalizedPrompt.text,
        options: Array.isArray(q.options) ? q.options.map((option) => normalizeStoredText(String(option)).text) : [],
        correct_answer: q.correct_answer || "",
        explanation: normalizeStoredText(q.explanation || "").text,
      };
      if (normalizedStimulus.text) cleaned.stimulus = normalizedStimulus.text;
      const table = sanitizeTable(q.table) ?? extractTableFromText(cleaned.text);
      if (table) cleaned.table = table;
      const tableSpec = deriveTableSpec(cleaned.table);
      if (tableSpec && validateTableSpec(tableSpec)) cleaned.table_spec = tableSpec;
      const figure = sanitizeFigure(q.figure);
      if (figure) cleaned.figure = figure;
      const graphSpec = deriveGraphSpec(cleaned);
      if (graphSpec && validateGraphSpec(graphSpec)) cleaned.graph_spec = graphSpec;
      const sourceReferencedVisual = VISUAL_REFERENCE_RE.test(`${normalizedStimulus.text}\n${normalizedPrompt.text}`);
      if ((normalizedPrompt.removedVisualMarkup || normalizedStimulus.removedVisualMarkup || sourceReferencedVisual) && !cleaned.figure && !cleaned.table_spec && !cleaned.graph_spec) {
        cleaned.visual_unavailable = true;
      }
      return cleaned;
    });

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

// Try to recover a structured table when the AI inlined tabular data as prose.
function extractTableFromText(text: string): QuestionTable | undefined {
  if (!text) return undefined;
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  // Look for a block of 2-6 consecutive lines that all have the same number
  // of whitespace-separated tokens (at least 2 tokens and at least one number).
  for (let start = 0; start < lines.length; start++) {
    const tokens = lines[start].split(/\s+/);
    if (tokens.length < 2 || tokens.length > 8) continue;
    const hasNumber = tokens.some((t) => /^-?\d+(\.\d+)?$/.test(t));
    if (!hasNumber) continue;

    let end = start;
    for (let j = start + 1; j < Math.min(start + 6, lines.length); j++) {
      const nextTokens = lines[j].split(/\s+/);
      if (nextTokens.length !== tokens.length) break;
      if (!nextTokens.some((t) => /^-?\d+(\.\d+)?$/.test(t))) break;
      end = j;
    }

    if (end > start) {
      const block = lines.slice(start, end + 1);
      const headers = block[0].split(/\s+/);
      const rows = block.slice(1).map((line) => line.split(/\s+/));
      return { headers, rows };
    }
  }
  return undefined;
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

function sanitizeTable(raw: unknown): QuestionTable | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const t = raw as Partial<QuestionTable>;
  if (!Array.isArray(t.headers) || !Array.isArray(t.rows)) return undefined;
  const headers = t.headers.map((h) => String(h ?? ""));
  const rows = t.rows
    .filter((r) => Array.isArray(r))
    .map((r) => (r as unknown[]).map((c) => String(c ?? "")));
  if (headers.length < 2 || rows.length === 0 || rows.some((row) => row.length !== headers.length)) return undefined;
  const out: QuestionTable = { headers, rows };
  if (typeof t.caption === "string" && t.caption.trim()) out.caption = t.caption;
  return out;
}

function sanitizeFigure(raw: unknown): QuestionFigure | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const f = raw as Partial<QuestionFigure>;
  const alt = typeof f.alt === "string" && f.alt.trim() ? f.alt : "Figure";
  if (f.type === "svg" && typeof f.svg === "string" && f.svg.includes("<svg")) {
    // Server-side SVG sanitization without DOMPurify (avoids jsdom/canvas).
    // The authoritative sanitizer runs on the client before render.
    const svg = f.svg
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
      .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(/(href|xlink:href)\s*=\s*("|')\s*javascript:[^"']*("|')/gi, '$1="#"');
    const out: QuestionFigure = { type: "svg", svg, alt };
    if (typeof f.caption === "string" && f.caption.trim()) out.caption = f.caption;
    return out;
  }
  if (f.type === "image" && typeof f.src === "string" && /^(https?:|data:image\/)/i.test(f.src)) {
    const out: QuestionFigure = { type: "image", src: f.src, alt };
    if (typeof f.caption === "string" && f.caption.trim()) out.caption = f.caption;
    return out;
  }
  return undefined;
}

function deriveTableSpec(table: QuestionTable | undefined): QuestionTableSpec | undefined {
  if (!table) return undefined;
  return {
    kind: "table",
    headers: table.headers.map((header) => String(header ?? "").trim()),
    rows: table.rows.map((row) => row.map((cell) => String(cell ?? "").trim())),
  };
}

function validateTableSpec(spec: QuestionTableSpec): boolean {
  if (!Array.isArray(spec.headers) || spec.headers.length < 2 || spec.headers.some((header) => !header)) {
    return false;
  }
  if (!Array.isArray(spec.rows) || spec.rows.length === 0) return false;
  if (spec.rows.some((row) => !Array.isArray(row) || row.length !== spec.headers.length)) return false;
  return spec.rows.some((row) => row.some((cell) => Number.isFinite(parseNumericCell(cell))));
}

function parseNumericCell(value: string | undefined): number {
  if (!value) return Number.NaN;
  const parsed = Number(value.replace(/[$,%]/g, "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseLinearEquation(source: string): Omit<QuestionGraphSpec, "kind" | "relationship"> | undefined {
  if (!source) return undefined;
  const compact = source.replace(/\s+/g, "").replace(/−/g, "-");
  const fxMatch = compact.match(/^([a-zA-Z])\(([a-zA-Z])\)=([+-]?\d*\.?\d*)([a-zA-Z])([+-]\d*\.?\d+)$/);
  if (fxMatch) {
    const yVariable = fxMatch[1];
    const xVariable = fxMatch[2];
    const slopeToken = fxMatch[3];
    const xTermVariable = fxMatch[4];
    const interceptToken = fxMatch[5];
    if (xVariable !== xTermVariable) return undefined;
    const slope = slopeToken === "" || slopeToken === "+" ? 1 : slopeToken === "-" ? -1 : Number(slopeToken);
    const intercept = Number(interceptToken);
    if (!Number.isFinite(slope) || !Number.isFinite(intercept)) return undefined;
    return {
      xVariable,
      yVariable,
      equation: `${yVariable}(${xVariable}) = ${slope}${xVariable} ${intercept >= 0 ? "+" : "−"} ${Math.abs(intercept)}`,
      slope,
      intercept,
    };
  }

  const yxMatch = compact.match(/^([a-zA-Z])=([+-]?\d*\.?\d*)([a-zA-Z])([+-]\d*\.?\d+)$/);
  if (!yxMatch) return undefined;
  const yVariable = yxMatch[1];
  const slopeToken = yxMatch[2];
  const xVariable = yxMatch[3];
  const interceptToken = yxMatch[4];
  const slope = slopeToken === "" || slopeToken === "+" ? 1 : slopeToken === "-" ? -1 : Number(slopeToken);
  const intercept = Number(interceptToken);
  if (!Number.isFinite(slope) || !Number.isFinite(intercept)) return undefined;
  return {
    xVariable,
    yVariable,
    equation: `${yVariable} = ${slope}${xVariable} ${intercept >= 0 ? "+" : "−"} ${Math.abs(intercept)}`,
    slope,
    intercept,
  };
}

function deriveGraphSpec(question: Question): QuestionGraphSpec | undefined {
  const candidates = [question.text, question.stimulus].filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    const equalities = candidate.match(/[a-zA-Z]\s*(?:\(\s*[a-zA-Z]\s*\))?\s*=\s*[^\n.;:!?]+/g) || [];
    for (const equation of equalities) {
      const parsed = parseLinearEquation(equation);
      if (parsed) {
        return {
          kind: "graph",
          relationship: "linear",
          ...parsed,
        };
      }
    }
  }
  return undefined;
}

function validateGraphSpec(spec: QuestionGraphSpec): boolean {
  return Boolean(
    spec.equation &&
      spec.xVariable &&
      spec.yVariable &&
      Number.isFinite(spec.slope) &&
      Number.isFinite(spec.intercept)
  );
}

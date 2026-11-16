// POST student-chat — the IELTS Writing coach (slim rewrite).
//
// Transport is unchanged for src/hooks/useAIChat.ts:
//   request  { messages: [{role, content}], ...extra fields }
//   success  200 text/event-stream, the gateway's OpenAI-style SSE passed through
//            ("data: {choices:[{delta:{content}}]}" lines, ending "data: [DONE]")
//   failure  JSON { error } with 401 / 400 / 402 (no credits) / 404 / 429 / 500
// Conversation persistence stays in the hook (it writes ai_conversations
// itself); this function does not read or write that table, so
// `conversationId` is accepted and ignored.
//
// Accepted and IGNORED for compatibility while the web app changes:
// isReport, reportContext, analysisType, modelOverride, taskType, subject,
// quizContext, attachments, learningStyle and any other extra field.
//
// New: `reportId` (owner-checked) gives the coach the task, script, bands,
// checklist, priorities and issues; `lang` sets the reply language.
// One provider (Lovable AI Gateway), one cheap model, 1 credit per message.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CREDIT_COST } from "../_shared/ielts/contract.ts";
import type { FeedbackLang } from "../_shared/ielts/contract.ts";
import { CORS_HEADERS, fail, preflight, readJson } from "../_shared/ielts/http.ts";
import { isFeedbackLang, isUuid } from "../_shared/ielts/requests.ts";
import { buildCoachSystemPrompt, legacyReportContext, reportContext, trimHistory } from "../_shared/ielts/chat.ts";
import { isGradeReport } from "../_shared/ielts/postprocess.ts";
import { buildChatBody, callGateway } from "../_shared/ielts/gateway.ts";
import { CHAT_SETTINGS } from "../_shared/ielts/models.ts";
import { refundCredits, spendCredits } from "../_shared/ielts/credits.ts";

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return fail(401, "Unauthorized", "unauthorized");
  let userId: string;
  try {
    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return fail(401, "Unauthorized: Invalid token", "unauthorized");
    userId = data.user.id;
  } catch {
    return fail(401, "Unauthorized", "unauthorized");
  }

  const body = (await readJson(req, 1_000_000)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return fail(400, "Request body must be JSON.", "bad_request");
  if (!Array.isArray(body.messages)) return fail(400, "messages must be an array.", "bad_request");
  const history = trimHistory(body.messages);
  if (history.length === 0) return fail(400, "No valid user message found.", "bad_request");

  const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Language: explicit `lang`, else the profile's preferred_language, else English.
  let lang: FeedbackLang = "en";
  if (isFeedbackLang(body.lang)) lang = body.lang;
  else {
    const { data: p } = await admin.from("profiles").select("preferred_language").eq("user_id", userId).maybeSingle();
    if (isFeedbackLang(p?.preferred_language)) lang = p.preferred_language;
  }

  // Report context, owner-checked, loaded before any credit is spent.
  let context: string | null = null;
  if (body.reportId !== undefined && body.reportId !== null && body.reportId !== "") {
    if (!isUuid(body.reportId)) return fail(400, "reportId must be a UUID.", "bad_request");
    const { data: row, error } = await admin
      .from("ielts_writing_reports")
      .select("task_type, prompt, essay, overall_band, criteria, comments")
      .eq("id", body.reportId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("chat: report load failed", error);
      return fail(500, "Could not load the report.", "upstream_error");
    }
    if (!row) return fail(404, "Report not found.", "not_found");
    context = isGradeReport(row.comments) ? reportContext(row.comments) : legacyReportContext(row);
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return fail(500, "AI service is not configured.", "upstream_error");

  const cost = CREDIT_COST.chat;
  const spend = await spendCredits(admin, userId, cost);
  if (spend.ok === false) {
    if (spend.reason === "no_credits") {
      return new Response(JSON.stringify({ error: "You're out of credits for today. They reset tomorrow.", code: "no_credits", credits_remaining: 0 }), {
        status: 402,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    console.error("chat: credit check failed", spend.detail);
    return fail(500, "Could not verify credits", "upstream_error");
  }

  try {
    const system = buildCoachSystemPrompt({ lang, context });
    const res = await callGateway(
      LOVABLE_API_KEY,
      buildChatBody({ settings: CHAT_SETTINGS, messages: [{ role: "system", content: system }, ...history], stream: true }),
      { timeoutMs: CHAT_SETTINGS.timeoutMs },
    );
    if (res.ok === false) {
      await refundCredits(admin, userId, cost);
      const f = res as Extract<typeof res, { ok: false }>;
      console.error("chat: upstream failure", f.status, f.detail.slice(0, 300));
      if (f.status === 429) return fail(429, "Rate limit exceeded. Please try again later.", "rate_limited");
      return fail(500, "AI service error. Please try again.", "upstream_error");
    }
    if (!("stream" in res)) {
      await refundCredits(admin, userId, cost);
      return fail(500, "AI service error. Please try again.", "upstream_error");
    }
    // Pass the gateway's SSE stream through unchanged: the hook parses it directly.
    return new Response(res.stream, { headers: { ...CORS_HEADERS, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("student-chat error:", e);
    await refundCredits(admin, userId, cost);
    return fail(500, "Unexpected error.", "upstream_error");
  }
});

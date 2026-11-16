// POST ielts-grade-writing — GradeRequest → GradeResponse | ApiError
//
// Order of work: authenticate → validate (no credits spent on bad input) →
// spend credits (with the daily reset) → one gateway call (+1 retry on
// invalid output) → post-process → save → complete the draft → respond.
// Any failure after credits were spent refunds them (see _shared/ielts/credits.ts).
// All marking logic lives in _shared/ielts/ (pure, unit-tested).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { GradeResponse } from "../_shared/ielts/contract.ts";
import { CREDIT_COST } from "../_shared/ielts/contract.ts";
import { fail, json, preflight, readJson } from "../_shared/ielts/http.ts";
import { validateGradeRequest } from "../_shared/ielts/requests.ts";
import { refundCredits, spendCredits } from "../_shared/ielts/credits.ts";
import { callGateway, mapUpstreamFailure } from "../_shared/ielts/gateway.ts";
import { gradeWithModel } from "../_shared/ielts/grader.ts";
import { buildReport, reportDiagnostics, reportRow } from "../_shared/ielts/postprocess.ts";
import { countWords, promptOverlap, splitParagraphs } from "../_shared/ielts/text.ts";
import { GRADER_VERSION } from "../_shared/ielts/prompt.ts";

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return fail(401, "Please sign in.", "unauthorized");

  let userId: string;
  try {
    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return fail(401, "Please sign in.", "unauthorized");
    userId = data.user.id;
  } catch {
    return fail(401, "Please sign in.", "unauthorized");
  }

  const body = await readJson(req);
  if (body === null) return fail(400, "Request body must be JSON (max 3 MB).", "bad_request");
  const checked = validateGradeRequest(body);
  if (checked.ok === false) return json(checked.error, checked.status);
  const input = checked.value;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return fail(500, "The marking service is not configured.", "upstream_error");

  const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const cost = input.includeModelAnswer ? CREDIT_COST.gradeWithModelAnswer : CREDIT_COST.grade;
  const spend = await spendCredits(admin, userId, cost);
  if (spend.ok === false) {
    if (spend.reason === "no_credits") return fail(402, "You're out of credits for today. They reset tomorrow.", "no_credits");
    console.error("grade: credit check failed", spend.detail);
    return fail(500, "Could not verify credits.", "upstream_error");
  }
  let creditsRemaining: number | null = spend.remaining;

  try {
    const stats = {
      wordCount: countWords(input.script),
      paragraphCount: splitParagraphs(input.script).length,
      copiedWords: promptOverlap(input.script, [input.task.prompt, ...input.task.bullets].join("\n")).copiedWords,
    };

    const result = await gradeWithModel(
      {
        task: input.task,
        variant: input.task.variant,
        script: input.script,
        feedbackLang: input.feedbackLang,
        includeModelAnswer: input.includeModelAnswer,
        customVisual: input.customVisual,
        stats,
      },
      {
        call: (b, timeoutMs) => callGateway(LOVABLE_API_KEY, b, { timeoutMs }),
        now: () => Date.now(),
        log: (msg, data) => console.warn(msg, JSON.stringify(data ?? {})),
      },
    );

    if (result.ok === false) {
      const refunded = await refundCredits(admin, userId, cost);
      if (refunded !== null) creditsRemaining = refunded;
      if (result.kind === "invalid") {
        console.error("grade: invalid model output after retry", { graderVersion: GRADER_VERSION, errors: result.errors.slice(0, 10) });
        return fail(502, "The marker returned an unreadable result. Your credits were not used; please try again.", "grader_invalid_output");
      }
      console.error("grade: upstream failure", result.status, result.detail.slice(0, 500));
      const m = mapUpstreamFailure(result.status);
      return fail(m.status, m.message, m.code);
    }

    const reportId = crypto.randomUUID();
    const report = buildReport({
      output: result.output,
      task: input.task,
      script: input.script,
      feedbackLang: input.feedbackLang,
      model: result.model,
      includeModelAnswer: input.includeModelAnswer,
      customVisual: input.customVisual,
      id: reportId,
      now: new Date().toISOString(),
    });
    console.log("grade: ok", JSON.stringify({ attempts: result.attempts, mode: result.mode, ...reportDiagnostics(result.output, report) }));

    // Only link a draft the user owns (session_id is a foreign key).
    let sessionId: string | null = null;
    if (input.sessionId) {
      const { data: s } = await admin
        .from("ielts_sessions")
        .select("id")
        .eq("id", input.sessionId)
        .eq("user_id", userId)
        .eq("skill", "writing")
        .maybeSingle();
      if (s?.id) sessionId = s.id;
    }

    const { error: saveError } = await admin.from("ielts_writing_reports").insert({ ...reportRow(report), user_id: userId, session_id: sessionId });
    if (saveError) {
      // The student paid and the grading succeeded: return it, but without an id (it cannot be reopened or discussed in chat).
      console.error("grade: could not save report", saveError);
      report.id = null;
    }

    // Close the draft only when the report is stored: otherwise the draft is the only
    // server copy of the essay, so it stays open for the student to submit again.
    if (sessionId && !saveError) {
      const { error: sErr } = await admin
        .from("ielts_sessions")
        .update({ status: "completed", completed_at: new Date().toISOString(), band: report.overall })
        .eq("id", sessionId)
        .eq("user_id", userId);
      if (sErr) console.error("grade: could not complete draft session", sErr);
    }

    const response: GradeResponse = { report, creditsRemaining };
    return json(response);
  } catch (e) {
    console.error("grade: unexpected error", e);
    await refundCredits(admin, userId, cost);
    return fail(500, "Unexpected error while marking. Your credits were not used.", "upstream_error");
  }
});

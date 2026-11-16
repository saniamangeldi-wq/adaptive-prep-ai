// POST ielts-generate-writing-task — GetTaskRequest → GetTaskResponse | ApiError
//
// source "bank" (default): a task from the original bank. No model call, no credits.
// source "generated": the cheap model writes a task (json_object mode), validated
// against the contract (including visual specs) before it is returned; one retry
// with the validator errors; credits refunded on failure.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { GetTaskResponse } from "../_shared/ielts/contract.ts";
import { CREDIT_COST } from "../_shared/ielts/contract.ts";
import { fail, json, preflight, readJson } from "../_shared/ielts/http.ts";
import { validateGetTaskRequest } from "../_shared/ielts/requests.ts";
import { pickBankTask } from "../_shared/ielts/taskBank.ts";
import { buildTaskGenMessages, buildTaskGenRetry, normalizeGeneratedTask, pickVariant } from "../_shared/ielts/taskGen.ts";
import { buildChatBody, callGateway, extractStructured, mapUpstreamFailure } from "../_shared/ielts/gateway.ts";
import { TASK_GEN_SETTINGS } from "../_shared/ielts/models.ts";
import { refundCredits, spendCredits } from "../_shared/ielts/credits.ts";

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return fail(401, "Please sign in.", "unauthorized");
  let userId: string;
  try {
    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return fail(401, "Please sign in.", "unauthorized");
    userId = data.user.id;
  } catch {
    return fail(401, "Please sign in.", "unauthorized");
  }

  const body = await readJson(req, 50_000);
  if (body === null) return fail(400, "Request body must be JSON.", "bad_request");
  const checked = validateGetTaskRequest(body);
  if (checked.ok === false) return json(checked.error, checked.status);
  const reqv = checked.value;

  if (reqv.source === "bank") {
    const task = pickBankTask(reqv);
    if (!task) return fail(404, "No task available for that selection.", "not_found");
    const response: GetTaskResponse = { task, creditsRemaining: null };
    return json(response);
  }

  // ── generated ──
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return fail(500, "Task generation is not configured.", "upstream_error");
  const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const cost = CREDIT_COST.generateTask;
  const spend = await spendCredits(admin, userId, cost);
  if (spend.ok === false) {
    if (spend.reason === "no_credits") return fail(402, "You're out of credits for today. They reset tomorrow.", "no_credits");
    console.error("generate: credit check failed", spend.detail);
    return fail(500, "Could not verify credits.", "upstream_error");
  }

  try {
    const variant = pickVariant(reqv.taskType, reqv.variant);
    const base = buildTaskGenMessages(reqv.taskType, variant, reqv.topic);
    let messages = base;
    let lastErrors: string[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await callGateway(LOVABLE_API_KEY, buildChatBody({ settings: TASK_GEN_SETTINGS, messages, structured: { mode: "json" } }), {
        timeoutMs: TASK_GEN_SETTINGS.timeoutMs,
      });
      if (res.ok === false) {
        await refundCredits(admin, userId, cost);
        const f = res as Extract<typeof res, { ok: false }>;
        console.error("generate: upstream failure", f.status, f.detail.slice(0, 300));
        const m = mapUpstreamFailure(f.status);
        return fail(m.status, m.message, m.code);
      }
      const extracted = "json" in res ? extractStructured(res.json) : { ok: false as const, error: "unexpected stream" };
      if (extracted.ok === true) {
        const n = normalizeGeneratedTask(extracted.value, reqv.taskType, variant, `gen-${crypto.randomUUID()}`);
        if (n.ok === true) {
          const response: GetTaskResponse = { task: n.task, creditsRemaining: spend.remaining };
          return json(response);
        }
        lastErrors = (n as Extract<typeof n, { ok: false }>).errors;
      } else {
        lastErrors = [(extracted as { error: string }).error];
      }
      console.warn("generate: invalid task", JSON.stringify(lastErrors.slice(0, 8)));
      messages = [...base, buildTaskGenRetry(lastErrors)];
    }
    const refunded = await refundCredits(admin, userId, cost);
    console.error("generate: invalid after retry", { refunded });
    return fail(502, "Could not generate a valid task. Your credits were not used; try again or pick one from the bank.", "upstream_error");
  } catch (e) {
    console.error("generate: unexpected error", e);
    await refundCredits(admin, userId, cost);
    return fail(500, "Unexpected error. Your credits were not used.", "upstream_error");
  }
});

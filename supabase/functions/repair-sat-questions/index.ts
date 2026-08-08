import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

/** Screen-reader / speech serialization that must be repaired at the source. */
const SPEECH_TOKEN_RE =
  /\b(?:Superscript|Subscript|Baseline|StartFraction|EndFraction|StartRoot|EndRoot|StartAbsoluteValue|EndAbsoluteValue|percent sign|left parenthesis|right parenthesis)\b/i;
/** Flattened table/chart data glued into the prompt or options. */
const FLATTENED_RE = /(?:\b\d+\s+){5,}\d+\b/;

function needsRepair(q: any): boolean {
  const blob = JSON.stringify([q?.text, q?.stimulus, q?.options, q?.explanation]);
  return SPEECH_TOKEN_RE.test(blob) || FLATTENED_RE.test(blob);
}

const REWRITE_PROMPT = `You repair SAT questions whose math was stored as screen-reader speech text and whose tables were flattened into plain text during import.

Return STRICT JSON only:
{
  "text": string,
  "stimulus": string | null,
  "options": string[] | null,
  "explanation": string | null,
  "table": { "headers": string[], "rows": string[][], "caption"?: string } | null,
  "notes": string
}

Rules:
- Convert every speech-math token into real LaTeX wrapped in $...$ (e.g. "x Superscript negative 2 Baseline" -> "$x^{-2}$", "StartFraction a Over b EndFraction" -> "$\\frac{a}{b}$", "percent sign" -> "%").
- Never change the mathematical meaning, the numbers, the answer, or the option order.
- Never reword prose that is already correct. Repair formatting only.
- If a run of numbers is a flattened table, move it into "table" with correct headers and rows, and remove that blob from "text". Options that are flattened tables become a compact readable representation of the same values.
- Return null for any field you did not change.
- Invent nothing. If the data is unrecoverable, set "notes" to "unrecoverable" and return nulls.`;

const VERIFY_PROMPT = `You independently solve an SAT question and verify its recorded answer.

Return STRICT JSON only:
{ "answer": string, "agrees": boolean, "confidence": number, "reason": string }

"answer" is the option letter (A-D) for multiple choice, or the numeric value for grid-in.
"agrees" is true only if your independent answer matches the recorded answer.
Do not be agreeable: if the recorded answer is wrong, say so.`;

async function callModel(model: string, system: string, user: string) {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const raw: string = data.choices?.[0]?.message?.content ?? "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function isValidTable(t: any): boolean {
  return (
    !!t && Array.isArray(t.headers) && t.headers.length >= 2 &&
    Array.isArray(t.rows) && t.rows.length > 0 &&
    t.rows.every((r: any) => Array.isArray(r) && r.length === t.headers.length)
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    let authorized = token === SERVICE_ROLE;
    if (!authorized) {
      const { data: userRes } = await admin.auth.getUser(token);
      const uid = userRes?.user?.id;
      if (!uid) return json({ error: "Unauthorized" }, 401);
      const { data: profile } = await admin
        .from("profiles")
        .select("role")
        .eq("user_id", uid)
        .maybeSingle();
      authorized = profile?.role === "school_admin";
    }
    if (!authorized) return json({ error: "Forbidden" }, 403);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const dryRun = Boolean(body?.dry_run);
    const verify = body?.verify !== false;
    const limit = Math.min(Number(body?.limit) || 25, 100);

    const { data: tests, error } = await admin.from("sat_tests").select("id, questions");
    if (error) throw error;

    let flagged = 0;
    let repaired = 0;
    let verified = 0;
    let disputed = 0;
    let unrecoverable = 0;
    const samples: unknown[] = [];

    for (const test of tests ?? []) {
      if (repaired >= limit) break;
      const questions = Array.isArray(test.questions) ? [...(test.questions as any[])] : [];
      let dirty = false;

      for (let i = 0; i < questions.length; i++) {
        if (repaired >= limit) break;
        const q = questions[i];
        if (!q || typeof q !== "object" || !q.id) continue;
        if (!needsRepair(q)) continue;
        flagged++;

        const payload = JSON.stringify({
          text: q.text ?? "",
          stimulus: q.stimulus ?? null,
          options: q.options ?? null,
          explanation: q.explanation ?? null,
        });

        const fix = await callModel("google/gemini-3.1-pro-preview", REWRITE_PROMPT, payload);
        if (!fix || fix.notes === "unrecoverable") {
          unrecoverable++;
          continue;
        }

        const next: any = { ...q, original_text: q.original_text ?? q.text };
        if (typeof fix.text === "string" && fix.text.trim()) next.text = fix.text;
        if (typeof fix.stimulus === "string" && fix.stimulus.trim()) next.stimulus = fix.stimulus;
        if (Array.isArray(fix.options) && fix.options.length === (q.options?.length ?? 0)) {
          next.options = fix.options;
        }
        if (typeof fix.explanation === "string" && fix.explanation.trim()) {
          next.explanation = fix.explanation;
        }
        if (isValidTable(fix.table)) next.table = fix.table;

        let status = "deliverable";
        const reasons: string[] = [];

        if (verify) {
          const check = await callModel(
            "openai/gpt-5.5",
            VERIFY_PROMPT,
            JSON.stringify({
              text: next.text,
              stimulus: next.stimulus ?? null,
              options: next.options ?? null,
              table: next.table ?? null,
              recorded_answer: q.correct_answer ?? q.answer ?? null,
            })
          );
          if (check?.agrees === true) {
            verified++;
          } else {
            disputed++;
            status = "needs_review";
            reasons.push("answer_disputed");
          }
        }

        repaired++;
        if (samples.length < 3) {
          samples.push({ id: q.id, before: q.text?.slice(0, 160), after: next.text?.slice(0, 160), status });
        }

        if (!dryRun) {
          questions[i] = next;
          dirty = true;
          await admin.from("question_validation_state").upsert(
            {
              question_id: String(q.id),
              test_id: test.id,
              visual_requirement: next.table ? "optional" : "none",
              delivery_status: status,
              media_type: next.table ? "table" : null,
              fallback_used: null,
              failure_reasons: reasons,
              difficulty: q.difficulty ?? null,
              domain: q.section ?? null,
              skill: q.topic ?? null,
              validated_at: new Date().toISOString(),
            },
            { onConflict: "question_id" }
          );
        }
      }

      if (dirty && !dryRun) {
        const { error: upErr } = await admin.from("sat_tests").update({ questions }).eq("id", test.id);
        if (upErr) throw upErr;
      }
    }

    return json({ flagged, repaired, verified, disputed, unrecoverable, dry_run: dryRun, samples });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

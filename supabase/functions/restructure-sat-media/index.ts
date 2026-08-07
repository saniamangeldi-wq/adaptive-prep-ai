import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

/**
 * Detects questions whose table / chart data was flattened into plain text
 * during import, and rebuilds structured `table` / `figure` fields so the
 * renderer can show a real table or diagram. Question wording, options,
 * answers and explanations are never modified.
 */
function looksFlattened(text: string): boolean {
  if (!text) return false;
  return (
    /the data for the \d+ categories are as follows/i.test(text) ||
    /bars are shown/i.test(text) ||
    /(from|in) the table/i.test(text) ||
    /[a-z)][A-Z][a-z]+\d/.test(text) // glued cells: "...(in grams)Corn15.1"
  );
}

const SYSTEM_PROMPT = `You restructure SAT questions whose data table or chart was flattened into plain text during PDF/HTML import.

Return STRICT JSON only:
{
  "table": { "headers": string[], "rows": string[][], "caption"?: string } | null,
  "figure": { "type": "svg", "svg": string, "alt": string, "caption"?: string } | null,
  "text": string
}

Rules:
- Recover the original table exactly: split glued header/row cells correctly and keep every value.
- If the flattened content describes a bar/line chart (axis labels, category values), produce BOTH a "table" of the values AND a "figure" with a clean, self-contained inline <svg> bar chart (viewBox, no external fonts/images, no scripts, dark-neutral text color "#111", bars "#10B981", width ~640).
- If it is a geometry/diagram description with concrete measurements, produce a simple accurate inline <svg> figure.
- If there is no table or chart at all, return nulls and the text unchanged.
- "text" MUST be the original question text with ONLY the flattened table/chart blob removed. Never reword, translate, shorten or fix the remaining prompt text. Keep placeholders like "______blank".
- Never invent data that is not present in the input.
- Double-check cell splitting: a row label must not swallow the next cell's value (e.g. "Cornyes" is wrong; it is "Corn" + "yes"). Every row must have exactly as many cells as there are headers.`;

async function restructure(text: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
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


/* ---------------- Visual requirement validation ---------------- */

const EXPLICIT_VISUAL_RE =
  /\bin the (?:graph|table|figure|chart|diagram|scatterplot|histogram)\b|\b(?:graph|table|figure|chart|diagram)\s+(?:above|below|shown)\b|\bas shown\b|\bthe graph of\b(?!\s+(?:this|the|the given)\s+equation)|\bscatterplot\b|\bbar (?:graph|chart)\b|\bthe (?:following|given) (?:graph|table|figure|chart|diagram)\b/i;
const DOMAIN_HINT_RE = /\b(?:data set|dataset|frequency|distribution|quantitative evidence|percent of respondents|survey)\b/i;
const RAW_MATH_TOKEN_RE = /\b(?:Superscript|Subscript|Baseline|StartFraction|EndFraction|StartRoot|EndRoot)\b/i;

function isValidTable(t: any): boolean {
  return !!t && Array.isArray(t.headers) && t.headers.length >= 2 && Array.isArray(t.rows) && t.rows.length > 0 &&
    t.rows.every((r: any) => Array.isArray(r) && r.length === t.headers.length);
}

function isRenderableFigure(f: any): boolean {
  if (!f) return false;
  if (f.type === "image") return typeof f.src === "string" && /^(https?:|data:image\/)/i.test(f.src);
  return typeof f.svg === "string" && /<svg\b/i.test(f.svg) && /<\/svg\s*>/i.test(f.svg);
}

function isUsableTextEquivalent(text: any): boolean {
  if (typeof text !== "string" || text.trim().length < 120) return false;
  return (text.match(/-?\d+(?:\.\d+)?/g) || []).length >= 2;
}

/** Mirrors src/lib/sat-content.ts `validateQuestion`. Keep the two in sync. */
export function validateQuestion(q: any) {
  const source = [q.stimulus, q.text].filter(Boolean).join("\n");
  const failure_reasons: string[] = [];
  if (RAW_MATH_TOKEN_RE.test(source)) failure_reasons.push("math_serialization_invalid");

  const media = q.media || {};
  const figure = q.figure || (q.image_url ? { type: "image", src: q.image_url } : null);
  const structured = q.table || media.data;
  const figureOk = isRenderableFigure(figure);
  const mediaUrlOk = typeof media.src === "string" && /^(https?:|data:image\/)/i.test(media.src);
  const structuredOk = isValidTable(structured);
  const textOk = isUsableTextEquivalent(media.text_equivalent);

  const visual_requirement = EXPLICIT_VISUAL_RE.test(source)
    ? "required"
    : figure || structured || media.src ? "optional" : "none";

  if (q.visual_unavailable) failure_reasons.push("flagged_visual_unavailable");
  if (figure && !figureOk) failure_reasons.push("asset_invalid");
  if (q.table && !isValidTable(q.table)) failure_reasons.push("structured_data_invalid");

  let fallback_used: string | null = null;
  if (visual_requirement === "required") {
    const hasPrimary = figureOk || mediaUrlOk;
    if (!hasPrimary && !structuredOk && !textOk) {
      failure_reasons.push(figure || media.src ? "asset_unreachable_no_fallback" : "required_visual_missing_media");
    } else if (!hasPrimary) {
      fallback_used = structuredOk ? "structured" : "text";
    }
  }

  let delivery_status = "deliverable";
  if (failure_reasons.length) delivery_status = "quarantined";
  else if (fallback_used) delivery_status = "degraded";
  else if (visual_requirement === "none" && DOMAIN_HINT_RE.test(source) && !structuredOk && !figureOk) {
    delivery_status = "needs_review";
  }

  const media_type = figureOk ? figure.type : mediaUrlOk ? "image" : structuredOk ? "table" : textOk ? "text" : null;
  return { visual_requirement, delivery_status, media_type, fallback_used, failure_reasons };
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
    const limit = Math.min(Number(body?.limit) || 50, 200);

    const { data: tests, error } = await admin
      .from("sat_tests")
      .select("id, questions");
    if (error) throw error;

    let scanned = 0;
    let converted = 0;
    let quarantined = 0;
    const samples: unknown[] = [];

    for (const test of tests ?? []) {
      const questions = Array.isArray(test.questions) ? [...(test.questions as any[])] : [];
      let dirty = false;

      for (let i = 0; i < questions.length; i++) {
        if (converted >= limit) break;
        const q = questions[i];
        if (!q || typeof q !== "object") continue;
        if (q.table || q.figure) continue;
        if (!looksFlattened(q.text || "")) continue;
        scanned++;

        const result = await restructure(q.text);
        if (!result || (!result.table && !result.figure)) continue;
        if (!result.text || typeof result.text !== "string") continue;

        const next = { ...q, text: result.text };
        if (result.table?.headers?.length && result.table?.rows?.length) next.table = result.table;
        if (result.figure?.svg) next.figure = result.figure;

        converted++;
        if (samples.length < 3) samples.push({ id: q.id, table: next.table, figure: !!next.figure });
        if (!dryRun) {
          questions[i] = next;
          dirty = true;
        }
      }

      // Record validation state for every question in this test.
      if (!dryRun) {
        const rows = questions
          .filter((q: any) => q && typeof q === "object" && q.id)
          .map((q: any) => {
            const v = validateQuestion(q);
            if (v.delivery_status === "quarantined") quarantined++;
            return {
              question_id: String(q.id),
              test_id: test.id,
              visual_requirement: v.visual_requirement,
              delivery_status: v.delivery_status,
              media_type: v.media_type,
              fallback_used: v.fallback_used,
              failure_reasons: v.failure_reasons,
              difficulty: q.difficulty ?? null,
              domain: q.section ?? null,
              skill: q.topic ?? null,
              validated_at: new Date().toISOString(),
            };
          });
        if (rows.length) {
          await admin.from("question_validation_state").upsert(rows, { onConflict: "question_id" });
          const events = rows
            .filter((r) => r.delivery_status === "quarantined")
            .map((r) => ({
              question_id: r.question_id,
              event_type: "quarantined",
              visual_requirement: r.visual_requirement,
              media_type: r.media_type,
              visual_status: r.media_type ? "invalid" : "missing",
              fallback_used: r.fallback_used,
              failure_reasons: r.failure_reasons,
            }));
          if (events.length) await admin.from("visual_health_events").insert(events);
        }
      }

      if (dirty && !dryRun) {
        const { error: upErr } = await admin
          .from("sat_tests")
          .update({ questions })
          .eq("id", test.id);
        if (upErr) throw upErr;
      }
      if (converted >= limit) break;
    }

    return json({ scanned, converted, quarantined, dry_run: dryRun, samples });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

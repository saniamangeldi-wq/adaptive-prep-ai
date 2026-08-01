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

      if (dirty && !dryRun) {
        const { error: upErr } = await admin
          .from("sat_tests")
          .update({ questions })
          .eq("id", test.id);
        if (upErr) throw upErr;
      }
      if (converted >= limit) break;
    }

    return json({ scanned, converted, dry_run: dryRun, samples });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

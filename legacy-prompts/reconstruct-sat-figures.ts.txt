import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const MAINTENANCE_TOKENS = [
  Deno.env.get("SAT_MEDIA_MAINTENANCE_TOKEN") ?? "",
  Deno.env.get("SAT_FIGURE_RUN_TOKEN") ?? "",
].filter(Boolean);
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

const BUCKET = "sat-source-files";
const MODEL = "google/gemini-2.5-flash";

/**
 * Populates `public.sat_figures` so questions that depend on a visual become
 * deliverable again.
 *
 * Two passes, both idempotent (assets are keyed by SHA-256 checksum):
 *   1. adopt  - inline SVGs already stored inside the question JSON are uploaded
 *               to the private bucket, checksum-verified, and linked by
 *               `figure_id`.
 *   2. rebuild- questions whose required visual is missing get one AI attempt to
 *               recover the visual from data that is still present in the
 *               question text (a flattened chart, an axis dump, an explanation).
 *               Recovered structured data becomes a `table`; a recovered diagram
 *               becomes a sanitized SVG asset. Anything the model cannot recover
 *               from existing data stays quarantined - nothing is invented.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Table = { headers: string[]; rows: string[][]; caption?: string; chart?: "bar" | "line" };

type Question = {
  id?: string;
  text?: string;
  section?: string;
  topic?: string;
  explanation?: string;
  figure?: { type?: string; svg?: string; src?: string; alt?: string; caption?: string };
  figure_id?: string;
  table?: Table;
  visual_unavailable?: boolean;
  [k: string]: unknown;
};

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Conservative SVG gate: no scripts, no remote refs, bounded size. */
export function isSafeSvg(svg: string): boolean {
  if (typeof svg !== "string") return false;
  const s = svg.trim();
  if (!s.startsWith("<svg") || !s.includes("</svg>")) return false;
  if (s.length < 80 || s.length > 60_000) return false;
  if (/<script|<foreignObject|javascript:|<!ENTITY|xlink:href\s*=\s*["']?https?:/i.test(s)) return false;
  if (/\son[a-z]+\s*=/i.test(s)) return false;
  if (/(?:href|src)\s*=\s*["']?(?:https?:|data:(?!image\/))/i.test(s)) return false;
  return true;
}

/** A table is only usable if it has real headers and at least two data rows. */
export function isUsableTable(t: unknown): t is Table {
  const table = t as Table | undefined;
  if (!table || !Array.isArray(table.headers) || !Array.isArray(table.rows)) return false;
  if (table.headers.length < 2 || table.rows.length < 2) return false;
  return table.rows.every(
    (r) => Array.isArray(r) && r.length === table.headers.length && r.some((c) => String(c ?? "").trim() !== "")
  );
}

/** Does the question still reference a visual we cannot render? */
export function needsVisual(q: Question): boolean {
  if (q.figure_id) return false;
  if (isUsableTable(q.table)) return false;
  if (q.figure?.svg && isSafeSvg(q.figure.svg)) return false;
  const text = `${q.text ?? ""}`;
  return /\b(graph|chart|figure|diagram|table|shown above|shown below|the image|bar|scatterplot|number line)\b/i.test(
    text
  );
}

// deno-lint-ignore no-explicit-any
async function storeSvg(
  admin: any,
  svg: string,
  q: Question,
  testId: string,
  origin: "inline_svg" | "reconstruction"
): Promise<string | null> {
  const bytes = new TextEncoder().encode(svg);
  const checksum = await sha256Hex(bytes);

  const { data: existing } = await admin
    .from("sat_figures")
    .select("id, storage_path, extraction_status")
    .is("source_pdf_id", null)
    .eq("checksum_sha256", checksum)
    .maybeSingle();

  if (existing?.extraction_status === "verified") {
    await admin.from("sat_figures").update({ test_id: testId, question_id: q.id }).eq("id", existing.id);
    return existing.id;
  }

  const figureId = existing?.id ?? crypto.randomUUID();
  const path = existing?.storage_path ?? `reconstructed/${testId}/${figureId}.svg`;

  const upload = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: "image/svg+xml", upsert: true });
  if (upload.error) {
    console.error("[reconstruct-sat-figures] upload failed", upload.error);
    return null;
  }

  const row = {
    id: figureId,
    source_pdf_id: null,
    test_id: testId,
    question_id: q.id ?? null,
    storage_bucket: BUCKET,
    storage_path: path,
    mime_type: "image/svg+xml",
    checksum_sha256: checksum,
    alt_text: q.figure?.alt ?? null,
    text_equivalent: q.figure?.caption ?? null,
    extraction_status: "uploaded",
    origin,
  };
  const { error: upsertError } = await admin.from("sat_figures").upsert(row, { onConflict: "id" });
  if (upsertError) {
    console.error("[reconstruct-sat-figures] insert failed", upsertError);
    return null;
  }

  // Verification: the stored bytes must hash back to the same checksum.
  const download = await admin.storage.from(BUCKET).download(path);
  let verified = false;
  if (download.data) {
    const stored = new Uint8Array(await download.data.arrayBuffer());
    verified = (await sha256Hex(stored)) === checksum;
  }
  await admin
    .from("sat_figures")
    .update({ extraction_status: verified ? "verified" : "failed" })
    .eq("id", figureId);

  return verified ? figureId : null;
}

const SYSTEM_PROMPT = `You repair College Board SAT questions whose figure was lost during PDF extraction.

You may ONLY use data that is already present in the question text, options, or explanation.
NEVER invent data points, values, or relationships. If the surviving text does not contain
enough information to reproduce the original visual faithfully, return {"recoverable": false}.

Return STRICT JSON, no markdown fence:
{
  "recoverable": boolean,
  "kind": "table" | "svg" | null,
  "table": { "headers": string[], "rows": string[][], "caption": string, "chart": "bar" | "line" | null } | null,
  "svg": string | null,
  "alt": string | null,
  "cleaned_text": string | null
}

Rules:
- Prefer "table" whenever the lost visual was a bar chart, line graph, or data table: the
  chart axis labels and values are usually still glued into the prompt text.
- Use "svg" only for geometric diagrams, number lines, or scatterplots that the text
  fully specifies. SVG must be self-contained, use viewBox="0 0 640 400", currentColor for
  strokes/text, no scripts, no external references, under 20000 characters.
- "cleaned_text" is the question prompt with the glued axis/legend jumble removed and normal
  sentence spacing restored. Never reword the actual question or change its meaning.
- Preserve LaTeX exactly as written.`;

async function callModel(q: Question): Promise<Record<string, unknown> | null> {
  if (!LOVABLE_API_KEY) return null;
  const payload = {
    id: q.id,
    section: q.section ?? q.topic,
    text: q.text ?? "",
    options: q.options ?? null,
    explanation: typeof q.explanation === "string" ? q.explanation.slice(0, 2000) : null,
  };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(payload) },
      ],
    }),
  });

  if (res.status === 429 || res.status === 402) {
    throw new Error(res.status === 429 ? "rate_limited" : "payment_required");
  }
  if (!res.ok) {
    console.error("[reconstruct-sat-figures] model error", res.status, await res.text());
    return null;
  }

  const body = await res.json();
  const content: string = body?.choices?.[0]?.message?.content ?? "";
  const cleaned = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

/** Keeps a question quarantined and remembers that reconstruction was tried. */
// deno-lint-ignore no-explicit-any
async function markIrrecoverable(admin: any, q: Question, testId: string) {
  if (!q.id) return;
  await admin.from("question_validation_state").upsert(
    {
      question_id: q.id,
      test_id: testId,
      visual_requirement: "required",
      delivery_status: "quarantined",
      media_type: null,
      fallback_used: false,
      failure_reasons: ["required_visual_missing_media", "visual_reconstruction_failed"],
      validated_at: new Date().toISOString(),
    },
    { onConflict: "question_id" }
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth: maintenance token (batch runs) or a signed-in school admin.
    const maintenance = req.headers.get("x-maintenance-token");
    let authorized = Boolean(maintenance) && MAINTENANCE_TOKENS.includes(maintenance!);

    if (!authorized) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Missing authorization header" }, 401);
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) return json({ error: "Unauthorized" }, 401);
      const { data: profile } = await userClient
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile?.role !== "school_admin") return json({ error: "Admin access required" }, 403);
      authorized = true;
    }

    const body = await req.json().catch(() => ({}));
    const testId: string | undefined = typeof body?.testId === "string" ? body.testId : undefined;
    const limit = Math.min(Math.max(Number(body?.limit) || 40, 1), 200);
    const dryRun = body?.dryRun === true;
    const adoptOnly = body?.adoptOnly === true;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const retry = body?.retryFailed === true;

    // Questions a previous run already proved irrecoverable are skipped so each
    // batch makes forward progress instead of re-paying for the same failures.
    const attempted = new Set<string>();
    if (!retry) {
      const { data: failed } = await admin
        .from("question_validation_state")
        .select("question_id")
        .contains("failure_reasons", ["visual_reconstruction_failed"]);
      for (const row of failed ?? []) attempted.add(row.question_id as string);
    }

    // The authoritative blocked pool: questions validation already rejected for a
    // missing visual. Keyword sniffing is only a fallback for unvalidated rows.
    const blocked = new Set<string>();
    const { data: blockedRows } = await admin
      .from("question_validation_state")
      .select("question_id")
      .eq("visual_requirement", "required")
      .neq("delivery_status", "deliverable");
    for (const row of blockedRows ?? []) blocked.add(row.question_id as string);


    let query = admin.from("sat_tests").select("id, questions");
    if (testId) query = query.eq("id", testId);
    const { data: tests, error } = await query;
    if (error) return json({ error: error.message }, 500);

    const summary = {
      testsScanned: tests?.length ?? 0,
      adopted: 0,
      rebuiltSvg: 0,
      rebuiltTable: 0,
      irrecoverable: 0,
      examined: 0,
      dryRun,
    };
    let budget = limit;

    for (const test of tests ?? []) {
      const questions = (test.questions ?? []) as Question[];
      if (!Array.isArray(questions) || questions.length === 0) continue;
      let dirty = false;
      // Only questions this run actually repaired get their delivery state
      // rewritten - never the rest of the test.
      const repairedIds = new Set<string>();

      for (const q of questions) {
        // Pass 1: adopt inline SVGs into durable storage.
        if (!q.figure_id && q.figure?.svg && isSafeSvg(q.figure.svg)) {
          summary.examined++;
          if (dryRun) {
            summary.adopted++;
          } else {
            const id = await storeSvg(admin, q.figure.svg, q, test.id, "inline_svg");
            if (id) {
              q.figure_id = id;
              q.visual_unavailable = false;
              dirty = true;
              if (q.id) repairedIds.add(q.id);
              summary.adopted++;
            }
          }
          continue;
        }

        if (adoptOnly || budget <= 0) continue;

        // Pass 2: rebuild a missing required visual from surviving data.
        const isBlocked = Boolean(q.id && blocked.has(q.id));
        if (!isBlocked && !needsVisual(q)) continue;
        if (isBlocked && (q.figure_id || isUsableTable(q.table))) continue;
        if (q.id && attempted.has(q.id)) continue;
        summary.examined++;
        budget--;
        if (dryRun) continue;

        let result: Record<string, unknown> | null = null;
        try {
          result = await callModel(q);
        } catch (e) {
          const message = e instanceof Error ? e.message : "model_failed";
          return json({ error: message, partial: summary }, message === "rate_limited" ? 429 : 402);
        }

        if (!result || result.recoverable !== true) {
          summary.irrecoverable++;
          await markIrrecoverable(admin, q, test.id);
          continue;
        }

        const cleaned = typeof result.cleaned_text === "string" ? result.cleaned_text.trim() : "";

        if (result.kind === "table" && isUsableTable(result.table)) {
          const t = result.table as Table;
          q.table = {
            headers: t.headers.map((h) => String(h ?? "")),
            rows: t.rows.map((r) => r.map((c) => String(c ?? ""))),
            ...(t.caption ? { caption: String(t.caption) } : {}),
            ...(t.chart === "bar" || t.chart === "line" ? { chart: t.chart } : {}),
          };
          if (cleaned.length > 40) q.text = cleaned;
          q.visual_unavailable = false;
          dirty = true;
          if (q.id) repairedIds.add(q.id);
          summary.rebuiltTable++;
          continue;
        }

        if (result.kind === "svg" && typeof result.svg === "string" && isSafeSvg(result.svg)) {
          q.figure = {
            type: "svg",
            svg: result.svg,
            alt: typeof result.alt === "string" ? result.alt : undefined,
          };
          const id = await storeSvg(admin, result.svg, q, test.id, "reconstruction");
          if (id) {
            q.figure_id = id;
            if (cleaned.length > 40) q.text = cleaned;
            q.visual_unavailable = false;
            dirty = true;
            if (q.id) repairedIds.add(q.id);
            summary.rebuiltSvg++;
            continue;
          }
        }

        summary.irrecoverable++;
        await markIrrecoverable(admin, q, test.id);
      }

      if (dirty && !dryRun) {
        const { error: updateError } = await admin
          .from("sat_tests")
          .update({ questions })
          .eq("id", test.id);
        if (updateError) console.error("[reconstruct-sat-figures] test update failed", updateError);

        // Refresh delivery state for every question we repaired.
        const repaired = questions.filter((q) => q.id && repairedIds.has(q.id));
        if (repaired.length > 0) {
          await admin.from("question_validation_state").upsert(
            repaired.map((q) => ({
              question_id: q.id,
              test_id: test.id,
              visual_requirement: "required",
              delivery_status: "deliverable",
              media_type: q.figure_id ? "svg" : "table",
              fallback_used: !q.figure_id,
              failure_reasons: [],
              validated_at: new Date().toISOString(),
            })),
            { onConflict: "question_id" }
          );
        }
      }
    }

    return json(summary);
  } catch (error) {
    console.error("[reconstruct-sat-figures]", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});

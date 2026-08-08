import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Admin-only: attaches (or removes) an image figure on a single SAT question.
 * The image itself is uploaded to the `question-figures` storage bucket by the
 * client; this function only writes the verified URL into the question JSON and
 * refreshes its validation state so it can re-enter the live delivery pool.
 */
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
    const { data: userRes } = await admin.auth.getUser(token);
    const uid = userRes?.user?.id;
    if (!uid) return json({ error: "Unauthorized" }, 401);
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("user_id", uid)
      .maybeSingle();
    if (profile?.role !== "school_admin") return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const questionId = typeof body?.question_id === "string" ? body.question_id.trim() : "";
    const remove = Boolean(body?.remove);
    const src = typeof body?.src === "string" ? body.src.trim() : "";
    const alt = typeof body?.alt === "string" ? body.alt.trim() : "";
    const caption = typeof body?.caption === "string" ? body.caption.trim() : "";

    if (!questionId) return json({ error: "question_id is required" }, 400);
    if (!remove) {
      if (!/^https?:\/\//i.test(src)) return json({ error: "src must be an http(s) URL" }, 400);
      if (alt.length < 3) return json({ error: "alt text is required (min 3 chars)" }, 400);
    }

    const { data: tests, error } = await admin.from("sat_tests").select("id, questions");
    if (error) throw error;

    for (const test of tests ?? []) {
      const questions = Array.isArray(test.questions) ? [...(test.questions as any[])] : [];
      const idx = questions.findIndex((q: any) => q && String(q.id) === questionId);
      if (idx === -1) continue;

      const q = { ...questions[idx] };
      if (remove) {
        delete q.figure;
        delete q.image_url;
        delete q.image_alt;
      } else {
        q.figure = { type: "image", src, alt, ...(caption ? { caption } : {}) };
        q.visual_unavailable = false;
      }
      questions[idx] = q;

      const { error: upErr } = await admin.from("sat_tests").update({ questions }).eq("id", test.id);
      if (upErr) throw upErr;

      await admin.from("question_validation_state").upsert(
        {
          question_id: questionId,
          test_id: test.id,
          visual_requirement: remove ? "optional" : "required",
          delivery_status: remove ? "needs_review" : "ok",
          media_type: remove ? null : "image",
          fallback_used: null,
          failure_reasons: [],
          difficulty: q.difficulty ?? null,
          domain: q.section ?? null,
          skill: q.topic ?? null,
          validated_at: new Date().toISOString(),
        },
        { onConflict: "question_id" }
      );

      return json({ ok: true, question_id: questionId, test_id: test.id, removed: remove });
    }

    return json({ error: "Question not found" }, 404);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

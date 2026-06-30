// Temporary admin edge function to apply OpenSAT R&W updates and Math inserts.
// Uses SUPABASE_SERVICE_ROLE_KEY. Idempotent for math inserts via title uniqueness check.
// Should be deleted after the one-off migration.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const ADMIN_TOKEN = Deno.env.get("OPENSAT_ADMIN_TOKEN") ?? "opensat-fix-2024";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const token = req.headers.get("x-admin-token");
  if (token !== ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key);

  const body = await req.json();
  const action = body.action;

  if (action === "rw_update") {
    const updates: Array<{ id: string; questions: unknown[] }> = body.updates;
    let ok = 0, fail = 0;
    const errors: unknown[] = [];
    for (const u of updates) {
      const { error } = await sb
        .from("sat_tests")
        .update({ questions: u.questions, updated_at: new Date().toISOString() })
        .eq("id", u.id);
      if (error) { fail++; errors.push({ id: u.id, error: error.message }); }
      else ok++;
    }
    return new Response(JSON.stringify({ ok, fail, errors }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  if (action === "math_insert") {
    const tests: Array<Record<string, unknown>> = body.tests;
    let ok = 0, fail = 0, skipped = 0;
    const errors: unknown[] = [];
    for (const t of tests) {
      // Skip if a test with same title already exists
      const { data: existing } = await sb
        .from("sat_tests")
        .select("id")
        .eq("title", t.title as string)
        .maybeSingle();
      if (existing) { skipped++; continue; }
      const { error } = await sb.from("sat_tests").insert(t);
      if (error) { fail++; errors.push({ title: t.title, error: error.message }); }
      else ok++;
    }
    return new Response(JSON.stringify({ ok, fail, skipped, errors }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "unknown action" }), {
    status: 400,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});

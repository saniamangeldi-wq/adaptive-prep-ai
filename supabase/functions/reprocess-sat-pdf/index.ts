import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Reprocesses an archived SAT PDF as a new version. The original PDF is never
 * touched, existing assets are reused by checksum, and the previous test stays
 * live until the new run succeeds.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization header" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profile?.role !== "school_admin") return json({ error: "Admin access required" }, 403);

    const body = await req.json().catch(() => ({}));
    const sourcePdfId = typeof body?.sourcePdfId === "string" ? body.sourcePdfId : "";
    if (!/^[0-9a-f-]{36}$/i.test(sourcePdfId)) return json({ error: "Invalid sourcePdfId" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: source } = await admin
      .from("sat_source_pdfs")
      .select("id, storage_bucket, storage_path")
      .eq("id", sourcePdfId)
      .maybeSingle();
    if (!source) return json({ error: "Source PDF not found" }, 404);

    // Confirm the archived object is still there before starting a new run.
    const probe = await admin.storage.from(source.storage_bucket).download(source.storage_path);
    if (probe.error || !probe.data) {
      return json({ error: "Archived PDF is missing from storage" }, 409);
    }

    // Delegate the actual run to the single processing implementation.
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/process-sat-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      },
      body: JSON.stringify({ sourcePdfId }),
    });

    const payload = await res.json().catch(() => ({ error: "Processing returned no body" }));
    return json(payload, res.status);
  } catch (error) {
    console.error("[reprocess-sat-pdf]", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});

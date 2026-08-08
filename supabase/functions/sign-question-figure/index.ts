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
 * Mints a short-lived signed URL for a figure that belongs to a published SAT
 * test. Students never touch the private bucket directly, and the source PDF
 * is never signable through this endpoint.
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

    const body = await req.json().catch(() => ({}));
    const figureId = typeof body?.figureId === "string" ? body.figureId : "";
    if (!/^[0-9a-f-]{36}$/i.test(figureId)) return json({ error: "Invalid figureId" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: figure, error: figureError } = await admin
      .from("sat_figures")
      .select("id, storage_bucket, storage_path, extraction_status, test_id, mime_type")
      .eq("id", figureId)
      .maybeSingle();

    if (figureError || !figure) return json({ error: "Figure not found" }, 404);
    if (figure.extraction_status !== "verified") return json({ error: "Figure not verified" }, 409);

    // The asset must belong to a real test the caller is allowed to take.
    if (figure.test_id) {
      const { data: test } = await admin
        .from("sat_tests")
        .select("id")
        .eq("id", figure.test_id)
        .maybeSingle();
      if (!test) return json({ error: "Figure not available" }, 404);
    }

    const { data: signed, error: signError } = await admin.storage
      .from(figure.storage_bucket)
      .createSignedUrl(figure.storage_path, 300);

    if (signError || !signed?.signedUrl) return json({ error: "Could not sign asset" }, 500);

    return json({ url: signed.signedUrl, mimeType: figure.mime_type, expiresIn: 300 });
  } catch (error) {
    console.error("[sign-question-figure]", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});

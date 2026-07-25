import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const email = "test-teacher@adaptiveprep.org";
    const password = "test-for.computer(Perplexity)";

    // Create user
    let userId: string | null = null;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Test Teacher" },
    });

    if (createErr && !createErr.message.toLowerCase().includes("already")) {
      throw createErr;
    }

    if (created?.user) {
      userId = created.user.id;
    } else {
      // Look up existing
      const { data: list } = await admin.auth.admin.listUsers();
      userId = list.users.find((u) => u.email === email)?.id ?? null;
    }
    if (!userId) throw new Error("Could not resolve user id");

    // Find demo school
    const { data: school } = await admin
      .from("schools")
      .select("id")
      .ilike("name", "%AdaptivePrep Demo School%")
      .maybeSingle();

    // Set profile to teacher role, top tier
    await admin
      .from("profiles")
      .update({
        role: "teacher",
        full_name: "Test Teacher",
        tier: "tier_3",
        is_trial: false,
        trial_ends_at: null,
        subscription_ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        credits_remaining: 200,
        tests_remaining: 1000,
      })
      .eq("user_id", userId);

    await admin.from("user_roles").upsert({ user_id: userId, role: "teacher" }, { onConflict: "user_id,role" });

    if (school?.id) {
      await admin.from("school_members").upsert(
        { school_id: school.id, user_id: userId, role: "teacher", status: "active" },
        { onConflict: "school_id,user_id" },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, userId, email, password, schoolLinked: !!school?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

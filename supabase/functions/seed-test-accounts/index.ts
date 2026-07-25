import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const PASSWORD = "test-for.computer(Perplexity)";
const USERS = [
  { email: "test-student@adaptiveprep.org", full_name: "Test Student", role: "student" as const, tier: "tier_3" },
  { email: "test-tutor@adaptiveprep.org", full_name: "Test Tutor", role: "tutor" as const, tier: "tier_3" },
  { email: "test-admin@adaptiveprep.org", full_name: "Test Admin", role: "school_admin" as const, tier: "tier_3" },
];

Deno.serve(async () => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const results: any[] = [];
  const ids: Record<string, string> = {};

  for (const u of USERS) {
    let userId: string | null = null;
    const { data: created, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    });
    if (error) {
      // Try to find existing
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list?.users.find((x) => x.email === u.email);
      if (!existing) { results.push({ email: u.email, error: error.message }); continue; }
      userId = existing.id;
      await admin.auth.admin.updateUserById(existing.id, { password: PASSWORD, email_confirm: true });
    } else {
      userId = created.user!.id;
    }
    ids[u.role] = userId!;

    // profile tier + role
    await admin.from("profiles").update({
      role: u.role,
      tier: u.tier,
      is_trial: false,
      trial_ends_at: null,
      subscription_ends_at: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      credits_remaining: 200,
      tests_remaining: 1000,
      full_name: u.full_name,
    }).eq("user_id", userId!);

    await admin.from("user_roles").upsert({ user_id: userId!, role: u.role }, { onConflict: "user_id,role" });
    results.push({ email: u.email, user_id: userId, role: u.role });
  }

  // Create demo school owned by admin, add all three as members
  const adminId = ids["school_admin"];
  let schoolId: string | null = null;
  if (adminId) {
    const { data: existingSchool } = await admin.from("schools").select("id").eq("created_by", adminId).eq("name", "AdaptivePrep Demo School").maybeSingle();
    if (existingSchool) {
      schoolId = existingSchool.id;
    } else {
      const { data: school } = await admin.from("schools").insert({
        name: "AdaptivePrep Demo School",
        created_by: adminId,
        tier: "tier_3",
        ai_tier: 3,
      }).select("id").single();
      schoolId = school?.id ?? null;
    }
    if (schoolId) {
      const members = [
        { school_id: schoolId, user_id: adminId, role: "school_admin", status: "active" },
        ids["tutor"] && { school_id: schoolId, user_id: ids["tutor"], role: "tutor", status: "active" },
        ids["student"] && { school_id: schoolId, user_id: ids["student"], role: "student", status: "active" },
      ].filter(Boolean);
      for (const m of members as any[]) {
        await admin.from("school_members").upsert(m, { onConflict: "school_id,user_id" });
      }
    }
  }

  // Link student to tutor
  if (ids["tutor"] && ids["student"]) {
    await admin.from("tutor_students").upsert(
      { tutor_id: ids["tutor"], student_id: ids["student"] },
      { onConflict: "tutor_id,student_id" }
    );
  }

  return new Response(JSON.stringify({ ok: true, results, school_id: schoolId }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});

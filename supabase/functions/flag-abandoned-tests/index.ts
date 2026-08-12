// Flags unfinished practice attempts as abandoned when a student starts a new test.
// Rules (per product decision):
//  - Any unfinished attempt is abandoned the moment a new test is started.
//  - First offence: warning only, no deduction.
//  - Second and later offences: every question that was SERVED in the abandoned
//    attempt is deducted from the student's question bank, regardless of how many
//    were answered.
//  - Abandoned attempts never count towards progress (they have no completed_at).
//  - The student's tutor and teacher are notified (dashboard + email).
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return json({ error: "Unauthorized" }, 401);

    const authClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    // Every unfinished, not-yet-flagged attempt counts as abandoned.
    const { data: stale, error: staleErr } = await admin
      .from("test_attempts")
      .select("id, served_question_ids, total_questions, answers, created_at")
      .eq("user_id", user.id)
      .eq("abandoned", false)
      .is("completed_at", null);

    if (staleErr) throw staleErr;
    if (!stale || stale.length === 0) {
      return json({ abandoned: 0, warning: false, deducted: 0 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, email, abandon_warnings, tests_remaining")
      .eq("user_id", user.id)
      .maybeSingle();

    let warnings = profile?.abandon_warnings ?? 0;
    let deducted = 0;
    let warningOnly = false;

    for (const attempt of stale) {
      const served = Array.isArray(attempt.served_question_ids)
        ? attempt.served_question_ids.length
        : attempt.total_questions || 0;

      // First offence is a warning; after that the full served set is charged.
      const penalty = warnings === 0 ? 0 : served;
      if (warnings === 0) warningOnly = true;
      warnings += 1;
      deducted += penalty;

      await admin
        .from("test_attempts")
        .update({
          abandoned: true,
          abandoned_at: new Date().toISOString(),
          penalty_questions: penalty,
        })
        .eq("id", attempt.id);
    }

    const newRemaining = Math.max(0, (profile?.tests_remaining ?? 0) - deducted);
    await admin
      .from("profiles")
      .update({ abandon_warnings: warnings, tests_remaining: newRemaining })
      .eq("user_id", user.id);

    // Notify the linked tutor(s) and teacher(s).
    const [{ data: tutors }, { data: teachers }] = await Promise.all([
      admin.from("tutor_students").select("tutor_id").eq("student_id", user.id),
      admin.from("teacher_students").select("teacher_id").eq("student_id", user.id),
    ]);

    const mentorIds = [
      ...(tutors ?? []).map((r: { tutor_id: string }) => r.tutor_id),
      ...(teachers ?? []).map((r: { teacher_id: string }) => r.teacher_id),
    ];

    if (mentorIds.length > 0) {
      const { data: mentors } = await admin
        .from("profiles")
        .select("user_id, email, full_name")
        .in("user_id", mentorIds);

      for (const mentor of mentors ?? []) {
        if (!mentor.email) continue;
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              template: "abandoned-test-alert",
              to: mentor.email,
              data: {
                mentorName: mentor.full_name || "there",
                studentName: profile?.full_name || profile?.email || "A student",
                abandonedCount: stale.length,
                questionsDeducted: deducted,
                warningOnly,
                questionsRemaining: newRemaining,
              },
            }),
          });
        } catch (e) {
          console.error("abandon alert email failed", e);
        }
      }
    }

    return json({
      abandoned: stale.length,
      warning: warningOnly && deducted === 0,
      deducted,
      questionsRemaining: newRemaining,
    });
  } catch (error) {
    console.error("flag-abandoned-tests error", error);
    return json({ error: (error as Error).message }, 500);
  }
});

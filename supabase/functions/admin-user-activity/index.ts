import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use anon key client for auth verification
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Use service role client for cross-user data access
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is school_admin or tutor
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (!profile || !["school_admin", "tutor", "teacher"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get student IDs based on role
    let studentIds: string[] = [];

    if (profile.role === "school_admin") {
      const { data: schoolMember } = await serviceClient
        .from("school_members")
        .select("school_id")
        .eq("user_id", userId)
        .eq("role", "school_admin")
        .maybeSingle();

      if (schoolMember?.school_id) {
        const { data: members } = await serviceClient
          .from("school_members")
          .select("user_id")
          .eq("school_id", schoolMember.school_id)
          .eq("status", "active");

        studentIds = (members || []).map(m => m.user_id);
      }
    } else if (profile.role === "tutor") {
      const { data: tutorStudents } = await serviceClient
        .from("tutor_students")
        .select("student_id")
        .eq("tutor_id", userId);

      studentIds = (tutorStudents || []).map(ts => ts.student_id);
      // Include the tutor themselves
      studentIds.push(userId);
    } else if (profile.role === "teacher") {
      const { data: teacherStudents } = await serviceClient
        .from("teacher_students")
        .select("student_id")
        .eq("teacher_id", userId);

      studentIds = (teacherStudents || []).map(ts => ts.student_id);
      studentIds.push(userId);
    }

    if (studentIds.length === 0) {
      return new Response(JSON.stringify({ users: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get profiles for all members
    const { data: profiles } = await serviceClient
      .from("profiles")
      .select("user_id, email, full_name, role, tier, created_at, updated_at, credits_remaining, questions_used_today")
      .in("user_id", studentIds);

    // Get test attempts for all members
    const { data: attempts } = await serviceClient
      .from("test_attempts")
      .select("user_id, score, correct_answers, total_questions, time_spent_seconds, completed_at")
      .in("user_id", studentIds);

    // Get AI conversation counts
    const { data: conversations } = await serviceClient
      .from("ai_conversations")
      .select("user_id, credits_used")
      .in("user_id", studentIds);

    // Aggregate per user
    const userMap = new Map<string, any>();

    for (const p of profiles || []) {
      userMap.set(p.user_id, {
        user_id: p.user_id,
        email: p.email,
        full_name: p.full_name,
        role: p.role,
        tier: p.tier,
        joined: p.created_at,
        last_active: p.updated_at,
        credits_remaining: p.credits_remaining,
        questions_used_today: p.questions_used_today,
        tests_taken: 0,
        tests_completed: 0,
        total_questions_answered: 0,
        total_correct: 0,
        total_time_seconds: 0,
        ai_conversations: 0,
        ai_credits_used: 0,
        best_score: 0,
        avg_accuracy: 0,
      });
    }

    for (const a of attempts || []) {
      const u = userMap.get(a.user_id);
      if (!u) continue;
      u.tests_taken++;
      if (a.completed_at) u.tests_completed++;
      u.total_questions_answered += a.total_questions || 0;
      u.total_correct += a.correct_answers || 0;
      u.total_time_seconds += a.time_spent_seconds || 0;
      if ((a.score || 0) > u.best_score) u.best_score = a.score || 0;
    }

    for (const c of conversations || []) {
      const u = userMap.get(c.user_id);
      if (!u) continue;
      u.ai_conversations++;
      u.ai_credits_used += c.credits_used || 0;
    }

    // Calculate avg accuracy
    for (const u of userMap.values()) {
      if (u.total_questions_answered > 0) {
        u.avg_accuracy = Math.round((u.total_correct / u.total_questions_answered) * 100);
      }
    }

    const users = Array.from(userMap.values()).sort((a, b) => b.total_time_seconds - a.total_time_seconds);

    return new Response(JSON.stringify({ users }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-user-activity error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

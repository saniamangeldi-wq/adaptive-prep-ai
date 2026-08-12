// Verifies a question top-up Stripe Checkout session and grants 98 questions once.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOPUP_QUESTIONS = 98;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return json({ error: "Unauthorized" }, 401);

    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const { data: userData } = await authClient.auth.getUser(token);
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { session_id } = await req.json().catch(() => ({ session_id: null }));
    if (!session_id || typeof session_id !== "string") {
      return json({ granted: false, reason: "Missing session_id" }, 400);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.metadata?.user_id !== user.id) {
      return json({ granted: false, reason: "Session does not belong to this account" }, 403);
    }
    if (session.metadata?.type !== "question_topup") {
      return json({ granted: false, reason: "Not a question top-up session" }, 400);
    }
    if (session.payment_status !== "paid") {
      return json({ granted: false, reason: "Payment not completed" });
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { data: existing } = await admin
      .from("question_topups")
      .select("id, status")
      .eq("stripe_session_id", session_id)
      .maybeSingle();

    if (existing?.status === "granted") {
      return json({ granted: true, already_claimed: true, questions: TOPUP_QUESTIONS });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("tests_remaining")
      .eq("user_id", user.id)
      .maybeSingle();

    const newRemaining = (profile?.tests_remaining ?? 0) + TOPUP_QUESTIONS;

    await admin
      .from("question_topups")
      .upsert(
        {
          user_id: user.id,
          stripe_session_id: session_id,
          amount_cents: session.amount_total ?? 100,
          currency: (session.currency ?? "usd").toLowerCase(),
          questions_granted: TOPUP_QUESTIONS,
          status: "granted",
        },
        { onConflict: "stripe_session_id" },
      );

    await admin
      .from("profiles")
      .update({ tests_remaining: newRemaining })
      .eq("user_id", user.id);

    return json({ granted: true, questions: TOPUP_QUESTIONS, questionsRemaining: newRemaining });
  } catch (error) {
    console.error("verify-question-topup error", error);
    return json({ error: (error as Error).message }, 500);
  }
});

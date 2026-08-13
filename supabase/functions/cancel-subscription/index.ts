import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) =>
  console.log(`[CANCEL-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

const REASONS = [
  "too_expensive",
  "not_using",
  "missing_features",
  "found_alternative",
  "finished_prep",
  "technical_issues",
  "other",
];

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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return json({ error: "Unauthorized" }, 401);

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user?.email) return json({ error: "Unauthorized" }, 401);
    log("User authenticated", { userId: user.id });

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const reason = typeof body.reason === "string" && REASONS.includes(body.reason) ? body.reason : "other";
    const feedback = typeof body.feedback === "string" ? body.feedback.slice(0, 2000) : null;

    const { data: profile } = await admin
      .from("profiles")
      .select("tier, full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    let stripeSubscriptionId: string | null = null;
    let accessUntil: string | null = null;
    let stripeError: string | null = null;

    if (stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (customers.data.length > 0) {
          const subs = await stripe.subscriptions.list({
            customer: customers.data[0].id,
            status: "active",
            limit: 5,
          });
          for (const sub of subs.data) {
            const updated = await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
            stripeSubscriptionId = updated.id;
            const end = (updated as unknown as { current_period_end?: number }).current_period_end;
            if (end) accessUntil = new Date(end * 1000).toISOString();
          }
          log("Stripe subscriptions cancelled at period end", { count: subs.data.length });
        } else {
          log("No Stripe customer found for email");
        }
      } catch (e) {
        stripeError = e instanceof Error ? e.message : String(e);
        log("Stripe error", { stripeError });
      }
    }

    // Fall back to the tier expiry we already track when Stripe has nothing to say
    if (!accessUntil) {
      const { data: p } = await admin
        .from("profiles")
        .select("subscription_ends_at, trial_ends_at")
        .eq("user_id", user.id)
        .maybeSingle();
      accessUntil = p?.subscription_ends_at ?? p?.trial_ends_at ?? null;
    }

    const { error: insertError } = await admin.from("subscription_cancellations").insert({
      user_id: user.id,
      email: user.email,
      tier: profile?.tier ?? null,
      reason,
      feedback,
      stripe_subscription_id: stripeSubscriptionId,
      access_until: accessUntil,
      stripe_error: stripeError,
    });
    if (insertError) log("Failed to record cancellation", { message: insertError.message });

    // Confirmation email (best effort)
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({
          templateName: "subscription-cancelled",
          recipientEmail: user.email,
          templateData: {
            userName: profile?.full_name ?? null,
            accessUntil,
            reason,
          },
        }),
      });
    } catch (e) {
      log("Cancellation email failed", { message: e instanceof Error ? e.message : String(e) });
    }

    return json({
      success: true,
      cancelled_in_stripe: Boolean(stripeSubscriptionId),
      access_until: accessUntil,
      needs_manual_review: !stripeSubscriptionId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return json({ error: message }, 500);
  }
});

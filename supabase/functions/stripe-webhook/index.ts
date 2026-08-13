import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, stripe-signature",
};

const log = (step: string, details?: unknown) =>
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

const money = (amount?: number | null, currency?: string | null) => {
  if (amount == null) return null;
  const value = amount / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency || "usd").toUpperCase(),
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${(currency || "usd").toUpperCase()}`;
  }
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

async function sendEmail(templateName: string, recipientEmail: string, templateData: Record<string, unknown>) {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ templateName, recipientEmail, templateData }),
    });
    log("Email dispatched", { templateName, ok: res.ok });
  } catch (e) {
    log("Email failed", { templateName, message: e instanceof Error ? e.message : String(e) });
  }
}

async function profileByEmail(email?: string | null) {
  if (!email) return null;
  const { data } = await admin
    .from("profiles")
    .select("user_id, full_name, tier")
    .ilike("email", email)
    .maybeSingle();
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey) return new Response("Stripe not configured", { status: 500, headers: corsHeaders });

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const body = await req.text();

  let event: Stripe.Event;
  if (webhookSecret) {
    const signature = req.headers.get("stripe-signature") ?? "";
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (e) {
      log("Signature verification failed", { message: e instanceof Error ? e.message : String(e) });
      return new Response("Invalid signature", { status: 400, headers: corsHeaders });
    }
  } else {
    // No secret configured yet — refuse rather than trust unsigned input.
    log("STRIPE_WEBHOOK_SECRET missing; rejecting event");
    return new Response("Webhook secret not configured", { status: 400, headers: corsHeaders });
  }

  log("Event received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const email = invoice.customer_email ?? null;
        const profile = await profileByEmail(email);
        const line = invoice.lines?.data?.[0];
        const periodEnd = line?.period?.end ? new Date(line.period.end * 1000).toISOString() : null;

        if (periodEnd && profile?.user_id) {
          await admin
            .from("profiles")
            .update({ subscription_ends_at: periodEnd, is_trial: false })
            .eq("user_id", profile.user_id);
        }

        if (email) {
          await sendEmail("payment-receipt", email, {
            userName: profile?.full_name ?? null,
            amount: money(invoice.amount_paid, invoice.currency),
            planName: line?.description ?? "AdaptivePrep subscription",
            invoiceNumber: invoice.number ?? null,
            paidAt: new Date(event.created * 1000).toISOString(),
            periodEnd,
            invoiceUrl: invoice.hosted_invoice_url ?? null,
          });
        }
        break;
      }

      case "invoice.upcoming": {
        const invoice = event.data.object as Stripe.Invoice;
        const email = invoice.customer_email ?? null;
        const profile = await profileByEmail(email);
        if (email) {
          await sendEmail("renewal-reminder", email, {
            userName: profile?.full_name ?? null,
            amount: money(invoice.amount_due, invoice.currency),
            planName: invoice.lines?.data?.[0]?.description ?? "AdaptivePrep subscription",
            renewalDate: invoice.next_payment_attempt
              ? new Date(invoice.next_payment_attempt * 1000).toISOString()
              : null,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(sub.customer as string);
        const email = (customer as Stripe.Customer)?.email ?? null;
        const profile = await profileByEmail(email);
        if (profile?.user_id) {
          await admin
            .from("profiles")
            .update({
              tier: "tier_0",
              is_trial: false,
              subscription_ends_at: null,
              credits_remaining: 15,
              tests_remaining: 10,
            })
            .eq("user_id", profile.user_id);
          log("Downgraded to free", { userId: profile.user_id });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        log("Payment failed", { email: invoice.customer_email, invoice: invoice.id });
        break;
      }

      default:
        log("Unhandled event", { type: event.type });
    }
  } catch (e) {
    log("Handler error", { message: e instanceof Error ? e.message : String(e) });
    return new Response("Handler error", { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

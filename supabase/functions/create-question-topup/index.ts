// Creates a Stripe Checkout session for a one-off question top-up:
// $1 / ₸500 → 98 questions (44 Math + 54 Reading & Writing = one full-length test).
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const TOPUP_QUESTIONS = 98;

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
    const { data } = await authClient.auth.getUser(token);
    const user = data?.user;
    if (!user?.email) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const currency = body?.currency === "kzt" ? "kzt" : "usd";

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    // Same $1 / ₸500 prices already used elsewhere in the app.
    const priceId = currency === "kzt"
      ? "price_1TDqjMCMf0zaGhPS51TFBYot" // ₸500
      : "price_1TDqg9CMf0zaGhPSH1z7qsV5"; // $1

    const origin = req.headers.get("origin") || "https://adaptiveprep.org";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/dashboard/tests?topup=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/tests?topup=cancelled`,
      metadata: {
        user_id: user.id,
        type: "question_topup",
        questions: String(TOPUP_QUESTIONS),
        currency,
      },
    });

    return json({ url: session.url });
  } catch (error) {
    console.error("create-question-topup error", error);
    return json({ error: (error as Error).message }, 500);
  }
});

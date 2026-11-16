import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CREDIT_COST } from "@ielts/contract.ts";
import { TIER_DAILY_CREDITS, TRIAL_DAILY_CREDITS, dailyCreditLimit } from "@ielts/credits.ts";
import { PLANS, BILLING_MULTIPLIERS, BILLING_PERIOD_MONTHS, calcPrice, getPlan } from "@/lib/pricing-config";
import { STRIPE_LINKS, getStripeLink } from "@/lib/stripe-links";
import { allowanceForCredits, allowanceForTier, creditCostLines, planFeatureLines, planUsage } from "@/lib/plan-features";
import { billingActions, billingState, isCancelling, type BillingInput } from "@/lib/billing-state";
import { planFromRow } from "@/hooks/usePlan";
import { getTierLimits, TIER_LIMITS, TRIAL_LIMITS } from "@/lib/tier-limits";
import { CANCEL_REASONS } from "@/lib/cancel-reasons";

const root = resolve(__dirname, "../../..");

/** Values copied from the old app (src/lib/stripe-links.ts, pricing-config.ts). Do not edit. */
const OLD_STUDENT_LINKS = {
  tier_1: {
    monthly: "https://buy.stripe.com/3cIdR89w83nqgQhbwR4wM04",
    term: "https://buy.stripe.com/4gM00i5fS8HK2Zr30l4wM0k",
    yearly: "https://buy.stripe.com/4gM3cu23G2jm2Zr6cx4wM0p",
  },
  tier_2: {
    monthly: "https://buy.stripe.com/28EcN4bEgaPSdE5fN74wM05",
    term: "https://buy.stripe.com/9B6aEWeQs7DGbvX58t4wM0j",
    yearly: "https://buy.stripe.com/9B65kC9w8bTWdE51Wh4wM0q",
  },
  tier_3: {
    monthly: "https://buy.stripe.com/7sY9AS7o03nq2Zr9oJ4wM06",
    term: "https://buy.stripe.com/3cI3cudMo6zCeI9bwR4wM0l",
    yearly: "https://buy.stripe.com/7sY00ieQs9LO57zdEZ4wM0r",
  },
};

describe("restored plans match the old app", () => {
  it("keeps every student Stripe link and tier id identical", () => {
    expect(STRIPE_LINKS.student).toEqual(OLD_STUDENT_LINKS);
    expect(Object.keys(STRIPE_LINKS)).toEqual(["student"]);
  });

  it("getStripeLink returns the stored link for every tier and cycle", () => {
    for (const tier of ["tier_1", "tier_2", "tier_3"] as const) {
      for (const cycle of ["monthly", "term", "yearly"] as const) {
        expect(getStripeLink(tier, cycle)).toBe(OLD_STUDENT_LINKS[tier][cycle]);
      }
    }
  });

  it("keeps names, tier ids and prices as sold", () => {
    expect(PLANS.map((p) => [p.id, p.tierId, p.name, p.monthlyPriceUSD, p.monthlyPriceKZT])).toEqual([
      ["student-free", "tier_0", "Free", 0, 0],
      ["student-basic", "tier_1", "Basic", 5, 2500],
      ["student-pro", "tier_2", "Pro", 10, 4990],
      ["student-elite", "tier_3", "Elite", 21, 9900],
    ]);
    expect(BILLING_MULTIPLIERS).toEqual({ monthly: 1, term: 0.9, yearly: 0.8 });
    expect(BILLING_PERIOD_MONTHS).toEqual({ monthly: 1, term: 3, yearly: 12 });
    expect(calcPrice(21, "yearly")).toBe(17);
    expect(calcPrice(10, "term")).toBe(9);
  });

  it("matches the old app's files when they are present on this machine", () => {
    const old = "/home/claude/repos/old-app/src/lib/stripe-links.ts";
    if (!existsSync(old)) return;
    const urlsOf = (t: string) => [...t.matchAll(/(tier_\d|monthly|term|yearly): "([^"]+)"/g)].map((m) => `${m[1]}=${m[2]}`);
    const oldStudentBlock = readFileSync(old, "utf8").split("tutor: {")[0];
    const newText = readFileSync(resolve(root, "src/lib/stripe-links.ts"), "utf8");
    expect(urlsOf(newText)).toEqual(urlsOf(oldStudentBlock));
  });
});

describe("plan descriptions come from the server constants", () => {
  it("derives essay checks and chat messages from credits and CREDIT_COST", () => {
    expect(planUsage("tier_0")).toBe("About 3 essay checks a day, or 15 chat messages");
    expect(planUsage("tier_1")).toBe("About 8 essay checks a day, or 40 chat messages");
    expect(planUsage("tier_2")).toBe("About 20 essay checks a day, or 100 chat messages");
    expect(planUsage("tier_3")).toBe("About 40 essay checks a day, or 200 chat messages");
  });

  it("uses TIER_DAILY_CREDITS and CREDIT_COST for every number", () => {
    for (const p of PLANS) {
      const a = allowanceForTier(p.tierId);
      expect(a.dailyCredits).toBe(TIER_DAILY_CREDITS[p.tierId]);
      expect(a.essayChecks).toBe(Math.floor(TIER_DAILY_CREDITS[p.tierId] / CREDIT_COST.grade));
      expect(a.chatMessages).toBe(Math.floor(TIER_DAILY_CREDITS[p.tierId] / CREDIT_COST.chat));
      const lines = planFeatureLines(p.tierId);
      expect(lines[0]).toBe(`${TIER_DAILY_CREDITS[p.tierId]} AI credits every day`);
    }
  });

  it("follows the constants if they change", () => {
    expect(allowanceForCredits(1000)).toEqual({
      dailyCredits: 1000,
      essayChecks: Math.floor(1000 / CREDIT_COST.grade),
      chatMessages: Math.floor(1000 / CREDIT_COST.chat),
    });
  });

  it("lists the cost of each kind of call from CREDIT_COST", () => {
    const text = creditCostLines().join("\n");
    expect(text).toContain(`Essay check: ${CREDIT_COST.grade} credits`);
    expect(text).toContain(`model answer: ${CREDIT_COST.gradeWithModelAnswer} credits`);
    expect(text).toContain(`Chat message: ${CREDIT_COST.chat} credit`);
  });

  it("promises nothing the product does not do", () => {
    const banned = /\b(SAT|quiz|quizzes|test|tests|flashcard|flashcards|lesson|lessons|voice|priority|support|university|premium|model|coaching|research|analytics|unlimited)\b/i;
    for (const p of PLANS) {
      // "model answer" is a real, priced feature, but it is not claimed per plan.
      for (const line of planFeatureLines(p.tierId)) expect(line).not.toMatch(banned);
    }
  });
});

describe("usePlan mapping", () => {
  const base = { tier: "tier_2", is_trial: false, trial_ends_at: null, credits_remaining: 60, credits_reset_at: new Date().toISOString(), subscription_ends_at: "2026-12-01T00:00:00Z" };

  it("reads tier, plan name, credits and end date", () => {
    const p = planFromRow(base);
    expect(p).toMatchObject({ tierId: "tier_2", planName: "Pro", isTrial: false, dailyCredits: 100, creditsRemaining: 60, subscriptionEndsAt: "2026-12-01T00:00:00Z", loading: false });
  });

  it("gives trial users the trial allowance, as dailyCreditLimit does on the server", () => {
    const p = planFromRow({ ...base, is_trial: true, trial_ends_at: "2026-11-20T00:00:00Z", subscription_ends_at: null });
    expect(p.isTrial).toBe(true);
    expect(p.dailyCredits).toBe(TRIAL_DAILY_CREDITS);
    expect(p.dailyCredits).toBe(dailyCreditLimit("tier_2", true));
    expect(p.trialEndsAt).toBe("2026-11-20T00:00:00Z");
  });

  it("matches dailyCreditLimit for every tier", () => {
    for (const t of Object.keys(TIER_DAILY_CREDITS)) expect(planFromRow({ ...base, tier: t }).dailyCredits).toBe(dailyCreditLimit(t, false));
  });

  it("shows a full balance when the server has not reset credits yet today", () => {
    const yesterday = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
    expect(planFromRow({ ...base, credits_remaining: 3, credits_reset_at: yesterday }).creditsRemaining).toBe(100);
  });

  it("falls back to the free plan for a missing row or unknown tier", () => {
    expect(planFromRow(null).tierId).toBe("tier_0");
    expect(planFromRow({ ...base, tier: "tier_9" }).planName).toBe("Free");
    expect(planFromRow(null).creditsRemaining).toBeNull();
  });
});

describe("billing page states and actions", () => {
  const now = new Date("2026-11-16T12:00:00Z");
  const input = (over: Partial<BillingInput>): BillingInput => ({
    tierId: "tier_0",
    isTrial: false,
    subscriptionEndsAt: null,
    latestCancellation: null,
    now,
    ...over,
  });
  const actionOf = (state: ReturnType<typeof billingState>, tier: string) =>
    Object.fromEntries(billingActions(state, tier).plans.map((p) => [p.tierId, p.action]));

  it("free: current is Free, every paid plan can be subscribed to, nothing to cancel", () => {
    const state = billingState(input({}));
    expect(state).toBe("free");
    expect(actionOf(state, "tier_0")).toEqual({ tier_0: "current", tier_1: "subscribe", tier_2: "subscribe", tier_3: "subscribe" });
    expect(billingActions(state, "tier_0").canCancel).toBe(false);
  });

  it("trial: no plan is current, every paid plan can be subscribed to, nothing to cancel", () => {
    const state = billingState(input({ tierId: "tier_2", isTrial: true }));
    expect(state).toBe("trial");
    expect(actionOf(state, "tier_2")).toEqual({ tier_0: "free_forever", tier_1: "subscribe", tier_2: "subscribe", tier_3: "subscribe" });
    expect(billingActions(state, "tier_2").canCancel).toBe(false);
  });

  it("paid: current plan marked, higher plans upgrade, lower paid plans downgrade, cancel offered", () => {
    const state = billingState(input({ tierId: "tier_2", subscriptionEndsAt: "2026-12-10T00:00:00Z" }));
    expect(state).toBe("paid");
    expect(actionOf(state, "tier_2")).toEqual({ tier_0: "free_forever", tier_1: "downgrade", tier_2: "current", tier_3: "upgrade" });
    expect(billingActions(state, "tier_2").canCancel).toBe(true);
    expect(actionOf(state, "tier_3").tier_3).toBe("current");
    expect(actionOf(state, "tier_1").tier_3).toBe("upgrade");
  });

  it("cancelling: same plan can be resubscribed, cancel is no longer offered", () => {
    const state = billingState(
      input({
        tierId: "tier_1",
        subscriptionEndsAt: "2026-12-10T00:00:00Z",
        latestCancellation: { created_at: "2026-11-15T00:00:00Z", access_until: "2026-12-10T00:00:00Z" },
      })
    );
    expect(state).toBe("cancelling");
    expect(actionOf(state, "tier_1")).toEqual({ tier_0: "free_forever", tier_1: "resubscribe", tier_2: "upgrade", tier_3: "upgrade" });
    expect(billingActions(state, "tier_1").canCancel).toBe(false);
  });

  it("an old cancellation does not count once the subscription has renewed past it or expired", () => {
    const renewed = input({
      tierId: "tier_1",
      subscriptionEndsAt: "2027-01-10T00:00:00Z",
      latestCancellation: { created_at: "2026-10-01T00:00:00Z", access_until: "2026-12-10T00:00:00Z" },
    });
    expect(isCancelling(renewed)).toBe(false);
    expect(billingState(renewed)).toBe("paid");
    const expired = input({
      tierId: "tier_1",
      subscriptionEndsAt: "2026-11-01T00:00:00Z",
      latestCancellation: { created_at: "2026-10-01T00:00:00Z", access_until: "2026-11-01T00:00:00Z" },
    });
    expect(isCancelling(expired)).toBe(false);
  });

  it("a cancellation without an access date is not treated as cancelling", () => {
    expect(isCancelling(input({ tierId: "tier_1", latestCancellation: { created_at: "2026-11-01T00:00:00Z", access_until: null } }))).toBe(false);
  });
});

describe("tier limits reduced to what is true", () => {
  it("only carries names, prices and daily credits", () => {
    expect(Object.keys(getTierLimits("tier_3")).sort()).toEqual(["creditsPerDay", "displayName", "name", "price"]);
    expect(TIER_LIMITS.tier_1).toEqual({ name: "tier_1", displayName: "Basic", price: 5, creditsPerDay: 40 });
    expect(TRIAL_LIMITS.creditsPerDay).toBe(TRIAL_DAILY_CREDITS);
    expect(getTierLimits(undefined).displayName).toBe(getPlan("tier_0").name);
  });
});

describe("agreement with the kept server functions", () => {
  const read = (p: string) => readFileSync(resolve(root, p), "utf8");

  it("sends only cancel reasons the cancel-subscription function accepts", () => {
    const server = read("supabase/functions/cancel-subscription/index.ts");
    const list = server.match(/const REASONS = \[([\s\S]*?)\];/)![1];
    const accepted = [...list.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
    for (const r of CANCEL_REASONS) expect(accepted).toContain(r.value);
  });

  it("cancel dialog calls cancel-subscription with { reason, feedback }", () => {
    const dialog = read("src/components/billing/CancelSubscriptionDialog.tsx");
    expect(dialog).toContain('invoke("cancel-subscription"');
    expect(dialog).toMatch(/body: \{ reason, feedback:/);
    const server = read("supabase/functions/cancel-subscription/index.ts");
    expect(server).toContain("body.reason");
    expect(server).toContain("body.feedback");
  });

  it("the webhook downgrades to the free plan with the free daily credits", () => {
    const server = read("supabase/functions/stripe-webhook/index.ts");
    expect(server).toContain('tier: "tier_0"');
    expect(server).toContain(`credits_remaining: ${TIER_DAILY_CREDITS.tier_0}`);
  });

  it("the Terms point customers to the Billing page to cancel", () => {
    const terms = read("src/pages/Terms.tsx");
    expect(terms).toContain("from the Billing page in your");
    expect(terms).not.toContain("by emailing");
  });
});

import { useState } from "react";
import { Check, CreditCard, Clock } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { useLatestCancellation } from "@/hooks/useLatestCancellation";
import { PLANS, calcPrice, fmtKZT, fmtUSD, getPlan, type BillingCycle, type Plan } from "@/lib/pricing-config";
import { getStripeLink } from "@/lib/stripe-links";
import { creditCostLines, planFeatureLines, planUsage } from "@/lib/plan-features";
import { billingActions, billingState, daysUntil, type PlanAction } from "@/lib/billing-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageSeo } from "@/components/seo/PageSeo";
import { CancelSubscriptionDialog } from "@/components/billing/CancelSubscriptionDialog";

const SUPPORT_EMAIL = "hello@adaptiveprep.org";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

const ACTION_LABEL: Record<PlanAction, (plan: Plan) => string> = {
  current: () => "Current plan",
  free_forever: () => "Free plan",
  subscribe: (p) => `Subscribe to ${p.name}`,
  upgrade: (p) => `Upgrade to ${p.name}`,
  downgrade: (p) => `Switch to ${p.name}`,
  resubscribe: () => "Resubscribe",
};

export default function Billing() {
  const { user } = useAuth();
  const plan = usePlan();
  const [refreshKey, setRefreshKey] = useState(0);
  const { latestCancellation, loading: cancellationLoading } = useLatestCancellation(refreshKey);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  const loading = plan.loading || cancellationLoading;
  const state = billingState({
    tierId: plan.tierId,
    isTrial: plan.isTrial,
    subscriptionEndsAt: plan.subscriptionEndsAt,
    latestCancellation,
  });
  const actions = billingActions(state, plan.tierId);
  const current = getPlan(plan.tierId);
  const endDate = formatDate(state === "cancelling" ? latestCancellation?.access_until ?? plan.subscriptionEndsAt : plan.subscriptionEndsAt);
  const trialDays = daysUntil(plan.trialEndsAt);

  const creditsPct =
    plan.creditsRemaining !== null && plan.dailyCredits > 0
      ? Math.min(100, Math.max(0, (plan.creditsRemaining / plan.dailyCredits) * 100))
      : 0;

  return (
    <DashboardLayout>
      <PageSeo
        title="Billing & Plans | AdaptivePrep"
        description="Manage your AdaptivePrep plan: see your daily credits, change plan or cancel."
        path="/dashboard/billing"
      />
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Billing &amp; plans</h1>
          <p className="text-muted-foreground mt-1">Your plan, your daily credits, and how to change or cancel.</p>
        </div>

        {/* Current plan */}
        {loading ? (
          <Skeleton className="h-44 w-full rounded-xl" />
        ) : (
          <Card className="border-primary">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {state === "trial" ? <Clock className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {state === "trial" ? "Free trial" : `${current.name} plan`}
                    </CardTitle>
                    <CardDescription>
                      {state === "free" && "Free. No card needed."}
                      {state === "trial" &&
                        (plan.trialEndsAt
                          ? `${trialDays} day${trialDays === 1 ? "" : "s"} left. Ends ${formatDate(plan.trialEndsAt)}.`
                          : "Your trial is active.")}
                      {state === "paid" && (endDate ? `Renews on ${endDate}.` : "Subscription active.")}
                      {state === "cancelling" &&
                        (endDate
                          ? `Cancelled. You keep access until ${endDate}, then your account moves to the free plan.`
                          : "Cancelled. You keep access until the end of your paid period.")}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {state === "trial" && <Badge variant="secondary">Trial</Badge>}
                  {state === "cancelling" && <Badge variant="secondary">Cancelled</Badge>}
                  {actions.canCancel && <CancelSubscriptionDialog onCancelled={() => setRefreshKey((k) => k + 1)} />}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <p className="text-xs text-muted-foreground mb-1">AI credits today</p>
                  <p className="text-xl font-bold text-foreground">
                    {plan.creditsRemaining ?? 0}
                    <span className="text-sm font-normal text-muted-foreground">/{plan.dailyCredits}</span>
                  </p>
                  <Progress value={creditsPct} className="h-1.5 mt-2" aria-label="Credits left today" />
                  <p className="text-xs text-muted-foreground mt-2">Credits reset every day.</p>
                </div>
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <p className="text-xs text-muted-foreground mb-1">What your credits buy</p>
                  <p className="text-sm text-foreground">
                    {planUsage(plan.tierId)}.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {state === "trial"
                      ? "Trial accounts get the trial allowance shown here."
                      : "Essay checks and chat messages share the same credits."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plans */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-foreground">{state === "free" || state === "trial" ? "Choose a plan" : "Change plan"}</h2>
          <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as BillingCycle)}>
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="term">3 months (10% off)</TabsTrigger>
              <TabsTrigger value="yearly">Yearly (20% off)</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => {
            const action = actions.plans.find((a) => a.tierId === p.tierId)!.action;
            const isCurrent = action === "current";
            const link = p.tierId === "tier_0" ? null : getStripeLink(p.tierId, billingCycle);
            const cycleSuffix = billingCycle === "monthly" ? "/mo" : billingCycle === "term" ? "/mo (3 months)" : "/mo (yearly)";
            return (
              <Card key={p.id} className={`relative flex flex-col ${isCurrent ? "border-primary" : ""}`}>
                {isCurrent && <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs">Current plan</Badge>}
                {p.mostPopular && !isCurrent && (
                  <Badge variant="secondary" className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs">
                    {p.badge}
                  </Badge>
                )}
                <CardHeader className="pb-3 pt-5">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <CardDescription>
                    {p.monthlyPriceUSD === 0 ? (
                      <span className="text-2xl font-bold text-foreground">Free</span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-foreground">{fmtUSD(calcPrice(p.monthlyPriceUSD, billingCycle))}</span>
                        <span className="text-muted-foreground text-sm">{cycleSuffix}</span>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {fmtKZT(calcPrice(p.monthlyPriceKZT, billingCycle))}
                          {cycleSuffix}
                        </span>
                      </>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col pt-0">
                  <ul className="space-y-2 flex-1 text-xs">
                    {planFeatureLines(p.tierId).map((line) => (
                      <li key={line} className="flex items-start gap-2 text-muted-foreground">
                        <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" aria-hidden="true" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4">
                    {link && action !== "current" && action !== "free_forever" ? (
                      <Button className="w-full" size="sm" variant={action === "downgrade" ? "outline" : "default"} asChild>
                        <a href={link} target="_blank" rel="noopener noreferrer">
                          {ACTION_LABEL[action](p)}
                        </a>
                      </Button>
                    ) : (
                      <Button className="w-full" size="sm" variant="outline" disabled>
                        {ACTION_LABEL[action](p)}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Paying and switching plans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p>
              Plans are paid through Stripe in a new tab.{" "}
              {user?.email ? (
                <>
                  At checkout, use the same email as this account (<span className="text-foreground font-medium">{user.email}</span>) so
                  your payment reaches your account.
                </>
              ) : (
                "At checkout, use the same email as your account so your payment reaches it."
              )}
            </p>
            {(state === "paid" || state === "cancelling") && (
              <p>
                Choosing a different plan starts a new Stripe subscription. It does not end your current one for you. To avoid paying
                for two plans, email{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
                  {SUPPORT_EMAIL}
                </a>{" "}
                after you switch and we will cancel the old one.
              </p>
            )}
            <p>
              If your plan has not changed a few minutes after you pay, email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
                {SUPPORT_EMAIL}
              </a>{" "}
              with the email you paid with.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What credits cost</CardTitle>
            <CardDescription>Credits are spent when you use the checker or the coach chat.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
              {creditCostLines().map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              If a check fails on our side, its credits are returned. Band scores are estimates, not official IELTS results.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Billing &amp; refund policy</CardTitle>
            <CardDescription>
              Please read before subscribing:{" "}
              <a href="/terms" className="text-primary hover:underline">
                full Terms of Service
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p>
              Subscriptions renew automatically until cancelled. You can cancel at any time from this page. Cancelling stops all
              future charges immediately.
            </p>
            <p>
              <span className="text-foreground font-medium">All payments are final and non-refundable</span>, including partial billing
              periods. When you cancel, you keep full access for the rest of the period you have already paid for, and no refund or
              proration is issued for unused time.
            </p>
            <p>
              Questions about a charge? Email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

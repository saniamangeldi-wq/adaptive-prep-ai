import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PLANS,
  calcPrice,
  fmtKZT,
  fmtUSD,
  type BillingCycle,
  type Plan,
} from "@/lib/pricing-config";
import { getStripeLink } from "@/lib/stripe-links";
import { planFeatureLines } from "@/lib/plan-features";

const billingOptions: { key: BillingCycle; label: string; discount?: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "term", label: "3 Months", discount: "−10%" },
  { key: "yearly", label: "Yearly", discount: "−20%" },
];

interface PricingProps {
  /** Use h1 when this section is the page's primary heading (e.g. /pricing). Defaults to h2. */
  headingLevel?: "h1" | "h2";
  headingText?: React.ReactNode;
}

export function Pricing({ headingLevel = "h2", headingText }: PricingProps = {}) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const Heading = headingLevel;

  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 max-w-3xl mx-auto">
          <Heading className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {headingText ?? "Simple, transparent pricing"}
          </Heading>
          <p className="text-lg text-muted-foreground">
            Every plan includes the IELTS Writing checker and the writing coach chat. A plan sets how many credits you get each day.
            Upgrade or downgrade anytime.
          </p>
        </div>

        <div className="flex justify-center mb-10">
          <div
            role="group"
            aria-label="Billing period"
            className="inline-flex items-center gap-1 p-1 rounded-full bg-muted border border-border"
          >
            {billingOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                aria-pressed={billingCycle === opt.key}
                onClick={() => setBillingCycle(opt.key)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors",
                  billingCycle === opt.key
                    ? "bg-card text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
                {opt.discount && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{opt.discount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 max-w-6xl mx-auto md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} billingCycle={billingCycle} />
          ))}
        </div>

        <p className="text-center mt-10 text-muted-foreground">
          Start on the free plan, no card needed.{" "}
          <Link to="/signup" className="text-primary hover:underline font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </section>
  );
}

function PlanCard({ plan, billingCycle }: { plan: Plan; billingCycle: BillingCycle }) {
  const isFree = plan.monthlyPriceUSD === 0;
  const stripeLink = plan.tierId === "tier_0" ? null : getStripeLink(plan.tierId, billingCycle);

  return (
    <div
      className={cn(
        "relative p-6 rounded-xl border bg-card text-card-foreground flex flex-col",
        plan.mostPopular ? "border-primary" : "border-border"
      )}
    >
      {plan.mostPopular && plan.badge && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
          <Sparkles className="w-3 h-3" />
          {plan.badge}
        </Badge>
      )}

      <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>

      <div className="mt-4 mb-6">
        {isFree ? (
          <span className="text-4xl font-bold text-foreground">Free</span>
        ) : (
          <>
            <PriceLine
              base={fmtKZT(plan.monthlyPriceKZT)}
              now={fmtKZT(calcPrice(plan.monthlyPriceKZT, billingCycle))}
              discounted={billingCycle !== "monthly"}
              large
            />
            <PriceLine
              base={fmtUSD(plan.monthlyPriceUSD)}
              now={fmtUSD(calcPrice(plan.monthlyPriceUSD, billingCycle))}
              discounted={billingCycle !== "monthly"}
            />
          </>
        )}
      </div>

      <ul className="space-y-3 mb-8">
        {planFeatureLines(plan.tierId).map((line) => (
          <li key={line} className="flex items-start gap-2">
            <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span className="text-sm text-foreground">{line}</span>
          </li>
        ))}
      </ul>

      <div className="flex-1" />

      {stripeLink ? (
        <Button className="w-full" variant={plan.mostPopular ? "default" : "outline"} asChild>
          <a href={stripeLink} target="_blank" rel="noopener noreferrer">
            Choose {plan.name}
          </a>
        </Button>
      ) : (
        <Button className="w-full" variant="outline" asChild>
          <Link to="/signup">Start free</Link>
        </Button>
      )}
    </div>
  );
}

function PriceLine({ base, now, discounted, large }: { base: string; now: string; discounted: boolean; large?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 mt-1">
      {discounted && <span className="text-sm text-muted-foreground line-through">{base}</span>}
      <span className={cn("font-bold text-foreground", large ? "text-3xl" : "text-xl text-muted-foreground")}>{now}</span>
      <span className="text-muted-foreground text-sm">/mo</span>
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRICING_CONFIG, calcPrice, fmtKZT, fmtUSD, type BillingCycle } from "@/lib/pricing-config";
import { getStripeLink } from "@/lib/stripe-links";

type PricingRole = "student" | "tutor";

interface PricingProps {
  /** Use h1 when this section is the page's primary heading (e.g. /pricing). Defaults to h2. */
  headingLevel?: "h1" | "h2";
  headingText?: React.ReactNode;
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { key: T; label: string; note?: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-border p-0.5 text-sm">
      {options.map((o) => (
        <button
          key={o.key}
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "rounded px-3 py-1.5 transition-colors",
            value === o.key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
          {o.note && <span className="ml-1.5 font-mono text-xs opacity-70">{o.note}</span>}
        </button>
      ))}
    </div>
  );
}

export function Pricing({ headingLevel = "h2", headingText }: PricingProps = {}) {
  const { t } = useTranslation();
  const [role, setRole] = useState<PricingRole>("student");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const Heading = headingLevel;
  const plans = role === "student" ? PRICING_CONFIG.students : PRICING_CONFIG.tutors;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <Heading className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            {headingText ?? t("home.pricing_title")}
          </Heading>
          <p className="mt-3 text-muted-foreground">{t("home.pricing_lede")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Segmented<PricingRole>
            label={t("home.pricing_title")}
            value={role}
            onChange={setRole}
            options={[
              { key: "student", label: t("home.tab_students") },
              { key: "tutor", label: t("home.tab_tutors") },
            ]}
          />
          <Segmented<BillingCycle>
            label="Billing"
            value={cycle}
            onChange={setCycle}
            options={[
              { key: "monthly", label: t("home.cycle_monthly") },
              { key: "term", label: t("home.cycle_term"), note: "−10%" },
              { key: "yearly", label: t("home.cycle_yearly"), note: "−20%" },
            ]}
          />
        </div>
      </div>

      <div className={cn("mt-10 grid gap-6", plans.length > 1 ? "md:grid-cols-2" : "max-w-xl")}>
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} cycle={cycle} role={role} />
        ))}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        {role === "student" ? t("home.pricing_note_students") : t("home.pricing_note_tutors")}
      </p>
    </div>
  );
}

function PlanCard({
  plan,
  cycle,
  role,
}: {
  plan: { id: string; stripeTier: "tier_1" | "tier_2" | "tier_3" | null; name: string; description: string; monthlyPriceKZT: number; monthlyPriceUSD: number; mostPopular: boolean; features: string[] };
  cycle: BillingCycle;
  role: PricingRole;
}) {
  const { t } = useTranslation();
  const isFree = plan.monthlyPriceKZT === 0;
  const stripeLink = plan.stripeTier ? getStripeLink(role, plan.stripeTier, cycle) : null;

  return (
    <div className={cn("flex flex-col rounded-md border bg-card p-6", plan.mostPopular ? "border-foreground" : "border-border")}>
      <h3 className="text-xl font-semibold">{plan.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>

      <div className="mt-6 border-t border-border pt-5">
        {isFree ? (
          <span className="font-mono text-3xl">{t("home.free")}</span>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl">{fmtKZT(calcPrice(plan.monthlyPriceKZT, cycle))}</span>
              <span className="text-sm text-muted-foreground">{t("home.per_month")}</span>
              {cycle !== "monthly" && (
                <span className="font-mono text-sm text-muted-foreground line-through">{fmtKZT(plan.monthlyPriceKZT)}</span>
              )}
            </div>
            <div className="mt-1 font-mono text-sm text-muted-foreground">
              {fmtUSD(calcPrice(plan.monthlyPriceUSD, cycle))} {t("home.per_month")}
            </div>
          </>
        )}
      </div>

      <ul className="mt-6 space-y-2.5 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2.5">
            <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="flex-1" />

      {stripeLink ? (
        <Button variant={plan.mostPopular ? "hero" : "heroOutline"} className="mt-8 w-full" asChild>
          <a href={stripeLink} target="_blank" rel="noreferrer">{t("home.get_started")}</a>
        </Button>
      ) : (
        <Button variant={plan.mostPopular ? "hero" : "heroOutline"} className="mt-8 w-full" asChild>
          <Link to="/signup">{t("home.get_started")}</Link>
        </Button>
      )}
    </div>
  );
}

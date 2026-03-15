import { useState } from "react";
import { Check, Sparkles, Plus, Minus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  PRICING_CONFIG,
  BILLING_MULTIPLIERS,
  BILLING_PERIOD_MONTHS,
  calcPrice,
  fmtKZT,
  fmtUSD,
  type BillingCycle,
  type SchoolPlan,
} from "@/lib/pricing-config";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ────────────────────────────────────────────
   TEACHER ADD-ON COUNTER
   ──────────────────────────────────────────── */

function TeacherAddonCounter({
  billingCycle,
  basePlanKZT,
  basePlanUSD,
}: {
  billingCycle: BillingCycle;
  basePlanKZT: number;
  basePlanUSD: number;
}) {
  const [extra, setExtra] = useState(0);

  const addonKZT = calcPrice(PRICING_CONFIG.teacherAddOn.priceKZT, billingCycle);
  const addonUSD = calcPrice(PRICING_CONFIG.teacherAddOn.priceUSD, billingCycle);
  const baseKZT = calcPrice(basePlanKZT, billingCycle);
  const baseUSD = calcPrice(basePlanUSD, billingCycle);
  const totalKZT = baseKZT + extra * addonKZT;
  const totalUSD = baseUSD + extra * addonUSD;

  return (
    <div className="mt-4 p-3 rounded-xl border border-border/40 bg-muted/20">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">👨‍🏫</span>
        <span className="text-xs font-semibold text-foreground">+1 Teacher Add-On</span>
        {billingCycle !== "monthly" && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
            {billingCycle === "term" ? "−10%" : "−20%"}
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground mb-2">
        {PRICING_CONFIG.teacherAddOn.description}
      </p>

      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span>/ mo per extra teacher</span>
        <span className="text-foreground font-medium">
          {fmtKZT(addonKZT)}{" "}
          <span className="text-muted-foreground">/ {fmtUSD(addonUSD)}</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setExtra(Math.max(0, extra - 1))}
          className="w-7 h-7 rounded-lg bg-card border border-border text-foreground flex items-center justify-center text-sm font-bold hover:border-primary transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="text-sm font-bold text-foreground w-6 text-center">{extra}</span>
        <button
          onClick={() => setExtra(extra + 1)}
          className="w-7 h-7 rounded-lg bg-card border border-border text-foreground flex items-center justify-center text-sm font-bold hover:border-primary transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] text-muted-foreground">
          {extra > 0
            ? `= ${fmtKZT(extra * addonKZT)} / ${fmtUSD(extra * addonUSD)} mo`
            : "extra teachers"}
        </span>
      </div>

      {extra > 0 && (
        <div className="mt-3 pt-2 border-t border-border/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Combined total</span>
            <div className="text-right">
              <p className="text-sm font-bold text-primary">{fmtKZT(totalKZT)}/mo</p>
              <p className="text-[11px] text-muted-foreground">{fmtUSD(totalUSD)}/mo</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 text-right">
            {billingCycle === "monthly"
              ? "billed monthly"
              : billingCycle === "term"
              ? "billed every 3 months"
              : "billed yearly"}
          </p>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────
   STUDENT ADD-ON BLOCK
   ──────────────────────────────────────────── */

function StudentAddonBlock({ billingCycle }: { billingCycle: BillingCycle }) {
  const addonKZT = calcPrice(PRICING_CONFIG.schoolOverage.monthlyPriceKZT, billingCycle);
  const addonUSD = calcPrice(PRICING_CONFIG.schoolOverage.monthlyPriceUSD, billingCycle);

  return (
    <div className="mt-3 p-3 rounded-xl border border-border/40 bg-muted/20">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">🎓</span>
        <span className="text-xs font-semibold text-foreground">+ Add Students</span>
        {billingCycle !== "monthly" && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
            {billingCycle === "term" ? "−10%" : "−20%"}
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground mb-2">
        {PRICING_CONFIG.schoolOverage.description}
      </p>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>per {PRICING_CONFIG.schoolOverage.studentsPerBlock} students / mo</span>
        <span className="text-foreground font-medium">
          {fmtKZT(addonKZT)}{" "}
          <span className="text-muted-foreground">/ {fmtUSD(addonUSD)}</span>
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   SCHOOL PLAN CARD
   ──────────────────────────────────────────── */

function SchoolPlanCard({
  plan,
  billingCycle,
}: {
  plan: SchoolPlan;
  billingCycle: BillingCycle;
}) {
  const [email, setEmail] = useState("");
  const isEnterprise = plan.monthlyPriceKZT === null;

  const discountedKZT = isEnterprise ? null : calcPrice(plan.monthlyPriceKZT!, billingCycle);
  const discountedUSD = isEnterprise ? null : calcPrice(plan.monthlyPriceUSD!, billingCycle);
  const totalPeriodKZT = discountedKZT !== null ? discountedKZT * BILLING_PERIOD_MONTHS[billingCycle] : null;
  const totalPeriodUSD = discountedUSD !== null ? discountedUSD * BILLING_PERIOD_MONTHS[billingCycle] : null;

  const teacherLabel = plan.bundledTeachers === Infinity ? "Unlimited" : `${plan.bundledTeachers}`;
  const showTooltip = plan.id === "school-pro" || plan.id === "school-enterprise";

  return (
    <div
      className={cn(
        "relative flex flex-col p-6 rounded-2xl border transition-all duration-300 hover:shadow-xl",
        plan.mostPopular
          ? "bg-gradient-to-b from-primary/10 to-transparent border-primary/50 shadow-glow"
          : "bg-card border-border/50 hover:border-primary/30"
      )}
    >
      {/* Most Popular */}
      {plan.mostPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
            <Sparkles className="w-3 h-3" />
            Most Popular
          </div>
        </div>
      )}

      {/* Tier */}
      <div className="mb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {plan.tier}
        </span>
      </div>

      {/* Name & description */}
      <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">{plan.description}</p>

      {/* Teacher pill */}
      <div className="mb-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary cursor-default">
                👨‍🏫 {teacherLabel} Teachers Included
                {showTooltip && <Info className="w-3 h-3 text-muted-foreground" />}
              </span>
            </TooltipTrigger>
            {showTooltip && (
              <TooltipContent className="max-w-[240px] text-xs">
                Teacher accounts can assign quizzes, monitor student progress, view analytics, and manage their class groups.
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Price */}
      <div className="mb-4">
        {isEnterprise ? (
          <p className="text-3xl font-bold text-foreground">Custom</p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              {billingCycle !== "monthly" && (
                <span className="text-sm text-muted-foreground line-through">
                  {fmtKZT(plan.monthlyPriceKZT!)}
                </span>
              )}
              <span className="text-3xl font-bold text-foreground">
                {fmtKZT(discountedKZT!)}
              </span>
              <span className="text-muted-foreground text-sm">/mo</span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              {billingCycle !== "monthly" && (
                <span className="text-xs text-muted-foreground line-through">
                  {fmtUSD(plan.monthlyPriceUSD!)}
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                {fmtUSD(discountedUSD!)}/mo
              </span>
            </div>
            {billingCycle !== "monthly" && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {fmtKZT(totalPeriodKZT!)} / {fmtUSD(totalPeriodUSD!)}{" "}
                {billingCycle === "term" ? "billed every 3 months" : "billed yearly"}
              </p>
            )}
          </>
        )}
      </div>

      {/* Base students */}
      {plan.baseStudents !== null && (
        <p className="text-xs text-muted-foreground mb-3">
          📚 Base includes {plan.baseStudents} students
        </p>
      )}

      {/* Features */}
      <ul className="space-y-2.5 mb-6">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
            <span className="text-sm text-foreground">{f}</span>
          </li>
        ))}
      </ul>

      {/* Add-on blocks for non-enterprise */}
      {!isEnterprise && (
        <>
          <StudentAddonBlock billingCycle={billingCycle} />
          <TeacherAddonCounter
            billingCycle={billingCycle}
            basePlanKZT={plan.monthlyPriceKZT!}
            basePlanUSD={plan.monthlyPriceUSD!}
          />
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* CTA */}
      <div className="mt-6">
        {isEnterprise ? (
          <Button variant="hero" className="w-full" asChild>
            <a href="mailto:schools@met.ai">Contact Us</a>
          </Button>
        ) : (
          <>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email to get started"
              className="mb-3"
            />
            <Button
              variant="hero"
              className="w-full"
              disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
            >
              Get Started
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   SCHOOLS TAB — MAIN EXPORT
   ──────────────────────────────────────────── */

export function SchoolsTab({ billingCycle }: { billingCycle: BillingCycle }) {
  return (
    <div className="grid gap-8 max-w-6xl mx-auto md:grid-cols-3">
      {PRICING_CONFIG.schools.map((plan) => (
        <SchoolPlanCard key={plan.id} plan={plan} billingCycle={billingCycle} />
      ))}
    </div>
  );
}

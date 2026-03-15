import { useState } from "react";
import { Check, Sparkles, GraduationCap, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PRICING_CONFIG, calcPrice, fmtKZT, fmtUSD, type BillingCycle } from "@/lib/pricing-config";
import { SchoolsTab } from "@/components/landing/pricing/SchoolsTab";

type PricingRole = "student" | "tutor" | "school";

const roleConfig = {
  student: { icon: GraduationCap, label: "For Students" },
  tutor: { icon: Users, label: "For Tutors" },
  school: { icon: Building2, label: "For Schools" },
};

const billingOptions: { key: BillingCycle; label: string; discount?: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "term", label: "3 Months", discount: "−10%" },
  { key: "yearly", label: "Yearly", discount: "−20%" },
];

export function Pricing() {
  const [selectedRole, setSelectedRole] = useState<PricingRole>("student");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  return (
    <section className="py-24 bg-card/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />

      <div className="container relative z-10 mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Simple, transparent{" "}
            <span className="gradient-text">pricing</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Choose the plan that fits your needs. Upgrade or downgrade anytime.
          </p>
        </div>

        {/* Role Selector */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/50 border border-border/50">
            {(Object.keys(roleConfig) as PricingRole[]).map((role) => {
              const { icon: Icon, label } = roleConfig[role];
              const isActive = selectedRole === role;
              return (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{label.replace("For ", "")}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/30 border border-border/30">
            {billingOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setBillingCycle(opt.key)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                  billingCycle === opt.key
                    ? "bg-secondary text-secondary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
                {opt.discount && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
                    {opt.discount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        {selectedRole === "school" ? (
          <SchoolsTab billingCycle={billingCycle} />
        ) : (
          <div
            className={cn(
              "grid gap-8 max-w-6xl mx-auto",
              selectedRole === "student" ? "md:grid-cols-4" : "md:grid-cols-2"
            )}
          >
            {(selectedRole === "student"
              ? PRICING_CONFIG.students
              : PRICING_CONFIG.tutors
            ).map((plan) => (
              <GenericPlanCard key={plan.id} plan={plan} billingCycle={billingCycle} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12">
          {selectedRole === "student" && (
            <p className="text-muted-foreground">
              🎉 Start with our free plan, or try Pro features free for 7 days!{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up now
              </Link>
            </p>
          )}
          {selectedRole === "tutor" && (
            <p className="text-muted-foreground">
              🚀 Need more than 30 students?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Contact us for custom pricing
              </Link>
            </p>
          )}
          {selectedRole === "school" && (
            <p className="text-muted-foreground">
              🏫 All school plans include teacher accounts. Add more anytime.{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Request a quote
              </Link>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── Generic card for Student & Tutor plans ── */

function GenericPlanCard({
  plan,
  billingCycle,
}: {
  plan: { id: string; tier: string; name: string; badge: string | null; description: string; monthlyPriceKZT: number; monthlyPriceUSD: number; mostPopular: boolean; features: string[] };
  billingCycle: BillingCycle;
}) {
  const discountedKZT = calcPrice(plan.monthlyPriceKZT, billingCycle);
  const discountedUSD = calcPrice(plan.monthlyPriceUSD, billingCycle);
  const isFree = plan.monthlyPriceKZT === 0;

  return (
    <div
      className={cn(
        "relative p-6 rounded-2xl border transition-all duration-300 hover:shadow-xl flex flex-col",
        plan.mostPopular
          ? "bg-gradient-to-b from-primary/10 to-transparent border-primary/50 shadow-glow"
          : "bg-card border-border/50 hover:border-primary/30"
      )}
    >
      {plan.mostPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
            <Sparkles className="w-3 h-3" />
            {plan.badge}
          </div>
        </div>
      )}

      <div className="mb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {plan.tier}
        </span>
      </div>

      <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">{plan.description}</p>

      <div className="mb-6">
        {isFree ? (
          <span className="text-4xl font-bold text-foreground">Free</span>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              {billingCycle !== "monthly" && (
                <span className="text-sm text-muted-foreground line-through">
                  {fmtKZT(plan.monthlyPriceKZT)}
                </span>
              )}
              <span className="text-3xl font-bold text-foreground">{fmtKZT(discountedKZT)}</span>
              <span className="text-muted-foreground text-sm">/mo</span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              {billingCycle !== "monthly" && (
                <span className="text-xs text-muted-foreground line-through">
                  {fmtUSD(plan.monthlyPriceUSD)}
                </span>
              )}
              <span className="text-sm text-muted-foreground">{fmtUSD(discountedUSD)}/mo</span>
            </div>
          </>
        )}
      </div>

      <ul className="space-y-3 mb-8">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <span className="text-sm text-foreground">{f}</span>
          </li>
        ))}
      </ul>

      <div className="flex-1" />

      <Button
        variant="hero"
        className={cn("w-full", !plan.mostPopular && "opacity-80 hover:opacity-100")}
        asChild
      >
        <Link to="/signup">Get Started</Link>
      </Button>
    </div>
  );
}

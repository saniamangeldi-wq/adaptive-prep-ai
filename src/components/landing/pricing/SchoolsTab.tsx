import { Check, Sparkles, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PRICING_CONFIG,
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
   SCHOOL PLAN CARD
   ──────────────────────────────────────────── */

function SchoolPlanCard({
  plan,
}: {
  plan: SchoolPlan;
}) {

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
        <p className="text-3xl font-bold text-foreground">Custom</p>
        <p className="text-sm text-muted-foreground mt-1">Contact us for pricing</p>
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

      {/* Spacer */}
      <div className="flex-1" />

      {/* CTA */}
      <div className="mt-6">
        <Button variant="hero" className="w-full" onClick={() => {}}>
          Contact Us
        </Button>
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
        <SchoolPlanCard key={plan.id} plan={plan} />
      ))}
    </div>
  );
}

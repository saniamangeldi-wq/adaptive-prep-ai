import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { 
  CreditCard, 
  Check,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "School Starter",
    tier: "tier_1",
    price: "$299",
    period: "/month",
    description: "For small schools getting started",
    features: [
      "Up to 25 students",
      "Up to 5 teachers",
      "Basic analytics",
      "Email support",
    ],
  },
  {
    name: "School Plus",
    tier: "tier_2",
    price: "$599",
    period: "/month",
    description: "For growing schools",
    popular: true,
    features: [
      "Up to 100 students",
      "Up to 20 teachers",
      "Advanced analytics",
      "Priority support",
      "Custom branding",
    ],
  },
  {
    name: "School Pro",
    tier: "tier_3",
    price: "$999",
    period: "/month",
    description: "For large schools & districts",
    features: [
      "Unlimited students",
      "Unlimited teachers",
      "Full analytics suite",
      "Dedicated support",
      "API access",
      "SSO integration",
    ],
  },
];

export default function SchoolBilling() {
  const { profile } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Billing & Plans</h1>
          <p className="text-muted-foreground mt-1">
            Manage your school subscription
          </p>
        </div>

        {/* Current Plan */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Current Plan</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold text-foreground">
                {profile?.tier === "tier_3" ? "School Pro" : profile?.tier === "tier_2" ? "School Plus" : "School Starter"}
              </p>
              <p className="text-muted-foreground">
                {profile?.tier === "tier_3" ? "$999" : profile?.tier === "tier_2" ? "$599" : "$299"}/month
              </p>
            </div>
            <Button variant="outline">
              Manage Payment
            </Button>
          </div>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className={cn(
                "p-6 rounded-2xl border transition-all",
                plan.popular
                  ? "bg-gradient-to-b from-primary/10 to-transparent border-primary/50"
                  : "bg-card border-border/50"
              )}
            >
              {plan.popular && (
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium mb-4">
                  <Sparkles className="w-3 h-3" />
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              <div className="mt-4">
                <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant={profile?.tier === plan.tier ? "outline" : "hero"}
                className="w-full mt-6"
                disabled={profile?.tier === plan.tier}
              >
                {profile?.tier === plan.tier ? "Current Plan" : "Upgrade"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { 
  CreditCard, 
  Check,
  Sparkles,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Solo Tutor",
    tier: "tier_1",
    price: 59,
    description: "For individual tutors with a few students",
    features: [
      "Up to 5 students",
      "Student progress tracking",
      "AI Coach for all students",
      "Basic analytics dashboard",
      "Email support",
      "Custom test assignments",
    ],
  },
  {
    name: "Professional",
    tier: "tier_2",
    price: 169,
    description: "For growing tutoring practices",
    popular: true,
    features: [
      "Up to 15 students",
      "Advanced progress analytics",
      "Enhanced AI for students",
      "Parent progress reports",
      "Priority support",
      "Custom branding",
      "White-label reports",
    ],
  },
  {
    name: "Tutor Business",
    tier: "tier_3",
    price: 449,
    description: "For established tutoring businesses",
    features: [
      "Up to 40 students",
      "Premium AI for all students",
      "White-label reports",
      "API access",
      "Multi-tutor management",
      "Dedicated account manager",
      "Custom integrations",
    ],
  },
];

export default function TutorBilling() {
  const { profile } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Billing & Plans</h1>
          <p className="text-muted-foreground mt-1">
            Manage your tutoring subscription
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
                {profile?.tier === "tier_3" ? "Tutor Business" : profile?.tier === "tier_2" ? "Professional" : "Solo Tutor"}
              </p>
              <p className="text-muted-foreground">
                ${profile?.tier === "tier_3" ? "449" : profile?.tier === "tier_2" ? "169" : "59"}/month
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
                <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                <span className="text-muted-foreground">/month</span>
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
                variant={profile?.tier === plan.tier ? "secondary" : "hero"}
                className={cn(
                  "w-full mt-6",
                  profile?.tier === plan.tier && "bg-muted text-muted-foreground"
                )}
                disabled={profile?.tier === plan.tier}
              >
                {profile?.tier === plan.tier ? "Current Plan" : "Upgrade"}
              </Button>
            </div>
          ))}
        </div>

        {/* Features comparison */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">What's included in each tier</h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium text-foreground mb-2">AI Quality</p>
              <p className="text-muted-foreground">Higher tiers get access to better AI models with improved reasoning and explanations.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-2">Student Capacity</p>
              <p className="text-muted-foreground">Upgrade to work with more students and scale your tutoring practice.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-2">Analytics</p>
              <p className="text-muted-foreground">Get deeper insights into student performance and learning patterns.</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

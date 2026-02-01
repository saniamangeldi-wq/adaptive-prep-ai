import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    tier: "Tier 1",
    price: 7,
    description: "Perfect for getting started with SAT prep",
    features: [
      "2 practice tests per month",
      "Full feedback on all tests",
      "Study planner access",
      "Progress dashboard",
      "50 AI credits per day",
      "Standard AI quality",
    ],
    popular: false,
  },
  {
    name: "Pro",
    tier: "Tier 2",
    price: 10,
    description: "Most popular for serious test prep",
    features: [
      "4 practice tests per month",
      "Enhanced feedback quality",
      "Everything in Starter",
      "150 AI credits per day",
      "Better AI explanations",
      "Priority support",
    ],
    popular: true,
  },
  {
    name: "Elite",
    tier: "Tier 3",
    price: 21,
    description: "Maximum preparation power",
    features: [
      "12 practice tests per month",
      "Premium feedback quality",
      "Everything in Pro",
      "300 AI credits per day",
      "Voice chat with AI",
      "Best AI quality",
    ],
    popular: false,
  },
];

export function Pricing() {
  return (
    <section className="py-24 bg-card/50 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      
      <div className="container relative z-10 mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Simple, transparent{" "}
            <span className="gradient-text">pricing</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Choose the plan that fits your study needs. Upgrade or downgrade anytime.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <PricingCard key={plan.name} {...plan} />
          ))}
        </div>

        {/* Additional info */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            🎓 Schools and tutors?{" "}
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Check our institutional pricing
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

function PricingCard({
  name,
  tier,
  price,
  description,
  features,
  popular,
}: {
  name: string;
  tier: string;
  price: number;
  description: string;
  features: string[];
  popular: boolean;
}) {
  return (
    <div
      className={cn(
        "relative p-6 rounded-2xl border transition-all duration-300 hover:shadow-xl",
        popular
          ? "bg-gradient-to-b from-primary/10 to-transparent border-primary/50 shadow-glow"
          : "bg-card border-border/50 hover:border-primary/30"
      )}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
            <Sparkles className="w-3 h-3" />
            Most Popular
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-baseline gap-2 mb-1">
          <h3 className="text-xl font-bold text-foreground">{name}</h3>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{tier}</span>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-4xl font-bold text-foreground">${price}</span>
        <span className="text-muted-foreground">/month</span>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <span className="text-sm text-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        variant={popular ? "hero" : "outline"}
        className="w-full"
        asChild
      >
        <Link to="/signup">Get Started</Link>
      </Button>
    </div>
  );
}

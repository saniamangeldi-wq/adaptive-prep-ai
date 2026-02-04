import { useState } from "react";
import { Check, Sparkles, GraduationCap, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type PricingRole = "student" | "tutor" | "school";

const studentPlans = [
  {
    name: "Free",
    tier: "Forever Free",
    price: 0,
    description: "Get started with SAT prep basics",
    features: [
      "10 SAT questions per day",
      "20 AI credits/day",
      "Gemini Flash AI (Quick Chat)",
      "Adaptive learning style",
      "Progress dashboard",
      "5 flashcards/day",
    ],
    popular: false,
  },
  {
    name: "Starter",
    tier: "Tier 1",
    price: 7,
    description: "Perfect for getting started with SAT prep",
    features: [
      "2 practice tests per month",
      "Unlimited SAT questions",
      "50 AI credits/day",
      "GPT-4o AI Model",
      "Full test feedback",
      "20 flashcards/day",
    ],
    popular: false,
  },
  {
    name: "Pro",
    tier: "Tier 2",
    price: 10,
    description: "Most popular for serious test prep",
    features: [
      "5 practice tests per month",
      "150 AI credits/day",
      "Perplexity Pro (Research + Citations)",
      "Perplexity Reasoning",
      "50 flashcards/day",
      "Detailed analytics",
    ],
    popular: true,
  },
  {
    name: "Elite",
    tier: "Tier 3",
    price: 21,
    description: "Maximum preparation power",
    features: [
      "Unlimited practice tests",
      "300 AI credits/day",
      "All Perplexity Models",
      "Deep Research + Advanced Reasoning",
      "University Match feature",
      "1-on-1 coaching session",
    ],
    popular: false,
  },
];

const tutorPlans = [
  {
    name: "Solo Tutor",
    tier: "Tier 1",
    price: 29,
    description: "For individual tutors with a few students",
    features: [
      "Up to 5 students",
      "Student progress tracking",
      "AI Coach for all students",
      "Basic analytics dashboard",
      "Email support",
      "Custom test assignments",
    ],
    popular: false,
  },
  {
    name: "Pro Tutor",
    tier: "Tier 2",
    price: 59,
    description: "For growing tutoring practices",
    features: [
      "Up to 15 students",
      "Advanced progress analytics",
      "Enhanced AI for students",
      "Parent progress reports",
      "Priority support",
      "Custom branding",
    ],
    popular: true,
  },
  {
    name: "Tutor Business",
    tier: "Tier 3",
    price: 99,
    description: "For established tutoring businesses",
    features: [
      "Up to 30 students",
      "Premium AI for all students",
      "White-label reports",
      "API access",
      "Dedicated account manager",
      "Custom integrations",
    ],
    popular: false,
  },
];

const schoolPlans = [
  {
    name: "Basic",
    tier: "Tier 1",
    price: 170,
    priceNote: "per 25 students",
    teacherPrice: 30,
    description: "Essential tools for school SAT prep",
    features: [
      "Basic AI assistance for students",
      "Teacher dashboard",
      "Class progress tracking",
      "Standard analytics",
      "Email support",
      "Bulk student onboarding",
    ],
    popular: false,
  },
  {
    name: "Enhanced",
    tier: "Tier 2",
    price: 200,
    priceNote: "per 25 students",
    teacherPrice: 35,
    description: "Advanced features for better outcomes",
    features: [
      "Enhanced AI with reasoning",
      "Advanced analytics & reports",
      "Parent portal access",
      "Custom test creation",
      "Priority support",
      "Department organization",
    ],
    popular: true,
  },
  {
    name: "Premium",
    tier: "Tier 3",
    price: 300,
    priceNote: "per 25 students",
    teacherPrice: 40,
    description: "Full-featured institutional solution",
    features: [
      "Premium AI with voice chat",
      "University Match tool access",
      "Custom branding",
      "API & LMS integration",
      "Dedicated success manager",
      "On-site training available",
    ],
    popular: false,
  },
];

const roleConfig = {
  student: { icon: GraduationCap, label: "For Students", plans: studentPlans },
  tutor: { icon: Users, label: "For Tutors", plans: tutorPlans },
  school: { icon: Building2, label: "For Schools", plans: schoolPlans },
};

export function Pricing() {
  const [selectedRole, setSelectedRole] = useState<PricingRole>("student");
  const currentPlans = roleConfig[selectedRole].plans;

  return (
    <section className="py-24 bg-card/50 relative overflow-hidden">
      {/* Background gradient */}
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
        <div className="flex justify-center mb-12">
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

        {/* Pricing cards */}
        <div className={cn(
          "grid gap-8 max-w-6xl mx-auto",
          selectedRole === "student" ? "md:grid-cols-4" : "md:grid-cols-3"
        )}>
          {currentPlans.map((plan) => (
            <PricingCard key={`${selectedRole}-${plan.name}`} {...plan} role={selectedRole} />
          ))}
        </div>

        {/* Additional info */}
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
              📚 Need more than 30 students?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Contact us for custom pricing
              </Link>
            </p>
          )}
          {selectedRole === "school" && (
            <p className="text-muted-foreground">
              🏫 Prices shown are base rates. Teacher seats are ${schoolPlans[0].teacherPrice}-${schoolPlans[2].teacherPrice}/month each.{" "}
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

function PricingCard({
  name,
  tier,
  price,
  priceNote,
  teacherPrice,
  description,
  features,
  popular,
  role,
}: {
  name: string;
  tier: string;
  price: number;
  priceNote?: string;
  teacherPrice?: number;
  description: string;
  features: string[];
  popular: boolean;
  role: PricingRole;
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

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          {price === 0 ? (
            <span className="text-4xl font-bold text-foreground">Free</span>
          ) : (
            <>
              <span className="text-4xl font-bold text-foreground">${price}</span>
              <span className="text-muted-foreground">/month</span>
            </>
          )}
        </div>
        {priceNote && (
          <p className="text-xs text-muted-foreground mt-1">{priceNote}</p>
        )}
        {teacherPrice && (
          <p className="text-xs text-muted-foreground mt-1">+ ${teacherPrice}/teacher/month</p>
        )}
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
        variant="hero"
        className={cn(
          "w-full",
          !popular && "opacity-80 hover:opacity-100"
        )}
        asChild
      >
        <Link to="/signup">Get Started</Link>
      </Button>
    </div>
  );
}

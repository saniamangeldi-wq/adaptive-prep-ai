import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { getTierLimits, getDaysRemaining, TIER_LIMITS, TRIAL_LIMITS, PricingTier } from "@/lib/tier-limits";
import { BILLING_MULTIPLIERS, BillingCycle } from "@/lib/pricing-config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Check, 
  Clock, 
  Sparkles, 
  Crown, 
  Zap, 
  CreditCard,
  Search,
  Brain,
   Globe,
   GraduationCap,
   Users
} from "lucide-react";

// Tutor plan definitions
const tutorPlans = [
  {
    name: "Solo Tutor",
    tier: "tier_1" as PricingTier,
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
    tier: "tier_2" as PricingTier,
    price: 169,
    popular: true,
    description: "For growing tutoring practices",
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
    tier: "tier_3" as PricingTier,
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

export default function Billing() {
  const { profile } = useAuth();

  // Route to role-specific billing
  if (profile?.role === "tutor") {
    return <TutorBillingView />;
  }

  // Default: student billing
  return <StudentBillingView />;
}

function TutorBillingView() {
  const { profile } = useAuth();

  const currentPlanName = profile?.tier === "tier_3" ? "Tutor Business" : profile?.tier === "tier_2" ? "Professional" : "Solo Tutor";
  const currentPrice = profile?.tier === "tier_3" ? 449 : profile?.tier === "tier_2" ? 169 : 59;

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
        <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{currentPlanName}</CardTitle>
                  <CardDescription>${currentPrice}/month</CardDescription>
                </div>
              </div>
              <Button variant="outline">Manage Payment</Button>
            </div>
          </CardHeader>
        </Card>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6">
          {tutorPlans.map((plan) => {
            const isCurrentPlan = profile?.tier === plan.tier;
            return (
              <Card
                key={plan.tier}
                className={`relative flex flex-col ${
                  isCurrentPlan
                    ? "border-primary ring-2 ring-primary/20"
                    : plan.popular
                      ? "border-accent/50"
                      : ""
                }`}
              >
                {isCurrentPlan && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs">
                    Current Plan
                  </Badge>
                )}
                {plan.popular && !isCurrentPlan && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs">
                    Most Popular
                  </Badge>
                )}

                <CardHeader className="pb-3 pt-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 rounded-md bg-primary/20 text-primary">
                      <Users className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                  </div>
                  <CardDescription>
                    <span className="text-2xl font-bold text-foreground">${plan.price}</span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                  </CardDescription>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col pt-0">
                  <ul className="space-y-2 flex-1 text-xs">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-muted-foreground">
                        <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4">
                    {isCurrentPlan ? (
                      <Button variant="outline" className="w-full" size="sm" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Button variant={plan.tier === "tier_3" ? "hero" : "outline"} className="w-full" size="sm">
                        {(["tier_0","tier_1","tier_2","tier_3"].indexOf(profile?.tier || "tier_1") > ["tier_0","tier_1","tier_2","tier_3"].indexOf(plan.tier)) ? "Downgrade" : plan.tier === "tier_3" ? "Go Business" : "Upgrade"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* What's included */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What's included in each tier</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function StudentBillingView() {
  const { profile } = useAuth();

  const isTrialUser = profile?.is_trial && profile?.trial_ends_at;
  const daysRemaining = isTrialUser ? getDaysRemaining(profile.trial_ends_at) : 0;
  const currentTierLimits = getTierLimits(profile?.tier as PricingTier);

  const pricingTiers: PricingTier[] = ["tier_0", "tier_1", "tier_2", "tier_3"];

  const getTierIcon = (tierKey: PricingTier) => {
    switch (tierKey) {
      case "tier_0": return <Zap className="w-5 h-5" />;
      case "tier_1": return <Sparkles className="w-5 h-5" />;
      case "tier_2": return <Crown className="w-5 h-5" />;
      case "tier_3": return <Crown className="w-5 h-5" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Billing & Plans</h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription and view plan details
          </p>
        </div>

        {/* Current Plan Overview */}
        <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  {isTrialUser ? <Sparkles className="w-5 h-5 text-primary" /> : getTierIcon(profile?.tier as PricingTier || "tier_0")}
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {isTrialUser ? "Pro Trial" : currentTierLimits.displayName} Plan
                  </CardTitle>
                  <CardDescription>
                    {isTrialUser 
                      ? `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining in trial`
                      : currentTierLimits.price === 0 
                        ? "Free forever" 
                        : `$${currentTierLimits.price}/month`
                    }
                  </CardDescription>
                </div>
              </div>
              {isTrialUser && (
                <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
                  <Clock className="w-3 h-3 mr-1" />
                  Trial Active
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">AI Credits Today</p>
                <p className="text-xl font-bold text-foreground">
                  {profile?.credits_remaining || 0}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{isTrialUser ? TRIAL_LIMITS.creditsPerDay : currentTierLimits.creditsPerDay}
                  </span>
                </p>
                <Progress 
                  value={((profile?.credits_remaining || 0) / (isTrialUser ? TRIAL_LIMITS.creditsPerDay : currentTierLimits.creditsPerDay)) * 100} 
                  className="h-1.5 mt-2" 
                />
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Questions Remaining</p>
                <p className="text-xl font-bold text-foreground">
                  {currentTierLimits.questionsPerMonth === 0 
                    ? "0" 
                    : (profile?.tests_remaining || 0)}
                  {currentTierLimits.questionsPerMonth > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">
                      /{currentTierLimits.questionsPerMonth}
                    </span>
                  )}
                </p>
                {currentTierLimits.questionsPerMonth > 0 && (
                  <Progress 
                    value={((profile?.tests_remaining || 0) / currentTierLimits.questionsPerMonth) * 100} 
                    className="h-1.5 mt-2" 
                  />
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {currentTierLimits.questionsPerMonth === 0 ? "Upgrade to unlock" : "This month"}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">AI Model</p>
                <p className="text-xl font-bold text-foreground">
                  {currentTierLimits.aiProvider === "perplexity" 
                    ? (currentTierLimits.aiModel === "gpt-5-all" ? "Perplexity All" : "Perplexity Pro")
                    : currentTierLimits.aiModel === "gpt-4o" ? "GPT-4o" 
                    : "Gemini Flash"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {currentTierLimits.aiProvider === "perplexity" 
                    ? "Multi-AI Search" 
                    : currentTierLimits.aiProvider === "openai" 
                      ? "OpenAI" 
                      : "Google Gemini"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Plans Grid */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Choose Your Plan</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pricingTiers.map((tierKey) => {
              const tier = TIER_LIMITS[tierKey];
              const isCurrentTier = profile?.tier === tierKey && !profile?.is_trial;
              const isTrialTier = profile?.is_trial && tierKey === "tier_2";
              const isPopular = tierKey === "tier_2";

              return (
                <Card 
                  key={tierKey} 
                  className={`relative flex flex-col ${
                    isCurrentTier || isTrialTier 
                      ? "border-primary ring-2 ring-primary/20" 
                      : isPopular 
                        ? "border-accent/50" 
                        : ""
                  }`}
                >
                  {isPopular && !isCurrentTier && !isTrialTier && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs">
                      Most Popular
                    </Badge>
                  )}
                  {(isCurrentTier || isTrialTier) && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs">
                      {isTrialTier ? "Current Trial" : "Current"}
                    </Badge>
                  )}
                  
                  <CardHeader className="pb-3 pt-5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`p-1.5 rounded-md ${
                        tierKey === "tier_3" ? "bg-yellow-500/20 text-yellow-400" :
                        tierKey === "tier_2" ? "bg-primary/20 text-primary" :
                        tierKey === "tier_1" ? "bg-accent/20 text-accent" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {getTierIcon(tierKey)}
                      </div>
                      <CardTitle className="text-base">{tier.displayName}</CardTitle>
                    </div>
                    <CardDescription>
                      {tier.price === 0 ? (
                        <span className="text-2xl font-bold text-foreground">Free</span>
                      ) : (
                        <>
                          <span className="text-2xl font-bold text-foreground">${tier.price}</span>
                          <span className="text-muted-foreground text-sm">/mo</span>
                        </>
                      )}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col pt-0">
                    <ul className="space-y-2 flex-1 text-xs">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-muted-foreground">
                          <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                            tierKey === "tier_3" ? "text-yellow-400" :
                            tierKey === "tier_2" ? "text-primary" :
                            tierKey === "tier_1" ? "text-accent" :
                            "text-muted-foreground"
                          }`} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <div className="mt-4">
                      {isCurrentTier ? (
                        <Button variant="outline" className="w-full" size="sm" disabled>
                          Current Plan
                        </Button>
                      ) : isTrialTier ? (
                        <Button variant="hero" className="w-full" size="sm">
                          <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                          Subscribe
                        </Button>
                      ) : tierKey === "tier_0" ? (
                        <Button variant="outline" className="w-full" size="sm" disabled>
                          Free Forever
                        </Button>
                      ) : (
                        <Button 
                          variant={tierKey === "tier_3" ? "hero" : "outline"} 
                          className="w-full"
                          size="sm"
                        >
                          {tierKey === "tier_3" ? "Go Elite" : "Upgrade"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* AI Provider Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Model Quality by Tier</CardTitle>
            <CardDescription>Higher tiers get access to more powerful AI models</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Free</p>
                <p className="font-medium text-sm text-foreground">Gemini Flash</p>
                <p className="text-xs text-muted-foreground mt-1">Fast & efficient</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Starter</p>
                <p className="font-medium text-sm text-foreground">GPT-4o</p>
                <p className="text-xs text-muted-foreground mt-1">Balanced quality</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-xs text-primary mb-1">Pro</p>
                <p className="font-medium text-sm text-foreground">Perplexity Pro</p>
                <p className="text-xs text-muted-foreground mt-1">Multi-AI Search</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-xs text-yellow-400 mb-1">Elite</p>
                <p className="font-medium text-sm text-foreground">Perplexity + All</p>
                <p className="text-xs text-muted-foreground mt-1">Deep Research + Reasoning</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What is Perplexity Section */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">What is Perplexity AI?</CardTitle>
                <CardDescription>The power behind Pro & Elite tiers</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Perplexity is an advanced AI platform that <span className="text-foreground font-medium">combines multiple AI models</span> to deliver the most accurate and comprehensive answers. Unlike single-model systems, Perplexity intelligently routes your questions to the best AI for each task.
            </p>
            
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className="p-1.5 rounded-md bg-primary/20">
                  <Globe className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Real-Time Search</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Access current information with web-grounded answers</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className="p-1.5 rounded-md bg-accent/20">
                  <Brain className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Multi-AI Reasoning</p>
                  <p className="text-xs text-muted-foreground mt-0.5">GPT, Gemini, Claude & more working together</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className="p-1.5 rounded-md bg-yellow-500/20">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Deep Research</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Elite tier unlocks advanced reasoning models</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">Pro</Badge>
              <span>sonar-pro model with enhanced citations</span>
              <span className="mx-2">•</span>
              <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-400">Elite</Badge>
              <span>sonar-reasoning-pro + deep-research models</span>
            </div>
          </CardContent>
        </Card>

         {/* Elite University Match Highlight */}
         <Card className="border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 via-transparent to-primary/5">
           <CardHeader>
             <div className="flex items-center gap-3">
               <div className="p-2 rounded-lg bg-yellow-500/20">
                 <GraduationCap className="w-5 h-5 text-yellow-400" />
               </div>
               <div>
                 <CardTitle className="text-lg">University Match</CardTitle>
                 <CardDescription>Exclusive to Elite subscribers</CardDescription>
               </div>
             </div>
           </CardHeader>
           <CardContent className="space-y-4">
             <p className="text-sm text-muted-foreground leading-relaxed">
              Get <span className="text-foreground font-medium">personalized university recommendations</span> based on your academic profile, test scores, and preferences. Our AI analyzes your portfolio to match you with the best-fit universities across the globe.
             </p>
             
             <div className="grid gap-3 sm:grid-cols-3">
               <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                 <div className="p-1.5 rounded-md bg-yellow-500/20">
                   <Brain className="w-4 h-4 text-yellow-400" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-foreground">AI-Powered Matching</p>
                   <p className="text-xs text-muted-foreground mt-0.5">Smart analysis of your academic portfolio</p>
                 </div>
               </div>
               <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                 <div className="p-1.5 rounded-md bg-primary/20">
                   <Globe className="w-4 h-4 text-primary" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-foreground">Global Universities</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Universities worldwide</p>
                 </div>
               </div>
               <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                 <div className="p-1.5 rounded-md bg-accent/20">
                   <Search className="w-4 h-4 text-accent" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-foreground">Scholarship Finder</p>
                   <p className="text-xs text-muted-foreground mt-0.5">Discover funding opportunities</p>
                 </div>
               </div>
             </div>
           </CardContent>
         </Card>
      </div>
    </DashboardLayout>
  );
}

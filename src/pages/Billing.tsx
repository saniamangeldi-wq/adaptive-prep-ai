import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { getTierLimits, getDaysRemaining, TIER_LIMITS, PricingTier } from "@/lib/tier-limits";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Check, 
  Clock, 
  Sparkles, 
  Crown, 
  Zap, 
  CreditCard
} from "lucide-react";

export default function Billing() {
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
                    /{currentTierLimits.creditsPerDay}
                  </span>
                </p>
                <Progress 
                  value={((profile?.credits_remaining || 0) / currentTierLimits.creditsPerDay) * 100} 
                  className="h-1.5 mt-2" 
                />
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Tests Remaining</p>
                <p className="text-xl font-bold text-foreground">
                  {currentTierLimits.testsPerMonth === "unlimited" 
                    ? "Unlimited" 
                    : profile?.tests_remaining || 0
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-2">This month</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">AI Model</p>
                <p className="text-xl font-bold text-foreground">
                  {currentTierLimits.aiModel === "gpt-5.2" ? "GPT-5.2 Reasoning" : 
                   currentTierLimits.aiModel === "gpt-5" ? "GPT-5" : 
                   currentTierLimits.aiModel === "gpt-5-mini" ? "GPT-5 Mini" : 
                   "Gemini Flash"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {currentTierLimits.aiProvider === "openai" ? "OpenAI" : "Google Gemini"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Plans Grid - 4 cards in a row */}
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
                <p className="font-medium text-sm text-foreground">GPT-4o Mini</p>
                <p className="text-xs text-muted-foreground mt-1">Balanced quality</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Pro</p>
                <p className="font-medium text-sm text-foreground">GPT-4o</p>
                <p className="text-xs text-muted-foreground mt-1">Enhanced reasoning</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Elite</p>
                <p className="font-medium text-sm text-foreground">GPT-4o + Voice</p>
                <p className="text-xs text-muted-foreground mt-1">Premium experience</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

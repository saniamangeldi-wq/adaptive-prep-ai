import { useState } from "react";
import { Heart, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function DonationBanner() {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("donation-dismissed") === "true");
  const [purchasing, setPurchasing] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const isElite = profile?.tier === "tier_3";

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("donation-dismissed", "true");
  };

  const handleDonate = async (currency: "usd" | "kzt") => {
    if (!user) {
      // Not logged in — use payment links
      const url = currency === "kzt"
        ? "https://buy.stripe.com/5kQ4gy37Ke249nP58t4wM03"
        : "https://buy.stripe.com/aFadR86jW2jm7fH7gB4wM02";
      window.open(url, "_blank");
      return;
    }

    // Logged in — use checkout with rewards
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-university-payment", {
        body: { currency },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not create checkout session", variant: "destructive" });
    } finally {
      setPurchasing(false);
    }
  };

  if (dismissed) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-lg">
      <div className="relative rounded-2xl border border-border/50 bg-card/95 backdrop-blur-lg p-5 shadow-2xl">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          {isElite ? (
            <Sparkles className="w-5 h-5 text-primary" />
          ) : (
            <Heart className="w-5 h-5 text-primary fill-primary" />
          )}
          <h4 className="font-semibold text-foreground text-sm">
            {isElite ? "Get +3 Bonus AI Credits" : "Unlock University Match"}
          </h4>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          {isElite
            ? "Top up your AI credits instantly — 3 extra credits added to your balance."
            : "Get 10 minutes of full access to University Match — explore matches, scholarships & more."}
        </p>

        <div className="flex gap-3">
          <Button
            variant="hero"
            size="sm"
            className="flex-1 text-xs"
            disabled={purchasing}
            onClick={() => handleDonate("usd")}
          >
            {isElite ? "Buy for $1" : "Unlock for $1"}
          </Button>
          <Button
            variant="hero"
            size="sm"
            className="flex-1 text-xs"
            disabled={purchasing}
            onClick={() => handleDonate("kzt")}
          >
            {isElite ? "Buy for ₸500" : "Unlock for ₸500"}
          </Button>
        </div>
      </div>
    </div>
  );
}

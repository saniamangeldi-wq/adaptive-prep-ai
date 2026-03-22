import { useState } from "react";
import { Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DONATION_LINKS = [
  {
    label: "$1 Donation",
    url: "https://buy.stripe.com/aFadR86jW2jm7fH7gB4wM02",
    accent: "bg-primary hover:bg-primary/90",
  },
  {
    label: "₸500 Donation",
    url: "https://buy.stripe.com/5kQ4gy37Ke249nP58t4wM03",
    accent: "bg-accent hover:bg-accent/90",
  },
];

export function DonationBanner() {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("donation-dismissed") === "true");

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("donation-dismissed", "true");
  };

  if (dismissed) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-lg">
      <div className="relative rounded-2xl border border-border/50 bg-card/95 backdrop-blur-lg p-5 shadow-2xl">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-5 h-5 text-primary fill-primary" />
          <h4 className="font-semibold text-foreground text-sm">
            Support AdaptivePrep
          </h4>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Help us keep building free AI-powered education tools for students everywhere.
        </p>

        <div className="flex gap-3">
          {DONATION_LINKS.map((link) => (
            <Button
              key={link.label}
              variant="hero"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => window.open(link.url, "_blank")}
            >
              {link.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

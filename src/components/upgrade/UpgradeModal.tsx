import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageSquare, FileText, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import type { PaywallVariant } from "@/hooks/useUpgradeModal";

const COPY: Record<PaywallVariant, { icon: typeof Sparkles; title: string; description: string; bullets: string[]; cta: string }> = {
  coach: {
    icon: MessageSquare,
    title: "You're on a streak — keep it going",
    description: "You've used your free AI Coach messages for today. Pro removes the cap so your study session never breaks.",
    bullets: [
      "100 AI Coach messages per day",
      "Listen to responses with voice",
      "Unlimited practice quizzes",
    ],
    cta: "Start 7-day Pro trial",
  },
  tests: {
    icon: FileText,
    title: "See your full weakness breakdown",
    description: "You've completed a practice test. Pro unlocks the detailed analysis plus 9 more official-style tests.",
    bullets: [
      "Section-by-section weakness map",
      "AI study plan based on your mistakes",
      "Unlimited practice tests this month",
    ],
    cta: "Start 7-day Pro trial",
  },
  universities: {
    icon: GraduationCap,
    title: "Compare unlimited universities",
    description: "You've looked at a few schools. Pro lets you compare any university side-by-side with admission odds.",
    bullets: [
      "Unlimited university match results",
      "Side-by-side admission probability",
      "Financial readiness planner",
    ],
    cta: "Start 7-day Pro trial",
  },
};

interface Props {
  open: boolean;
  onClose: () => void;
  variant: PaywallVariant;
}

export function UpgradeModal({ open, onClose, variant }: Props) {
  const copy = COPY[variant];
  const Icon = copy.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-xl text-foreground">{copy.title}</DialogTitle>
          <DialogDescription className="text-muted-foreground pt-1">
            {copy.description}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 py-2">
          {copy.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-foreground">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={onClose} className="sm:flex-1">
            Maybe later
          </Button>
          <Button asChild className="sm:flex-1">
            <Link to="/pricing" onClick={onClose}>
              {copy.cta}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

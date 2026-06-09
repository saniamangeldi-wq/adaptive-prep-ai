import { Sparkles } from "lucide-react";
import { useFoundingMemberCount, FOUNDING_MEMBER_CAP, FOUNDING_PRICE_USD, FOUNDING_PRICE_KZT } from "@/hooks/useFoundingMember";

export function FoundingMemberBanner() {
  const { spotsLeft, isAvailable, loading } = useFoundingMemberCount();

  if (loading || !isAvailable) return null;

  const pct = spotsLeft === null ? 0 : Math.round(((FOUNDING_MEMBER_CAP - spotsLeft) / FOUNDING_MEMBER_CAP) * 100);

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5">
      <div className="flex items-start sm:items-center gap-3 flex-col sm:flex-row sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              Founding Member pricing — Pro for ${FOUNDING_PRICE_USD}/mo (₸{FOUNDING_PRICE_KZT.toLocaleString("ru-RU")}) forever
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              First {FOUNDING_MEMBER_CAP} students lock in this rate. <span className="text-primary font-medium">{spotsLeft} spots left.</span>
            </p>
          </div>
        </div>
      </div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

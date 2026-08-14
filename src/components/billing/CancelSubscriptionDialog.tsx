import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

const REASONS: { value: string; label: string }[] = [
  { value: "too_expensive", label: "It's too expensive" },
  { value: "not_using", label: "I'm not using it enough" },
  { value: "missing_features", label: "Missing features I need" },
  { value: "found_alternative", label: "I found another platform" },
  { value: "finished_prep", label: "I finished my SAT prep" },
  { value: "technical_issues", label: "Technical problems or bugs" },
  { value: "other", label: "Other" },
];

interface Props {
  trigger?: React.ReactNode;
}

export function CancelSubscriptionDialog({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"reason" | "done">("reason");
  const [reason, setReason] = useState<string>("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [accessUntil, setAccessUntil] = useState<string | null>(null);
  const [needsReview, setNeedsReview] = useState(false);

  const reset = () => {
    setStep("reason");
    setReason("");
    setFeedback("");
    setAccessUntil(null);
    setNeedsReview(false);
  };

  const submit = async () => {
    if (!reason) {
      toast.error("Please pick a reason so we know what to fix.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
        body: { reason, feedback: feedback.trim() || null },
      });
      if (error) throw error;
      setAccessUntil((data as any)?.access_until ?? null);
      setNeedsReview(Boolean((data as any)?.needs_manual_review));
      setStep("done");
    } catch (e) {
      toast.error(
        e instanceof Error
          ? `Couldn't cancel automatically: ${e.message}. Email hello@adaptiveprep.org and we'll do it for you.`
          : "Something went wrong. Email hello@adaptiveprep.org and we'll cancel it for you."
      );
    } finally {
      setLoading(false);
    }
  };

  const untilLabel = accessUntil
    ? new Date(accessUntil).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            Cancel subscription
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {step === "reason" ? (
          <>
            <DialogHeader>
              <DialogTitle>Cancel your subscription</DialogTitle>
              <DialogDescription>
                Auto-renewal stops immediately and you keep access until the end of the period you've
                already paid for. Your progress and history stay saved.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">No refunds.</span> Payments already made are
              final and non-refundable, including for partial periods. You will not be charged again, and
              unused time is not refunded or prorated.
            </div>


            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Why are you cancelling?</Label>
                <RadioGroup value={reason} onValueChange={setReason} className="space-y-1.5">
                  {REASONS.map((r) => (
                    <div key={r.value} className="flex items-center gap-2">
                      <RadioGroupItem value={r.value} id={`cancel-reason-${r.value}`} />
                      <Label
                        htmlFor={`cancel-reason-${r.value}`}
                        className="text-sm font-normal text-muted-foreground cursor-pointer"
                      >
                        {r.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancel-feedback" className="text-sm font-medium">
                  Tell us more <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="cancel-feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What could we have done better?"
                  rows={4}
                  maxLength={2000}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                Keep my plan
              </Button>
              <Button variant="destructive" onClick={submit} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm cancellation
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                Subscription cancelled
              </DialogTitle>
              <DialogDescription>
                {needsReview
                  ? "We've recorded your cancellation and sent you a confirmation email. If any charge appears after this, email hello@adaptiveprep.org and we'll refund it."
                  : untilLabel
                    ? `You won't be charged again. You keep full access until ${untilLabel}.`
                    : "You won't be charged again. You keep access for the rest of your paid period."}
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Thanks for the feedback — it goes straight to the team. You can resubscribe any time from
              this page.
            </p>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

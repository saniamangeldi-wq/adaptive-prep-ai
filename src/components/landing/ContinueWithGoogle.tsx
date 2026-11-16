import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";
import { GoogleIcon } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

/** Starts Google sign-in (same call as the Login and Signup pages) and lands on the chat. */
export function ContinueWithGoogle({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/dashboard",
      });
      if (result?.error) throw result.error;
    } catch (error: any) {
      toast.error(error?.message || "Failed to sign in with Google");
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-3 rounded-xl bg-primary pl-2 pr-5 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70",
        className,
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
        {busy ? <Loader2 className="h-4 w-4 animate-spin text-[#0A756C]" aria-hidden="true" /> : <GoogleIcon className="h-[18px] w-[18px]" />}
      </span>
      Continue with Google
    </button>
  );
}

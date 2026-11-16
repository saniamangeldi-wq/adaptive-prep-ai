import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageSeo } from "@/components/seo/PageSeo";
import { AuthShell } from "@/components/landing/AuthShell";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSent(true);
      toast.success("Password reset link sent! Check your email.");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle={sent ? "Check your email for a reset link." : "Enter your email and we will send you a link to set a new password."}
    >
      <PageSeo
        title="Forgot password — AdaptivePrep"
        description="Reset your AdaptivePrep account password. Enter your email to receive a secure password reset link."
        path="/forgot-password"
      />
      <div className="space-y-6">
        {sent ? (
          <div className="space-y-4">
            <p className="rounded-xl border border-border bg-card p-4 text-[15px] leading-6 text-foreground">
              We sent a reset link to <span className="font-medium">{email}</span>. Open it to set a new password. If it
              is not in your inbox, check the spam folder.
            </p>
            <Button variant="outline" onClick={() => setSent(false)} className="h-11 rounded-xl">
              Use a different email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="h-12 text-base"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button type="submit" variant="hero" className="h-12 w-full rounded-xl text-[15px]" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send reset link"
              )}
            </Button>
          </form>
        )}

        <Link to="/login" className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to log in
        </Link>
      </div>
    </AuthShell>
  );
}

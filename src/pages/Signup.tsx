import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { PageSeo } from "@/components/seo/PageSeo";
import { AuthShell, GoogleAuthButton, OrDivider } from "@/components/landing/AuthShell";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignup = async () => {
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/dashboard",
      });

      if (result?.error) throw result.error;
    } catch (error: any) {
      toast.error(error.message || "Failed to sign up with Google");
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          // The database trigger (handle_new_user) builds the profile row from this.
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Check if this is an existing user (identities will be empty for duplicate signup)
        const isExistingUser = data.user.identities?.length === 0;

        if (isExistingUser) {
          toast.error("An account with this email already exists. Please log in.");
          navigate("/login");
          return;
        }

        toast.success("Account created! Check your email to confirm.");

        // Fire-and-forget: baseline student role record. Does not block navigation.
        supabase.rpc("assign_self_student_role").then(({ error }) => {
          if (error) console.error("Role insert error:", error);
        });

        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Check your IELTS Writing and see where your estimated band comes from."
    >
      <PageSeo
        title="Create your AdaptivePrep account"
        description="Sign up for AdaptivePrep to check your IELTS Writing against the four public criteria and get an estimated band."
        path="/signup"
      />
      <div className="space-y-6">
        <GoogleAuthButton onClick={handleGoogleSignup} />
        <OrDivider />

        <form onSubmit={handleEmailSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Your name</Label>
            <Input
              id="fullName"
              type="text"
              autoComplete="name"
              className="h-12 text-base"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="h-12 pr-12 text-base"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                aria-describedby="password-hint"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p id="password-hint" className="text-xs text-muted-foreground">At least 6 characters.</p>
          </div>

          <Button type="submit" variant="outline" className="h-12 w-full rounded-xl text-[15px] font-semibold" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating account…
              </>
            ) : (
              "Sign up with email"
            )}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>

        <p className="text-xs text-muted-foreground">
          By signing up, you agree to our{" "}
          <Link to="/terms" className="text-primary underline-offset-4 hover:underline">Terms</Link>.
        </p>
      </div>
    </AuthShell>
  );
}

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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        toast.success("Welcome back!");

        // Fire-and-forget: make sure the baseline student role record exists.
        supabase.rpc("assign_self_student_role").then(({ error }) => {
          if (error) console.error("Error ensuring role in user_roles:", error);
        });

        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/dashboard",
      });

      if (result?.error) throw result.error;
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in with Google");
    }
  };

  return (
    <AuthShell title="Log in" subtitle="Pick up where you left off with your IELTS Writing.">
      <PageSeo
        title="Sign in to AdaptivePrep"
        description="Log in to AdaptivePrep to check your IELTS Writing and chat with your writing coach."
        path="/login"
      />
      <div className="space-y-6">
        <GoogleAuthButton onClick={handleGoogleLogin} />
        <OrDivider />

        <form onSubmit={handleEmailLogin} className="space-y-4">
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
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-sm text-primary underline-offset-4 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="h-12 pr-12 text-base"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
          </div>

          <Button type="submit" variant="outline" className="h-12 w-full rounded-xl text-[15px] font-semibold" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Logging in…
              </>
            ) : (
              "Log in with email"
            )}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground">
          New to AdaptivePrep?{" "}
          <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

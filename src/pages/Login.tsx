import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Mail, Lock, Eye, EyeOff, Loader2, User, Users, School, BookOpen, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type UserRole = "student" | "tutor" | "teacher" | "school_admin";

const roles = [
  { id: "student" as const, label: "Student", icon: BookOpen, description: "Practice & learn" },
  { id: "tutor" as const, label: "Tutor", icon: User, description: "Manage students" },
  { id: "teacher" as const, label: "Teacher", icon: Users, description: "Classroom view" },
  { id: "school_admin" as const, label: "School Admin", icon: School, description: "School dashboard" },
];

export default function Login() {
  const [step, setStep] = useState<"credentials" | "role">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
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
        // Fetch user's roles
        const { data: rolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);

        if (rolesError) {
          console.error("Error fetching roles:", rolesError);
          toast.success("Welcome back!");
          navigate("/dashboard");
          return;
        }

        const availableRoles = rolesData?.map(r => r.role as UserRole) || [];

        if (availableRoles.length === 0) {
          // No roles found, default to student
          toast.success("Welcome back!");
          navigate("/dashboard");
        } else if (availableRoles.length === 1) {
          // Only one role, use it directly
          await updateActiveRole(data.user.id, availableRoles[0]);
          toast.success("Welcome back!");
          navigate("/dashboard");
        } else {
          // Multiple roles, show role selection
          setUserRoles(availableRoles);
          setSelectedRole(availableRoles[0]);
          setStep("role");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const updateActiveRole = async (userId: string, role: UserRole) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating active role:", error);
    }
  };

  const handleRoleSelection = async () => {
    if (!selectedRole) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await updateActiveRole(user.id, selectedRole);
        toast.success(`Signed in as ${selectedRole.replace("_", " ")}`);
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error("Failed to set role");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in with Google");
    }
  };

  return (
    <div className="min-h-screen flex dark">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center">
            <Link to="/" className="inline-flex items-center gap-2 mb-8">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold text-foreground">AdaptivePrep</span>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">
              {step === "credentials" ? "Welcome back" : "Choose your role"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {step === "credentials" 
                ? "Sign in to continue your SAT prep journey" 
                : "You have multiple roles. Select one to continue."}
            </p>
          </div>

          {step === "credentials" ? (
            <>
              {/* Google Sign In */}
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={handleGoogleLogin}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                </div>
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10 h-12"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10 h-12"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded border-border" />
                    <span className="text-muted-foreground">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  className="w-full h-12"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline font-medium">
                  Sign up for free
                </Link>
              </p>
            </>
          ) : (
            /* Role Selection */
            <div className="space-y-6">
              <div className="space-y-3">
                {roles
                  .filter(role => userRoles.includes(role.id))
                  .map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      className={cn(
                        "w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-4",
                        selectedRole === role.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center",
                        selectedRole === role.id 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        <role.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{role.label}</h3>
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                      </div>
                      <ChevronRight className={cn(
                        "w-5 h-5 transition-colors",
                        selectedRole === role.id ? "text-primary" : "text-muted-foreground"
                      )} />
                    </button>
                  ))}
              </div>

              <Button
                variant="hero"
                className="w-full h-12"
                onClick={handleRoleSelection}
                disabled={loading || !selectedRole}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Continuing...
                  </>
                ) : (
                  <>
                    Continue as {selectedRole?.replace("_", " ")}
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </>
                )}
              </Button>

              <button
                onClick={() => setStep("credentials")}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to login
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Image/Gradient */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/20 via-background to-accent/10 items-center justify-center p-12">
        <div className="max-w-md text-center space-y-6">
          <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center animate-float">
            <GraduationCap className="w-12 h-12 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Start learning smarter</h2>
          <p className="text-muted-foreground">
            Join thousands of students using AI-powered adaptive learning to ace their SAT.
          </p>
        </div>
      </div>
    </div>
  );
}

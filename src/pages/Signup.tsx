import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Mail, Lock, Eye, EyeOff, Loader2, User, Users, School, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type UserRole = "student" | "tutor" | "teacher" | "school_admin";

const roles = [
  { id: "student" as const, label: "Student", icon: BookOpen, description: "Preparing for the SAT" },
  { id: "tutor" as const, label: "Tutor", icon: User, description: "Helping students succeed" },
  { id: "teacher" as const, label: "Teacher", icon: Users, description: "Teaching at a school" },
  { id: "school_admin" as const, label: "School Admin", icon: School, description: "Managing a school" },
];

export default function Signup() {
  const [step, setStep] = useState<"role" | "details">("role");
  const [selectedRole, setSelectedRole] = useState<UserRole>("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/onboarding`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
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
          data: {
            full_name: fullName,
            role: selectedRole,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Check if this is an existing user (identities will be empty for duplicate signup)
        const isExistingUser = data.user.identities?.length === 0;

        if (isExistingUser) {
          // User already exists - try to sign them in and add the new role
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            // Wrong password or other auth error
            toast.error("An account with this email already exists. Please log in to add a new role.");
            navigate("/login");
            return;
          }

          if (signInData.user) {
            // Check if they already have this role
            const { data: existingRoles } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", signInData.user.id);

            const hasRole = existingRoles?.some(r => r.role === selectedRole);

            if (hasRole) {
              toast.info(`You already have the ${selectedRole.replace("_", " ")} role!`);
              navigate("/dashboard");
              return;
            }

            // Add the new role to existing account
            const { error: roleError } = await supabase
              .from("user_roles")
              .insert({
                user_id: signInData.user.id,
                role: selectedRole,
              });

            if (roleError) {
              console.error("Role insert error:", roleError);
              toast.error("Failed to add new role. Please try again.");
              return;
            }

            // Update primary role in profile if needed
            const { error: profileError } = await supabase
              .from("profiles")
              .update({ role: selectedRole })
              .eq("user_id", signInData.user.id);

            if (profileError) {
              console.error("Profile update error:", profileError);
            }

            toast.success(`${selectedRole.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())} role added to your account!`);
            navigate("/dashboard");
          }
        } else {
          // New user - proceed with normal signup
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ 
              role: selectedRole,
              full_name: fullName 
            })
            .eq("user_id", data.user.id);

          if (profileError) {
            console.error("Profile update error:", profileError);
          }

          // Add to user_roles table
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({
              user_id: data.user.id,
              role: selectedRole,
            });

          if (roleError) {
            console.error("Role insert error:", roleError);
          }

          toast.success("Account created! Check your email to confirm.");
          navigate("/onboarding");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex dark text-foreground">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background overflow-y-auto">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center">
            <Link to="/" className="inline-flex items-center gap-2 mb-8">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold text-foreground">AdaptivePrep</span>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
            <p className="text-muted-foreground mt-2">
              {step === "role" ? "First, tell us who you are" : "Complete your registration"}
            </p>
          </div>

          {step === "role" ? (
            /* Role Selection */
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all duration-200",
                      selectedRole === role.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <role.icon className={cn(
                      "w-6 h-6 mb-2",
                      selectedRole === role.id ? "text-primary" : "text-muted-foreground"
                    )} />
                    <h3 className="font-semibold text-foreground">{role.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{role.description}</p>
                  </button>
                ))}
              </div>

              <Button
                variant="hero"
                className="w-full h-12"
                onClick={() => setStep("details")}
              >
                Continue
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          ) : (
            /* Account Details */
            <div className="space-y-6">
              <button
                onClick={() => setStep("role")}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                ← Back to role selection
              </button>

              {/* Google Sign Up */}
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={handleGoogleSignup}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
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
              <form onSubmit={handleEmailSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      className="pl-10 h-12"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>

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
                      minLength={6}
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

                <Button
                  type="submit"
                  variant="hero"
                  className="w-full h-12"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    `Sign up as ${roles.find(r => r.id === selectedRole)?.label}`
                  )}
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground">
                By signing up, you agree to our{" "}
                <Link to="/terms" className="text-primary hover:underline">Terms</Link>
                {" "}and{" "}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </p>
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
          <h2 className="text-3xl font-bold text-foreground">Join AdaptivePrep</h2>
          <p className="text-muted-foreground">
            {selectedRole === "student" && "Personalized SAT prep that adapts to how you learn best."}
            {selectedRole === "tutor" && "Powerful tools to track and boost your students' progress."}
            {selectedRole === "teacher" && "Streamlined classroom management with AI-powered insights."}
            {selectedRole === "school_admin" && "Comprehensive analytics and team management for your school."}
          </p>
        </div>
      </div>
    </div>
  );
}

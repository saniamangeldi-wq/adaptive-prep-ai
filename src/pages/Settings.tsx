import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import { 
  User, 
  Mail, 
  Shield,
  LogOut,
  Save,
  Bell,
  Moon,
  Globe,
  Sparkles,
  Check,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { getTierLimits, getDaysRemaining, TIER_LIMITS, PricingTier } from "@/lib/tier-limits";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const { user, profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const isDarkMode = theme === "dark";

  const handleSaveProfile = async () => {
    if (!profile?.user_id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("user_id", profile.user_id);

      if (error) throw error;
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to log out");
      setLoggingOut(false);
    }
  };

  const getRoleBadge = () => {
    switch (profile?.role) {
      case "school_admin":
        return "School Admin";
      case "teacher":
        return "Teacher";
      case "tutor":
        return "Tutor";
      default:
        return "Student";
    }
  };

  const getTierBadge = () => {
    const tierLimits = getTierLimits(profile?.tier as PricingTier);
    if (profile?.is_trial) return "Pro Trial";
    return tierLimits.displayName;
  };

  const isTrialUser = profile?.is_trial && profile?.trial_ends_at;
  const daysRemaining = isTrialUser ? getDaysRemaining(profile.trial_ends_at) : 0;
  const currentTierLimits = getTierLimits(profile?.tier as PricingTier);

  const pricingTiers: PricingTier[] = ["tier_0", "tier_1", "tier_2", "tier_3"];

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and preferences
          </p>
        </div>

        {/* Profile Section */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Profile Information</h3>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-foreground">Email</Label>
              <div className="flex items-center gap-2 mt-1.5 p-3 rounded-lg bg-muted/50 border border-border">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{user?.email}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed
              </p>
            </div>

            <Button
              variant="hero"
              onClick={handleSaveProfile}
              disabled={saving || fullName === profile?.full_name}
            >
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Account Info */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Account</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <span className="text-muted-foreground">Role</span>
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
                {getRoleBadge()}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <span className="text-muted-foreground">Plan</span>
              <span className="px-3 py-1 rounded-full bg-accent/20 text-accent text-sm font-medium">
                {getTierBadge()}
              </span>
            </div>

            {profile?.role === "student" && (
              <>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <span className="text-muted-foreground">AI Credits</span>
                  <span className="font-medium text-foreground">
                    {profile.credits_remaining} remaining
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <span className="text-muted-foreground">Tests Remaining</span>
                  <span className="font-medium text-foreground">
                    {profile.tests_remaining} this month
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Pricing Plans - for students */}
        {profile?.role === "student" && (
          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-semibold text-foreground">Plans & Billing</h3>
                {isTrialUser && daysRemaining > 0 && (
                  <p className="text-xs text-yellow-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    Trial ends in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {pricingTiers.map((tierKey) => {
                const tier = TIER_LIMITS[tierKey];
                const isCurrentTier = profile?.tier === tierKey && !profile?.is_trial;
                const isTrialTier = profile?.is_trial && tierKey === "tier_2";

                return (
                  <Card 
                    key={tierKey} 
                    className={`relative ${isCurrentTier || isTrialTier ? "border-primary ring-1 ring-primary" : ""}`}
                  >
                    {(isCurrentTier || isTrialTier) && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                        {isTrialTier ? "Current (Trial)" : "Current"}
                      </Badge>
                    )}
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{tier.displayName}</CardTitle>
                      <CardDescription>
                        {tier.price === 0 ? (
                          <span className="text-2xl font-bold text-foreground">Free</span>
                        ) : (
                          <>
                            <span className="text-2xl font-bold text-foreground">${tier.price}</span>
                            <span className="text-muted-foreground">/mo</span>
                          </>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <ul className="space-y-1.5 text-xs">
                        {tier.features.slice(0, 4).map((feature, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-muted-foreground">
                            <Check className="w-3 h-3 text-primary flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      {!isCurrentTier && !isTrialTier && tierKey !== "tier_0" && (
                        <Button 
                          variant={tierKey === "tier_3" ? "hero" : "outline"} 
                          size="sm" 
                          className="w-full mt-3"
                        >
                          Upgrade
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Preferences */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Preferences</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">Email Notifications</span>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <Moon className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">Dark Mode</span>
              </div>
              <Switch
                checked={isDarkMode}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="p-6 rounded-2xl bg-card border border-destructive/30">
          <div className="flex items-center gap-3 mb-4">
            <LogOut className="w-5 h-5 text-destructive" />
            <h3 className="font-semibold text-foreground">Sign Out</h3>
          </div>
          <p className="text-muted-foreground mb-4">
            Sign out of your account on this device
          </p>
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

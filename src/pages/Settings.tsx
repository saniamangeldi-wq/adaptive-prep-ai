import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { 
  User, 
  Mail, 
  Shield,
  LogOut,
  Save,
  Bell,
  Moon,
  Globe,
  Languages,
  Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { getTierLimits, PricingTier } from "@/lib/tier-limits";
import { SchoolSettingsSection } from "@/components/settings/SchoolSettingsSection";

export default function Settings() {
  const { user, profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState(profile?.preferred_language || "en");

  // Preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const isDarkMode = theme === "dark";

  const LANGUAGES = [
    { value: "en", label: "English", flag: "🇺🇸" },
    { value: "kk", label: "Қазақша", flag: "🇰🇿" },
    { value: "ru", label: "Русский", flag: "🇷🇺" },
  ];

  const handleLanguageChange = (lang: string) => {
    setPreferredLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const handleSaveProfile = async () => {
    if (!profile?.user_id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, preferred_language: preferredLanguage })
        .eq("user_id", profile.user_id);

      if (error) throw error;
      toast.success(t("settings.profileUpdated"));
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(t("settings.profileError"));
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
      toast.error(t("settings.logoutError"));
      setLoggingOut(false);
    }
  };

  const getRoleBadge = () => {
    switch (profile?.role) {
      case "school_admin":
        return t("roles.schoolAdmin");
      case "teacher":
        return t("roles.teacher");
      case "tutor":
        return t("roles.tutor");
      default:
        return t("roles.student");
    }
  };

  const getTierBadge = () => {
    if (profile?.is_trial) return "Pro Trial";
    if (profile?.role === "tutor") {
      return profile?.tier === "tier_3" ? "Tutor Business" : profile?.tier === "tier_2" ? "Professional" : "Solo Tutor";
    }
    const tierLimits = getTierLimits(profile?.tier as PricingTier);
    return tierLimits.displayName;
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("settings.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("settings.subtitle")}
          </p>
        </div>

        {/* School Settings - Only for School Admins */}
        {profile?.role === "school_admin" && <SchoolSettingsSection />}

        {/* Profile Section */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">{t("settings.profileInfo")}</h3>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName" className="text-foreground">{t("settings.fullName")}</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("settings.fullNamePlaceholder")}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-foreground">{t("settings.email")}</Label>
              <div className="flex items-center gap-2 mt-1.5 p-3 rounded-lg bg-muted/50 border border-border">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{user?.email}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("settings.emailNoChange")}
              </p>
            </div>

            <Button
              variant="hero"
              onClick={handleSaveProfile}
              disabled={saving || (fullName === profile?.full_name && preferredLanguage === (profile?.preferred_language || "en"))}
            >
              {saving ? (
                t("settings.saving")
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t("settings.saveChanges")}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Account Info */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">{t("settings.account")}</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <span className="text-muted-foreground">{t("settings.role")}</span>
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
                {getRoleBadge()}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <span className="text-muted-foreground">{t("settings.plan")}</span>
              <span className="px-3 py-1 rounded-full bg-accent/20 text-accent text-sm font-medium">
                {getTierBadge()}
              </span>
            </div>

            {profile?.role === "student" && (
              <>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <span className="text-muted-foreground">{t("settings.aiCredits")}</span>
                  <span className="font-medium text-foreground">
                    {profile.credits_remaining} {t("settings.remaining")}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <span className="text-muted-foreground">{t("settings.testsRemaining")}</span>
                  <span className="font-medium text-foreground">
                    {profile.tests_remaining} {t("settings.thisMonth")}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Preferences */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">{t("settings.preferences")}</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{t("settings.emailNotifications")}</span>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <Moon className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{t("settings.darkMode")}</span>
              </div>
              <Switch
                checked={isDarkMode}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <Languages className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{t("settings.language")}</span>
              </div>
              <Select value={preferredLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Learning Style Assessment */}
        {profile?.role === "student" && (
          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <div className="flex items-center gap-3 mb-6">
              <Brain className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Learning Style Assessment</h3>
            </div>
            <div className="space-y-4">
              {profile?.vak_primary_style && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <span className="text-muted-foreground">Current Style</span>
                  <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium capitalize">
                    {profile.vak_primary_style}
                  </span>
                </div>
              )}
              {profile?.vak_last_taken_at && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <span className="text-muted-foreground">Last taken</span>
                  <span className="text-foreground text-sm">
                    {new Date(profile.vak_last_taken_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              {(() => {
                const lastTaken = profile?.vak_last_taken_at;
                const canRetake = !lastTaken || (Date.now() - new Date(lastTaken).getTime()) > 7 * 24 * 60 * 60 * 1000;
                const nextDate = lastTaken ? new Date(new Date(lastTaken).getTime() + 7 * 24 * 60 * 60 * 1000) : null;
                return (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Retake the assessment weekly so the AI adapts to your evolving learning style.
                    </p>
                    <Button
                      variant="hero"
                      onClick={() => navigate("/onboarding?retake=vak")}
                      disabled={!canRetake}
                    >
                      <Brain className="w-4 h-4" />
                      {canRetake ? "Retake Assessment" : `Available ${nextDate?.toLocaleDateString()}`}
                    </Button>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Logout */}
        <div className="p-6 rounded-2xl bg-card border border-destructive/30">
          <div className="flex items-center gap-3 mb-4">
            <LogOut className="w-5 h-5 text-destructive" />
            <h3 className="font-semibold text-foreground">{t("settings.signOut")}</h3>
          </div>
          <p className="text-muted-foreground mb-4">
            {t("settings.signOutDesc")}
          </p>
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? t("settings.signingOut") : t("settings.signOut")}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

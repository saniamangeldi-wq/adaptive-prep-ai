import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { User, Mail, Save, Languages, Lock, LogOut } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PageSeo } from "@/components/seo/PageSeo";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ru", label: "Русский" },
  { value: "kk", label: "Қазақша" },
];

const MIN_PASSWORD_LENGTH = 6;

export default function Settings() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState(profile?.preferred_language || "en");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || "");
  }, [profile?.full_name]);

  useEffect(() => {
    setPreferredLanguage(profile?.preferred_language || "en");
  }, [profile?.preferred_language]);

  const handleLanguageChange = async (lang: string) => {
    setPreferredLanguage(lang);

    if (profile?.user_id) {
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ preferred_language: lang })
          .eq("user_id", profile.user_id);

        if (error) throw error;

        updateProfile({ preferred_language: lang });
        toast.success("Language updated");
      } catch (error) {
        console.error("Error saving language:", error);
        setPreferredLanguage(profile.preferred_language || "en");
        toast.error(t("settings.profileError"));
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!profile?.user_id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("user_id", profile.user_id);

      if (error) throw error;
      updateProfile({ full_name: fullName });
      toast.success(t("settings.profileUpdated"));
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(t("settings.profileError"));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error(t("settings.passwordTooShort", { count: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("settings.passwordMismatch"));
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("settings.passwordUpdated"));
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error?.message || t("settings.passwordError"));
    } finally {
      setChangingPassword(false);
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

  return (
    <DashboardLayout>
      <PageSeo
        title="Account Settings | AdaptivePrep"
        description="Update your name, language and password on AdaptivePrep."
        path="/dashboard/settings"
      />
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("settings.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("settings.subtitle")}</p>
        </div>

        {/* Profile */}
        <div className="p-4 sm:p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">{t("settings.profileInfo")}</h2>
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
              <div className="flex items-center gap-2 mt-1.5 p-3 rounded-lg bg-muted/50 border border-border min-w-0">
                <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-foreground truncate">{user?.email}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t("settings.emailNoChange")}</p>
            </div>

            <Button
              variant="hero"
              onClick={handleSaveProfile}
              disabled={saving || fullName === (profile?.full_name || "")}
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

        {/* Language */}
        <div className="p-4 sm:p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <Languages className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">{t("settings.language")}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t("settings.languageDesc")}</p>
          <Select value={preferredLanguage} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-full sm:w-[220px]" aria-label={t("settings.language")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Change password */}
        <div className="p-4 sm:p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">{t("settings.changePassword")}</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="newPassword" className="text-foreground">{t("settings.newPassword")}</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1.5"
                minLength={MIN_PASSWORD_LENGTH}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-foreground">{t("settings.confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5"
                minLength={MIN_PASSWORD_LENGTH}
              />
            </div>
            <Button type="submit" variant="hero" disabled={changingPassword || !newPassword || !confirmPassword}>
              {changingPassword ? t("settings.saving") : t("settings.updatePassword")}
            </Button>
          </form>
        </div>

        {/* Sign out */}
        <div className="p-4 sm:p-6 rounded-2xl bg-card border border-destructive/30">
          <div className="flex items-center gap-3 mb-4">
            <LogOut className="w-5 h-5 text-destructive" />
            <h2 className="font-semibold text-foreground">{t("settings.signOut")}</h2>
          </div>
          <p className="text-muted-foreground mb-4">{t("settings.signOutDesc")}</p>
          <Button variant="destructive" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? t("settings.signingOut") : t("settings.signOut")}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

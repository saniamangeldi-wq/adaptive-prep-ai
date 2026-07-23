import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const languages = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "kk", label: "KK" },
];

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const { profile, updateProfile } = useAuth();
  const current = (i18n.language || "en").slice(0, 2);

  const handleChange = async (code: string) => {
    await i18n.changeLanguage(code);
    if (profile?.user_id) {
      try {
        await supabase
          .from("profiles")
          .update({ preferred_language: code })
          .eq("user_id", profile.user_id);
        updateProfile({ preferred_language: code });
      } catch (e) {
        console.error("Error saving language:", e);
      }
    }
  };

  return (
    <div className={`flex gap-1 items-center ${className}`}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleChange(lang.code)}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            current === lang.code
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label={`Switch language to ${lang.label}`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}

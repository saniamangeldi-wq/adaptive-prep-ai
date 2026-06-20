import { useTranslation } from "react-i18next";

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
  const current = (i18n.language || "en").slice(0, 2);

  return (
    <div className={`flex gap-1 items-center ${className}`}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
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

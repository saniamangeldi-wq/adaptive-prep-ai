import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function Navbar() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { href: "/#how", label: t("home.nav_how") },
    { href: "/#tutors", label: t("home.nav_tutors") },
    { href: "/#pricing", label: t("home.nav_pricing") },
    { href: "/#faq", label: t("home.nav_faq") },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/95">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4" aria-label="Main">
        <Link to="/" className="font-display text-xl font-semibold tracking-tight">
          AdaptivePrep
        </Link>

        <div className="hidden md:flex items-center gap-7 text-sm">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <LanguageSwitcher />
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">{t("home.sign_in")}</Link>
          </Button>
          <Button variant="hero" size="sm" asChild>
            <Link to="/signup">{t("home.cta_start")}</Link>
          </Button>
        </div>

        <button
          className="md:hidden -mr-2 p-2"
          onClick={() => setIsOpen((o) => !o)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {isOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="mx-auto max-w-6xl px-4 py-3">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="block py-3 border-b border-border" onClick={() => setIsOpen(false)}>
                {l.label}
              </a>
            ))}
            <div className="flex items-center justify-between gap-3 pt-4 pb-2">
              <LanguageSwitcher />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">{t("home.sign_in")}</Link>
                </Button>
                <Button variant="hero" size="sm" asChild>
                  <Link to="/signup">{t("home.cta_start")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

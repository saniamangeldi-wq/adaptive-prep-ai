import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const CONTACT_EMAIL = "hello@adaptiveprep.org";

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-12 grid gap-8 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <div className="font-display text-lg font-semibold">AdaptivePrep</div>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">{t("home.footer_tagline")}</p>
        </div>
        <ul className="space-y-2 text-sm">
          <li><a href="/#how" className="hover:underline">{t("home.nav_how")}</a></li>
          <li><a href="/#pricing" className="hover:underline">{t("home.nav_pricing")}</a></li>
          <li><Link to="/digital-sat-score-calculator" className="hover:underline">{t("home.footer_calculator")}</Link></li>
        </ul>
        <ul className="space-y-2 text-sm">
          <li><Link to="/login" className="hover:underline">{t("home.sign_in")}</Link></li>
          <li><Link to="/terms" className="hover:underline">Terms</Link></li>
          <li><a href={`mailto:${CONTACT_EMAIL}`} className="hover:underline">{t("home.footer_contact")}: {CONTACT_EMAIL}</a></li>
        </ul>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground flex flex-col gap-2 sm:flex-row sm:justify-between">
          <span>© {year} AdaptivePrep</span>
          <span className="max-w-xl">{t("home.footer_legal")}</span>
        </div>
      </div>
    </footer>
  );
}

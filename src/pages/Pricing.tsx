import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Pricing as PricingSection } from "@/components/landing/Pricing";
import { PageSeo } from "@/components/seo/PageSeo";

export default function PricingPage() {
  const { t } = useTranslation();
  return (
    <div className="paper min-h-screen">
      <PageSeo
        title="Pricing · AdaptivePrep"
        description="Free plan, Pro at ₸4,990 ($10) a month, and a Tutor plan for tutors running SAT groups. Every new account starts with a 7-day Pro trial."
        path="/pricing"
      />
      <Navbar />
      <main className="pt-16">
        <PricingSection headingLevel="h1" headingText={t("home.pricing_title")} />
      </main>
      <Footer />
    </div>
  );
}

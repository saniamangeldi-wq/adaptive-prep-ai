import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Pricing as PricingSection } from "@/components/landing/Pricing";
import { FoundingMemberBanner } from "@/components/upgrade/FoundingMemberBanner";
import { PageSeo } from "@/components/seo/PageSeo";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background dark">
      <PageSeo
        title="Pricing — AdaptivePrep AI SAT Tutor"
        description="Simple AI SAT prep pricing. Free forever plan, Pro from $10/mo, Elite with unlimited tests. First 100 students lock in $5/mo Pro forever."
        path="/pricing"
      />
      <Navbar />
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <FoundingMemberBanner />
        </div>
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}

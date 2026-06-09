import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";
import { DonationBanner } from "@/components/landing/DonationBanner";
import { PageSeo } from "@/components/seo/PageSeo";

const Index = () => {
  return (
    <div className="min-h-screen bg-background dark">
      <PageSeo
        title="AdaptivePrep — Your AI SAT Study Partner"
        description="AI-powered SAT prep with adaptive practice tests, an AI coach, smart flashcards, and university match. Built for ambitious high-school students."
        path="/"
      />
      <Navbar />
      <main>
        <Hero />
        <section id="features">
          <Features />
        </section>
        <section id="pricing">
          <Pricing />
        </section>
      </main>
      <Footer />
      <DonationBanner />
    </div>
  );
};

export default Index;

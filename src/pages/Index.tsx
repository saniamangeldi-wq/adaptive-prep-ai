import { PageSeo } from "@/components/seo/PageSeo";
import { Pricing } from "@/components/landing/Pricing";
import { LandingFooter, LandingHeader } from "@/components/landing/LandingChrome";
import { AskWhy, ClosingCall, Faq, Hero, HowItWorks, WhatYouGet } from "@/components/landing/LandingSections";

const Index = () => {
  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <PageSeo
        title="AdaptivePrep — IELTS Writing checker"
        description="Check your IELTS Writing against the four public criteria. Get an estimated band and feedback on your own sentences in English, Russian or Kazakh."
        path="/"
      />
      <LandingHeader />
      <main className="flex-1">
        <Hero />
        <AskWhy />
        <WhatYouGet />
        <HowItWorks />
        {/* Pricing renders its own <section id="pricing">. */}
        <Pricing />
        <Faq />
        <ClosingCall />
      </main>
      <LandingFooter />
    </div>
  );
};

export default Index;

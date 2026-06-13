import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { PageSeo } from "@/components/seo/PageSeo";
import { Calculator, BookOpen, FileText, ArrowRight, Check } from "lucide-react";

const SITE_URL = "https://adaptiveprep.org";
const PATH = "/digital-sat-question-bank";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Digital SAT Question Bank — 1000+ Practice Questions",
  url: `${SITE_URL}${PATH}`,
  description:
    "Free Digital SAT question bank with 1000+ adaptive Math and Reading & Writing practice questions, plus full-length Bluebook-style tests.",
  isPartOf: {
    "@type": "WebSite",
    name: "AdaptivePrep",
    url: SITE_URL,
  },
  about: {
    "@type": "Thing",
    name: "Digital SAT",
  },
};

export default function DigitalSATQuestionBank() {
  return (
    <div className="min-h-screen bg-background dark text-foreground">
      <PageSeo
        title="Digital SAT Question Bank — 1000+ Practice Questions | Adaptive Prep"
        description="Free Digital SAT question bank: 1000+ adaptive Math & Reading/Writing questions plus full-length Bluebook-style practice tests. Start free today."
        path={PATH}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <Navbar />

      <main className="pt-24 pb-16">
        <article className="container mx-auto max-w-4xl px-4">
          <header className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Free Digital SAT Question Bank
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              1000+ adaptive Digital SAT practice questions across Math and Reading &amp; Writing,
              plus full-length Bluebook-style tests — all free with AdaptivePrep.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="hero">
                <Link to="/signup">
                  Start practicing free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="heroOutline">
                <Link to="/pricing">View plans</Link>
              </Button>
            </div>
          </header>

          <section className="mb-12 bg-card border border-border rounded-2xl p-8">
            <div className="flex items-start gap-4 mb-4">
              <Calculator className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold mb-2">Math Question Bank</h2>
                <p className="text-muted-foreground">
                  500+ Digital SAT Math questions covering Algebra, Advanced Math, Problem-Solving
                  &amp; Data Analysis, and Geometry &amp; Trigonometry. Difficulty calibrates to
                  your rolling performance so every question targets a real weak spot.
                </p>
              </div>
            </div>
            <ul className="space-y-2 mt-4 ml-10">
              {[
                "Adaptive difficulty per skill",
                "Step-by-step AI explanations on every wrong answer",
                "Official Digital SAT format and timing",
              ].map((t) => (
                <li key={t} className="flex gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /> {t}
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-12 bg-card border border-border rounded-2xl p-8">
            <div className="flex items-start gap-4 mb-4">
              <BookOpen className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold mb-2">Reading &amp; Writing Question Bank</h2>
                <p className="text-muted-foreground">
                  500+ Reading &amp; Writing questions covering Craft &amp; Structure, Information
                  &amp; Ideas, Standard English Conventions, and Expression of Ideas. Short
                  passages, modern formats, and AI feedback on every attempt.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-12 bg-card border border-border rounded-2xl p-8">
            <div className="flex items-start gap-4 mb-4">
              <FileText className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold mb-2">Full-Length Digital SAT Practice Tests</h2>
                <p className="text-muted-foreground">
                  Simulate test day with full-length Bluebook-style practice tests, including
                  Module 1 → Module 2 adaptive routing for both Reading &amp; Writing and Math, and
                  a scaled 400–1600 score with weak-skill breakdown.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-16 bg-gradient-to-br from-primary/20 to-teal-500/10 border border-primary/30 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-3">Start the Digital SAT question bank free</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Create a free AdaptivePrep account to unlock 1000+ adaptive questions and full-length
              Digital SAT practice tests — no credit card required.
            </p>
            <Button asChild size="lg" variant="hero">
              <Link to="/signup">
                Get started free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}

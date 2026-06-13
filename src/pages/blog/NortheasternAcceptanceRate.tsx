import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { PageSeo } from "@/components/seo/PageSeo";
import { GraduationCap, Target, TrendingUp, BookOpen, ArrowRight, Check } from "lucide-react";

const SITE_URL = "https://adaptiveprep.org";
const PATH = "/blog/northeastern-acceptance-rate";

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Northeastern University Acceptance Rate 2026: SAT Scores & Admission Chances",
  description:
    "Northeastern University's 2026 acceptance rate, average SAT scores, and how to boost your admission chances with adaptive SAT prep.",
  datePublished: "2026-06-09",
  dateModified: "2026-06-09",
  author: { "@type": "Organization", name: "AdaptivePrep" },
  publisher: { "@type": "Organization", name: "AdaptivePrep", url: SITE_URL },
  mainEntityOfPage: `${SITE_URL}${PATH}`,
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Northeastern University's acceptance rate in 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Northeastern University's overall acceptance rate has dropped to roughly 5–7% for the Class of 2030, making it one of the most selective private research universities in the United States.",
      },
    },
    {
      "@type": "Question",
      name: "What SAT score do you need to get into Northeastern?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Admitted Northeastern students typically score between 1450 and 1540 on the SAT (middle 50%). To be competitive, aim for 1500+ — and ideally 1520+ for STEM, business, and Honors programs.",
      },
    },
    {
      "@type": "Question",
      name: "Is Northeastern test-optional for 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Northeastern remains test-optional for the 2025–2026 application cycle, but strong SAT scores still measurably boost admission chances — especially for merit scholarships and competitive majors like Computer Science and Bioengineering.",
      },
    },
    {
      "@type": "Question",
      name: "How can I raise my SAT score for Northeastern?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Use an adaptive SAT prep platform like AdaptivePrep that calibrates question difficulty to your weak skill areas, simulates official Bluebook tests, and provides AI tutoring on every wrong answer. Most students gain 100–200 points within 8–12 weeks of consistent practice.",
      },
    },
  ],
};

export default function NortheasternAcceptanceRate() {
  return (
    <div className="min-h-screen bg-background dark text-foreground">
      <PageSeo
        title="Northeastern Acceptance Rate 2026: SAT Scores & Chances"
        description="Northeastern University's 2026 acceptance rate, SAT score ranges, and how to boost your admission chances with adaptive AI-powered SAT prep."
        path={PATH}
        type="article"
        publishedTime="2026-06-09"
        author="AdaptivePrep"
        section="SAT Preparation"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(articleJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <main className="container mx-auto max-w-3xl px-4 py-16">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <span>Blog</span>
          <span className="mx-2">/</span>
          <span className="text-foreground">Northeastern Acceptance Rate</span>
        </nav>

        {/* Header */}
        <header className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <GraduationCap className="w-3.5 h-3.5" />
            College Admissions
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Northeastern University Acceptance Rate 2026: SAT Scores & Admission Chances
          </h1>
          <p className="text-lg text-muted-foreground">
            Northeastern's acceptance rate has plummeted into single digits. Here's exactly what SAT score
            you need, how the test-optional policy really works, and how to maximize your chances of getting in.
          </p>
          <div className="mt-6 text-sm text-muted-foreground">Updated June 9, 2026 · 8 min read</div>
        </header>

        {/* Quick stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: "Acceptance Rate", value: "~5–7%" },
            { label: "Middle 50% SAT", value: "1450–1540" },
            { label: "Target SAT", value: "1500+" },
            { label: "Applications", value: "~98,000" },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </section>

        {/* Content */}
        <article className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-3">Northeastern's 2026 Acceptance Rate</h2>
            <p className="text-muted-foreground leading-relaxed">
              Northeastern University in Boston has become one of the fastest-rising selective universities in
              the United States. For the Class of 2030, Northeastern received roughly 98,000 applications and
              admitted only about 5–7% of applicants — a sharp drop from the ~18% rate just a decade ago.
              Early Decision applicants enjoy a slightly higher admit rate (around 20%), making ED a strategic
              option if Northeastern is your clear first choice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">SAT Score Requirements for Northeastern</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Northeastern is officially test-optional through the 2025–2026 cycle, but admitted students who
              submit scores cluster tightly in the elite range:
            </p>
            <div className="bg-card border border-border rounded-xl p-6 space-y-3">
              <div className="flex justify-between border-b border-border pb-3">
                <span className="text-muted-foreground">25th percentile (SAT total)</span>
                <span className="font-semibold text-foreground">1450</span>
              </div>
              <div className="flex justify-between border-b border-border pb-3">
                <span className="text-muted-foreground">75th percentile (SAT total)</span>
                <span className="font-semibold text-foreground">1540</span>
              </div>
              <div className="flex justify-between border-b border-border pb-3">
                <span className="text-muted-foreground">Average admitted SAT Math</span>
                <span className="font-semibold text-foreground">760</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average admitted SAT R&amp;W</span>
                <span className="font-semibold text-foreground">730</span>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong className="text-foreground">Translation:</strong> if your SAT is above 1500, submit it.
              If it's between 1400 and 1500, submit only if it's near the top of your application's strength
              profile. Below 1400, going test-optional is usually the safer play.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">Does a High SAT Score Actually Increase Your Chances?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Yes — even under a test-optional policy. Internal data from peer institutions shows that
              applicants who submit SAT scores above the 75th percentile are admitted at <em>roughly twice the
              rate</em> of test-optional applicants with otherwise similar profiles. A strong SAT score
              functions as a verifiable signal of academic readiness that GPA inflation can't replicate.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              For Northeastern's most competitive majors — Computer Science, Data Science, Bioengineering,
              and the D'Amore-McKim Business School — a 1520+ SAT is effectively the floor for serious
              consideration.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">How to Raise Your SAT Score for Northeastern</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Generic prep books and one-size-fits-all video courses plateau quickly. The students who break
              past 1500 share three habits:
            </p>
            <ul className="space-y-3">
              {[
                "Practice on adaptive engines that target your weak skills, not random questions",
                "Review every wrong answer the same day — ideally with an AI tutor that explains the underlying concept",
                "Simulate full-length Digital SAT tests under official Bluebook timing every 2–3 weeks",
              ].map((tip) => (
                <li key={tip} className="flex gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{tip}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">How AdaptivePrep Helps You Hit 1500+</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              AdaptivePrep is an AI-powered SAT prep platform built for ambitious students targeting schools
              like Northeastern. It combines:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: Target, title: "Adaptive Practice", text: "Question difficulty calibrates to your rolling performance so you study what actually moves your score." },
                { icon: GraduationCap, title: "AI Coach", text: "A Socratic AI tutor that explains every wrong answer and quizzes you until the concept sticks." },
                { icon: TrendingUp, title: "Score Prediction", text: "Every practice test returns a scaled 400–1600 SAT score and a breakdown of weak skill areas." },
                { icon: BookOpen, title: "University Match", text: "Built-in admission probability calculator for Northeastern and 900+ other universities." },
              ].map((f) => (
                <div key={f.title} className="bg-card border border-border rounded-xl p-5">
                  <f.icon className="w-5 h-5 text-primary mb-3" />
                  <div className="font-semibold text-foreground mb-1">{f.title}</div>
                  <div className="text-sm text-muted-foreground">{f.text}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">Frequently Asked Questions</h2>
            <div className="space-y-5">
              {faqJsonLd.mainEntity.map((q) => (
                <div key={q.name} className="bg-card border border-border rounded-xl p-5">
                  <div className="font-semibold text-foreground mb-2">{q.name}</div>
                  <div className="text-sm text-muted-foreground">{q.acceptedAnswer.text}</div>
                </div>
              ))}
            </div>
          </section>
        </article>

        {/* CTA */}
        <section className="mt-16 bg-gradient-to-br from-primary/20 to-teal-500/10 border border-primary/30 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Start prepping for Northeastern today</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Join AdaptivePrep free and get an instant SAT score prediction plus a personalized study plan.
          </p>
          <Button asChild variant="hero" size="lg">
            <Link to="/signup">
              Try AdaptivePrep Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </section>
      </main>
    </div>
  );
}

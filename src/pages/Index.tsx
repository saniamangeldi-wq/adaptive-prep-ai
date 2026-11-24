import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/landing/Navbar";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";
import { PageSeo } from "@/components/seo/PageSeo";
import { SKILLS, type SkillKey } from "@/lib/sat-skills";
import { cn } from "@/lib/utils";
import { COHORT, formatDate } from "@/lib/cohort";

const CONTACT_EMAIL = "hello@adaptiveprep.org";

// Illustrative numbers for the sample report. Labelled "Example data" on the page.
const SAMPLE_SKILLS: Array<[SkillKey, number]> = [
  ["information_ideas", 71],
  ["craft_structure", 64],
  ["expression_ideas", 77],
  ["standard_english", 58],
  ["algebra", 74],
  ["advanced_math", 49],
  ["data_analysis", 69],
  ["geometry_trig", 55],
];

function SampleReport() {
  const { t } = useTranslation();
  const weakest = [...SAMPLE_SKILLS].sort((a, b) => a[1] - b[1]).slice(0, 2).map(([k]) => k);
  return (
    <figure className="rounded-md border border-border bg-card p-5 sm:p-6 shadow-card">
      <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
        <figcaption className="text-sm font-medium">{t("home.report_label")}</figcaption>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{t("home.report_example")}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto] items-end gap-4 py-4 border-b border-border">
        <div>
          <div className="text-xs text-muted-foreground">{t("home.report_estimate")}</div>
          <div className="font-mono text-3xl sm:text-4xl font-medium tracking-tight">
            1210<span className="text-muted-foreground">–</span>1330
          </div>
        </div>
        <dl className="text-right font-mono text-sm leading-6">
          <div><dt className="inline text-muted-foreground font-sans">{t("home.report_rw")} </dt><dd className="inline">≈640</dd></div>
          <div><dt className="inline text-muted-foreground font-sans">{t("home.report_math")} </dt><dd className="inline">≈630</dd></div>
        </dl>
      </div>

      <div className="pt-4">
        <div className="text-xs text-muted-foreground mb-3">{t("home.report_skills")}</div>
        <ul className="space-y-2.5">
          {SAMPLE_SKILLS.map(([key, pct]) => {
            const weak = weakest.includes(key);
            return (
              <li key={key} className="grid grid-cols-[minmax(0,1fr)_7rem_2.5rem] sm:grid-cols-[minmax(0,1fr)_9rem_2.5rem] items-center gap-3 text-sm">
                <span className={cn("truncate", weak && "font-medium")}>{SKILLS[key].label}</span>
                <span className="h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden>
                  <span
                    className={cn("block h-full rounded-full", weak ? "bg-accent" : "bg-foreground/70")}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="font-mono text-right tabular-nums">{pct}%</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm">
          <span className="text-muted-foreground">{t("home.report_focus")}: </span>
          <span className="mark">{weakest.map((k) => SKILLS[k].label).join(", ")}</span>
        </p>
      </div>
    </figure>
  );
}

function SectionHeading({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
      {children}
    </h2>
  );
}

const Index = () => {
  const { t, i18n } = useTranslation();
  const lang = ["ru", "kk"].includes(i18n.language?.slice(0, 2)) ? i18n.language.slice(0, 2) : "en";

  const steps = [1, 2, 3].map((n) => ({
    n,
    title: t(`home.step${n}_title`),
    body: t(`home.step${n}_body`),
  }));
  const diffs = [1, 2, 3].map((n) => ({ title: t(`home.diff${n}_title`), body: t(`home.diff${n}_body`) }));
  const faqs = [1, 2, 3, 4].map((n) => ({ q: t(`home.faq${n}_q`), a: t(`home.faq${n}_a`) }));

  return (
    <div className="paper min-h-screen">
      <PageSeo
        title="AdaptivePrep · Digital SAT practice in Russian and Kazakh"
        description="Adaptive Digital SAT practice tests with an estimated score range, a breakdown across all 8 skill areas, and explanations in Russian and Kazakh."
        path="/"
      />
      <Navbar />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pt-28 pb-16 sm:pt-32 lg:pb-24">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <p className="text-sm text-muted-foreground">{t("home.eyebrow")}</p>
              <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight">
                {t("home.h1")}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">{t("home.lede")}</p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button variant="hero" size="xl" asChild>
                  <Link to="/signup">
                    {t("home.cta_primary")}
                    <ArrowRight />
                  </Link>
                </Button>
                <Button variant="heroOutline" size="xl" asChild>
                  <a href="#how">{t("home.cta_secondary")}</a>
                </Button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t("home.cta_note")}</p>
            </div>
            <SampleReport />
          </div>
        </section>

        {/* Live group */}
        <section className="border-t border-border bg-foreground text-background">
          <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold">{t("intensive.band_title")}</div>
              <div className="text-sm text-background/70">
                {t("intensive.band_body", { start: formatDate(COHORT.startDate, lang), seats: COHORT.seats })}
              </div>
            </div>
            <Button className="bg-background text-foreground hover:bg-background/90 self-start sm:self-auto" asChild>
              <Link to="/sat-intensive">{t("intensive.band_cta")}<ArrowRight /></Link>
            </Button>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
            <SectionHeading id="how">{t("home.how_title")}</SectionHeading>
            <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
              {steps.map((s) => (
                <li key={s.n} className="border-t border-foreground pt-5">
                  <span className="font-mono text-sm text-muted-foreground">0{s.n}</span>
                  <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* What's different */}
        <section className="border-t border-border bg-secondary/60">
          <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24 grid gap-10 lg:grid-cols-[1fr_2fr]">
            <SectionHeading>{t("home.diff_title")}</SectionHeading>
            <dl className="grid gap-8 sm:grid-cols-2">
              {diffs.map((d, i) => (
                <div key={d.title} className={cn(i === 0 && "sm:col-span-2")}>
                  <dt className="text-lg font-semibold">{d.title}</dt>
                  <dd className="mt-2 leading-relaxed text-muted-foreground max-w-prose">{d.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Tutors */}
        <section id="tutors" className="border-t border-border scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24 grid gap-10 lg:grid-cols-2">
            <div>
              <SectionHeading>{t("home.tutors_title")}</SectionHeading>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t("home.tutors_lede")}</p>
            </div>
            <div>
              <ul className="divide-y divide-border border-y border-border">
                {[1, 2, 3].map((n) => (
                  <li key={n} className="py-4 leading-relaxed">{t(`home.tutors_point${n}`)}</li>
                ))}
              </ul>
              <p className="mt-6 text-muted-foreground">{t("home.tutors_price")}</p>
              <Button variant="heroOutline" className="mt-4" asChild>
                <a href={`mailto:${CONTACT_EMAIL}?subject=AdaptivePrep%20for%20tutors`}>{t("home.tutors_cta")}</a>
              </Button>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-border scroll-mt-16">
          <Pricing />
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-border scroll-mt-16">
          <div className="mx-auto max-w-3xl px-4 py-16 lg:py-24">
            <SectionHeading>{t("home.faq_title")}</SectionHeading>
            <div className="mt-8 divide-y divide-border border-y border-border">
              {faqs.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <Plus className="mt-1 h-5 w-5 shrink-0 transition-transform group-open:rotate-45" aria-hidden />
                  </summary>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border bg-foreground text-background">
          <div className="mx-auto max-w-6xl px-4 py-16 lg:py-20 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">{t("home.final_title")}</h2>
              <p className="mt-3 text-background/70 text-lg">{t("home.final_body")}</p>
            </div>
            <Button size="xl" className="bg-background text-foreground hover:bg-background/90" asChild>
              <Link to="/signup">
                {t("home.cta_primary")}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;

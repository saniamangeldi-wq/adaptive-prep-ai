import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { PageSeo } from "@/components/seo/PageSeo";
import { supabase } from "@/integrations/supabase/client";
import { COHORT, formatDate, isEarlyBird } from "@/lib/cohort";

const CONTACT_EMAIL = "hello@adaptiveprep.org";
const GRADES = ["9", "10", "11", "12"];
const kzt = (n: number) => n.toLocaleString("ru-RU").replace(/ /g, " ");

type LangKey = "en" | "ru" | "kk";

function LeadForm() {
  const { t, i18n } = useTranslation();
  const lang = (["ru", "kk", "en"].includes(i18n.language?.slice(0, 2)) ? i18n.language.slice(0, 2) : "ru") as LangKey;
  const [state, setState] = useState<"idle" | "sending" | "done" | "error" | "invalid">("idle");
  const [form, setForm] = useState({ name: "", contact: "", grade: "", target: "", language: lang, note: "", website: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Honeypot: real people never see or fill this field.
    if (form.website) {
      setState("done");
      return;
    }
    const name = form.name.trim();
    const contact = form.contact.trim();
    if (!name || contact.length < 3) {
      setState("invalid");
      return;
    }
    const target = Number(form.target);
    setState("sending");
    const params = new URLSearchParams(window.location.search);
    const { error } = await supabase.from("cohort_leads").insert({
      cohort: COHORT.id,
      name: name.slice(0, 100),
      contact: contact.slice(0, 100),
      grade: form.grade || null,
      target_score: Number.isInteger(target) && target >= 400 && target <= 1600 ? target : null,
      language: form.language,
      note: form.note.trim().slice(0, 1000) || null,
      source: (params.get("utm_source") || params.get("src") || document.referrer || "direct").slice(0, 100),
    });
    setState(error ? "error" : "done");
    if (error) console.error("Lead submit failed:", error);
  };

  if (state === "done") {
    return (
      <div className="rounded-md border border-foreground p-6" role="status">
        <p className="text-lg font-semibold">{t("intensive.form_ok_title")}</p>
        <p className="mt-2 text-muted-foreground">{t("intensive.form_ok_body")}</p>
      </div>
    );
  }

  const field = "mt-1.5 bg-card";
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <label className="block">
        <span className="text-sm font-medium">{t("intensive.form_name")}</span>
        <Input className={field} value={form.name} onChange={set("name")} maxLength={100} autoComplete="name" required />
      </label>
      <label className="block">
        <span className="text-sm font-medium">{t("intensive.form_contact")}</span>
        <Input className={field} value={form.contact} onChange={set("contact")} maxLength={100} autoComplete="tel" inputMode="text" required />
        <span className="mt-1 block text-xs text-muted-foreground">{t("intensive.form_contact_hint")}</span>
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium">{t("intensive.form_grade")}</span>
          <select className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm" value={form.grade} onChange={set("grade")}>
            <option value="">—</option>
            {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
            <option value="other">{t("intensive.form_grade_other")}</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("intensive.form_language")}</span>
          <select className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm" value={form.language} onChange={set("language")}>
            <option value="ru">Русский</option>
            <option value="kk">Қазақша</option>
            <option value="en">English</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-medium">{t("intensive.form_target")}</span>
        <Input className={field} value={form.target} onChange={set("target")} inputMode="numeric" maxLength={4} placeholder="1300" />
      </label>
      <label className="block">
        <span className="text-sm font-medium">{t("intensive.form_note")}</span>
        <Textarea className={field} value={form.note} onChange={set("note")} maxLength={1000} rows={3} />
      </label>
      <input type="text" name="website" value={form.website} onChange={set("website")} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {state === "invalid" && <p className="text-sm text-destructive">{t("intensive.form_invalid")}</p>}
      {state === "error" && <p className="text-sm text-destructive">{t("intensive.form_error", { email: CONTACT_EMAIL })}</p>}
      <Button type="submit" variant="hero" size="lg" className="w-full" disabled={state === "sending"}>
        {state === "sending" ? t("intensive.form_sending") : t("intensive.form_submit")}
      </Button>
    </form>
  );
}

export default function SatIntensive() {
  const { t, i18n } = useTranslation();
  const lang = (["ru", "kk", "en"].includes(i18n.language?.slice(0, 2)) ? i18n.language.slice(0, 2) : "en") as LangKey;
  const start = formatDate(COHORT.startDate, lang);
  const end = formatDate(COHORT.endDate, lang);
  const early = isEarlyBird();
  const lessons = COHORT.weeks * COHORT.lessonsPerWeek;

  const facts: Array<[string, string]> = [
    [t("intensive.facts_dates"), `${start} – ${end}`],
    [t("intensive.facts_schedule"), COHORT.schedule[lang]],
    [t("intensive.facts_format"), t("intensive.format_value", { lessons, minutes: COHORT.lessonMinutes })],
    [t("intensive.facts_group"), t("intensive.group_value", { seats: COHORT.seats })],
  ];

  return (
    <div className="paper min-h-screen">
      <PageSeo title={t("intensive.seo_title")} description={t("intensive.seo_desc")} path="/sat-intensive" />
      <Navbar />
      <main>
        <section className="mx-auto max-w-6xl px-4 pt-28 pb-14 sm:pt-32">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="text-sm text-muted-foreground">{t("intensive.eyebrow")}</p>
              <h1 className="mt-4 font-display text-4xl sm:text-5xl font-semibold leading-[1.08] tracking-tight">{t("intensive.h1")}</h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">{t("intensive.lede")}</p>
              <Button variant="hero" size="xl" className="mt-8" asChild>
                <a href="#join">{t("intensive.cta")}<ArrowRight /></a>
              </Button>
            </div>
            <dl className="self-start rounded-md border border-border bg-card divide-y divide-border">
              {facts.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[7rem_1fr] gap-4 px-5 py-3.5 text-sm">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
              <div className="grid grid-cols-[7rem_1fr] gap-4 px-5 py-4 text-sm">
                <dt className="text-muted-foreground">{t("intensive.facts_price")}</dt>
                <dd className="space-y-1">
                  {early ? (
                    <>
                      <div className="text-base font-medium"><span className="mark">{t("intensive.price_early", { price: kzt(COHORT.earlyBirdKZT), seats: COHORT.earlyBirdSeats, until: formatDate(COHORT.earlyBirdUntil, lang) })}</span></div>
                      <div className="text-muted-foreground">{t("intensive.price_full", { price: kzt(COHORT.priceKZT) })}</div>
                    </>
                  ) : (
                    <div className="text-base font-medium">{t("intensive.price_full", { price: kzt(COHORT.priceKZT) })}</div>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-14 grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight">{t("intensive.included_title")}</h2>
              <ul className="mt-6 space-y-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <li key={n} className="flex gap-3 leading-relaxed">
                    <Check className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                    <span>{t(`intensive.inc${n}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight">{t("intensive.who_title")}</h2>
              <ul className="mt-6 divide-y divide-border border-y border-border">
                {[1, 2, 3].map((n) => (
                  <li key={n} className="py-3.5 leading-relaxed">{t(`intensive.who${n}`)}</li>
                ))}
              </ul>
              <h3 className="mt-10 text-lg font-semibold">{t("intensive.teacher_title")}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{t("intensive.teacher_body", { name: COHORT.teacherName })}</p>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-secondary/60">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="font-display text-3xl font-semibold tracking-tight">{t("intensive.steps_title")}</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-4">
              {[1, 2, 3, 4].map((n) => (
                <li key={n} className="border-t border-foreground pt-4">
                  <span className="font-mono text-sm text-muted-foreground">0{n}</span>
                  <p className="mt-2 leading-relaxed">{t(`intensive.step${n}`, { start })}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="join" className="border-t border-border scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 py-14 grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight">{t("intensive.form_title")}</h2>
              <p className="mt-3 text-muted-foreground">{t("intensive.form_lede")}</p>
              <h3 className="mt-10 text-lg font-semibold">{t("intensive.faq_title")}</h3>
              <div className="mt-3 divide-y divide-border border-y border-border">
                {[1, 2, 3, 4].map((n) => (
                  <details key={n} className="py-3">
                    <summary className="cursor-pointer font-medium">{t(`intensive.faq${n}_q`)}</summary>
                    <p className="mt-2 leading-relaxed text-muted-foreground">{t(`intensive.faq${n}_a`)}</p>
                  </details>
                ))}
              </div>
            </div>
            <LeadForm />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

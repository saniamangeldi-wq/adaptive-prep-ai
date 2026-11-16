import { Link } from "react-router-dom";
import { VARIANTS_BY_TASK } from "@ielts/contract.ts";
import { TASK_TYPE_LABELS, VARIANT_LABELS } from "@/lib/ielts/labels";
import { planUsage } from "@/lib/plan-features";
import { CRITERION_COLORS } from "@/components/writing/ScriptHighlights";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ContinueWithGoogle } from "./ContinueWithGoogle";
import { SampleReport } from "./SampleReport";
import { SampleChat } from "./SampleChat";
import { Button } from "@/components/ui/button";

const CONTAINER = "mx-auto max-w-6xl px-4 sm:px-6";
const H2 = "text-[1.75rem] leading-9 sm:text-[2rem] sm:leading-[2.5rem] font-semibold tracking-[-0.02em] text-foreground";

export function Hero() {
  return (
    <section className={`${CONTAINER} grid gap-10 pb-16 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-14 lg:pb-24 lg:pt-20`}>
      <div className="max-w-xl">
        <h1 className="text-display-sm sm:text-display-md lg:text-display-lg font-semibold text-foreground">
          See which sentences hold your IELTS Writing band back.
        </h1>
        <p className="mt-5 text-lg leading-7 text-muted-foreground text-pretty">
          Write or paste a Task 1 or Task 2 answer. You get an estimated band for each of the four marking criteria,
          comments on the exact sentences you wrote, and a coach you can ask why.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <ContinueWithGoogle className="w-full sm:w-auto" />
          <Button variant="outline" asChild className="h-12 rounded-xl px-5 text-[15px] font-semibold">
            <Link to="/signup">Sign up with email</Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </div>
      <SampleReport />
    </section>
  );
}

export function AskWhy() {
  return (
    <section aria-labelledby="ask-why" className="border-y border-border bg-card/60">
      <div className={`${CONTAINER} grid gap-10 py-16 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center lg:gap-14 lg:py-24`}>
        <div className="order-2 lg:order-1">
          <SampleChat />
        </div>
        <div className="order-1 max-w-lg lg:order-2">
          <h2 id="ask-why" className={H2}>Ask why a sentence lost marks.</h2>
          <p className="mt-4 text-lg leading-7 text-muted-foreground text-pretty">
            Open the coach from any report and it already knows your essay, your bands and every comment. Ask what a
            comment means, how to fix your introduction, or what to practise first.
          </p>
          <p className="mt-4 text-[15px] leading-6 text-muted-foreground">
            The coach also answers general questions about IELTS Writing: task types, planning, structure, grammar and
            vocabulary.
          </p>
        </div>
      </div>
    </section>
  );
}

const CRITERIA = [
  {
    key: "task" as const,
    name: "Task Achievement or Task Response",
    text: "Whether you answered every part of the question, with a clear overview or position and ideas that are developed rather than listed.",
  },
  {
    key: "coherence" as const,
    name: "Coherence and Cohesion",
    text: "How easy your answer is to follow: paragraphing, the order of ideas, and linking that shows how one point leads to the next.",
  },
  {
    key: "lexical" as const,
    name: "Lexical Resource",
    text: "The range and precision of your vocabulary: natural word combinations, the right word forms, correct spelling.",
  },
  {
    key: "grammar" as const,
    name: "Grammatical Range and Accuracy",
    text: "The variety of sentence structures you control, and how often mistakes get in the way of meaning.",
  },
];

export function WhatYouGet() {
  return (
    <section id="what-you-get" aria-labelledby="what-you-get-title" className={`${CONTAINER} py-16 lg:py-24`}>
      <div className="max-w-2xl">
        <h2 id="what-you-get-title" className={H2}>What a report gives you</h2>
        <p className="mt-4 text-lg leading-7 text-muted-foreground text-pretty">
          An estimated band for each of the four public marking criteria, and the overall band they add up to. Each
          criterion has its own colour, and that colour marks its comments in your text.
        </p>
      </div>

      <dl className="mt-10 grid gap-x-10 gap-y-7 md:grid-cols-2">
        {CRITERIA.map((c) => (
          <div key={c.key} className="border-l-[3px] pl-4" style={{ borderColor: CRITERION_COLORS[c.key] }}>
            <dt className="font-semibold text-foreground">{c.name}</dt>
            <dd className="mt-1 text-[15px] leading-6 text-muted-foreground">{c.text}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-14 grid gap-10 border-t border-border pt-10 md:grid-cols-3">
        <div>
          <h3 className="font-semibold text-foreground">Comments on your own sentences</h3>
          <p className="mt-2 text-[15px] leading-6 text-muted-foreground">
            Every comment points to the words you wrote, says what is wrong and suggests a better wording. The report
            also checks the task&apos;s requirements and counts your most frequent error types.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Explanations in English, Russian or Kazakh</h3>
          <p className="mt-2 text-[15px] leading-6 text-muted-foreground">
            Your answer is always marked as English writing. The explanations and the coach&apos;s answers can be in
            the language you understand best.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Every Task 1 and Task 2 type</h3>
          <p className="mt-2 text-[15px] leading-6 text-muted-foreground">
            Take a question from our own task bank, ask for a new one, or paste the question you are practising.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 rounded-2xl border border-border bg-card p-5 sm:p-6 md:grid-cols-3">
        {(Object.keys(VARIANTS_BY_TASK) as Array<keyof typeof VARIANTS_BY_TASK>).map((t) => (
          <div key={t}>
            <h4 className="text-sm font-semibold text-foreground">{TASK_TYPE_LABELS[t]}</h4>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {VARIANTS_BY_TASK[t].map((v) => (
                <li key={v}>{VARIANT_LABELS[v]}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  {
    title: "Choose a task",
    text: "Pick the task type and get a question, or paste your own. For an Academic Task 1 question of your own, add a photo of the chart or describe it.",
  },
  {
    title: "Write your answer",
    text: "Write with a timer and a word count, or paste a finished answer. Your draft saves as you type, so closing the tab does not lose it.",
  },
  {
    title: "Read the report, then ask",
    text: "See the estimated bands and every comment on your text. Open the coach from the report to ask about any of it.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-16 border-y border-border bg-card/60">
      <div className={`${CONTAINER} py-16 lg:py-24`}>
        <h2 id="how-title" className={H2}>How it works</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/40 text-sm font-semibold tabular-nums text-primary" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="mt-4 font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-6 text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Faq() {
  const items = [
    {
      q: "What does “estimated band” mean?",
      a: "It is our estimate of the band an examiner might give your answer, worked out from the four public marking criteria. It is not an official score: only a real IELTS test gives you one. Use it to see where you stand and what to fix next.",
    },
    {
      q: "Which tasks are covered?",
      a: "Academic Task 1 (line graphs, bar charts, pie charts, tables, two visuals together, processes and cycles, maps), General Training Task 1 letters (formal, semi-formal and informal), and every common Task 2 essay type.",
    },
    {
      q: "Which languages can the feedback be in?",
      a: "English, Russian or Kazakh. Choose in Settings after you sign up; you can change it at any time. The website itself is in English.",
    },
    {
      q: "What does the free plan include?",
      a: `The writing checker and the coach, with a daily allowance of credits: ${planUsage("tier_0").replace(/^About/, "about")}. Credits reset every day. Paid plans give more credits; see Pricing above.`,
    },
  ];
  return (
    <section id="faq" aria-labelledby="faq-title" className={`${CONTAINER} py-16 lg:py-24`}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-14">
        <h2 id="faq-title" className={H2}>Questions</h2>
        <Accordion type="multiple" className="border-t border-border">
          {items.map((it) => (
            <AccordionItem key={it.q} value={it.q} className="border-border">
              <AccordionTrigger className="py-5 text-left text-base font-medium hover:no-underline">{it.q}</AccordionTrigger>
              <AccordionContent className="pb-5 text-[15px] leading-6 text-muted-foreground">{it.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

export function ClosingCall() {
  return (
    <section className={`${CONTAINER} pb-16 lg:pb-24`}>
      <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 sm:p-10 md:flex-row md:items-center md:justify-between">
        <div className="max-w-lg">
          <h2 className="text-2xl font-semibold tracking-[-0.015em] text-foreground">Check your next answer before the exam does.</h2>
          <p className="mt-2 text-[15px] leading-6 text-muted-foreground">Start on the free plan. Upgrade only if you need more checks a day.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ContinueWithGoogle />
          <Button variant="outline" asChild className="h-12 rounded-xl px-5 text-[15px] font-semibold">
            <Link to="/signup">Sign up with email</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

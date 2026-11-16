import { Link } from "react-router-dom";
import { GraduationCap, ListChecks, MessageSquareText, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSeo } from "@/components/seo/PageSeo";

const benefits = [
  {
    icon: ListChecks,
    title: "An estimated band on the four criteria",
    text: "Task achievement or response, coherence and cohesion, lexical resource, and grammatical range and accuracy, each with its own estimated band.",
  },
  {
    icon: MessageSquareText,
    title: "Feedback on your own sentences",
    text: "Comments point to the exact sentences you wrote, so you can see what to change instead of reading general advice.",
  },
  {
    icon: Languages,
    title: "Explanations in English, Russian or Kazakh",
    text: "Choose the language you understand best. Your essay stays in English; the explanations follow your choice.",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background dark text-foreground flex flex-col">
      <PageSeo
        title="AdaptivePrep — IELTS Writing checker"
        description="Check your IELTS Writing against the four public criteria. Get an estimated band and feedback on your own sentences in English, Russian or Kazakh."
        path="/"
      />

      <header className="border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground truncate">AdaptivePrep</span>
          </Link>
          <Link to="/login" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
            Log in
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-card/60 to-background" aria-hidden="true" />
          <div className="absolute top-8 left-0 sm:left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-primary/15 rounded-full blur-3xl" aria-hidden="true" />

          <div className="container relative z-10 mx-auto px-4 py-16 sm:py-24">
            <div className="max-w-2xl space-y-6">
              <h1 className="text-3xl sm:text-5xl font-bold text-foreground leading-tight">
                Check your <span className="gradient-text">IELTS Writing</span> before the exam
              </h1>
              <p className="text-lg text-muted-foreground">
                Write or paste your answer and see where your estimated band comes from.
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
                <Button variant="hero" size="xl" asChild>
                  <Link to="/signup">Sign up</Link>
                </Button>
                <Link to="/login" className="text-sm font-medium text-primary hover:underline">
                  Already have an account? Log in
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-16 sm:pb-24">
          <ul className="grid gap-4 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-2xl bg-card border border-border/50 p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-semibold text-foreground">{title}</h2>
                <p className="text-sm text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-border/50">
        <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground">
          <p>AdaptivePrep is not affiliated with or endorsed by the IELTS partners. Band scores are estimates.</p>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
        </div>
      </footer>
    </div>
  );
};

export default Index;

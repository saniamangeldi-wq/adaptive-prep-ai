import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Play,
  Search,
  Target,
  X,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MathRenderer } from "@/components/MathRenderer";
import { QuestionCard } from "@/components/test/QuestionCard";
import { PageSeo } from "@/components/seo/PageSeo";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { fetchMistakes, generateTest, type MistakeEntry } from "@/lib/test-generator";

type SectionFilter = "all" | "math" | "reading_writing";

const sectionLabel = (s: string) => (s === "math" ? "Math" : "Reading & Writing");

export default function MistakeBank() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [mistakes, setMistakes] = useState<MistakeEntry[]>([]);
  const [section, setSection] = useState<SectionFilter>("all");
  const [topic, setTopic] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    fetchMistakes(user.id, "combined")
      .then((rows) => {
        if (!cancelled) setMistakes(rows);
      })
      .catch(() => {
        if (!cancelled) setMistakes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    mistakes
      .filter((m) => section === "all" || m.question.section === section)
      .forEach((m) => counts.set(m.topic, (counts.get(m.topic) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [mistakes, section]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mistakes.filter((m) => {
      if (section !== "all" && m.question.section !== section) return false;
      if (topic && m.topic !== topic) return false;
      if (q) {
        const haystack = `${m.question.text} ${m.question.stimulus ?? ""} ${m.topic}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [mistakes, section, topic, query]);

  const startRedo = async () => {
    if (!user || isStarting) return;
    setIsStarting(true);
    try {
      const count = filtered.length;
      const test = await generateTest(
        {
          testType: section === "all" ? "combined" : section,
          length: count <= 10 ? "quick" : count <= 25 ? "short" : "full",
          difficulty: "normal",
          timerEnabled: false,
          sortOrder: "mixed",
          topics: topic ? [topic] : [],
          practiceMode: "incorrect",
        },
        user.id
      );
      if (!test) {
        toast({
          title: "No mistakes to review",
          description: "Great work — there's nothing to redo with these filters.",
        });
        setIsStarting(false);
        return;
      }
      navigate(`/dashboard/tests/${test.id}`, { state: { test } });
    } catch {
      toast({
        title: "Couldn't start the review",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
      setIsStarting(false);
    }
  };

  return (
    <>
      <PageSeo
        title="Mistake Bank | AdaptivePrep"
        description="Every SAT question you got wrong or skipped, with the correct answer and explanation — review and redo them in one place."
        path="/dashboard/tests/mistakes"
      />
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <Button variant="outline" size="sm" asChild className="mt-1">
                <Link to="/dashboard/tests">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Mistake Bank</h1>
                <p className="text-muted-foreground mt-1">
                  Every question you missed or skipped — find it, understand it, redo it.
                </p>
              </div>
            </div>
            <Button
              variant="hero"
              size="sm"
              onClick={startRedo}
              disabled={isStarting || filtered.length === 0}
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Redo these ({filtered.length})
                </>
              )}
            </Button>
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(["all", "math", "reading_writing"] as SectionFilter[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSection(s);
                    setTopic(null);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border-2 transition-colors",
                    section === s
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {s === "all" ? "All sections" : sectionLabel(s)}
                </button>
              ))}
            </div>

            {topics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {topics.map(([t, count]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTopic(topic === t ? null : t)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs border transition-colors",
                      topic === t
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {t} — {count}
                    {topic === t && <X className="w-3 h-3 inline ml-1" />}
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your mistakes..."
                className="pl-9"
              />
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading your mistakes...
            </div>
          ) : mistakes.length === 0 ? (
            <div className="p-8 rounded-2xl bg-card border border-border/50 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
              <h2 className="text-lg font-semibold text-foreground">
                No mistakes to review yet
              </h2>
              <p className="text-sm text-muted-foreground">
                Once you miss or skip a question, it shows up here with the correct answer and a
                full explanation.
              </p>
              <Button variant="hero" size="sm" asChild>
                <Link to="/dashboard/tests">
                  <Target className="w-4 h-4" />
                  Start practicing
                </Link>
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 rounded-2xl bg-card border border-border/50 text-center text-sm text-muted-foreground">
              No mistakes match these filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((m, index) => {
                const id = m.question.id;
                const isOpen = openId === id;
                return (
                  <div
                    key={id}
                    className="rounded-xl border border-border/50 bg-card overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : id)}
                      className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                    >
                      <span
                        className={cn(
                          "shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium mt-0.5",
                          m.question.section === "math"
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-purple-500/10 text-purple-500"
                        )}
                      >
                        {sectionLabel(m.question.section)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-foreground line-clamp-2">
                          <MathRenderer text={m.question.text} />
                        </span>
                        <span className="block text-xs text-muted-foreground mt-1">
                          {m.topic} •{" "}
                          {m.yourAnswer ? (
                            <>
                              You answered <span className="text-red-500">{m.yourAnswer}</span>
                            </>
                          ) : (
                            <span className="text-yellow-500">Skipped</span>
                          )}
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-muted-foreground shrink-0 transition-transform",
                          isOpen && "rotate-180"
                        )}
                      />
                    </button>

                    {isOpen && (
                      <div className="px-2 pb-4 sm:px-4">
                        <QuestionCard
                          question={m.question}
                          questionNumber={index + 1}
                          totalQuestions={filtered.length}
                          selectedAnswer={m.yourAnswer ?? undefined}
                          onAnswerChange={() => {}}
                          isFlagged={false}
                          onToggleFlag={() => {}}
                          showCorrectAnswer
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}

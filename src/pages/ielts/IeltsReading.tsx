import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageSeo } from "@/components/seo/PageSeo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  IeltsReadingSet,
  IeltsVariant,
  QUESTION_TYPE_LABELS,
  isReadingAnswerCorrect,
  readingBand,
} from "@/lib/ielts";

const TFNG = ["TRUE", "FALSE", "NOT GIVEN"];
const YNNG = ["YES", "NO", "NOT GIVEN"];

export default function IeltsReading() {
  const { user } = useAuth();
  const [variant, setVariant] = useState<IeltsVariant>("academic");
  const [passageCount, setPassageCount] = useState<1 | 3>(1);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [set, setSet] = useState<IeltsReadingSet | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const allQuestions = useMemo(
    () => (set ? set.passages.flatMap((p) => p.questions) : []),
    [set],
  );

  const correctCount = useMemo(
    () => allQuestions.filter((q) => isReadingAnswerCorrect(answers[q.id], q.answer)).length,
    [allQuestions, answers],
  );

  const band = submitted ? readingBand(correctCount, allQuestions.length, variant) : null;

  const generate = async () => {
    setLoading(true);
    setSubmitted(false);
    setAnswers({});
    setSet(null);
    try {
      const { data, error } = await supabase.functions.invoke("ielts-generate-reading", {
        body: { variant, passageCount, topic },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const generated: IeltsReadingSet = { ...data, variant };
      setSet(generated);

      if (user) {
        const { data: session } = await supabase
          .from("ielts_sessions")
          .insert([
            {
              user_id: user.id,
              skill: "reading",
              variant,
              mode: "practice",
              config: { passageCount, topic },
              content: generated as unknown as Record<string, unknown>,
            },
          ])
          .select("id")
          .maybeSingle();
        setSessionId(session?.id ?? null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the reading set.");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!set) return;
    setSubmitted(true);
    const score = allQuestions.filter((q) => isReadingAnswerCorrect(answers[q.id], q.answer)).length;
    const finalBand = readingBand(score, allQuestions.length, variant);
    if (sessionId) {
      await supabase
        .from("ielts_sessions")
        .update({
          answers,
          raw_score: score,
          band: finalBand,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", sessionId);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const optionsFor = (type: string, options: string[]) => {
    if (type === "true_false_not_given") return TFNG;
    if (type === "yes_no_not_given") return YNNG;
    return options;
  };

  return (
    <>
      <PageSeo
        title="IELTS Reading practice | AdaptivePrep"
        description="Practise IELTS Reading with original passages, official question types and instant band estimates."
        path="/dashboard/ielts/reading"
      />
      <DashboardLayout>
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">IELTS Reading</h1>
            <p className="text-muted-foreground">
              Original passages with the official question types, marked instantly.
            </p>
          </div>

          <Card className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Test type</Label>
                <Tabs value={variant} onValueChange={(v) => setVariant(v as IeltsVariant)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="academic" className="flex-1">Academic</TabsTrigger>
                    <TabsTrigger value="general" className="flex-1">General Training</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="space-y-2">
                <Label>Length</Label>
                <Tabs
                  value={String(passageCount)}
                  onValueChange={(v) => setPassageCount(v === "3" ? 3 : 1)}
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="1" className="flex-1">One passage</TabsTrigger>
                    <TabsTrigger value="3" className="flex-1">Full test (3)</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ielts-topic">Subject area (optional)</Label>
              <Input
                id="ielts-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. climate science, urban history"
                maxLength={120}
              />
            </div>
            <Button onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {set ? "New set" : "Build my set"}
            </Button>
          </Card>

          {submitted && band !== null && (
            <Card className="flex flex-col gap-3 border-primary/40 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estimated band</p>
                <p className="text-4xl font-bold text-primary">{band.toFixed(1)}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                {correctCount} of {allQuestions.length} correct
              </div>
              <Button variant="outline" onClick={generate} disabled={loading}>
                <RotateCcw className="mr-2 h-4 w-4" /> Try another set
              </Button>
            </Card>
          )}

          {set?.passages.map((passage) => (
            <Card key={passage.number} className="space-y-6 p-6">
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-foreground">
                  Passage {passage.number}: {passage.title}
                </h2>
                <div className="whitespace-pre-line leading-relaxed text-foreground">
                  {passage.text}
                </div>
              </div>

              <div className="space-y-6 border-t border-border pt-6">
                {passage.questions.map((q, index) => {
                  const given = answers[q.id] ?? "";
                  const correct = isReadingAnswerCorrect(given, q.answer);
                  const choices = optionsFor(q.type, q.options);
                  return (
                    <div key={q.id} className="space-y-3">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 font-semibold text-muted-foreground">{index + 1}.</span>
                        <div className="flex-1 space-y-2">
                          <p className="text-foreground">{q.prompt}</p>
                          <Badge variant="secondary" className="text-xs">
                            {QUESTION_TYPE_LABELS[q.type] ?? q.type}
                          </Badge>
                        </div>
                        {submitted &&
                          (correct ? (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          ))}
                      </div>

                      {choices.length > 0 ? (
                        <RadioGroup
                          value={given}
                          onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                          disabled={submitted}
                          className="ml-6 space-y-2"
                        >
                          {choices.map((option) => (
                            <div key={option} className="flex items-center gap-2">
                              <RadioGroupItem value={option} id={`${q.id}-${option}`} />
                              <Label htmlFor={`${q.id}-${option}`} className="font-normal">
                                {option}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      ) : (
                        <Input
                          className="ml-6 max-w-sm"
                          value={given}
                          disabled={submitted}
                          placeholder="Your answer (max three words)"
                          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                        />
                      )}

                      {submitted && (
                        <div className="ml-6 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                          <p className="text-foreground">
                            <span className="font-medium">Answer:</span> {q.answer}
                          </p>
                          <p className="mt-1 text-muted-foreground">{q.explanation}</p>
                          {q.evidence && (
                            <p className="mt-1 italic text-muted-foreground">"{q.evidence}"</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}

          {set && !submitted && (
            <Button size="lg" className="w-full" onClick={submit}>
              Submit answers
            </Button>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}

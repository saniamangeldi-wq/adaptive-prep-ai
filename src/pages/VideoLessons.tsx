import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { PageSeo } from "@/components/seo/PageSeo";
import { BookOpen, ArrowLeft, CheckCircle2, Circle, ChevronLeft, ChevronRight, Loader2, PlayCircle, Volume2, VolumeX, Pause, Play, Sparkles, Maximize2, Minimize2, SkipForward, SkipBack } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useTranslation } from "react-i18next";

function NarrationBar({
  text,
  lang,
  tts,
  autoPlay,
  onToggleAutoPlay,
}: {
  text: string;
  lang: string;
  tts: ReturnType<typeof useSpeechSynthesis>;
  autoPlay: boolean;
  onToggleAutoPlay: () => void;
}) {
  if (!text) return null;
  const fallback = tts.isLangFallback(lang);
  const playing = tts.speaking && !tts.paused;
  const handlePlayPause = () => {
    if (tts.speaking && !tts.paused) { tts.pause(); return; }
    if (tts.paused) { tts.resume(); return; }
    tts.speak(text, lang);
  };
  return (
    <div className="flex items-center gap-2 bg-muted/20 rounded-lg p-2 flex-wrap">
      <Volume2 className="h-4 w-4 text-primary shrink-0 ml-1" />
      <Button
        type="button"
        size="sm"
        variant={playing ? "secondary" : "default"}
        onClick={handlePlayPause}
        className="gap-1.5 h-8"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        {playing ? "Pause" : tts.paused ? "Resume" : "Play narration"}
      </Button>
      {(tts.speaking || tts.paused) && (
        <Button type="button" size="sm" variant="ghost" onClick={tts.stop} className="gap-1.5 h-8">
          <VolumeX className="h-3.5 w-3.5" /> Stop
        </Button>
      )}
      <label className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
        <input
          type="checkbox"
          checked={autoPlay}
          onChange={onToggleAutoPlay}
          className="h-3 w-3 accent-primary"
        />
        Auto-play
      </label>
      {playing && (
        <span className="text-[10px] text-primary/70 animate-pulse hidden sm:inline">speaking…</span>
      )}
      {fallback && lang === "kk" && (
        <span className="text-[10px] text-muted-foreground/70 hidden md:inline">Kazakh voice may be unavailable on this device</span>
      )}
    </div>
  );
}

type Vak = "visual" | "auditory" | "reading_writing" | "kinesthetic";


interface PrebuiltLesson {
  id: string;
  subject: "math" | "verbal";
  section: string;
  topic: string;
  title: string;
  objective: string;
  difficulty: "easy" | "medium" | "hard";
  order_index: number;
}

interface Slide {
  heading: string;
  bullets?: string[];
  narration?: string;
  example?: string | null;
  audio_url?: string;
}

interface Quiz {
  questions: { stem: string; choices: string[]; answer: number; explanation: string }[];
}

interface Progress {
  lesson_id: string;
  status: "not_started" | "in_progress" | "completed";
  last_slide_index: number;
  quiz_score: number | null;
  quiz_total: number | null;
}

const supa = supabase as any;

function LessonDetail({ lesson, onBack, defaultVak }: { lesson: PrebuiltLesson; onBack: () => void; defaultVak: Vak }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [vak, setVak] = useState<Vak>(defaultVak);
  const [slideIdx, setSlideIdx] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const { i18n } = useTranslation();
  const lang = (i18n.language || "en").slice(0, 2);
  const tts = useSpeechSynthesis();
  const [autoPlayNarration, setAutoPlayNarration] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("lesson.autoPlayNarration");
      return v === null ? true : v === "1"; // default ON so lessons have audio out of the box
    } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem("lesson.autoPlayNarration", autoPlayNarration ? "1" : "0"); } catch {}
  }, [autoPlayNarration]);

  const { data: variant, isLoading: loadingVariant } = useQuery({
    queryKey: ["variant", lesson.id, vak],
    queryFn: async () => {
      const { data, error } = await supa
        .from("prebuilt_lesson_variants")
        .select("content")
        .eq("lesson_id", lesson.id)
        .eq("vak_style", vak)
        .maybeSingle();
      if (error) throw error;
      return data?.content as { slides: Slide[] } | null;
    },
  });

  const { data: quiz } = useQuery({
    queryKey: ["quiz", lesson.id],
    queryFn: async () => {
      const { data, error } = await supa
        .from("prebuilt_lesson_quizzes")
        .select("questions")
        .eq("lesson_id", lesson.id)
        .maybeSingle();
      if (error) throw error;
      const raw = data?.questions as any;
      const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.questions) ? raw.questions : [];
      return arr as Quiz["questions"];
    },
  });

  const saveProgress = useMutation({
    mutationFn: async (updates: Partial<Progress>) => {
      if (!user) return;
      const row = { user_id: user.id, lesson_id: lesson.id, ...updates };
      await supa.from("student_lesson_progress").upsert(row, { onConflict: "user_id,lesson_id" });
      qc.invalidateQueries({ queryKey: ["lesson-progress", user.id] });
    },
  });

  useEffect(() => {
    saveProgress.mutate({ status: "in_progress", last_slide_index: slideIdx });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideIdx]);

  // Stop any active narration when slide changes; optionally auto-play new slide
  useEffect(() => {
    tts.stop();
    if (!autoPlayNarration) return;
    const s = slides[slideIdx];
    if (!s || s.audio_url) return; // audio_url handled by <audio> element
    const text = s.narration || [s.heading, ...(s.bullets || []), s.example || ""].filter(Boolean).join(". ");
    if (text) tts.speak(text, lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideIdx, variant?.slides]);

  const slides = variant?.slides ?? [];
  const total = slides.length;
  const slide = slides[slideIdx];

  if (loadingVariant) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </DashboardLayout>
    );
  }

  if (showQuiz && Array.isArray(quiz) && quiz.length > 0) {
    const correct = quiz.filter((q, i) => answers[i] === q.answer).length;
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-4">
          <Button variant="ghost" className="gap-2" onClick={() => setShowQuiz(false)}>
            <ArrowLeft className="h-4 w-4" /> Back to lesson
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{lesson.title} — Quiz</h1>
          {quiz.map((q, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <p className="font-medium text-foreground">{i + 1}. {q.stem}</p>
                <div className="space-y-2">
                  {q.choices.map((c, ci) => {
                    const chosen = answers[i] === ci;
                    const isRight = submitted && ci === q.answer;
                    const isWrong = submitted && chosen && ci !== q.answer;
                    return (
                      <button
                        key={ci}
                        disabled={submitted}
                        onClick={() => setAnswers(prev => ({ ...prev, [i]: ci }))}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-colors flex items-start gap-2",
                          isRight ? "border-primary bg-primary/10" :
                          isWrong ? "border-destructive bg-destructive/10" :
                          chosen ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                        )}
                      >
                        <span className="text-sm font-medium text-muted-foreground">{String.fromCharCode(65 + ci)}.</span>
                        <span className="text-sm flex-1">{c}</span>
                      </button>
                    );
                  })}
                </div>
                {submitted && (
                  <p className="text-sm text-muted-foreground border-l-2 border-primary/40 pl-3">{q.explanation}</p>
                )}
              </CardContent>
            </Card>
          ))}
          {!submitted ? (
            <Button
              className="w-full"
              disabled={Object.keys(answers).length < quiz.length}
              onClick={() => {
                setSubmitted(true);
                const c = quiz.filter((q, i) => answers[i] === q.answer).length;
                saveProgress.mutate({ status: "completed", quiz_score: c, quiz_total: quiz.length, completed_at: new Date().toISOString() as any } as any);
                toast({ title: `${c} / ${quiz.length} correct`, description: c === quiz.length ? "Perfect!" : "Review the explanations below." });
              }}
            >
              Submit Quiz
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onBack}>Back to Lessons</Button>
              <Button className="flex-1" onClick={() => { setAnswers({}); setSubmitted(false); }}>Retake</Button>
            </div>
          )}
          {submitted && <p className="text-center text-sm text-muted-foreground">Score: {correct} / {quiz.length}</p>}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-4">

        <div className="flex items-center justify-between">
          <Button variant="ghost" className="gap-2" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> Back to Lessons
          </Button>
          <Select value={vak} onValueChange={(v) => { setVak(v as Vak); setSlideIdx(0); }}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="visual">Visual</SelectItem>
              <SelectItem value="auditory">Auditory</SelectItem>
              <SelectItem value="reading_writing">Reading/Writing</SelectItem>
              <SelectItem value="kinesthetic">Kinesthetic</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">{lesson.title}</h1>
          <div className="flex flex-wrap gap-2 mt-1">
            <Badge variant="outline" className="capitalize">SAT {lesson.subject}</Badge>
            <Badge variant="outline">{lesson.section}</Badge>
            <Badge variant="outline">{lesson.topic}</Badge>
            <Badge variant="secondary" className="capitalize">{lesson.difficulty}</Badge>
          </div>
        </div>

        {total > 0 && (
          <>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Slide {slideIdx + 1} of {total}</span>
                <span>{Math.round(((slideIdx + 1) / total) * 100)}%</span>
              </div>
              <Progress value={((slideIdx + 1) / total) * 100} className="h-1.5" />
            </div>

            <Card className="border-border/60 shadow-xl bg-card">
              <CardContent className="p-8 md:p-12 space-y-6 min-h-[520px] flex flex-col justify-center">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">{slide.heading}</h2>
                {slide.bullets && slide.bullets.length > 0 && (
                  <ul className="space-y-4 max-w-3xl">
                    {slide.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-3 text-lg md:text-xl leading-relaxed text-foreground">
                        <span className="mt-2.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {slide.narration && (
                  <p className="text-base md:text-lg text-muted-foreground italic border-l-4 border-primary/50 pl-4 max-w-3xl leading-relaxed">{slide.narration}</p>
                )}
                {slide.audio_url ? (
                  <div className="flex items-center gap-2 bg-muted/20 rounded-lg p-2">
                    <Volume2 className="h-4 w-4 text-primary shrink-0 ml-1" />
                    <audio
                      key={slide.audio_url}
                      controls
                      autoPlay
                      src={slide.audio_url}
                      className="w-full h-8"
                    />
                  </div>
                ) : tts.supported ? (
                  <NarrationBar
                    text={slide.narration || [slide.heading, ...(slide.bullets || []), slide.example || ""].filter(Boolean).join(". ")}
                    lang={lang}
                    tts={tts}
                    autoPlay={autoPlayNarration}
                    onToggleAutoPlay={() => setAutoPlayNarration(v => !v)}
                  />
                ) : null}
                {slide.example && slide.example.trim() && slide.example.trim().toUpperCase() !== "N/A" && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 md:p-6 space-y-2">
                    <span className="text-xs uppercase tracking-wider text-primary font-semibold">Example</span>
                    <p className="text-base md:text-lg text-foreground whitespace-pre-wrap leading-relaxed">{slide.example}</p>
                  </div>
                )}
              </CardContent>
            </Card>


            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" disabled={slideIdx === 0} onClick={() => setSlideIdx(i => i - 1)} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              {slideIdx < total - 1 ? (
                <Button onClick={() => setSlideIdx(i => i + 1)} className="gap-2">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => setShowQuiz(true)} className="gap-2">
                  Take Quiz <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function VideoLessons() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [selected, setSelected] = useState<PrebuiltLesson | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [genProgress, setGenProgress] = useState<{ done: number; total: number } | null>(null);
  const isAdmin = (profile as any)?.role === "school_admin" || (profile as any)?.role === "admin";

  const vak: Vak = useMemo(() => {
    const s = (profile as any)?.learning_style;
    if (s === "visual" || s === "auditory" || s === "reading_writing" || s === "kinesthetic") return s;
    return "visual";
  }, [profile]);

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["prebuilt-lessons"],
    queryFn: async () => {
      const { data, error } = await supa
        .from("prebuilt_lessons")
        .select("*")
        .order("subject").order("order_index");
      if (error) throw error;
      return data as PrebuiltLesson[];
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["lesson-progress", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supa
        .from("student_lesson_progress")
        .select("lesson_id, status, last_slide_index, quiz_score, quiz_total")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []) as Progress[];
    },
    enabled: !!user,
  });

  const progressMap = useMemo(() => {
    const m = new Map<string, Progress>();
    progress.forEach(p => m.set(p.lesson_id, p));
    return m;
  }, [progress]);

  if (selected) {
    return <LessonDetail lesson={selected} onBack={() => setSelected(null)} defaultVak={vak} />;
  }

  const renderList = (subj: "math" | "verbal") => {
    const filtered = lessons.filter(l => l.subject === subj && (sectionFilter === "all" || l.section === sectionFilter));
    const sections = Array.from(new Set(lessons.filter(l => l.subject === subj).map(l => l.section)));
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={sectionFilter === "all" ? "default" : "outline"} onClick={() => setSectionFilter("all")}>All</Button>
          {sections.map(s => (
            <Button key={s} size="sm" variant={sectionFilter === s ? "default" : "outline"} onClick={() => setSectionFilter(s)}>{s}</Button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((l) => {
            const p = progressMap.get(l.id);
            const completed = p?.status === "completed";
            return (
              <Card key={l.id} className="hover:border-primary/40 cursor-pointer transition-colors" onClick={() => setSelected(l)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {completed
                          ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <h3 className="font-medium text-foreground truncate">{l.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{l.section} · {l.topic}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs capitalize">{l.difficulty}</Badge>
                        {p?.quiz_score != null && (
                          <span className="text-xs text-muted-foreground">Quiz: {p.quiz_score}/{p.quiz_total}</span>
                        )}
                      </div>
                    </div>
                    <PlayCircle className="h-5 w-5 text-primary shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <PageSeo title="Lessons | AdaptivePrep" description="100 SAT lessons personalized to your learning style — saved to your account." path="/dashboard/lessons" />
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Lessons
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              100 SAT lessons adapted to your learning style ({vak.replace("_", "/")}). Progress saves automatically.
            </p>
          </div>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 shrink-0"
              disabled={!!genProgress}
              onClick={async () => {
                const ids = lessons.map(l => l.id);
                setGenProgress({ done: 0, total: ids.length });
                let ok = 0, fail = 0;
                for (let i = 0; i < ids.length; i++) {
                  try {
                    const { error } = await supabase.functions.invoke("generate-lesson-audio", {
                      body: { lesson_id: ids[i] },
                    });
                    if (error) { fail++; console.error(error); } else { ok++; }
                  } catch (e) { fail++; console.error(e); }
                  setGenProgress({ done: i + 1, total: ids.length });
                }
                setGenProgress(null);
                toast({ title: "Audio generation complete", description: `${ok} lessons ok, ${fail} failed.` });
              }}
            >
              {genProgress ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {genProgress.done}/{genProgress.total}</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Generate audio (admin)</>
              )}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="math" onValueChange={() => setSectionFilter("all")}>
            <TabsList>
              <TabsTrigger value="math">SAT Math (50)</TabsTrigger>
              <TabsTrigger value="verbal">SAT Verbal (50)</TabsTrigger>
            </TabsList>
            <TabsContent value="math" className="mt-4">{renderList("math")}</TabsContent>
            <TabsContent value="verbal" className="mt-4">{renderList("verbal")}</TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}

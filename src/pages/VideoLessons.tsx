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
import { BookOpen, ArrowLeft, CheckCircle2, Circle, ChevronLeft, ChevronRight, Loader2, PlayCircle, Volume2, VolumeX, Pause, Play, Sparkles, Maximize2, Minimize2, SkipForward, SkipBack, X, Gauge, LayoutGrid, RotateCcw, RotateCw, Repeat } from "lucide-react";
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

type Vak = "visual" | "auditory" | "kinesthetic";


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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [showChapters, setShowChapters] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);
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

  const slides = variant?.slides ?? [];
  const total = slides.length;
  const slide = slides[slideIdx];

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

  // Auto-advance when narration finishes (video-style playback)
  const wasSpeakingRef = useRef(false);
  useEffect(() => {
    if (tts.speaking) wasSpeakingRef.current = true;
    if (!tts.speaking && !tts.paused && wasSpeakingRef.current && autoPlayNarration) {
      wasSpeakingRef.current = false;
      if (slideIdx < total - 1) {
        setSlideIdx(i => Math.min(i + 1, total - 1));
      }
    }
  }, [tts.speaking, tts.paused, autoPlayNarration, slideIdx, total]);

  // Fullscreen state — track vendor-prefixed events for cross-browser reliability
  useEffect(() => {
    const onFs = () => {
      const el =
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement ||
        (document as any).mozFullScreenElement;
      setIsFullscreen(!!el);
    };
    const events = ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"];
    events.forEach(e => document.addEventListener(e, onFs));
    return () => events.forEach(e => document.removeEventListener(e, onFs));
  }, []);
  const enterFullscreen = async () => {
    const node = videoRef.current as any;
    if (!node) return;
    try {
      const req = node.requestFullscreen || node.webkitRequestFullscreen || node.msRequestFullscreen || node.mozRequestFullScreen;
      if (req) await req.call(node);
    } catch (e) {
      console.warn("Fullscreen request failed", e);
      toast({ title: "Fullscreen unavailable", description: "Your browser blocked fullscreen for this page." });
    }
  };
  const exitFullscreen = async () => {
    const doc = document as any;
    try {
      const exit = document.exitFullscreen || doc.webkitExitFullscreen || doc.msExitFullscreen || doc.mozCancelFullScreen;
      if (exit) await exit.call(document);
    } catch (e) { console.warn(e); }
  };
  const toggleFullscreen = () => {
    const active =
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).msFullscreenElement ||
      (document as any).mozFullScreenElement;
    if (active) exitFullscreen(); else enterFullscreen();
  };

  // Esc handler as an additional exit path (some browsers don't fire fullscreenchange reliably on secondary monitors)
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") exitFullscreen(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);



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
          <Badge variant="outline" className="capitalize">{vak} mode</Badge>
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

        {total > 0 && (() => {
          const narrationText = slide.narration || [slide.heading, ...(slide.bullets || []), slide.example || ""].filter(Boolean).join(". ");
          const isPlaying = tts.speaking && !tts.paused;
          const isPaused = tts.paused;
          const handlePlayPause = () => {
            if (slide.audio_url) return;
            if (isPlaying) { tts.pause(); return; }
            if (tts.paused) { tts.resume(); return; }
            if (narrationText) tts.speak(narrationText, lang);
          };
          const handleVideoKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.code !== "Space") return;
            const target = event.target as HTMLElement;
            if (["BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
            event.preventDefault();
            handlePlayPause();
          };
          return (
            <>
              <div
                ref={videoRef}
                tabIndex={0}
                role="region"
                aria-label="Lesson video player"
                onClick={(event) => {
                  const target = event.target as HTMLElement;
                  if (target.closest("button, input, select, [role='combobox']")) return;
                  videoRef.current?.focus();
                  handlePlayPause();
                }}
                onKeyDown={handleVideoKeyDown}
                className={cn(
                  "relative rounded-2xl overflow-hidden border border-border/60 shadow-2xl bg-[#0B0D14] group focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer",
                  isFullscreen ? "h-screen" : ""
                )}
              >
                {/* Animated gradient background */}
                <div className="absolute inset-0 opacity-70">
                  <div className="absolute -inset-20 bg-[radial-gradient(circle_at_20%_30%,hsl(var(--primary)/0.25),transparent_45%),radial-gradient(circle_at_80%_70%,hsl(var(--primary)/0.18),transparent_50%),radial-gradient(circle_at_50%_100%,hsl(var(--primary)/0.12),transparent_60%)] animate-[pulse_8s_ease-in-out_infinite]" />
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-background/40 to-background/80" />
                </div>
                {/* Grain overlay */}
                <div
                  className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
                  style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" }}
                />

                {/* Scene content */}
                <div
                  key={slideIdx}
                  className={cn(
                    "relative z-10 flex flex-col justify-center animate-fade-in",
                    isFullscreen ? "px-16 py-20 min-h-screen" : "px-8 md:px-14 py-14 md:py-20 min-h-[560px]"
                  )}
                >
                  <div className="max-w-4xl mx-auto w-full space-y-8">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary/80 font-semibold animate-fade-in">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      Scene {slideIdx + 1} · {lesson.topic}
                    </div>
                    <h2
                      className="text-4xl md:text-6xl font-bold text-foreground leading-[1.05] tracking-tight animate-fade-in"
                      style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
                    >
                      {slide.heading}
                    </h2>
                    {slide.bullets && slide.bullets.length > 0 && (
                      <ul className="space-y-4 md:space-y-5">
                        {slide.bullets.map((b, i) => (
                          <li
                            key={`${slideIdx}-${i}`}
                            className="flex items-start gap-4 text-lg md:text-2xl leading-relaxed text-foreground/95 animate-fade-in"
                            style={{ animationDelay: `${300 + i * 450}ms`, animationFillMode: "backwards" }}
                          >
                            <span className="mt-3 h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))] shrink-0" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {slide.example && slide.example.trim() && slide.example.trim().toUpperCase() !== "N/A" && (
                      <div
                        className="mt-2 rounded-2xl border border-primary/30 bg-primary/5 backdrop-blur-sm p-5 md:p-7 animate-fade-in"
                        style={{ animationDelay: `${300 + (slide.bullets?.length || 0) * 450 + 100}ms`, animationFillMode: "backwards" }}
                      >
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">
                          <Sparkles className="h-3.5 w-3.5" /> Worked Example
                        </div>
                        <p className="text-base md:text-lg text-foreground whitespace-pre-wrap leading-relaxed">{slide.example}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Captions band with word-by-word highlighting */}
                {showCaptions && tts.currentText && (
                  <div className="absolute left-0 right-0 bottom-24 px-6 z-20 pointer-events-none">
                    <div className="mx-auto max-w-3xl text-center">
                      <span className="inline-block px-4 py-2 rounded-md bg-black/70 backdrop-blur-sm text-white/80 text-sm md:text-base leading-relaxed">
                        {(() => {
                          const text = tts.currentText;
                          const idx = tts.charIndex;
                          const len = tts.charLength;
                          if (idx < 0 || idx >= text.length) return text;
                          const before = text.slice(0, idx);
                          const word = text.slice(idx, idx + (len || 0));
                          const after = text.slice(idx + (len || 0));
                          return (
                            <>
                              <span className="text-white/60">{before}</span>
                              <span className="text-white font-semibold bg-primary/40 rounded px-1">
                                {word}
                              </span>
                              <span className="text-white/40">{after}</span>
                            </>
                          );
                        })()}
                      </span>
                    </div>
                  </div>
                )}


                {/* Big center play button when paused/stopped */}
                {(!isPlaying || isPaused) && !slide.audio_url && (
                  <button
                    onClick={handlePlayPause}
                    className="absolute inset-0 z-20 flex items-center justify-center group/play"
                    aria-label={isPaused ? "Resume" : "Play"}
                  >
                    <span className="h-20 w-20 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground flex items-center justify-center shadow-2xl transition-transform group-hover/play:scale-110">
                      <Play className="h-9 w-9 ml-1" fill="currentColor" />
                    </span>
                  </button>
                )}

                {/* Prominent exit-fullscreen button (only visible in fullscreen) */}
                {isFullscreen && (
                  <button
                    onClick={(e) => { e.stopPropagation(); exitFullscreen(); }}
                    className="absolute top-4 right-4 z-40 flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/70 hover:bg-black/90 text-white text-xs font-medium border border-white/20 backdrop-blur-sm shadow-lg"
                    aria-label="Exit fullscreen"
                  >
                    <X className="h-4 w-4" /> Exit fullscreen
                    <span className="hidden md:inline text-white/50 ml-1 text-[10px]">Esc</span>
                  </button>
                )}

                {/* Chapter thumbnail strip */}
                {showChapters && (
                  <div className="absolute left-0 right-0 bottom-[92px] z-30 px-3 md:px-5 pb-2">
                    <div className="mx-auto max-w-[95%] rounded-xl bg-black/80 backdrop-blur-md border border-white/10 p-3 shadow-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-white/60 font-semibold">Chapters · {total}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowChapters(false); }}
                          className="text-white/50 hover:text-white p-1 rounded"
                          aria-label="Close chapters"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1 scroll-smooth">
                        {slides.map((s, i) => {
                          const active = i === slideIdx;
                          const done = i < slideIdx;
                          return (
                            <button
                              key={i}
                              onClick={(e) => { e.stopPropagation(); setSlideIdx(i); }}
                              className={cn(
                                "shrink-0 w-44 h-24 rounded-lg text-left p-2 border transition-all relative overflow-hidden group/thumb",
                                active
                                  ? "border-primary bg-primary/15 shadow-[0_0_0_2px_hsl(var(--primary)/0.4)]"
                                  : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                              )}
                              aria-label={`Jump to scene ${i + 1}: ${s.heading}`}
                            >
                              <div className="absolute inset-0 opacity-40">
                                <div className={cn(
                                  "absolute -inset-6",
                                  active
                                    ? "bg-[radial-gradient(circle_at_30%_30%,hsl(var(--primary)/0.5),transparent_60%)]"
                                    : "bg-[radial-gradient(circle_at_30%_30%,hsl(var(--primary)/0.2),transparent_60%)]"
                                )} />
                              </div>
                              <div className="relative flex items-center gap-1.5 mb-1">
                                <span className={cn(
                                  "text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded",
                                  active ? "bg-primary text-primary-foreground" : "bg-white/15 text-white/80"
                                )}>
                                  {String(i + 1).padStart(2, "0")}
                                </span>
                                {done && <CheckCircle2 className="h-3 w-3 text-primary" />}
                                {active && (
                                  <span className="text-[8px] uppercase tracking-widest text-primary font-bold ml-auto">Now</span>
                                )}
                              </div>
                              <div className="relative text-[11px] leading-tight text-white/90 font-medium line-clamp-3">
                                {s.heading}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Player chrome */}
                <div className="absolute left-0 right-0 bottom-0 z-30 bg-gradient-to-t from-black/85 via-black/50 to-transparent pt-10 pb-3 px-4 md:px-6">
                  {/* Chapter scrubber */}
                  <div className="flex items-center gap-1 mb-3">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSlideIdx(i)}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-all",
                          i < slideIdx ? "bg-primary" :
                          i === slideIdx ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]" :
                          "bg-white/25 hover:bg-white/40"
                        )}
                        aria-label={`Go to scene ${i + 1}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <button
                      onClick={() => setSlideIdx(i => Math.max(0, i - 1))}
                      disabled={slideIdx === 0}
                      className="p-2 rounded hover:bg-white/10 disabled:opacity-30"
                      aria-label="Previous scene"
                      title="Previous scene"
                    >
                      <SkipBack className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => tts.seekBy(-10)}
                      disabled={!tts.speaking && !tts.paused}
                      className="p-2 rounded hover:bg-white/10 disabled:opacity-30 relative"
                      aria-label="Rewind 10 seconds"
                      title="Rewind 10s"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span className="absolute -bottom-0.5 -right-0.5 text-[8px] font-bold bg-black/60 rounded px-0.5">10</span>
                    </button>
                    <button
                      onClick={handlePlayPause}
                      className="p-2.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      aria-label={isPlaying ? "Pause" : isPaused ? "Resume" : "Play"}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4 ml-0.5" fill="currentColor" />}
                    </button>
                    <button
                      onClick={() => tts.seekBy(10)}
                      disabled={!tts.speaking && !tts.paused}
                      className="p-2 rounded hover:bg-white/10 disabled:opacity-30 relative"
                      aria-label="Forward 10 seconds"
                      title="Forward 10s"
                    >
                      <RotateCw className="h-4 w-4" />
                      <span className="absolute -bottom-0.5 -right-0.5 text-[8px] font-bold bg-black/60 rounded px-0.5">10</span>
                    </button>
                    <button
                      onClick={() => tts.replay()}
                      className="p-2 rounded hover:bg-white/10"
                      aria-label="Replay scene from start"
                      title="Replay from start"
                    >
                      <Repeat className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (slideIdx < total - 1) setSlideIdx(i => i + 1);
                        else setShowQuiz(true);
                      }}
                      className="p-2 rounded hover:bg-white/10"
                      aria-label="Next scene"
                      title="Next scene"
                    >
                      <SkipForward className="h-4 w-4" />
                    </button>
                    <span className="text-xs text-white/80 tabular-nums ml-1">
                      {slideIdx + 1} / {total}
                    </span>

                    <div className="ml-auto flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowChapters(v => !v); }}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold border transition-colors",
                          showChapters ? "border-primary text-primary bg-primary/10" : "border-white/30 text-white/70 hover:text-white hover:border-white/60"
                        )}
                        aria-label="Toggle chapters"
                      >
                        <LayoutGrid className="h-3 w-3" /> Chapters
                      </button>
                      <button
                        onClick={() => setShowCaptions(v => !v)}
                        className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold border transition-colors",
                          showCaptions ? "border-white/70 text-white" : "border-white/30 text-white/50"
                        )}
                        aria-label="Toggle captions"
                      >
                        CC
                      </button>
                      {/* Playback speed */}
                      <div className="flex items-center gap-0.5 rounded border border-white/20 overflow-hidden">
                        <Gauge className="h-3.5 w-3.5 text-white/60 ml-1.5 mr-0.5" />
                        {[0.75, 1, 1.25, 1.5].map((r) => (
                          <button
                            key={r}
                            onClick={() => tts.setRate(r)}
                            className={cn(
                              "px-1.5 py-1 text-[10px] font-semibold tabular-nums transition-colors",
                              Math.abs(tts.rate - r) < 0.01
                                ? "bg-primary text-primary-foreground"
                                : "text-white/70 hover:bg-white/10"
                            )}
                            aria-label={`Playback speed ${r}x`}
                          >
                            {r}x
                          </button>
                        ))}
                      </div>
                      <label className="flex items-center gap-1.5 text-[11px] text-white/80 cursor-pointer select-none px-2">
                        <input
                          type="checkbox"
                          checked={autoPlayNarration}
                          onChange={() => setAutoPlayNarration(v => !v)}
                          className="h-3 w-3 accent-primary"
                        />
                        Autoplay
                      </label>
                      <button
                        onClick={tts.stop}
                        className="p-2 rounded hover:bg-white/10"
                        aria-label="Stop"
                      >
                        <VolumeX className="h-4 w-4" />
                      </button>
                      <button
                        onClick={toggleFullscreen}
                        className="p-2 rounded hover:bg-white/10"
                        aria-label="Toggle fullscreen"
                      >
                        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hidden native audio player for pre-generated audio */}
                {slide.audio_url && (
                  <audio
                    key={slide.audio_url}
                    autoPlay
                    src={slide.audio_url}
                    className="hidden"
                    onEnded={() => {
                      if (autoPlayNarration && slideIdx < total - 1) {
                        window.setTimeout(() => setSlideIdx(i => i + 1), 900);
                      }
                    }}
                  />
                )}
              </div>

              {slideIdx === total - 1 && (
                <div className="flex justify-end">
                  <Button onClick={() => setShowQuiz(true)} className="gap-2">
                    Take Quiz <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          );
        })()}
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
    if (s === "visual" || s === "auditory" || s === "kinesthetic") return s;
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

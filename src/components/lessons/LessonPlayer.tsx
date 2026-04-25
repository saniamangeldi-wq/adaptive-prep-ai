import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { LessonSlide } from "./LessonSlide";
import { VisualCheckpoint } from "./checkpoints/VisualCheckpoint";
import { KinestheticCheckpoint } from "./checkpoints/KinestheticCheckpoint";
import { ReadingWritingCheckpoint } from "./checkpoints/ReadingWritingCheckpoint";
import { AuditoryCheckpoint } from "./checkpoints/AuditoryCheckpoint";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  BookOpen,
  Maximize2,
  Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { Loader2, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlideData {
  slide_type: "title" | "content" | "example" | "summary";
  heading: string;
  subheading?: string;
  bullets?: string[];
  highlight_terms?: string[];
  equation?: string;
  code_snippet?: string;
  note?: string;
}

interface LessonSection {
  section_title: string;
  narration: string;
  slide: SlideData;
  duration_estimate_seconds: number;
}

interface CheckpointQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  after_section: number;
}

interface LessonContent {
  title: string;
  subtitle?: string;
  sections: LessonSection[];
  checkpoint_questions: CheckpointQuestion[];
  key_takeaways: string[];
  estimated_duration_seconds: number;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

interface NarratedSection {
  section_index: number;
  audio_url?: string;
  audio_base64?: string;
  word_timestamps?: WordTimestamp[];
  status: string;
}

interface LessonPlayerProps {
  lessonId: string;
  content: LessonContent;
  narratedSections?: NarratedSection[];
  onComplete?: () => void;
  vakStyle?: string;
}

type BufferDuration = "3" | "5" | "10" | "manual";

export function LessonPlayer({
  lessonId: _lessonId,
  content,
  narratedSections = [],
  onComplete,
  vakStyle,
}: LessonPlayerProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showCheckpoint, setShowCheckpoint] = useState<CheckpointQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answeredCheckpoints, setAnsweredCheckpoints] = useState<Set<number>>(new Set());
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNarration, setShowNarration] = useState(false);

  // Buffer state
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferCountdown, setBufferCountdown] = useState(0);
  const [bufferDuration, setBufferDuration] = useState<BufferDuration>("5");
  // When audio ends, lock narrationProgress at 1.0 so all content stays visible
  const [audioEnded, setAudioEnded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleSectionCompleteRef = useRef<() => void>(() => {});
  const bufferIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();
  const { speak: ttsSpeak, stop: ttsStop, isPlaying: ttsPlaying, isLoading: ttsLoading } = useTextToSpeech();

  const section = content.sections[currentSection];
  const narratedSection = narratedSections.find(s => s.section_index === currentSection);
  const hasAudio = !!narratedSection?.audio_url || !!narratedSection?.audio_base64;
  const totalSections = content.sections.length;
  const progressPct = (completedSections.size / totalSections) * 100;
  const wordTimestamps = narratedSection?.word_timestamps || [];

  // narrationProgress: 1.0 when audio ended so everything stays visible
  const narrationProgress = audioEnded ? 1.0 : (duration > 0 ? currentTime / duration : 0);

  // Cancel any active buffer countdown
  const cancelBuffer = useCallback(() => {
    if (bufferIntervalRef.current) {
      clearInterval(bufferIntervalRef.current);
      bufferIntervalRef.current = null;
    }
    setIsBuffering(false);
    setBufferCountdown(0);
  }, []);

  // Start buffer countdown then advance
  const startBufferCountdown = useCallback((nextAction: () => void) => {
    if (bufferDuration === "manual") {
      // In manual mode, just show the buffer bar — user must click Continue
      setIsBuffering(true);
      setBufferCountdown(-1); // -1 signals "manual"
      // Store the action so Continue can call it
      handleSectionCompleteRef.current = nextAction;
      return;
    }

    const seconds = parseInt(bufferDuration, 10);
    setIsBuffering(true);
    setBufferCountdown(seconds);

    const interval = setInterval(() => {
      setBufferCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          bufferIntervalRef.current = null;
          setIsBuffering(false);
          nextAction();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    bufferIntervalRef.current = interval;
  }, [bufferDuration]);

  // Keep handleSectionComplete in a ref to avoid stale closures in audio event listeners
  const handleSectionComplete = useCallback(() => {
    setCompletedSections(prev => new Set([...prev, currentSection]));

    const checkpoint = content.checkpoint_questions.find(
      q => q.after_section === currentSection && !answeredCheckpoints.has(q.after_section)
    );

    if (checkpoint) {
      setShowCheckpoint(checkpoint);
      setSelectedAnswer(null);
    } else if (currentSection < totalSections - 1) {
      setCurrentSection(prev => prev + 1);
    } else {
      onComplete?.();
    }
  }, [currentSection, content.checkpoint_questions, answeredCheckpoints, totalSections, onComplete]);

  // Update ref whenever callback changes
  useEffect(() => {
    handleSectionCompleteRef.current = handleSectionComplete;
  }, [handleSectionComplete]);

  // Audio setup for current section
  useEffect(() => {
    cancelBuffer();
    setAudioEnded(false);
    ttsStop();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audioUrl = narratedSection?.audio_url;
    const audioBase64 = narratedSection?.audio_base64;

    if (audioUrl) {
      audioRef.current = new Audio(audioUrl);
    } else if (audioBase64) {
      audioRef.current = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
    }

    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      audioRef.current.addEventListener("timeupdate", () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      });
      audioRef.current.addEventListener("loadedmetadata", () => {
        setDuration(audioRef.current?.duration || 0);
      });
      audioRef.current.addEventListener("ended", () => {
        setIsPlaying(false);
        setAudioEnded(true); // lock narrationProgress at 1.0
        // Start buffer countdown instead of immediately advancing
        startBufferCountdown(() => handleSectionCompleteRef.current());
      });
    }

    setCurrentTime(0);
    setDuration(0);

    return () => { audioRef.current?.pause(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSection]);

  // Pre-load next slide's audio
  useEffect(() => {
    if (currentSection < totalSections - 1) {
      const nextNarrated = narratedSections.find(s => s.section_index === currentSection + 1);
      if (nextNarrated?.audio_url) {
        preloadRef.current = new Audio();
        preloadRef.current.preload = "auto";
        preloadRef.current.src = nextNarrated.audio_url;
      }
    }
    return () => { preloadRef.current = null; };
  }, [currentSection, narratedSections, totalSections]);

  // Auto-play on mount and on slide change
  useEffect(() => {
    if (hasAudio && audioRef.current) {
      const timer = setTimeout(() => {
        audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
      }, currentSection === 0 ? 300 : 100);
      return () => clearTimeout(timer);
    }
  }, [currentSection, hasAudio]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted]);

  // Fullscreen
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  const togglePlay = () => {
    if (!audioRef.current) {
      toast({ title: "No audio available", description: "Audio for this slide is missing." });
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const goToPrevious = () => {
    if (currentSection > 0) {
      cancelBuffer();
      setShowCheckpoint(null);
      setCurrentSection(prev => prev - 1);
    }
  };

  const goToNext = () => {
    if (currentSection < totalSections - 1) {
      cancelBuffer();
      handleSectionComplete();
    }
  };

  const handleBufferSkip = () => {
    cancelBuffer();
    handleSectionCompleteRef.current();
  };

  const submitCheckpointAnswer = () => {
    if (selectedAnswer === null || !showCheckpoint) return;
    setAnsweredCheckpoints(prev => new Set([...prev, showCheckpoint.after_section]));
    const isCorrect = selectedAnswer === showCheckpoint.correct_index;
    toast({
      title: isCorrect ? "Correct! 🎉" : "Not quite",
      description: showCheckpoint.explanation,
      variant: isCorrect ? "default" : "destructive",
    });
    setTimeout(() => {
      setShowCheckpoint(null);
      if (currentSection < totalSections - 1) setCurrentSection(prev => prev + 1);
      else onComplete?.();
    }, 2000);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

  const handleCheckpointAnswer = (correct: boolean) => {
    if (!showCheckpoint) return;
    setAnsweredCheckpoints(prev => new Set([...prev, showCheckpoint.after_section]));
    toast({
      title: correct ? "Correct! 🎉" : "Not quite",
      description: showCheckpoint.explanation,
      variant: correct ? "default" : "destructive",
    });
    setTimeout(() => {
      setShowCheckpoint(null);
      if (currentSection < totalSections - 1) setCurrentSection(prev => prev + 1);
      else onComplete?.();
    }, 500);
  };

  if (showCheckpoint) {
    const cp = showCheckpoint as any;
    const renderVAKCheckpoint = () => {
      if (cp.question_type === "diagram_label") return <VisualCheckpoint checkpoint={cp} onAnswer={handleCheckpointAnswer} />;
      if (cp.question_type === "scenario_decision") return <KinestheticCheckpoint checkpoint={cp} onAnswer={handleCheckpointAnswer} />;
      if (cp.question_type === "text_analysis") return <ReadingWritingCheckpoint checkpoint={cp} onAnswer={handleCheckpointAnswer} />;
      if (vakStyle === "auditory") return <AuditoryCheckpoint checkpoint={cp} onAnswer={handleCheckpointAnswer} />;
      return null;
    };

    const vakCheckpoint = renderVAKCheckpoint();

    return (
      <Card className="border-primary/30 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-primary" />
            Checkpoint Question
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {vakCheckpoint || (
            <>
              <p className="text-foreground font-medium">{showCheckpoint.question}</p>
              <div className="space-y-2">
                {showCheckpoint.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedAnswer(idx)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors",
                      selectedAnswer === idx ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <span className="text-sm font-medium text-muted-foreground mr-2">{String.fromCharCode(65 + idx)}.</span>
                    {opt}
                  </button>
                ))}
              </div>
              <Button onClick={submitCheckpointAnswer} disabled={selectedAnswer === null} className="w-full">
                Submit Answer
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  const bufferSeconds = bufferDuration === "manual" ? 5 : parseInt(bufferDuration, 10);

  return (
    <div ref={containerRef} className={cn("space-y-4", isFullscreen && "bg-background p-6 flex flex-col h-screen")}>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Slide {currentSection + 1} of {totalSections}</span>
          <span>{Math.round(progressPct)}% complete</span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      <div className={cn("relative", isFullscreen && "flex-1")}>
        {content.sections.map((sec, idx) => (
          <LessonSlide
            key={idx}
            slide={sec.slide || { slide_type: "content", heading: sec.section_title, bullets: [sec.narration?.slice(0, 200)] }}
            sectionTitle={sec.section_title}
            slideIndex={idx}
            totalSlides={totalSections}
            isActive={idx === currentSection}
            narrationProgress={idx === currentSection ? narrationProgress : 0}
            isNarrating={idx === currentSection && isPlaying}
            currentTime={idx === currentSection ? currentTime : 0}
            wordTimestamps={idx === currentSection ? wordTimestamps : []}
            vakStyle={vakStyle}
          />
        ))}

        {/* Buffer countdown bar */}
        {isBuffering && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-card/80 backdrop-blur-md border border-border/50 rounded-full px-5 py-2">
            <div className="w-28 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{
                  animation: bufferCountdown === -1 ? "none" : `buffer-drain ${bufferSeconds}s linear forwards`,
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {bufferCountdown === -1
                ? "Click to continue"
                : `Next slide in ${bufferCountdown}s`}
            </span>
            <button
              onClick={handleBufferSkip}
              className="text-xs text-primary hover:opacity-80 whitespace-nowrap font-medium"
            >
              Continue →
            </button>
          </div>
        )}
      </div>

      {showNarration && section && (
        <div className="bg-muted/30 border border-border rounded-lg px-4 py-3 max-h-32 overflow-y-auto">
          <p className="text-sm text-muted-foreground leading-relaxed">{section.narration}</p>
        </div>
      )}

      <div className="space-y-2">
        {hasAudio && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10 text-right">{formatTime(currentTime)}</span>
            <div
              className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden cursor-pointer relative group"
              onClick={(e) => {
                if (!audioRef.current || !duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                audioRef.current.currentTime = pct * duration;
              }}
            >
              <div
                className="h-full bg-primary rounded-full transition-all duration-150"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-primary shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`, marginLeft: "-6px" }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-10">{formatTime(duration)}</span>
          </div>
        )}

        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="icon" onClick={goToPrevious} disabled={currentSection === 0}>
            <SkipBack className="h-4 w-4" />
          </Button>
          {hasAudio ? (
            <Button variant="default" size="icon" className="h-11 w-11 rounded-full" onClick={togglePlay}>
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </Button>
          ) : (
            <Button
              variant="default"
              size="icon"
              className="h-11 w-11 rounded-full"
              onClick={() => {
                if (ttsPlaying) {
                  ttsStop();
                } else if (section?.narration) {
                  ttsSpeak(section.narration);
                } else {
                  toast({ title: "Nothing to read", description: "This slide has no narration text." });
                }
              }}
              disabled={ttsLoading}
              title="Listen to this slide"
            >
              {ttsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : ttsPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Headphones className="h-5 w-5" />
              )}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={goToNext} disabled={currentSection >= totalSections - 1}>
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowNarration(!showNarration)}>
            <BookOpen className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="center">
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Reading time after each slide</p>
                <RadioGroup
                  value={bufferDuration}
                  onValueChange={(v) => setBufferDuration(v as BufferDuration)}
                  className="space-y-2"
                >
                  {[
                    { value: "3", label: "3 seconds" },
                    { value: "5", label: "5 seconds" },
                    { value: "10", label: "10 seconds" },
                    { value: "manual", label: "Manual (I'll click)" },
                  ].map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt.value} id={`buffer-${opt.value}`} />
                      <Label htmlFor={`buffer-${opt.value}`} className="text-sm text-foreground cursor-pointer">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap justify-center">
        {content.sections.map((_, idx) => (
          <button
            key={idx}
            onClick={() => { cancelBuffer(); setShowCheckpoint(null); setCurrentSection(idx); }}
            className={cn(
              "h-8 w-8 rounded-full text-xs font-medium flex items-center justify-center transition-colors",
              idx === currentSection
                ? "bg-primary text-primary-foreground"
                : completedSections.has(idx)
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {completedSections.has(idx) ? "✓" : idx + 1}
          </button>
        ))}
      </div>

      {completedSections.size === totalSections && content.key_takeaways?.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">📝 Key Takeaways</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {content.key_takeaways.map((takeaway, idx) => (
                <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-primary font-bold">{idx + 1}.</span>
                  {takeaway}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <style>{`
        @keyframes buffer-drain {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

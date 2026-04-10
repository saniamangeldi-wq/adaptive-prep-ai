import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LessonSlide } from "./LessonSlide";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Loader2,
  BookOpen,
  Mic,
  Maximize2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  onGenerateNarration?: (sectionIndex?: number) => Promise<void>;
  isNarrating?: boolean;
  vakStyle?: string;
}

export function LessonPlayer({
  lessonId,
  content,
  narratedSections = [],
  onComplete,
  onGenerateNarration,
  isNarrating = false,
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const section = content.sections[currentSection];
  const narratedSection = narratedSections.find(s => s.section_index === currentSection);
  const hasAudio = !!narratedSection?.audio_url || !!narratedSection?.audio_base64;
  const totalSections = content.sections.length;
  const progressPct = (completedSections.size / totalSections) * 100;
  const narrationProgress = duration > 0 ? currentTime / duration : 0;
  const wordTimestamps = narratedSection?.word_timestamps || [];

  // Audio setup
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (narratedSection?.audio_url) {
      audioRef.current = new Audio(narratedSection.audio_url);
    } else if (narratedSection?.audio_base64) {
      audioRef.current = new Audio(`data:audio/mpeg;base64,${narratedSection.audio_base64}`);
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
        handleSectionComplete();
      });
    }

    setCurrentTime(0);
    setDuration(0);

    return () => { audioRef.current?.pause(); };
  }, [currentSection, narratedSection]);

  // Auto-play when moving to next slide (video-like behavior)
  useEffect(() => {
    if (hasAudio && audioRef.current && isPlaying) {
      audioRef.current.play().catch(() => {});
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
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

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

  const togglePlay = () => {
    if (!audioRef.current) {
      toast({ title: "No narration", description: "Generate narration first." });
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
      setShowCheckpoint(null);
      setCurrentSection(prev => prev - 1);
    }
  };

  const goToNext = () => {
    if (currentSection < totalSections - 1) handleSectionComplete();
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
      if (currentSection < totalSections - 1) {
        setCurrentSection(prev => prev + 1);
      } else {
        onComplete?.();
      }
    }, 2000);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

  // Checkpoint overlay
  if (showCheckpoint) {
    return (
      <Card className="border-primary/30 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-primary" />
            Checkpoint Question
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground font-medium">{showCheckpoint.question}</p>
          <div className="space-y-2">
            {showCheckpoint.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedAnswer(idx)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-colors",
                  selectedAnswer === idx
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <span className="text-sm font-medium text-muted-foreground mr-2">
                  {String.fromCharCode(65 + idx)}.
                </span>
                {opt}
              </button>
            ))}
          </div>
          <Button onClick={submitCheckpointAnswer} disabled={selectedAnswer === null} className="w-full">
            Submit Answer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div ref={containerRef} className={cn("space-y-4", isFullscreen && "bg-background p-6 flex flex-col h-screen")}>
      {/* Overall progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Slide {currentSection + 1} of {totalSections}</span>
          <span>{Math.round(progressPct)}% complete</span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Slide area */}
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
      </div>

      {/* Narration transcript */}
      {showNarration && section && (
        <div className="bg-muted/30 border border-border rounded-lg px-4 py-3 max-h-32 overflow-y-auto">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {section.narration}
          </p>
        </div>
      )}

      {/* Video-style controls */}
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

          <Button
            variant="default"
            size="icon"
            className="h-11 w-11 rounded-full"
            onClick={togglePlay}
            disabled={!hasAudio}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>

          <Button variant="ghost" size="icon" onClick={goToNext} disabled={currentSection >= totalSections - 1}>
            <SkipForward className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>

          <Button variant="ghost" size="icon" onClick={() => setShowNarration(!showNarration)}>
            <BookOpen className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {!hasAudio && onGenerateNarration && (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => onGenerateNarration(currentSection)}
            disabled={isNarrating}
          >
            {isNarrating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
            {isNarrating ? "Generating narration..." : "Generate Narration for This Slide"}
          </Button>
        )}
      </div>

      {/* Slide navigation dots */}
      <div className="flex gap-1.5 flex-wrap justify-center">
        {content.sections.map((_, idx) => (
          <button
            key={idx}
            onClick={() => { setShowCheckpoint(null); setCurrentSection(idx); }}
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

      {/* Key takeaways */}
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
    </div>
  );
}

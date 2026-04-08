import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  CheckCircle2,
  XCircle,
  Loader2,
  BookOpen,
  Mic,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LessonSection {
  section_title: string;
  narration: string;
  visual_description: string;
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
  sections: LessonSection[];
  checkpoint_questions: CheckpointQuestion[];
  key_takeaways: string[];
  estimated_duration_seconds: number;
}

interface NarratedSection {
  section_index: number;
  audio_url?: string;
  audio_base64?: string;
  status: string;
}

interface LessonPlayerProps {
  lessonId: string;
  content: LessonContent;
  narratedSections?: NarratedSection[];
  onComplete?: () => void;
  onGenerateNarration?: (sectionIndex?: number) => Promise<void>;
  isNarrating?: boolean;
}

export function LessonPlayer({
  lessonId,
  content,
  narratedSections = [],
  onComplete,
  onGenerateNarration,
  isNarrating = false,
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const section = content.sections[currentSection];
  const narratedSection = narratedSections.find(
    (s) => s.section_index === currentSection
  );
  const hasAudio = !!narratedSection?.audio_url || !!narratedSection?.audio_base64;

  const totalSections = content.sections.length;
  const progressPct = ((completedSections.size / totalSections) * 100);

  // Setup audio for current section
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (narratedSection?.audio_url) {
      audioRef.current = new Audio(narratedSection.audio_url);
    } else if (narratedSection?.audio_base64) {
      audioRef.current = new Audio(
        `data:audio/mpeg;base64,${narratedSection.audio_base64}`
      );
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
    setIsPlaying(false);

    return () => {
      audioRef.current?.pause();
    };
  }, [currentSection, narratedSection]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleSectionComplete = useCallback(() => {
    setCompletedSections((prev) => new Set([...prev, currentSection]));

    // Check for checkpoint question after this section
    const checkpoint = content.checkpoint_questions.find(
      (q) => q.after_section === currentSection && !answeredCheckpoints.has(q.after_section)
    );

    if (checkpoint) {
      setShowCheckpoint(checkpoint);
      setSelectedAnswer(null);
    } else if (currentSection < totalSections - 1) {
      // Auto-advance to next section
      setCurrentSection((prev) => prev + 1);
    } else {
      onComplete?.();
    }
  }, [currentSection, content.checkpoint_questions, answeredCheckpoints, totalSections, onComplete]);

  const togglePlay = () => {
    if (!audioRef.current) {
      // If no audio, just read the section text
      toast({
        title: "No narration available",
        description: "Generate narration to hear the lesson read aloud.",
      });
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const goToPrevious = () => {
    if (currentSection > 0) {
      setCurrentSection((prev) => prev - 1);
      setShowCheckpoint(null);
    }
  };

  const goToNext = () => {
    if (currentSection < totalSections - 1) {
      handleSectionComplete();
    }
  };

  const handleCheckpointAnswer = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  };

  const submitCheckpointAnswer = () => {
    if (selectedAnswer === null || !showCheckpoint) return;

    setAnsweredCheckpoints((prev) => new Set([...prev, showCheckpoint.after_section]));

    const isCorrect = selectedAnswer === showCheckpoint.correct_index;
    toast({
      title: isCorrect ? "Correct! 🎉" : "Not quite",
      description: showCheckpoint.explanation,
      variant: isCorrect ? "default" : "destructive",
    });

    setTimeout(() => {
      setShowCheckpoint(null);
      if (currentSection < totalSections - 1) {
        setCurrentSection((prev) => prev + 1);
      } else {
        onComplete?.();
      }
    }, 2000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

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
                onClick={() => handleCheckpointAnswer(idx)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedAnswer === idx
                    ? selectedAnswer === showCheckpoint.correct_index
                      ? "border-green-500 bg-green-500/10"
                      : "border-primary bg-primary/10"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <span className="text-sm font-medium text-muted-foreground mr-2">
                  {String.fromCharCode(65 + idx)}.
                </span>
                {opt}
              </button>
            ))}
          </div>
          <Button
            onClick={submitCheckpointAnswer}
            disabled={selectedAnswer === null}
            className="w-full"
          >
            Submit Answer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            Section {currentSection + 1} of {totalSections}
          </span>
          <span>{Math.round(progressPct)}% complete</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      {/* Main lesson card */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{section.section_title}</CardTitle>
            {completedSections.has(currentSection) && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Done
              </Badge>
            )}
          </div>
          {section.visual_description && (
            <p className="text-xs text-muted-foreground italic">
              🎬 {section.visual_description}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Narration text */}
          <ScrollArea className="h-48 rounded-md border border-border p-4">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {section.narration}
            </p>
          </ScrollArea>

          {/* Audio controls */}
          <div className="space-y-2">
            {hasAudio && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-10 text-right">
                  {formatTime(currentTime)}
                </span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-10">
                  {formatTime(duration)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                disabled={currentSection === 0}
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button
                variant="default"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={togglePlay}
                disabled={!hasAudio}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                disabled={currentSection >= totalSections - 1}
              >
                <SkipForward className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            </div>

            {!hasAudio && onGenerateNarration && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => onGenerateNarration(currentSection)}
                disabled={isNarrating}
              >
                {isNarrating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                {isNarrating ? "Generating narration..." : "Generate Narration"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section navigation */}
      <div className="flex gap-1.5 flex-wrap">
        {content.sections.map((s, idx) => (
          <button
            key={idx}
            onClick={() => {
              setShowCheckpoint(null);
              setCurrentSection(idx);
            }}
            className={`h-8 w-8 rounded-full text-xs font-medium flex items-center justify-center transition-colors ${
              idx === currentSection
                ? "bg-primary text-primary-foreground"
                : completedSections.has(idx)
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {completedSections.has(idx) ? "✓" : idx + 1}
          </button>
        ))}
      </div>

      {/* Key takeaways (show at end) */}
      {completedSections.size === totalSections && content.key_takeaways.length > 0 && (
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

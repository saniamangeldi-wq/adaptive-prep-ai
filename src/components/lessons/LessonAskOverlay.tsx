import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, X, Loader2, Send, Sparkles, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Slide {
  heading: string;
  bullets?: string[];
}
interface Section {
  section_title: string;
  narration: string;
  slide: Slide;
}

interface LessonAskOverlayProps {
  open: boolean;
  onClose: () => void;
  lessonTitle: string;
  currentSection: Section;
  allSections: Section[];
  vakStyle?: string;
}

export function LessonAskOverlay({
  open,
  onClose,
  lessonTitle,
  currentSection,
  allSections,
  vakStyle,
}: LessonAskOverlayProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [usedDeepDive, setUsedDeepDive] = useState(false);

  const { speak, stop: stopSpeak, isPlaying, isLoading: ttsLoading } = useTextToSpeech();
  const { startRecording, stopRecording, isRecording, isConnecting } = useSpeechToText({
    onTranscript: (text) => setQuestion(text),
  });

  const ask = useCallback(async (deepDive: boolean) => {
    const q = question.trim();
    if (!q) {
      toast.error("Ask a question first");
      return;
    }
    setLoading(true);
    setUsedDeepDive(deepDive);
    setAnswer("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("You must be logged in");
        return;
      }
      const fullLessonContext = deepDive
        ? allSections.map((s, i) => `[Slide ${i + 1}] ${s.slide.heading}\n${s.narration}`).join("\n\n")
        : undefined;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lesson-ask`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            question: q,
            currentSlide: {
              heading: currentSection.slide.heading,
              narration: currentSection.narration,
              bullets: currentSection.slide.bullets,
            },
            deepDive,
            fullLessonContext,
            lessonTitle,
            vakStyle,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to get an answer");
        return;
      }
      const { answer: a } = await res.json();
      setAnswer(a || "");
      if (a) speak(a);
    } catch (err) {
      console.error("lesson-ask error:", err);
      toast.error("Failed to get an answer");
    } finally {
      setLoading(false);
    }
  }, [question, allSections, currentSection, lessonTitle, vakStyle, speak]);

  const handleClose = () => {
    stopSpeak();
    if (isRecording) stopRecording();
    setQuestion("");
    setAnswer("");
    setUsedDeepDive(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-0">
      <Card className="w-full max-w-2xl bg-card border-border p-6 space-y-4 relative">
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-muted transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Ask about this slide</h3>
        </div>

        <p className="text-xs text-muted-foreground">
          Context: <span className="text-foreground">{currentSection.slide.heading}</span>
        </p>

        <div className="space-y-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={isRecording ? "Listening..." : "Type your question, or tap the mic to speak"}
            className="min-h-[80px] resize-none"
            disabled={isRecording || loading}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={isRecording ? "destructive" : "outline"}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isConnecting || loading}
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRecording ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              <span className="ml-2">{isRecording ? "Stop" : "Speak"}</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => ask(false)}
              disabled={loading || !question.trim()}
              className="ml-auto"
            >
              {loading && !usedDeepDive ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="ml-2">Ask</span>
            </Button>
          </div>
        </div>

        {answer && (
          <div className="border border-border rounded-md p-4 bg-muted/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {usedDeepDive ? "Deep answer (full lesson context)" : "Quick answer"}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => (isPlaying ? stopSpeak() : speak(answer))}
                disabled={ttsLoading}
              >
                {ttsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPlaying ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{answer}</ReactMarkdown>
            </div>
            {!usedDeepDive && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => ask(true)}
                disabled={loading}
                className="w-full"
              >
                {loading && usedDeepDive ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Dig deeper (use full lesson context)
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

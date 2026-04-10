import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LessonPlayer } from "@/components/lessons/LessonPlayer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Loader2,
  BookOpen,
  Play,
  Sparkles,
  ArrowLeft,
  Film,
} from "lucide-react";

interface LessonRow {
  id: string;
  title: string;
  subject: string | null;
  topic: string | null;
  difficulty_level: string | null;
  status: string;
  vak_style: string | null;
  duration_seconds: number | null;
  script_content: string | null;
  created_at: string;
  audio_url: string | null;
}

interface GenerationProgress {
  lessonId: string;
  currentSlide: number;
  totalSlides: number;
  currentTitle: string;
  startTime: number;
  avgTimePerSlide: number;
}

export default function VideoLessons() {
  const { user } = useAuth();
  const { toast } = useToast();
  const _navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedLesson, setSelectedLesson] = useState<LessonRow | null>(null);
  const [narratedSections, setNarratedSections] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [newSubject, setNewSubject] = useState("Math");
  const [newDifficulty, setNewDifficulty] = useState("medium");
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const abortRef = useRef(false);

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["video-lessons", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_lessons")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LessonRow[];
    },
    enabled: !!user,
  });

  const generateLesson = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-lesson-content", {
        body: { topic: newTopic, subject: newSubject, difficulty: newDifficulty },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Lesson generated! 🎉", description: `"${data.content.title}" is ready.` });
      setShowCreate(false);
      setNewTopic("");
      queryClient.invalidateQueries({ queryKey: ["video-lessons"] });
    },
    onError: (error: any) => {
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    },
  });

  const getSectionAudioStatus = useCallback((lesson: LessonRow): { total: number; completed: number; sections: any[] } => {
    if (!lesson.script_content) return { total: 0, completed: 0, sections: [] };
    try {
      const content = JSON.parse(lesson.script_content);
      const sections = content.sections || [];
      const narrated = content.narrated_sections || [];
      const completed = narrated.filter((n: any) => n.status === "completed" && n.audio_url).length;
      return { total: sections.length, completed, sections: narrated };
    } catch {
      return { total: 0, completed: 0, sections: [] };
    }
  }, []);

  const isFullyNarrated = useCallback((lesson: LessonRow) => {
    const { total, completed } = getSectionAudioStatus(lesson);
    return total > 0 && completed >= total;
  }, [getSectionAudioStatus]);

  const cancelGeneration = useCallback(() => {
    abortRef.current = true;
    setGenerationProgress(null);
    toast({ title: "Generation cancelled", description: "Progress has been saved. You can resume later." });
  }, [toast]);

  const generateVideo = useCallback(async (lesson: LessonRow) => {
    if (abortRef.current === false && generationProgress) return; // prevent double-trigger
    if (!lesson.script_content) return;
    const content = JSON.parse(lesson.script_content);
    const sections = content.sections || [];
    const existingNarrated: any[] = content.narrated_sections || [];

    // Find which sections still need audio — strict guard
    const needsGeneration: number[] = [];
    for (let i = 0; i < sections.length; i++) {
      const existing = existingNarrated.find(
        (n: any) => n.section_index === i && n.status === "completed" && n.audio_url && n.audio_url.trim() !== ""
      );
      if (!existing) needsGeneration.push(i);
    }

    if (needsGeneration.length === 0) {
      // All audio exists — open player directly, zero ElevenLabs calls
      setNarratedSections(existingNarrated);
      setSelectedLesson(lesson);
      return;
    }

    // Confirm before starting (costs ElevenLabs credits)
    const proceed = window.confirm(
      `This will generate audio for ${needsGeneration.length} slide(s). This uses ElevenLabs credits. Continue?`
    );
    if (!proceed) return;

    abortRef.current = false;
    const startTime = Date.now();
    setGenerationProgress({
      lessonId: lesson.id,
      currentSlide: 0,
      totalSlides: sections.length,
      currentTitle: sections[needsGeneration[0]]?.section_title || "",
      startTime,
      avgTimePerSlide: 0,
    });

    const allNarrated = [...existingNarrated];
    let completedCount = existingNarrated.filter((n: any) => n.status === "completed" && n.audio_url).length;

    for (let i = 0; i < needsGeneration.length; i++) {
      if (abortRef.current) break;
      const sectionIdx = needsGeneration[i];
      const elapsed = (Date.now() - startTime) / 1000;
      const avgTime = i > 0 ? elapsed / i : 8;

      setGenerationProgress({
        lessonId: lesson.id,
        currentSlide: completedCount + 1,
        totalSlides: sections.length,
        currentTitle: sections[sectionIdx]?.section_title || `Slide ${sectionIdx + 1}`,
        startTime,
        avgTimePerSlide: avgTime,
      });

      try {
        const session = await supabase.auth.getSession();
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/narrate-lesson`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.data.session?.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ lesson_id: lesson.id, section_index: sectionIdx }),
          }
        );

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Narration failed");
        }

        const data = await response.json();
        const resultSection = data.sections?.[0];
        if (resultSection) {
          // Remove old entry for this index if any
          const existingIdx = allNarrated.findIndex((n: any) => n.section_index === sectionIdx);
          if (existingIdx >= 0) allNarrated[existingIdx] = resultSection;
          else allNarrated.push(resultSection);
          completedCount++;

          // Save progress to Supabase immediately (resumable)
          const updatedContent = { ...content, narrated_sections: allNarrated };
          await supabase
            .from("video_lessons")
            .update({ script_content: JSON.stringify(updatedContent) })
            .eq("id", lesson.id);
        }
      } catch (err: any) {
        console.error(`Failed to narrate section ${sectionIdx}:`, err);
        toast({
          title: `Slide ${sectionIdx + 1} failed`,
          description: err.message,
          variant: "destructive",
        });
      }
    }

    // Finalize
    setGenerationProgress(null);

    if (!abortRef.current) {
      // Update lesson status
      await supabase
        .from("video_lessons")
        .update({ status: "narrated", audio_url: allNarrated.find((n: any) => n.audio_url)?.audio_url || null })
        .eq("id", lesson.id);

      queryClient.invalidateQueries({ queryKey: ["video-lessons"] });

      // Refetch fresh lesson data then auto-open player
      const { data: freshLesson } = await supabase
        .from("video_lessons")
        .select("*")
        .eq("id", lesson.id)
        .single();

      if (freshLesson) {
        const freshContent = JSON.parse(freshLesson.script_content as string);
        setNarratedSections(freshContent.narrated_sections || allNarrated);
        setTimeout(() => setSelectedLesson(freshLesson as LessonRow), 800);
      }
    }
  }, [toast, queryClient]);

  const openLesson = (lesson: LessonRow) => {
    if (isFullyNarrated(lesson)) {
      const content = JSON.parse(lesson.script_content!);
      setNarratedSections(content.narrated_sections || []);
      setSelectedLesson(lesson);
    } else {
      generateVideo(lesson);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "draft": return "secondary";
      case "narrated": return "default";
      case "ready": return "default";
      default: return "secondary";
    }
  };

  const getEstimatedRemaining = () => {
    if (!generationProgress || generationProgress.avgTimePerSlide === 0) return null;
    const remaining = generationProgress.totalSlides - generationProgress.currentSlide;
    const seconds = Math.ceil(remaining * generationProgress.avgTimePerSlide);
    if (seconds < 60) return `~${seconds}s remaining`;
    return `~${Math.ceil(seconds / 60)}m remaining`;
  };

  // Lesson player view
  if (selectedLesson && selectedLesson.script_content) {
    const content = JSON.parse(selectedLesson.script_content);
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-4">
          <Button variant="ghost" className="gap-2" onClick={() => setSelectedLesson(null)}>
            <ArrowLeft className="h-4 w-4" />
            Back to Lessons
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{content.title}</h1>
            <div className="flex gap-2 mt-1">
              {selectedLesson.subject && <Badge variant="outline">{selectedLesson.subject}</Badge>}
              {selectedLesson.topic && <Badge variant="outline">{selectedLesson.topic}</Badge>}
              {selectedLesson.vak_style && <Badge variant="secondary">{selectedLesson.vak_style} learner</Badge>}
            </div>
          </div>
          <LessonPlayer
            lessonId={selectedLesson.id}
            content={content}
            narratedSections={narratedSections}
            vakStyle={selectedLesson.vak_style || undefined}
            onComplete={() => {
              toast({ title: "Lesson complete! 🏆", description: "Great job finishing this lesson." });
            }}
          />
        </div>
      </DashboardLayout>
    );
  }

  // Lessons list view
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Lessons
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI-generated slide lessons with narration, personalized to your learning style
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Lesson
          </Button>
        </div>

        {showCreate && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Generate a New Lesson
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="What topic do you want to learn? (e.g., Quadratic Equations)"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
              />
              <div className="flex gap-3">
                <Select value={newSubject} onValueChange={setNewSubject}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Math">Math</SelectItem>
                    <SelectItem value="Reading">Reading</SelectItem>
                    <SelectItem value="Writing">Writing</SelectItem>
                    <SelectItem value="Science">Science</SelectItem>
                    <SelectItem value="History">History</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={newDifficulty} onValueChange={setNewDifficulty}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => generateLesson.mutate()} disabled={!newTopic.trim() || generateLesson.isPending} className="gap-2">
                  {generateLesson.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate
                </Button>
                <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : lessons.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No lessons yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Generate your first AI-powered lesson to get started</p>
              <Button onClick={() => setShowCreate(true)} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Create Your First Lesson
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {lessons.map((lesson) => {
              const isGenerating = generationProgress?.lessonId === lesson.id;
              const ready = isFullyNarrated(lesson);
              const { total, completed } = getSectionAudioStatus(lesson);

              return (
                <Card
                  key={lesson.id}
                  className={`transition-colors ${isGenerating ? "border-primary/50" : "hover:border-primary/40 cursor-pointer"}`}
                  onClick={() => !isGenerating && openLesson(lesson)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">{lesson.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {lesson.subject && <span className="text-xs text-muted-foreground">{lesson.subject}</span>}
                          {lesson.topic && (
                            <>
                              <span className="text-xs text-muted-foreground">·</span>
                              <span className="text-xs text-muted-foreground">{lesson.topic}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={statusColor(lesson.status)} className="text-xs">{lesson.status}</Badge>
                          {lesson.duration_seconds && (
                            <span className="text-xs text-muted-foreground">~{Math.ceil(lesson.duration_seconds / 60)} min</span>
                          )}
                          {lesson.vak_style && (
                            <span className="text-xs text-muted-foreground capitalize">{lesson.vak_style}</span>
                          )}
                        </div>

                        {/* Generation progress inline */}
                        {isGenerating && generationProgress && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                              <span className="text-xs text-primary font-medium">
                                Generating slide {generationProgress.currentSlide} of {generationProgress.totalSlides}
                              </span>
                            </div>
                            <Progress
                              value={(generationProgress.currentSlide / generationProgress.totalSlides) * 100}
                              className="h-2"
                            />
                            <p className="text-xs text-muted-foreground truncate">
                              {generationProgress.currentTitle}
                            </p>
                            {getEstimatedRemaining() && (
                              <p className="text-xs text-muted-foreground">{getEstimatedRemaining()}</p>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              className="mt-1 h-7 text-xs"
                              onClick={(e) => { e.stopPropagation(); cancelGeneration(); }}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}

                        {/* Resumable hint */}
                        {!isGenerating && completed > 0 && !ready && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {completed}/{total} slides ready — click to resume
                          </p>
                        )}
                      </div>

                      {!isGenerating && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={(e) => { e.stopPropagation(); openLesson(lesson); }}
                        >
                          {ready ? (
                            <Play className="h-4 w-4 text-green-500" />
                          ) : (
                            <Film className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LessonPlayer } from "@/components/lessons/LessonPlayer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
}

export default function VideoLessons() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedLesson, setSelectedLesson] = useState<LessonRow | null>(null);
  const [narratedSections, setNarratedSections] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [newSubject, setNewSubject] = useState("Math");
  const [newDifficulty, setNewDifficulty] = useState("medium");

  // Fetch user's lessons
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

  // Generate new lesson content
  const generateLesson = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "generate-lesson-content",
        {
          body: {
            topic: newTopic,
            subject: newSubject,
            difficulty: newDifficulty,
          },
        }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Lesson generated! 🎉",
        description: `"${data.content.title}" is ready. You can now add narration.`,
      });
      setShowCreate(false);
      setNewTopic("");
      queryClient.invalidateQueries({ queryKey: ["video-lessons"] });
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message || "Could not generate lesson content.",
        variant: "destructive",
      });
    },
  });

  // Narrate a lesson section
  const narrateLesson = useMutation({
    mutationFn: async ({
      lessonId,
      sectionIndex,
    }: {
      lessonId: string;
      sectionIndex?: number;
    }) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/narrate-lesson`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            lesson_id: lessonId,
            section_index: sectionIndex,
          }),
        }
      );
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Narration failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setNarratedSections(data.sections || []);
      toast({
        title: "Narration ready! 🎙️",
        description: "Audio narration has been generated.",
      });
      queryClient.invalidateQueries({ queryKey: ["video-lessons"] });
    },
    onError: (error: any) => {
      toast({
        title: "Narration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openLesson = (lesson: LessonRow) => {
    setSelectedLesson(lesson);
    setNarratedSections([]);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "narrated":
        return "default";
      case "ready":
        return "default";
      default:
        return "secondary";
    }
  };

  // Lesson player view
  if (selectedLesson && selectedLesson.script_content) {
    const content = JSON.parse(selectedLesson.script_content);
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-4">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => setSelectedLesson(null)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lessons
          </Button>

          <div>
            <h1 className="text-2xl font-bold text-foreground">{content.title}</h1>
            <div className="flex gap-2 mt-1">
              {selectedLesson.subject && (
                <Badge variant="outline">{selectedLesson.subject}</Badge>
              )}
              {selectedLesson.topic && (
                <Badge variant="outline">{selectedLesson.topic}</Badge>
              )}
              {selectedLesson.vak_style && (
                <Badge variant="secondary">{selectedLesson.vak_style} learner</Badge>
              )}
            </div>
          </div>

          <LessonPlayer
            lessonId={selectedLesson.id}
            content={content}
            narratedSections={narratedSections}
            isNarrating={narrateLesson.isPending}
            onGenerateNarration={async (sectionIndex) => {
              await narrateLesson.mutateAsync({
                lessonId: selectedLesson.id,
                sectionIndex,
              });
            }}
            onComplete={() => {
              toast({
                title: "Lesson complete! 🏆",
                description: "Great job finishing this lesson.",
              });
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

        {/* Create new lesson form */}
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
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
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
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => generateLesson.mutate()}
                  disabled={!newTopic.trim() || generateLesson.isPending}
                  className="gap-2"
                >
                  {generateLesson.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lessons grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : lessons.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">
                No lessons yet
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate your first AI-powered lesson to get started
              </p>
              <Button onClick={() => setShowCreate(true)} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Create Your First Lesson
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {lessons.map((lesson) => (
              <Card
                key={lesson.id}
                className="cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => openLesson(lesson)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">
                        {lesson.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {lesson.subject && (
                          <span className="text-xs text-muted-foreground">
                            {lesson.subject}
                          </span>
                        )}
                        {lesson.topic && (
                          <>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">
                              {lesson.topic}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={statusColor(lesson.status)} className="text-xs">
                          {lesson.status}
                        </Badge>
                        {lesson.duration_seconds && (
                          <span className="text-xs text-muted-foreground">
                            ~{Math.ceil(lesson.duration_seconds / 60)} min
                          </span>
                        )}
                        {lesson.vak_style && (
                          <span className="text-xs text-muted-foreground capitalize">
                            {lesson.vak_style}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

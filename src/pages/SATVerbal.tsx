import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LessonPlayer } from "@/components/lessons/LessonPlayer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, BookOpen, Play, CheckCircle2, Lock, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Style = "visual" | "auditory" | "kinesthetic" | "reading_writing";

interface VerbalTopic {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  order_index: number;
  category: string | null;
}

interface VerbalLesson {
  id: string;
  topic_id: string;
  learning_style: string;
  title: string;
  hook: string | null;
  sections: any;
  checkpoint_questions: any;
  summary: string | null;
  estimated_minutes: number | null;
}

const STYLE_LABEL: Record<Style, string> = {
  visual: "Visual",
  auditory: "Auditory",
  kinesthetic: "Kinesthetic",
  reading_writing: "Reading/Writing",
};

const STYLE_EMOJI: Record<Style, string> = {
  visual: "👁️",
  auditory: "🎧",
  kinesthetic: "✋",
  reading_writing: "📝",
};

export default function SATVerbal() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<VerbalLesson | null>(null);
  const [completedTopicIds, setCompletedTopicIds] = useState<Set<string>>(new Set());

  // Resolve user's preferred VAK style
  const userStyle: Style = useMemo(() => {
    const primary = profile?.vak_primary_style as string | null | undefined;
    if (primary === "visual" || primary === "auditory" || primary === "kinesthetic" || primary === "reading_writing") {
      return primary;
    }
    return "visual";
  }, [profile?.vak_primary_style]);

  const [styleOverride, setStyleOverride] = useState<Style>(userStyle);

  const { data: topics = [], isLoading: loadingTopics } = useQuery({
    queryKey: ["verbal-topics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verbal_topics")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as VerbalTopic[];
    },
  });

  const { data: lessonsForTopic, isLoading: loadingLessons } = useQuery({
    queryKey: ["verbal-lessons", selectedTopicId],
    queryFn: async () => {
      if (!selectedTopicId) return [];
      const { data, error } = await supabase
        .from("verbal_lessons")
        .select("*")
        .eq("topic_id", selectedTopicId);
      if (error) throw error;
      return data as VerbalLesson[];
    },
    enabled: !!selectedTopicId,
  });

  const startLesson = (lesson: VerbalLesson) => {
    setActiveLesson(lesson);
  };

  const onLessonComplete = () => {
    if (activeLesson) {
      setCompletedTopicIds((prev) => new Set([...prev, activeLesson.topic_id]));
    }
    toast({
      title: "Lesson complete! 🎉",
      description: "Great work — you mastered a 700+ verbal skill.",
    });
  };

  // -------- Player view --------
  if (activeLesson) {
    const playerContent = {
      title: activeLesson.title,
      subtitle: activeLesson.hook || undefined,
      sections: activeLesson.sections,
      checkpoint_questions: activeLesson.checkpoint_questions,
      key_takeaways: [activeLesson.summary || ""].filter(Boolean),
      estimated_duration_seconds: (activeLesson.estimated_minutes || 15) * 60,
    };

    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-4">
          <Button variant="ghost" className="gap-2" onClick={() => setActiveLesson(null)}>
            <ArrowLeft className="h-4 w-4" />
            Back to Verbal Curriculum
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{activeLesson.title}</h1>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">SAT Verbal</Badge>
              <Badge variant="outline">700+ Difficulty</Badge>
              <Badge variant="secondary">
                {STYLE_EMOJI[activeLesson.learning_style as Style]} {STYLE_LABEL[activeLesson.learning_style as Style]} learner
              </Badge>
            </div>
            {activeLesson.hook && (
              <p className="text-sm text-muted-foreground mt-3 italic">"{activeLesson.hook}"</p>
            )}
          </div>
          <LessonPlayer
            lessonId={activeLesson.id}
            content={playerContent as any}
            narratedSections={[]}
            vakStyle={activeLesson.learning_style}
            onComplete={onLessonComplete}
          />
        </div>
      </DashboardLayout>
    );
  }

  // -------- Topic detail view --------
  if (selectedTopicId) {
    const topic = topics.find((t) => t.id === selectedTopicId);
    const lesson = lessonsForTopic?.find((l) => l.learning_style === styleOverride);

    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Button variant="ghost" className="gap-2" onClick={() => setSelectedTopicId(null)}>
            <ArrowLeft className="h-4 w-4" />
            Back to All Topics
          </Button>

          {topic && (
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{topic.title}</h1>
              {topic.description && (
                <p className="text-muted-foreground mt-2">{topic.description}</p>
              )}
              <div className="flex gap-2 mt-3">
                <Badge variant="outline">SAT Verbal</Badge>
                <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                  700+ Difficulty
                </Badge>
              </div>
            </div>
          )}

          <Card className="border-border/50">
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Choose your learning style</label>
                <p className="text-xs text-muted-foreground mt-1">
                  Each lesson is recorded in 4 styles. Pick the one that matches how you learn best.
                </p>
              </div>
              <Select value={styleOverride} onValueChange={(v) => setStyleOverride(v as Style)}>
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STYLE_LABEL) as Style[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STYLE_EMOJI[s]} {STYLE_LABEL[s]}
                      {s === userStyle ? " (your style)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {loadingLessons ? (
                <Skeleton className="h-32" />
              ) : lesson ? (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">{lesson.title}</h3>
                        {lesson.hook && (
                          <p className="text-sm text-muted-foreground italic mt-1">"{lesson.hook}"</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                          <span>~{lesson.estimated_minutes || 15} min</span>
                          <span>·</span>
                          <span>{(lesson.sections as any[])?.length || 0} slides</span>
                          <span>·</span>
                          <span>{(lesson.checkpoint_questions as any[])?.length || 0} checkpoints</span>
                        </div>
                        <Button onClick={() => startLesson(lesson)} className="mt-4 gap-2">
                          <Play className="h-4 w-4" />
                          Start Lesson
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground">No lesson found for this style.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // -------- Topic list view --------
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            SAT Verbal Curriculum
          </h1>
          <p className="text-muted-foreground mt-1">
            25 topics covering the entire Digital SAT Reading & Writing section. Every lesson is recorded at 700+ difficulty in 4 learning styles.
          </p>
          <div className="flex gap-2 mt-3">
            <Badge variant="outline">25 Topics</Badge>
            <Badge variant="outline">100 Lessons</Badge>
            <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
              700+ Mastery Track
            </Badge>
          </div>
        </div>

        {loadingTopics ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {topics.map((topic) => {
              const isCompleted = completedTopicIds.has(topic.id);
              return (
                <Card
                  key={topic.id}
                  className="cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setSelectedTopicId(topic.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                        {topic.order_index}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-foreground">{topic.title}</h3>
                          {isCompleted && (
                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                        {topic.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {topic.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            4 styles
                          </Badge>
                          {topic.category && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {topic.category.replace("_", " ")}
                            </Badge>
                          )}
                        </div>
                      </div>
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

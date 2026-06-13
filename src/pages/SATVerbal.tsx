import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LessonPlayer } from "@/components/lessons/LessonPlayer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, BookOpen, Play, CheckCircle2, Sparkles, Calculator, Loader2, Wand2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageSeo } from "@/components/seo/PageSeo";

type Style = "visual" | "auditory" | "kinesthetic" | "reading_writing";
type Track = "verbal" | "math";

interface Topic {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  order_index: number;
  category: string | null;
}

interface Lesson {
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
  const queryClient = useQueryClient();
  const [activeTrack, setActiveTrack] = useState<Track>("verbal");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [completedTopicIds, setCompletedTopicIds] = useState<Set<string>>(new Set());
  const [generatingTopicId, setGeneratingTopicId] = useState<string | null>(null);

  // Auto-resolve user's preferred VAK style — no manual override
  const userStyle: Style = useMemo(() => {
    const primary = profile?.vak_primary_style as string | null | undefined;
    if (primary === "visual" || primary === "auditory" || primary === "kinesthetic" || primary === "reading_writing") {
      return primary;
    }
    return "visual";
  }, [profile?.vak_primary_style]);

  const topicsTable = activeTrack === "verbal" ? "verbal_topics" : "math_topics";
  const lessonsTable = activeTrack === "verbal" ? "verbal_lessons" : "math_lessons";

  const { data: topics = [], isLoading: loadingTopics } = useQuery({
    queryKey: [topicsTable],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(topicsTable as any)
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data as unknown) as Topic[];
    },
  });

  const { data: lessonsForTopic, isLoading: loadingLessons } = useQuery({
    queryKey: [lessonsTable, selectedTopicId],
    queryFn: async () => {
      if (!selectedTopicId) return [];
      const { data, error } = await supabase
        .from(lessonsTable as any)
        .select("*")
        .eq("topic_id", selectedTopicId);
      if (error) throw error;
      return (data as unknown) as Lesson[];
    },
    enabled: !!selectedTopicId,
  });

  const startLesson = (lesson: Lesson) => setActiveLesson(lesson);

  const onLessonComplete = () => {
    if (activeLesson) {
      setCompletedTopicIds((prev) => new Set([...prev, activeLesson.topic_id]));
    }
    toast({ title: "Lesson complete! 🎉", description: "Great work — you mastered a 700+ skill." });
  };

  const generateMathLesson = async (topicId: string) => {
    setGeneratingTopicId(topicId);
    try {
      const { error } = await supabase.functions.invoke("generate-math-lesson", {
        body: { topic_id: topicId, styles: [userStyle] },
      });
      if (error) throw error;
      toast({ title: "Lesson ready! ✨", description: "Your personalized math lesson has been generated." });
      await queryClient.invalidateQueries({ queryKey: [lessonsTable, topicId] });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message || "Try again", variant: "destructive" });
    } finally {
      setGeneratingTopicId(null);
    }
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
      <PageSeo title="SAT Verbal Lessons | AdaptivePrep" description="Master SAT reading and writing with adaptive verbal lessons tailored to your learning style." path="/dashboard/sat-verbal" />
        <div className="max-w-3xl mx-auto space-y-4">
          <Button variant="ghost" className="gap-2" onClick={() => setActiveLesson(null)}>
            <ArrowLeft className="h-4 w-4" />
            Back to Curriculum
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{activeLesson.title}</h1>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">SAT {activeTrack === "math" ? "Math" : "Verbal"}</Badge>
              <Badge variant="outline">700+ Difficulty</Badge>
              <Badge variant="secondary">
                {STYLE_EMOJI[activeLesson.learning_style as Style]} {STYLE_LABEL[activeLesson.learning_style as Style]}
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
    // Auto-pick user's style; fall back to any available variant
    const lesson =
      lessonsForTopic?.find((l) => l.learning_style === userStyle) ||
      lessonsForTopic?.[0];
    const isGenerating = generatingTopicId === selectedTopicId;

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
                <Badge variant="outline">SAT {activeTrack === "math" ? "Math" : "Verbal"}</Badge>
                <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                  700+ Difficulty
                </Badge>
                <Badge variant="secondary">
                  {STYLE_EMOJI[userStyle]} Auto-matched to your {STYLE_LABEL[userStyle]} style
                </Badge>
              </div>
            </div>
          )}

          <Card className="border-border/50">
            <CardContent className="p-5">
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
              ) : activeTrack === "math" ? (
                <div className="flex flex-col items-center text-center py-8 gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
                    <Wand2 className="h-7 w-7 text-primary" />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <h3 className="font-semibold text-foreground">Generate this lesson now</h3>
                    <p className="text-sm text-muted-foreground">
                      Personalized to your <span className="text-foreground font-medium">{STYLE_LABEL[userStyle]}</span> learning style. Takes ~20 seconds.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => generateMathLesson(selectedTopicId)}
                    disabled={isGenerating}
                    className="gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating your lesson...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Lesson
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No lesson found for this topic.</p>
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
            SAT Curriculum
          </h1>
          <p className="text-muted-foreground mt-1">
            Full-coverage Digital SAT lessons recorded at 700+ difficulty — automatically matched to your{" "}
            <span className="text-foreground font-medium">{STYLE_LABEL[userStyle]}</span> learning style.
          </p>
        </div>

        <Tabs value={activeTrack} onValueChange={(v) => { setActiveTrack(v as Track); setSelectedTopicId(null); }} className="w-full">
          <TabsList className="grid w-full sm:w-96 grid-cols-2">
            <TabsTrigger value="verbal" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Verbal
            </TabsTrigger>
            <TabsTrigger value="math" className="gap-2">
              <Calculator className="h-4 w-4" />
              Math
            </TabsTrigger>
          </TabsList>

          <TabsContent value="verbal" className="space-y-6 mt-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">25 Topics</Badge>
              <Badge variant="outline">100 Lessons</Badge>
              <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">700+ Mastery Track</Badge>
            </div>
            {renderTopicGrid()}
          </TabsContent>

          <TabsContent value="math" className="space-y-6 mt-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">22 Topics</Badge>
              <Badge variant="outline">Algebra · Advanced · Data · Geometry</Badge>
              <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">700+ Mastery Track</Badge>
              <Badge variant="secondary" className="gap-1.5">
                <Sparkles className="h-3 w-3" /> Generated on-demand
              </Badge>
            </div>
            {renderTopicGrid()}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );

  function renderTopicGrid() {
    if (loadingTopics) {
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      );
    }
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {topics.map((topic) => {
          const isCompleted = completedTopicIds.has(topic.id);
          const isLocked = topic.order_index !== 1;
          return (
            <Card
              key={topic.id}
              className={`transition-colors ${isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-primary/40"}`}
              onClick={() => {
                if (isLocked) {
                  toast({ title: "Locked 🔒", description: "This lesson is part of the full curriculum — coming soon." });
                  return;
                }
                setSelectedTopicId(topic.id);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                    {isLocked ? <Lock className="h-4 w-4" /> : topic.order_index}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground">{topic.title}</h3>
                      {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />}
                    </div>
                    {topic.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{topic.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {isLocked ? (
                        <Badge variant="outline" className="text-xs">Coming soon</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Available now</Badge>
                      )}
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
    );
  }
}

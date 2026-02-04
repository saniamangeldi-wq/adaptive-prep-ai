import { Eye, Ear, BookOpen, Hand, ChevronRight, Sparkles, Bot, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LearningStyle } from "./LearningStyleStep";

const styleInfo: Record<LearningStyle, {
  icon: typeof Eye;
  title: string;
  description: string;
  color: string;
}> = {
  visual: {
    icon: Eye,
    title: "Visual Learner",
    description: "You learn best through images, diagrams, and visual representations. We'll prioritize charts, graphs, and video explanations in your study materials.",
    color: "from-blue-500 to-cyan-400",
  },
  auditory: {
    icon: Ear,
    title: "Auditory Learner",
    description: "You absorb information best through listening. We'll include audio explanations and encourage you to read problems aloud.",
    color: "from-purple-500 to-pink-400",
  },
  reading_writing: {
    icon: BookOpen,
    title: "Reading/Writing Learner",
    description: "You excel with text-based learning. We'll provide detailed written explanations and encourage note-taking.",
    color: "from-emerald-500 to-teal-400",
  },
  kinesthetic: {
    icon: Hand,
    title: "Kinesthetic Learner",
    description: "You learn by doing. We'll include interactive exercises and hands-on practice problems.",
    color: "from-orange-500 to-amber-400",
  },
};

interface OnboardingCompleteProps {
  learningStyle: LearningStyle;
  selectedSubjects: string[];
  onComplete: () => void;
  loading: boolean;
}

export function OnboardingComplete({ 
  learningStyle, 
  selectedSubjects,
  onComplete, 
  loading 
}: OnboardingCompleteProps) {
  const style = styleInfo[learningStyle];
  const StyleIcon = style.icon;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8 dark">
      <div className="max-w-lg w-full text-center space-y-8 animate-fade-in">
        <div className={`w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br ${style.color} flex items-center justify-center`}>
          <StyleIcon className="w-12 h-12 text-white" />
        </div>
        
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Your Learning Style</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">{style.title}</h1>
          <p className="text-muted-foreground">{style.description}</p>
        </div>

        {/* Selected Subjects */}
        {selectedSubjects.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {selectedSubjects.map((subject) => (
              <span 
                key={subject}
                className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm"
              >
                {subject}
              </span>
            ))}
          </div>
        )}

        {/* AI Coach Welcome */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 text-left">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                Meet your AI Study Coach!
                <MessageSquare className="w-4 h-4 text-primary" />
              </h3>
              <p className="text-sm text-muted-foreground">
                Ask me anything about your studies. I'll help with {selectedSubjects.slice(0, 2).join(", ")}
                {selectedSubjects.length > 2 && ` and ${selectedSubjects.length - 2} more subjects`}!
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="hero"
          size="xl"
          onClick={onComplete}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Saving..." : "Start Learning"}
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

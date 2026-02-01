import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Ear, BookOpen, Hand, ChevronRight, ChevronLeft, Sparkles, Bot, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type LearningStyle = "visual" | "auditory" | "reading_writing" | "kinesthetic";

const questions = [
  {
    id: 1,
    question: "When learning something new, I prefer to...",
    options: [
      { style: "visual" as const, text: "See diagrams, charts, or videos" },
      { style: "auditory" as const, text: "Listen to explanations or discussions" },
      { style: "reading_writing" as const, text: "Read about it and take notes" },
      { style: "kinesthetic" as const, text: "Try it hands-on and learn by doing" },
    ],
  },
  {
    id: 2,
    question: "I remember things best when I...",
    options: [
      { style: "visual" as const, text: "Can picture them in my mind" },
      { style: "auditory" as const, text: "Hear them explained multiple times" },
      { style: "reading_writing" as const, text: "Write them down or read them repeatedly" },
      { style: "kinesthetic" as const, text: "Practice or experience them directly" },
    ],
  },
  {
    id: 3,
    question: "During a study session, I'm most likely to...",
    options: [
      { style: "visual" as const, text: "Create mind maps or color-coded notes" },
      { style: "auditory" as const, text: "Explain concepts out loud to myself" },
      { style: "reading_writing" as const, text: "Reread and summarize text materials" },
      { style: "kinesthetic" as const, text: "Take frequent breaks and move around" },
    ],
  },
  {
    id: 4,
    question: "When solving math problems, I prefer...",
    options: [
      { style: "visual" as const, text: "Drawing pictures or graphs to visualize" },
      { style: "auditory" as const, text: "Talking through the steps verbally" },
      { style: "reading_writing" as const, text: "Following written step-by-step formulas" },
      { style: "kinesthetic" as const, text: "Using physical manipulatives or counting" },
    ],
  },
  {
    id: 5,
    question: "I get distracted most easily when...",
    options: [
      { style: "visual" as const, text: "There's visual clutter or movement around me" },
      { style: "auditory" as const, text: "There's background noise or talking" },
      { style: "reading_writing" as const, text: "The instructions aren't written clearly" },
      { style: "kinesthetic" as const, text: "I have to sit still for too long" },
    ],
  },
];

const styleInfo = {
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

export default function Onboarding() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, LearningStyle>>({});
  const [showResult, setShowResult] = useState(false);
  const [calculatedStyle, setCalculatedStyle] = useState<LearningStyle | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const handleAnswer = (style: LearningStyle) => {
    setAnswers({ ...answers, [currentQuestion]: style });
  };

  const calculateResult = (): LearningStyle => {
    const counts: Record<LearningStyle, number> = {
      visual: 0,
      auditory: 0,
      reading_writing: 0,
      kinesthetic: 0,
    };

    Object.values(answers).forEach((style) => {
      counts[style]++;
    });

    return Object.entries(counts).reduce((a, b) => (counts[a[0] as LearningStyle] > counts[b[0] as LearningStyle] ? a : b))[0] as LearningStyle;
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      const style = calculateResult();
      setCalculatedStyle(style);
      setShowResult(true);
    }
  };

  const handleComplete = async () => {
    if (!user || !calculatedStyle) return;
    
    setLoading(true);
    try {
      // Save learning style to profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          learning_style: calculatedStyle,
          onboarding_completed: true 
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Save quiz responses
      const { error: quizError } = await supabase
        .from("learning_style_responses")
        .insert({
          user_id: user.id,
          responses: answers,
          calculated_style: calculatedStyle,
          confidence_scores: {
            visual: Object.values(answers).filter(a => a === "visual").length,
            auditory: Object.values(answers).filter(a => a === "auditory").length,
            reading_writing: Object.values(answers).filter(a => a === "reading_writing").length,
            kinesthetic: Object.values(answers).filter(a => a === "kinesthetic").length,
          },
        });

      if (quizError) throw quizError;

      await refreshProfile();
      toast.success("Profile complete! Let's start learning.");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const currentQ = questions[currentQuestion];
  const selectedAnswer = answers[currentQuestion];

  if (showResult && calculatedStyle) {
    const style = styleInfo[calculatedStyle];
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
                  Ask me anything about your studies. I'll guide you to solutions without giving direct answers — this helps you learn better!
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="hero"
            size="xl"
            onClick={handleComplete}
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

  return (
    <div className="min-h-screen bg-background flex flex-col dark">
      {/* Progress bar */}
      <div className="h-1 bg-secondary">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-xl w-full space-y-8">
          {/* Question counter */}
          <div className="text-center">
            <span className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {questions.length}
            </span>
          </div>

          {/* Question */}
          <h2 className="text-2xl font-bold text-foreground text-center">
            {currentQ.question}
          </h2>

          {/* Options */}
          <div className="space-y-3">
            {currentQ.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option.style)}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
                  selectedAnswer === option.style
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <span className="text-foreground">{option.text}</span>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="ghost"
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            <Button
              variant="hero"
              onClick={handleNext}
              disabled={!selectedAnswer}
            >
              {currentQuestion === questions.length - 1 ? "See Results" : "Next"}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

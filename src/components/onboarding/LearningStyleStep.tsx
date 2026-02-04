import { cn } from "@/lib/utils";

type LearningStyle = "visual" | "auditory" | "reading_writing" | "kinesthetic";

interface Question {
  id: number;
  question: string;
  options: Array<{ style: LearningStyle; text: string }>;
}

const questions: Question[] = [
  {
    id: 1,
    question: "When learning something new, I prefer to...",
    options: [
      { style: "visual", text: "See diagrams, charts, or videos" },
      { style: "auditory", text: "Listen to explanations or discussions" },
      { style: "reading_writing", text: "Read about it and take notes" },
      { style: "kinesthetic", text: "Try it hands-on and learn by doing" },
    ],
  },
  {
    id: 2,
    question: "I remember things best when I...",
    options: [
      { style: "visual", text: "Can picture them in my mind" },
      { style: "auditory", text: "Hear them explained multiple times" },
      { style: "reading_writing", text: "Write them down or read them repeatedly" },
      { style: "kinesthetic", text: "Practice or experience them directly" },
    ],
  },
  {
    id: 3,
    question: "During a study session, I'm most likely to...",
    options: [
      { style: "visual", text: "Create mind maps or color-coded notes" },
      { style: "auditory", text: "Explain concepts out loud to myself" },
      { style: "reading_writing", text: "Reread and summarize text materials" },
      { style: "kinesthetic", text: "Take frequent breaks and move around" },
    ],
  },
  {
    id: 4,
    question: "When solving math problems, I prefer...",
    options: [
      { style: "visual", text: "Drawing pictures or graphs to visualize" },
      { style: "auditory", text: "Talking through the steps verbally" },
      { style: "reading_writing", text: "Following written step-by-step formulas" },
      { style: "kinesthetic", text: "Using physical manipulatives or counting" },
    ],
  },
  {
    id: 5,
    question: "I get distracted most easily when...",
    options: [
      { style: "visual", text: "There's visual clutter or movement around me" },
      { style: "auditory", text: "There's background noise or talking" },
      { style: "reading_writing", text: "The instructions aren't written clearly" },
      { style: "kinesthetic", text: "I have to sit still for too long" },
    ],
  },
];

interface LearningStyleStepProps {
  questionIndex: number;
  answers: Record<number, LearningStyle>;
  onAnswer: (questionIndex: number, style: LearningStyle) => void;
}

export function LearningStyleStep({ 
  questionIndex, 
  answers, 
  onAnswer 
}: LearningStyleStepProps) {
  const question = questions[questionIndex];
  const selectedAnswer = answers[questionIndex];

  if (!question) return null;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <span className="text-sm text-muted-foreground">
          Learning Style Question {questionIndex + 1} of {questions.length}
        </span>
        <h2 className="text-2xl font-bold text-foreground mt-2">
          {question.question}
        </h2>
      </div>

      <div className="space-y-3">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => onAnswer(questionIndex, option.style)}
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
    </div>
  );
}

export function calculateLearningStyle(answers: Record<number, LearningStyle>): LearningStyle {
  const counts: Record<LearningStyle, number> = {
    visual: 0,
    auditory: 0,
    reading_writing: 0,
    kinesthetic: 0,
  };

  Object.values(answers).forEach((style) => {
    counts[style]++;
  });

  return Object.entries(counts).reduce((a, b) => 
    (counts[a[0] as LearningStyle] > counts[b[0] as LearningStyle] ? a : b)
  )[0] as LearningStyle;
}

export const LEARNING_STYLE_QUESTIONS_COUNT = questions.length;

export type { LearningStyle };

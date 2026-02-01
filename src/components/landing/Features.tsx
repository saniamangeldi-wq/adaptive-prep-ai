import { 
  Brain, 
  Target, 
  LineChart, 
  Layers, 
  MessageSquare, 
  Zap,
  GraduationCap,
  Clock
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Adaptive Learning",
    description: "Our AI analyzes your performance and adjusts difficulty in real-time to maximize learning efficiency.",
    color: "from-primary to-teal-400",
  },
  {
    icon: Target,
    title: "Learning Style Detection",
    description: "Take a quick quiz to discover if you're a visual, auditory, reading/writing, or kinesthetic learner.",
    color: "from-accent to-orange-400",
  },
  {
    icon: LineChart,
    title: "Progress Tracking",
    description: "Visualize your strengths and weaknesses with detailed analytics and personalized recommendations.",
    color: "from-info to-blue-400",
  },
  {
    icon: Layers,
    title: "Flexible Test Lengths",
    description: "Practice with 10, 25, 50, 75, or full 154-question tests — fit studying into any schedule.",
    color: "from-success to-emerald-400",
  },
  {
    icon: MessageSquare,
    title: "AI Study Coach",
    description: "Get hints and explanations without spoilers — our AI guides you to the answer, never gives it away.",
    color: "from-purple-500 to-pink-400",
  },
  {
    icon: Zap,
    title: "Smart Flashcards",
    description: "Generate flashcards automatically from your study materials or let AI create them from any topic.",
    color: "from-warning to-yellow-400",
  },
  {
    icon: GraduationCap,
    title: "Full SAT Coverage",
    description: "Complete Math and Reading/Writing practice with official-style questions and detailed feedback.",
    color: "from-rose-500 to-red-400",
  },
  {
    icon: Clock,
    title: "Timed Practice",
    description: "Toggle timer on or off — build test-taking stamina or focus on understanding without pressure.",
    color: "from-cyan-500 to-teal-400",
  },
];

export function Features() {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything you need to{" "}
            <span className="gradient-text">ace the SAT</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful features designed to personalize your study experience and maximize your score improvement.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} delay={index * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  color,
  delay 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  color: string;
  delay: number;
}) {
  return (
    <div 
      className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} p-0.5 mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <div className="w-full h-full rounded-[10px] bg-card flex items-center justify-center">
          <Icon className="w-5 h-5 text-foreground" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

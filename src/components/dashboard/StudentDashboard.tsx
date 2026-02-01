import { useAuth } from "@/contexts/AuthContext";
import { 
  BookOpen, 
  Brain, 
  Layers, 
  MessageSquare, 
  Trophy,
  ArrowRight,
  Target,
  FileText,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function StudentDashboard() {
  const { profile } = useAuth();

  const learningStyleLabel = {
    visual: "Visual",
    auditory: "Auditory",
    reading_writing: "Reading/Writing",
    kinesthetic: "Kinesthetic",
  };

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Welcome back, {profile?.full_name?.split(" ")[0] || "Student"}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {profile?.learning_style 
              ? `Your learning style: ${learningStyleLabel[profile.learning_style]}`
              : "Let's continue your SAT prep journey"}
          </p>
        </div>
        <Button variant="hero" asChild>
          <Link to="/dashboard/tests">
            Start Practice Test
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="Tests Remaining"
          value={profile?.tests_remaining?.toString() || "2"}
          subtext="this month"
          color="from-primary to-teal-400"
        />
        <StatCard
          icon={Zap}
          label="AI Credits"
          value={profile?.credits_remaining?.toString() || "50"}
          subtext="today"
          color="from-accent to-orange-400"
        />
        <StatCard
          icon={Trophy}
          label="Best Score"
          value="--"
          subtext="no tests yet"
          color="from-green-500 to-emerald-400"
        />
        <StatCard
          icon={Target}
          label="Accuracy"
          value="--"
          subtext="start practicing"
          color="from-blue-500 to-blue-400"
        />
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickAction
          icon={BookOpen}
          title="Practice Tests"
          description="Take a full SAT practice test or quick quiz"
          href="/dashboard/tests"
          color="from-primary to-teal-400"
        />
        <QuickAction
          icon={MessageSquare}
          title="AI Coach"
          description="Get help with concepts and study plans"
          href="/dashboard/coach"
          color="from-purple-500 to-pink-400"
        />
        <QuickAction
          icon={Layers}
          title="Flashcards"
          description="Review key concepts with smart flashcards"
          href="/dashboard/flashcards"
          color="from-accent to-orange-400"
        />
      </div>

      {/* Learning tip */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">Today's Study Tip</h3>
            <p className="text-muted-foreground text-sm">
              {profile?.learning_style === "visual" && "Try creating mind maps for complex concepts. Visual learners retain information better when they can see relationships between ideas."}
              {profile?.learning_style === "auditory" && "Read your notes out loud or explain concepts to someone else. Hearing information helps auditory learners remember it better."}
              {profile?.learning_style === "reading_writing" && "Rewrite your notes in your own words. Writing helps reinforce learning for reading/writing learners."}
              {profile?.learning_style === "kinesthetic" && "Take short breaks every 25 minutes to move around. Kinesthetic learners focus better when they incorporate movement."}
              {!profile?.learning_style && "Complete your learning style quiz to get personalized study tips tailored to how you learn best!"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext,
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  subtext: string;
  color: string;
}) {
  return (
    <div className="p-5 rounded-xl bg-card border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} p-0.5`}>
          <div className="w-full h-full rounded-[6px] bg-card flex items-center justify-center">
            <Icon className="w-5 h-5 text-foreground" />
          </div>
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground/70">{subtext}</span>
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
  href,
  color,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  color: string;
}) {
  return (
    <Link 
      to={href}
      className="group p-5 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} p-0.5 mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <div className="w-full h-full rounded-[10px] bg-card flex items-center justify-center">
          <Icon className="w-6 h-6 text-foreground" />
        </div>
      </div>
      <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

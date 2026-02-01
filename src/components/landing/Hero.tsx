import { Sparkles, BookOpen, Brain, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AIChatPreview } from "./AIChatPreview";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-hero" />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      
      <div className="container relative z-10 mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Your AI SAT Study Partner</span>
            </div>

            {/* Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Meet{" "}
                <span className="gradient-text">AdaptivePrep</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-lg">
                Your personalized SAT preparation assistant that adapts to your learning style — master Math and Reading/Writing, all in one place.
              </p>
            </div>

            {/* Features list */}
            <div className="space-y-4">
              <FeatureItem icon={BookOpen} text="Adaptive practice tests that match your skill level" />
              <FeatureItem icon={Brain} text="AI coach that guides you without giving away answers" />
              <FeatureItem icon={Trophy} text="Track your progress and crush your SAT goals" />
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-4">
              <Button variant="hero" size="xl" asChild>
                <Link to="/signup">
                  Get Started
                  <Sparkles className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="heroOutline" size="xl" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-3 pt-4">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-background"
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Join <span className="font-semibold text-foreground">thousands</span> of students preparing smarter with AI
              </p>
            </div>
          </div>

          {/* Right content - AI Chat Preview */}
          <div className="relative lg:pl-8">
            <AIChatPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureItem({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <span className="text-foreground">{text}</span>
    </div>
  );
}

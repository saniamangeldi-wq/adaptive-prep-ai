import { Bot, CheckCircle2, Send } from "lucide-react";
import { useState, useEffect } from "react";

export function AIChatPreview() {
  const [showMessage, setShowMessage] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [showPlan, setShowPlan] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setShowMessage(true), 500);
    const timer2 = setTimeout(() => setShowResponse(true), 1500);
    const timer3 = setTimeout(() => setShowPlan(true), 2500);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
      
      {/* Chat card */}
      <div className="relative glass-card rounded-2xl p-6 max-w-md mx-auto animate-float">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">AdaptivePrep AI</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-muted-foreground">Online • Ready to help</span>
            </div>
          </div>
        </div>

        {/* Chat messages */}
        <div className="space-y-4 mb-6">
          {/* User message */}
          {showMessage && (
            <div className="flex justify-end animate-fade-in">
              <div className="bg-primary text-primary-foreground px-4 py-3 rounded-2xl rounded-tr-sm max-w-[80%]">
                <p className="text-sm">I have the SAT next month. Can you help me create a study plan?</p>
              </div>
            </div>
          )}

          {/* Bot response */}
          {showResponse && (
            <div className="animate-fade-in">
              <p className="text-sm text-foreground mb-3">
                Of course! Here's your personalized 4-week SAT study plan:
              </p>
              
              {showPlan && (
                <div className="space-y-2 animate-fade-in">
                  <PlanItem week="Week 1-2" task="Math fundamentals & algebra" />
                  <PlanItem week="Week 2-3" task="Reading comprehension" />
                  <PlanItem week="Week 3-4" task="Practice tests + review" />
                  <p className="text-sm text-primary mt-3">Ready to start? 🚀</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50 border border-border/50">
          <input
            type="text"
            placeholder="Ask me anything..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            disabled
          />
          <button className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanItem({ week, task }: { week: string; task: string }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{week}:</span> {task}
      </p>
    </div>
  );
}

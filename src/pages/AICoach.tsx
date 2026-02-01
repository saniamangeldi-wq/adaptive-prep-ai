import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Zap,
  AlertCircle,
  Lightbulb,
  Clock,
  ArrowUpRight
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const suggestedPrompts = [
  "Create a 2-week SAT study plan for me",
  "Explain how to solve quadratic equations",
  "What are the best strategies for reading comprehension?",
  "Help me understand comma rules in grammar",
];

// Get daily credit limit based on tier
const getTierCredits = (tier: string | undefined) => {
  switch (tier) {
    case "tier_3": return 300;
    case "tier_2": return 150;
    default: return 50;
  }
};

// Get hours until midnight reset
const getHoursUntilReset = () => {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60));
};

export default function AICoach() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if ((profile?.credits_remaining || 0) <= 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response (would connect to actual AI endpoint)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getSimulatedResponse(userMessage.content),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const dailyLimit = getTierCredits(profile?.tier);
  const creditsRemaining = profile?.credits_remaining || 0;
  const creditsLow = creditsRemaining < 10 && creditsRemaining > 0;
  const noCredits = creditsRemaining <= 0;
  const hoursUntilReset = getHoursUntilReset();

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              AI Coach
            </h1>
            <p className="text-sm text-muted-foreground">
              Your personal SAT study assistant
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-foreground">
              {creditsRemaining}/{dailyLimit} credits
            </span>
          </div>
        </div>

        {/* Important notice */}
        <div className="mb-4 p-4 rounded-xl bg-info/10 border border-info/20 flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-medium text-foreground">Learning Mode:</span>{" "}
            <span className="text-muted-foreground">
              I'll help you understand concepts and guide you to solutions, but I won't give you direct answers to test questions. This helps you learn better!
            </span>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 rounded-xl bg-card/50 border border-border/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                How can I help you today?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                I'm your AI study coach. Ask me about SAT concepts, study strategies, or help with practice problems.
              </p>
              <div className="grid sm:grid-cols-2 gap-2 w-full max-w-lg">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="p-3 text-sm text-left rounded-lg bg-secondary/50 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" && "flex-row-reverse"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    message.role === "assistant" 
                      ? "bg-primary/20" 
                      : "bg-accent/20"
                  )}>
                    {message.role === "assistant" ? (
                      <Bot className="w-4 h-4 text-primary" />
                    ) : (
                      <User className="w-4 h-4 text-accent" />
                    )}
                  </div>
                  <div className={cn(
                    "max-w-[80%] p-4 rounded-2xl",
                    message.role === "assistant"
                      ? "bg-card border border-border/50 rounded-tl-sm"
                      : "bg-primary text-primary-foreground rounded-tr-sm"
                  )}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm p-4">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Credits warning */}
        {creditsLow && (
          <div className="mb-2 p-2 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-warning" />
            <span className="text-muted-foreground">Low credits remaining. Credits reset daily at midnight.</span>
          </div>
        )}

        {/* No credits - upgrade prompt */}
        {noCredits && (
          <div className="mb-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  You've used your {dailyLimit} daily credits
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Resets in {hoursUntilReset} hour{hoursUntilReset !== 1 ? 's' : ''}.{" "}
                  {profile?.tier !== "tier_3" && (
                    <Link to="/dashboard/settings" className="text-primary hover:underline inline-flex items-center gap-1">
                      Upgrade for {profile?.tier === "tier_2" ? "300" : "150"}+ credits/day
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={noCredits ? "No credits remaining..." : "Ask me anything about SAT prep..."}
              disabled={noCredits || isLoading}
              className="w-full h-12 px-4 rounded-xl bg-card border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>
          <Button
            variant="hero"
            size="icon"
            className="w-12 h-12"
            onClick={handleSend}
            disabled={!input.trim() || noCredits || isLoading}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

function getSimulatedResponse(input: string): string {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes("study plan") || lowerInput.includes("schedule")) {
    return `Great question! Here's a personalized study plan based on your learning style:

**Week 1-2: Foundation Building**
• Focus on Math fundamentals (30 min/day)
• Practice reading comprehension (20 min/day)
• Review 10 vocabulary words daily

**Week 3-4: Practice & Review**
• Take 2 practice tests per week
• Review mistakes thoroughly
• Work on weak areas identified in tests

Would you like me to adjust this plan for your specific needs?`;
  }
  
  if (lowerInput.includes("quadratic") || lowerInput.includes("equation")) {
    return `Let me guide you through quadratic equations! 🎯

**The Standard Form:** ax² + bx + c = 0

**Key Methods to Solve:**
1. **Factoring** - Best when the equation factors nicely
2. **Quadratic Formula** - Works for any quadratic: x = (-b ± √(b²-4ac)) / 2a
3. **Completing the Square** - Useful for understanding the vertex

**Tip:** On the SAT, often the fastest method is to factor or use the quadratic formula.

Would you like me to walk you through a practice problem? (I'll guide you, not give the answer!)`;
  }
  
  if (lowerInput.includes("reading") || lowerInput.includes("comprehension")) {
    return `Here are proven strategies for SAT Reading! 📚

**Before Reading:**
• Skim the questions first to know what to look for
• Note line references in questions

**While Reading:**
• Read actively - underline key points
• Pay attention to transition words (however, therefore, although)
• Identify the main idea of each paragraph

**Answering Questions:**
• Always find evidence in the passage
• Eliminate obviously wrong answers first
• Be wary of answers that are too extreme

Want me to explain any of these strategies in more detail?`;
  }
  
  return `That's a great question! Let me help you think through this.

Based on what you're asking, here are some things to consider:

1. **Break it down** - What's the core concept you need to understand?
2. **Find patterns** - How does this relate to what you already know?
3. **Practice application** - Try working through a similar example

Would you like me to:
• Explain a specific concept in more detail?
• Guide you through a practice problem?
• Create a focused study session on this topic?

Remember, I'm here to help you learn - not just give answers! 💡`;
}

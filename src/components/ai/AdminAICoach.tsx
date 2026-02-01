import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  Bot, 
  User, 
  TrendingUp, 
  Zap,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Trash2,
  FileText,
  MessageSquare,
  Building2,
  Users,
  Target,
  BarChart3,
  Trophy
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useAIChat, type Message } from "@/hooks/useAIChat";
import ReactMarkdown from "react-markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const suggestedPrompts = [
  "Which teacher's class has the best performance?",
  "Give me enrollment projections for the next 3 months",
  "What's our ROI on the current subscription plan?",
  "Which areas need the most improvement school-wide?",
];

const projectionPrompts = [
  "Project our student enrollment for the next 6 months",
  "What's the expected SAT score improvement trajectory?",
  "Analyze capacity needs based on growth trends",
  "Budget forecast for scaling to 100 students",
];

const teacherAnalysisPrompts = [
  "Rank teachers by student improvement rates",
  "What teaching methods correlate with best outcomes?",
  "Which classes are underperforming and why?",
  "Compare teacher effectiveness across subjects",
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

export function AdminAICoach() {
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();
  const { messages, isLoading, streamChat, clearMessages } = useAIChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (customMessage?: string) => {
    const messageToSend = customMessage || input;
    if (!messageToSend.trim() || isLoading) return;
    if ((profile?.credits_remaining || 0) <= 0) return;
    
    if (!customMessage) setInput("");
    await streamChat(messageToSend, { endpoint: "admin-analytics" });
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const handleQuickAnalysis = async (prompt: string) => {
    await handleSend(prompt);
  };

  const dailyLimit = getTierCredits(profile?.tier);
  const creditsRemaining = profile?.credits_remaining || 0;
  const creditsLow = creditsRemaining < 10 && creditsRemaining > 0;
  const noCredits = creditsRemaining <= 0;
  const hoursUntilReset = getHoursUntilReset();

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Analytics Engine
          </h1>
          <p className="text-sm text-muted-foreground">
            School projections, teacher performance, and strategic insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearMessages}
              className="text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-foreground">
              {creditsRemaining}/{dailyLimit}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-4">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="projections" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Projections
          </TabsTrigger>
          <TabsTrigger value="teachers" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Teachers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex flex-col mt-0">
          {/* Chat area */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 rounded-xl bg-card/50 border border-border/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-400 flex items-center justify-center mb-4">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  School Analytics at Your Fingertips
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Ask about school projections, teacher class performance, budget optimization, or strategic insights.
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
                  <MessageBubble key={message.id} message={message} />
                ))}
                {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                  <LoadingBubble />
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Credits warnings */}
          <CreditsWarnings 
            creditsLow={creditsLow} 
            noCredits={noCredits} 
            dailyLimit={dailyLimit} 
            hoursUntilReset={hoursUntilReset}
            tier={profile?.tier}
          />

          {/* Input area */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder={noCredits ? "No credits remaining..." : "Ask about projections, teacher performance, or strategy..."}
                disabled={noCredits || isLoading}
                className="w-full h-12 px-4 rounded-xl bg-card border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
            </div>
            <Button
              variant="hero"
              size="icon"
              className="w-12 h-12"
              onClick={() => handleSend()}
              disabled={!input.trim() || noCredits || isLoading}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="projections" className="flex-1 flex flex-col mt-0">
          {/* Projections Quick Actions */}
          <div className="p-6 rounded-xl bg-card border border-border/50 mb-4">
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              School Projections
              <span className="text-xs text-muted-foreground ml-auto">5 credits/analysis</span>
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get AI-powered forecasts for enrollment, performance, and resource planning.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-3">
              {projectionPrompts.map((prompt) => (
                <Button 
                  key={prompt}
                  variant="outline" 
                  className="h-auto py-3 px-4 text-left justify-start"
                  onClick={() => handleQuickAnalysis(prompt)}
                  disabled={isLoading || creditsRemaining < 5}
                >
                  <div className="flex items-start gap-3">
                    <BarChart3 className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                    <span className="text-sm">{prompt}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Output Area */}
          <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-xl bg-card/50 border border-border/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                <Target className="w-12 h-12 mb-4 opacity-50" />
                <p>Projection results will appear here</p>
                <p className="text-xs mt-2">Click a quick action above or ask in chat</p>
              </div>
            ) : (
              <>
                {messages.filter(m => m.role === "assistant").map((message) => (
                  <div key={message.id} className="p-4 rounded-xl bg-card border border-border/50">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="teachers" className="flex-1 flex flex-col mt-0">
          {/* Teacher Performance Quick Actions */}
          <div className="p-6 rounded-xl bg-card border border-border/50 mb-4">
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              Teacher Class Performance
              <span className="text-xs text-muted-foreground ml-auto">5 credits/analysis</span>
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Analyze which teachers' classes perform best and identify success patterns.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-3">
              {teacherAnalysisPrompts.map((prompt) => (
                <Button 
                  key={prompt}
                  variant="outline" 
                  className="h-auto py-3 px-4 text-left justify-start"
                  onClick={() => handleQuickAnalysis(prompt)}
                  disabled={isLoading || creditsRemaining < 5}
                >
                  <div className="flex items-start gap-3">
                    <Users className="w-4 h-4 mt-0.5 text-accent flex-shrink-0" />
                    <span className="text-sm">{prompt}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Output Area */}
          <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-xl bg-card/50 border border-border/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                <Trophy className="w-12 h-12 mb-4 opacity-50" />
                <p>Teacher analysis results will appear here</p>
                <p className="text-xs mt-2">Compare class performance and identify best practices</p>
              </div>
            ) : (
              <>
                {messages.filter(m => m.role === "assistant").map((message) => (
                  <div key={message.id} className="p-4 rounded-xl bg-card border border-border/50">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  return (
    <div className={cn(
      "flex gap-3",
      message.role === "user" && "flex-row-reverse"
    )}>
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
        {message.role === "assistant" ? (
          <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </div>
  );
}

function LoadingBubble() {
  return (
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
  );
}

function CreditsWarnings({ 
  creditsLow, 
  noCredits, 
  dailyLimit, 
  hoursUntilReset,
  tier 
}: { 
  creditsLow: boolean; 
  noCredits: boolean; 
  dailyLimit: number; 
  hoursUntilReset: number;
  tier: string | undefined;
}) {
  if (noCredits) {
    return (
      <div className="mb-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              You've used your {dailyLimit} daily credits
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Resets in {hoursUntilReset} hour{hoursUntilReset !== 1 ? 's' : ''}.{" "}
              {tier !== "tier_3" && (
                <Link to="/dashboard/school/billing" className="text-primary hover:underline inline-flex items-center gap-1">
                  Upgrade for more credits
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (creditsLow) {
    return (
      <div className="mb-2 p-2 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2 text-sm">
        <AlertCircle className="w-4 h-4 text-warning" />
        <span className="text-muted-foreground">Low credits remaining. Credits reset daily at midnight.</span>
      </div>
    );
  }

  return null;
}

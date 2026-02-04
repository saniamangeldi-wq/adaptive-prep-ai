import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  Bot, 
  User, 
  GraduationCap, 
  Zap,
  AlertCircle,
  Lightbulb,
  Clock,
  ArrowUpRight,
  Trash2,
  Volume2,
  VolumeX,
  Loader2,
  Crown
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useAIChat, type Message } from "@/hooks/useAIChat";
import ReactMarkdown from "react-markdown";
import { VoiceChat } from "./VoiceChat";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

const suggestedPrompts = [
  "Create a 2-week SAT study plan for me",
  "Explain how to solve quadratic equations",
  "What are the best strategies for reading comprehension?",
  "Help me understand comma rules in grammar",
];

// Get daily credit limit based on tier and trial status
const getTierCredits = (tier: string | undefined, isTrial: boolean | undefined) => {
  if (isTrial) return 100; // Trial users get 100 credits/day
  switch (tier) {
    case "tier_3": return 300;
    case "tier_2": return 150;
    case "tier_1": return 50;
    case "tier_0": return 20;
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

export function StudentAICoach() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();
  const { messages, isLoading, streamChat, clearMessages } = useAIChat();
  const isTier3 = profile?.tier === "tier_3";

  const handleVoiceTranscript = (text: string) => {
    setInput(text);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if ((profile?.credits_remaining || 0) <= 0) return;
    
    const userInput = input;
    setInput("");
    await streamChat(userInput, { endpoint: "student-chat" });
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const dailyLimit = getTierCredits(profile?.tier, profile?.is_trial);
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
            <GraduationCap className="w-6 h-6 text-primary" />
            Study Coach
          </h1>
          <p className="text-sm text-muted-foreground">
            Your personal SAT study assistant
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
              <MessageBubble key={message.id} message={message} isTier3={isTier3} />
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <LoadingBubble />
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Credits warnings */}
      {creditsLow && (
        <div className="mb-2 p-2 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 text-warning" />
          <span className="text-muted-foreground">Low credits remaining. Credits reset daily at midnight.</span>
        </div>
      )}

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
        {/* Voice chat for Tier 3 users */}
        {isTier3 && (
          <VoiceChat 
            onTranscript={handleVoiceTranscript}
            isDisabled={noCredits || isLoading}
          />
        )}
        <div className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={noCredits ? "No credits remaining..." : isTier3 ? "Type or use voice chat..." : "Ask me anything about SAT prep..."}
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
  );
}

function MessageBubble({ message, isTier3 }: { message: Message; isTier3: boolean }) {
  const { speak, stop, isPlaying, isLoading } = useTextToSpeech();

  const handleTTS = () => {
    if (isPlaying) {
      stop();
    } else {
      speak(message.content);
    }
  };

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
          <>
            <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>
                {/* Strip citation brackets like [1][2][3] from AI responses */}
                {message.content.replace(/\[\d+\]/g, '')}
              </ReactMarkdown>
            </div>
            {/* TTS button for Tier 3 users */}
            {isTier3 && message.content && (
              <div className="mt-2 pt-2 border-t border-border/30 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTTS}
                  disabled={isLoading}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                  title={isPlaying ? "Stop reading" : "Read aloud"}
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isPlaying ? (
                    <VolumeX className="w-3 h-3" />
                  ) : (
                    <Volume2 className="w-3 h-3" />
                  )}
                  <span>{isPlaying ? "Stop" : "Listen"}</span>
                  <Crown className="w-3 h-3 text-warning" />
                </Button>
              </div>
            )}
          </>
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

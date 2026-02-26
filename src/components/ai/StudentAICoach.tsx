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
import { AISuggestions } from "./AISuggestions";
import { CreditsInfoPopover } from "./CreditsInfoPopover";
import { ChatAttachments } from "./ChatAttachments";
import { useAttachments } from "@/hooks/useAttachments";
import { getTierLimits, TRIAL_LIMITS } from "@/lib/tier-limits";

// Get daily credit limit based on tier and trial status
const getTierCredits = (tier: string | undefined, isTrial: boolean | undefined) => {
  if (isTrial) return TRIAL_LIMITS.creditsPerDay;
  return getTierLimits(tier as any).creditsPerDay;
};

// Get hours until midnight reset
const getHoursUntilReset = () => {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60));
};

export function StudentAICoach({ conversationId, onEnsureConversation }: { conversationId?: string | null; onEnsureConversation?: () => Promise<string | null> }) {
  const [input, setInput] = useState("");
  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();
  const { messages, isLoading, streamChat, clearMessages, loadConversationMessages } = useAIChat(activeConvId);
  const isTier3 = profile?.tier === "tier_3";

  // Sync activeConvId when conversationId prop changes
  useEffect(() => {
    setActiveConvId(conversationId || null);
  }, [conversationId]);

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConvId) {
      loadConversationMessages(activeConvId);
    } else {
      clearMessages();
    }
  }, [activeConvId, loadConversationMessages, clearMessages]);
  
  // Attachments hook
  const {
    attachments,
    isUploading,
    uploadFile,
    attachUrl,
    performWebSearch,
    removeAttachment,
    clearAttachments,
    getAttachmentContext,
  } = useAttachments();

  // Determine the primary subject for suggestions
  const primarySubject = profile?.primary_goal === "homework" 
    ? "General" 
    : profile?.primary_goal || "SAT";

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
    
    // Auto-create conversation if none exists
    if (!activeConvId && onEnsureConversation) {
      const newId = await onEnsureConversation();
      if (newId) setActiveConvId(newId);
    }
    
    // Combine message with attachment context
    const attachmentContext = getAttachmentContext();
    const userInput = input + attachmentContext;
    
    setInput("");
    clearAttachments();
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
      <div className="flex items-center justify-between mb-2">
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
          <CreditsInfoPopover creditsRemaining={creditsRemaining} dailyLimit={dailyLimit}>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-colors cursor-pointer">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">
                {creditsRemaining}/{dailyLimit}
              </span>
            </button>
          </CreditsInfoPopover>
        </div>
      </div>


      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-2 p-3 rounded-xl bg-card/50 border border-border/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center mb-3">
              <Bot className="w-6 h-6 text-primary-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">
              How can I help you today?
            </h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Ask me about any subject, study strategies, or practice problems.
            </p>
            <AISuggestions 
              subject={primarySubject}
              onSelectSuggestion={handleSuggestedPrompt}
              className="w-full max-w-lg"
            />
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
      <div className="space-y-2">
        <ChatAttachments
          attachments={attachments}
          isUploading={isUploading}
          onUploadFile={uploadFile}
          onAttachUrl={attachUrl}
          onWebSearch={performWebSearch}
          onRemove={removeAttachment}
          disabled={noCredits || isLoading}
        />
        
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
            placeholder={noCredits ? "No credits remaining..." : isTier3 ? "Type, paste image, or use voice..." : "Type or paste an image (Ctrl+V)..."}
            disabled={noCredits || isLoading}
            className="w-full h-12 px-4 rounded-xl bg-card border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
        </div>
        <Button
          variant="hero"
          size="icon"
          className="w-12 h-12"
          onClick={handleSend}
          disabled={(!input.trim() && attachments.length === 0) || noCredits || isLoading}
        >
          <Send className="w-5 h-5" />
        </Button>
        </div>
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

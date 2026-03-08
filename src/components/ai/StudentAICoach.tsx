import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  Bot, 
  User, 
  GraduationCap, 
  Zap,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Trash2,
  Volume2,
  VolumeX,
  Loader2,
  Crown,
  Paperclip,
  Search,
  Mic
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

const getTierCredits = (tier: string | undefined, isTrial: boolean | undefined) => {
  if (isTrial) return TRIAL_LIMITS.creditsPerDay;
  return getTierLimits(tier as any).creditsPerDay;
};

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
  const [showAttachments, setShowAttachments] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();
  const { messages, isLoading, streamChat, clearMessages, loadConversationMessages } = useAIChat(activeConvId);
  const isTier3 = profile?.tier === "tier_3";

  useEffect(() => {
    setActiveConvId(conversationId || null);
  }, [conversationId]);

  useEffect(() => {
    if (activeConvId) {
      loadConversationMessages(activeConvId);
    } else {
      clearMessages();
    }
  }, [activeConvId, loadConversationMessages, clearMessages]);
  
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
    
    if (!activeConvId && onEnsureConversation) {
      const newId = await onEnsureConversation();
      if (newId) setActiveConvId(newId);
    }
    
    const attachmentContext = getAttachmentContext();
    const userInput = input + attachmentContext;
    
    setInput("");
    clearAttachments();
    setShowAttachments(false);
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
    <div className="flex flex-col h-full min-h-0">
      {/* Messages area — centered */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-[720px] mx-auto px-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center mb-4">
                <Bot className="w-7 h-7 md:w-8 md:h-8 text-primary-foreground" />
              </div>
              <h2 className="text-lg md:text-xl font-semibold text-foreground mb-2">
                How can I help you today?
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                I'm your AI study coach. Ask me about any subject, study strategies, or help with practice problems.
              </p>
              <AISuggestions 
                subject={primarySubject}
                onSelectSuggestion={handleSuggestedPrompt}
                className="w-full max-w-lg"
              />
            </div>
          ) : (
            <div className="space-y-5 py-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} isTier3={isTier3} />
              ))}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <LoadingBubble />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Credits warnings */}
      <div className="max-w-[720px] mx-auto w-full px-4">
        {creditsLow && (
          <div className="mb-2 p-2 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
            <span className="text-muted-foreground text-xs">Low credits. Resets at midnight.</span>
          </div>
        )}

        {noCredits && (
          <div className="mb-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">
                  You've used your {dailyLimit} daily credits
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Resets in {hoursUntilReset}h.{" "}
                  {profile?.tier !== "tier_3" && (
                    <Link to="/dashboard/billing" className="text-primary hover:underline inline-flex items-center gap-1">
                      Upgrade <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating input bar */}
      <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 flex-shrink-0">
        <div className="max-w-[720px] mx-auto px-4">
          {/* Attachment previews above input */}
          {showAttachments && (
            <div className="mb-2">
              <ChatAttachments
                attachments={attachments}
                isUploading={isUploading}
                onUploadFile={uploadFile}
                onAttachUrl={attachUrl}
                onWebSearch={performWebSearch}
                onRemove={removeAttachment}
                disabled={noCredits || isLoading}
              />
            </div>
          )}

          <div className={cn(
            "relative flex items-center gap-2 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm px-3 py-2 transition-shadow",
            "focus-within:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)] focus-within:border-primary/40"
          )}>
            {/* Attach button */}
            <button
              onClick={() => setShowAttachments(!showAttachments)}
              disabled={noCredits || isLoading}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
              title="Attach files"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Text input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={noCredits ? "No credits remaining..." : "Ask anything..."}
              disabled={noCredits || isLoading}
              className="flex-1 bg-transparent border-none text-foreground placeholder:text-muted-foreground/60 focus:outline-none text-sm h-10 md:h-9"
            />

            {/* Credits badge — minimal */}
            <CreditsInfoPopover creditsRemaining={creditsRemaining} dailyLimit={dailyLimit}>
              <button className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Zap className="w-3 h-3" />
                <span>{creditsRemaining}</span>
              </button>
            </CreditsInfoPopover>

            {/* Voice button (Tier 3) */}
            {isTier3 && (
              <VoiceChat 
                onTranscript={handleVoiceTranscript}
                isDisabled={noCredits || isLoading}
              />
            )}

            {/* Send button */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-xl transition-colors",
                input.trim() 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "text-muted-foreground"
              )}
              onClick={handleSend}
              disabled={(!input.trim() && attachments.length === 0) || noCredits || isLoading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
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

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] md:max-w-[75%] px-4 py-3 rounded-2xl rounded-tr-md bg-primary text-primary-foreground">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
        <Bot className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="ai-prose max-w-none">
          <ReactMarkdown>
            {message.content
              .replace(/<think>[\s\S]*?<\/think>/gi, '')
              .replace(/<\/?think>/gi, '')
              .replace(/\[\d+\]/g, '')
              .trim()}
          </ReactMarkdown>
        </div>
        {isTier3 && message.content && (
          <div className="mt-2 flex">
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
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingBubble() {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
        <Bot className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="pt-2">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

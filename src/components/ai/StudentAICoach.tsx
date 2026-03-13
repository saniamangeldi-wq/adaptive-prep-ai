import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  Bot, 
  Zap,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Volume2,
  VolumeX,
  Loader2,
  Paperclip,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Check,
  GraduationCap,
  Mic,
  Crown
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useAIChat, type Message } from "@/hooks/useAIChat";
import ReactMarkdown from "react-markdown";
import { VoiceChat } from "./VoiceChat";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { ChatAttachments } from "./ChatAttachments";
import { useAttachments } from "@/hooks/useAttachments";
import { getTierLimits, TRIAL_LIMITS } from "@/lib/tier-limits";
import { toast } from "sonner";
import { QuestionWidget } from "./QuestionWidget";

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

const DEFAULT_CHIPS = [
  "Make me a 2-week SAT study plan",
  "Explain quadratic equations",
  "Help me improve reading comp",
  "What are the hardest SAT grammar rules?",
];

interface StudentAICoachProps {
  conversationId?: string | null;
  onEnsureConversation?: () => Promise<string | null>;
  chatMode?: "text" | "voice";
}

export function StudentAICoach({ conversationId, onEnsureConversation, chatMode = "text" }: StudentAICoachProps) {
  const [input, setInput] = useState("");
  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId || null);
  const [showAttachments, setShowAttachments] = useState(false);
  const skipNextLoad = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { profile } = useAuth();
  const { messages, isLoading, streamChat, clearMessages, loadConversationMessages } = useAIChat(activeConvId);
  const isTier3 = profile?.tier === "tier_3";

  useEffect(() => {
    setActiveConvId(conversationId || null);
  }, [conversationId]);

  useEffect(() => {
    if (skipNextLoad.current) {
      skipNextLoad.current = false;
      return;
    }
    if (activeConvId) {
      loadConversationMessages(activeConvId);
    } else {
      clearMessages();
    }
  }, [activeConvId, loadConversationMessages, clearMessages]);

  // Restore focus after AI finishes responding
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);
  
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

  const handleVoiceTranscript = (text: string) => {
    setInput(text);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (overrideInput?: string) => {
    const text = overrideInput ?? input;
    if (!text.trim() || isLoading) return;
    if ((profile?.credits_remaining || 0) <= 0) return;
    
    if (!activeConvId && onEnsureConversation) {
      const newId = await onEnsureConversation();
      if (newId) {
        skipNextLoad.current = true;
        setActiveConvId(newId);
      }
    }
    
    const attachmentContext = getAttachmentContext();
    const userInput = text + attachmentContext;
    
    setInput("");
    clearAttachments();
    setShowAttachments(false);
    await streamChat(userInput, { endpoint: "student-chat" });
  };

  const handleChipClick = (prompt: string) => {
    handleSend(prompt);
  };

  const dailyLimit = getTierCredits(profile?.tier, profile?.is_trial);
  const creditsRemaining = profile?.credits_remaining || 0;
  const creditsLow = creditsRemaining < 10 && creditsRemaining > 0;
  const noCredits = creditsRemaining <= 0;
  const hoursUntilReset = getHoursUntilReset();

  // Voice mode
  if (chatMode === "voice") {
    return (
      <div className="flex flex-col h-full">
        <VoiceChat
          onTranscript={handleVoiceTranscript}
          isDisabled={noCredits || isLoading}
          fullMode={true}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages area — centered */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-[760px] mx-auto px-4">
          {messages.length === 0 ? (
            /* Empty state */
            <div className="h-full flex flex-col items-center justify-center text-center py-24">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center mb-6">
                <GraduationCap className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-[26px] font-bold text-foreground mb-2">
                What do you want to study today?
              </h1>
              <p className="text-sm text-muted-foreground mb-8">
                Your SAT study coach — math, reading, writing, and beyond
              </p>
              <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                {DEFAULT_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleChipClick(chip)}
                    disabled={noCredits || isLoading}
                    className="px-4 py-2.5 text-[13px] text-left rounded-xl border border-border/30 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:shadow-[0_0_12px_-3px_hsl(var(--primary)/0.3)] transition-all duration-200 disabled:opacity-40"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Active chat — Perplexity style: no bubbles */
            <div className="py-6">
              {messages.map((message, index) => (
                <PerplexityMessage
                  key={message.id}
                  message={message}
                  isTier3={isTier3}
                  isLast={index === messages.length - 1}
                  onRetry={() => {
                    // Find the previous user message and resend
                    const prevUserMsg = messages.slice(0, index).reverse().find(m => m.role === "user");
                    if (prevUserMsg) handleSend(prevUserMsg.content);
                  }}
                />
              ))}
              {isLoading && (!messages.length || messages[messages.length - 1]?.role !== "assistant" || messages[messages.length - 1]?.content === "") && (
                <LoadingIndicator />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Credits warnings */}
      <div className="max-w-[760px] mx-auto w-full px-4">
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

      {/* Floating input bar — Perplexity style */}
      <div className="pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 flex-shrink-0">
        <div className="max-w-[760px] mx-auto px-4">
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
            "relative flex items-center gap-2 rounded-2xl border border-border/30 bg-muted/30 backdrop-blur-sm px-4 py-2.5 transition-all duration-200",
            "focus-within:shadow-[0_0_24px_-6px_hsl(var(--primary)/0.35)] focus-within:border-primary/50"
          )}>
            {/* Attach button */}
            <button
              onClick={() => setShowAttachments(!showAttachments)}
              disabled={noCredits || isLoading}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              title="Attach files"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Text input */}
              <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={noCredits ? "No credits remaining..." : "Ask anything..."}
              disabled={noCredits}
              className="flex-1 bg-transparent border-none text-foreground placeholder:text-muted-foreground/50 focus:outline-none text-sm h-10"
            />

            {/* Voice button (Tier 3) — compact */}
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
                "h-9 w-9 rounded-xl transition-colors",
                input.trim() 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "text-muted-foreground"
              )}
              onClick={() => handleSend()}
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

/* ─── Parse JSON quiz widgets from AI text ─── */
function parseMessageContent(content: string) {
  const parts: Array<{ type: 'text'; content: string } | { type: 'widget'; data: any }> = [];
  // Match JSON blocks (with or without markdown code fences) containing widget_type
  const jsonRegex = /(?:```(?:json)?\s*)?\{[\s\S]*?"widget_type"\s*:\s*"interactive_quiz"[\s\S]*?\}(?:\s*```)?/g;
  let lastIndex = 0;
  let match;

  while ((match = jsonRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index).trim() });
    }
    try {
      // Strip code fence markers if present
      const raw = match[0].replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      parts.push({ type: 'widget', data: JSON.parse(raw) });
    } catch {
      parts.push({ type: 'text', content: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex).trim() });
  }

  return parts.length ? parts : [{ type: 'text' as const, content }];
}

/* ─── Perplexity-style message (no bubbles) ─── */
function PerplexityMessage({ message, isTier3, isLast, onRetry }: { 
  message: Message; 
  isTier3: boolean; 
  isLast: boolean;
  onRetry: () => void;
}) {
  const { speak, stop, isPlaying, isLoading: ttsLoading } = useTextToSpeech();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTTS = () => {
    if (isPlaying) {
      stop();
    } else {
      speak(message.content);
    }
  };

  if (message.role === "user") {
    return (
      <div className="pt-8 first:pt-0">
        <p className="text-lg font-semibold text-foreground">
          {message.content}
        </p>
      </div>
    );
  }

  // Assistant message
  const cleanContent = message.content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/?think>/gi, '')
    .replace(/\[\d+\]/g, '')
    .trim();

  // Parse message into text + interactive widget parts
  const parts = parseMessageContent(cleanContent);

  return (
    <div className="mt-4 pb-8 border-b border-border/30 last:border-b-0">
      <div className="ai-prose-perplexity max-w-none">
        {parts.map((part, i) => {
          if (part.type === 'widget') {
            return <QuestionWidget key={i} data={part.data} />;
          }
          return part.content ? <ReactMarkdown key={i}>{part.content}</ReactMarkdown> : null;
        })}
      </div>

      {/* Reaction row */}
      {cleanContent && (
        <div className="mt-4 flex items-center gap-1">
          {isTier3 && (
            <button
              onClick={handleTTS}
              disabled={ttsLoading}
              className="group/btn p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors"
              title={isPlaying ? "Stop" : "Listen"}
            >
              {ttsLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isPlaying ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Copy"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Helpful"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Not helpful"
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRetry}
            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Retry"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="mt-4 pt-2">
      <div className="flex gap-1.5">
        <span className="w-2 h-2 bg-muted-foreground/30 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 bg-muted-foreground/30 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 bg-muted-foreground/30 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

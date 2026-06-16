import { useState, useRef, useEffect, useCallback } from "react";
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
  Crown,
  BookOpen,
  Mic,
  MicOff
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useAIChat, type Message } from "@/hooks/useAIChat";
import { MarkdownMath as ReactMarkdown } from "@/components/ai/MarkdownMath";
import { VoiceChat } from "./VoiceChat";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useBrowserSTT } from "@/hooks/useBrowserSTT";

import { supabase } from "@/integrations/supabase/client";
import { ChatAttachments } from "./ChatAttachments";
import { useAttachments } from "@/hooks/useAttachments";
import { useReferences, type Reference } from "@/hooks/useReferences";
import { ReferencesPanel } from "./ReferencesPanel";
import { ReferencesBadge } from "./ReferencesBadge";
import { CitationChip } from "./CitationChip";
import { getTierLimits, TRIAL_LIMITS } from "@/lib/tier-limits";
import { toast } from "sonner";
import { sanitizeAIResponse } from "@/utils/sanitizeAIResponse";
import { QuestionWidget } from "./QuestionWidget";
import { DocumentWidget } from "./DocumentWidget";

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

const getSpacePrompts = (spaceName: string, spaceDescription: string) => {
  const prompts: Record<string, string[]> = {
    'essays': [
      "Help me write my Why This Field essay",
      "Review my thesis statement",
      "Give me strong essay opening strategies",
      "What makes a compelling research essay?"
    ],
    'math': [
      "Explain quadratic equations",
      "Help me with SAT Math grid-in questions",
      "Practice algebra problems with me",
      "What are the most tested SAT Math topics?"
    ],
    'reading': [
      "Help me improve reading speed",
      "Explain main idea vs supporting detail",
      "Practice SAT Reading passage questions",
      "What are the hardest reading question types?"
    ],
    'writing': [
      "Help me with grammar rules",
      "Practice SAT Writing questions",
      "How do I improve sentence structure?",
      "What are common writing mistakes to avoid?"
    ],
    'science': [
      "Explain the scientific method",
      "Help me with biology concepts",
      "Practice data interpretation questions",
      "What science topics should I focus on?"
    ],
  };
  const key = spaceName.toLowerCase().trim();
  return prompts[key] || [
    `Help me get started with ${spaceName}`,
    `What should I focus on in ${spaceName}?`,
    "Create a study plan for me",
    "Quiz me on what I know so far"
  ];
};

interface SpaceInfo {
  name: string;
  description?: string | null;
  icon?: string | null;
}

interface StudentAICoachProps {
  conversationId?: string | null;
  onEnsureConversation?: () => Promise<string | null>;
  chatMode?: "text" | "voice";
  spaceReferences?: Reference[];
  activeSpace?: SpaceInfo | null;
  modelOverride?: string;
}

export function StudentAICoach({ conversationId, onEnsureConversation, chatMode = "text", spaceReferences = [], activeSpace = null, modelOverride }: StudentAICoachProps) {
  const [input, setInput] = useState("");
  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId || null);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const skipNextLoad = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { profile } = useAuth();
  const { messages, isLoading, streamChat, clearMessages, loadConversationMessages } = useAIChat(activeConvId);
  const isTier3 = profile?.tier === "tier_3";
  const hasTTS = profile?.tier === "tier_2" || profile?.tier === "tier_3";

  const handleSendRef = useRef<(text: string) => void>(() => {});
  const [isCleaningSTT, setIsCleaningSTT] = useState(false);
  
  const handleSTTComplete = useCallback(async (rawText: string) => {
    if (!rawText.trim()) return;
    setIsCleaningSTT(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cleanup-stt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ rawText }),
        }
      );
      const data = await response.json();
      const cleaned = data?.cleaned || rawText.trim();
      handleSendRef.current(cleaned);
    } catch {
      // Fallback: send raw text
      handleSendRef.current(rawText.trim());
    } finally {
      setIsCleaningSTT(false);
    }
  }, []);

  const { startRecording: startSTT, stopRecording: stopSTT, isRecording: isSTTRecording, isSupported: isSTTSupported, partialText: sttPartialText } = useBrowserSTT({
    onComplete: handleSTTComplete,
  });


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

  const {
    references,
    isProcessing: isRefProcessing,
    addDocument: addRefDocument,
    addUrl: addRefUrl,
    addText: addRefText,
    removeReference,
    getReferenceContext,
    loadSpaceReferences,
  } = useReferences();

  // Load space-level references
  useEffect(() => {
    if (spaceReferences.length > 0) {
      loadSpaceReferences(spaceReferences);
    }
  }, [spaceReferences, loadSpaceReferences]);

  const handleVoiceTranscript = (text: string) => {
    setInput(text);
  };

  const shouldScrollRef = useRef(true);

  const scrollToBottom = () => {
    if (shouldScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Only auto-scroll when a new message is added (not on content updates during streaming)
  const prevMessageCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      shouldScrollRef.current = true;
      scrollToBottom();
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  // Detect manual scroll-up to pause auto-scroll
  const chatContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // If user scrolled up more than 100px from bottom, stop auto-scrolling
      shouldScrollRef.current = scrollHeight - scrollTop - clientHeight < 100;
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSend = async (overrideInput?: string, options?: { hidden?: boolean }) => {
    const text = overrideInput ?? input;
    if (!text.trim() || isLoading) return;
    if ((profile?.credits_remaining || 0) <= 0) return;

    if (!options?.hidden) {
      window.dispatchEvent(new CustomEvent("adaptiveprep:coach-message-sent"));
    }

    
    if (!activeConvId && onEnsureConversation) {
      const newId = await onEnsureConversation();
      if (newId) {
        skipNextLoad.current = true;
        setActiveConvId(newId);
      }
    }
    
    const attachmentContext = getAttachmentContext();
    const referenceContext = getReferenceContext();
    const fullInput = text + attachmentContext + referenceContext;

    // Build attachment metadata for display (not the extracted text)
    const attachMeta = attachments
      .filter(a => !a.isUploading)
      .map(a => ({
        type: a.type,
        name: a.file_name || 'file',
        preview: a.type === 'image' ? a.file_url || undefined : undefined,
      }));
    
    if (!options?.hidden) {
      setInput("");
      if (inputRef.current) inputRef.current.style.height = "auto";
      clearAttachments();
      setShowAttachments(false);
      setShowReferences(false);
    }
    await streamChat(fullInput, { endpoint: "student-chat", modelOverride }, text, attachMeta, options?.hidden);
  };

  // Keep handleSendRef in sync so the STT callback can call it
  handleSendRef.current = handleSend;

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
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-[760px] mx-auto px-4">
          {messages.length === 0 ? (
            /* Empty state — Space-specific or generic */
            activeSpace ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-24">
                <span className="text-[64px] leading-none mb-5">{activeSpace.icon || "📁"}</span>
                <h1 className="text-[28px] font-bold text-foreground mb-2">
                  {activeSpace.name}
                </h1>
                {activeSpace.description && (
                  <p className="text-[15px] text-muted-foreground mb-4 max-w-md line-clamp-2">
                    {activeSpace.description}
                  </p>
                )}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-xs text-muted-foreground mb-8">
                  <span>{activeSpace.icon || "📁"}</span>
                  This conversation is scoped to: <span className="font-medium text-foreground">{activeSpace.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                  {getSpacePrompts(activeSpace.name, activeSpace.description || "").map((chip) => (
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
            )
          ) : (
            /* Active chat — Perplexity style: no bubbles */
            <div className="py-6">
              {messages.filter(m => !m.hidden).map((message, index, filtered) => (
                <PerplexityMessage
                  key={`${message.id}-${message.role}`}
                  message={message}
                  isTier3={hasTTS}
                  isLast={index === filtered.length - 1}
                  isStreaming={isLoading}
                  onRetry={() => {
                    const prevUserMsg = messages.slice(0, messages.indexOf(message)).reverse().find(m => m.role === "user");
                    if (prevUserMsg) handleSend(prevUserMsg.content);
                  }}
                  onSend={(text) => handleSend(text)}
                  onSendSilent={(text) => handleSend(text, { hidden: true })}
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
            "relative flex items-center gap-2 rounded-2xl border border-border/30 bg-muted/30 backdrop-blur-sm px-3 py-2 transition-all duration-200",
            "focus-within:shadow-[0_0_24px_-6px_hsl(var(--primary)/0.35)] focus-within:border-primary/50"
          )}>
            {/* Attach button */}
            <button
              onClick={() => { setShowAttachments(!showAttachments); setShowReferences(false); }}
              disabled={noCredits || isLoading}
              className="flex-shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors disabled:opacity-40"
              title="Attach files"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Text input */}
              <textarea
              ref={inputRef}
              rows={1}
              value={isSTTRecording ? sttPartialText : input}
              onChange={(e) => {
                if (!isSTTRecording) {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isSTTRecording ? "Listening..." : isCleaningSTT ? "Cleaning up..." : noCredits ? "No credits remaining..." : "Ask anything..."}
              disabled={noCredits || isSTTRecording}
              className="flex-1 bg-transparent border-none text-foreground placeholder:text-muted-foreground/50 focus:outline-none text-sm min-h-[40px] max-h-[160px] resize-none py-2"
            />

            {/* STT mic button (free, browser-native, all tiers) */}
            {isSTTSupported && (
              <button
                onClick={isSTTRecording ? stopSTT : startSTT}
                disabled={noCredits || isLoading || isCleaningSTT}
                className={cn(
                  "flex-shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-40",
                  isSTTRecording 
                    ? "text-destructive animate-pulse" 
                    : isCleaningSTT
                    ? "text-primary animate-spin"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
                title={isSTTRecording ? "Stop & send" : isCleaningSTT ? "Processing..." : "Dictate message"}
              >
                {isCleaningSTT ? <Loader2 className="w-4 h-4" /> : isSTTRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
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
function extractBalancedJSON(str: string, startIdx: number): string | null {
  if (str[startIdx] !== '{') return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIdx; i < str.length; i++) {
    const ch = str[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return str.slice(startIdx, i + 1); }
  }
  return null;
}

function parseMessageContent(content: string, isStreaming = false) {
  const parts: Array<{ type: 'text'; content: string } | { type: 'widget'; data: any }> = [];
  // Strip markdown fences (``` and ```json) and inline backticks wrapping JSON objects
  let cleaned = content
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/`(\s*\{[\s\S]*?\}\s*)`/g, '$1');

  // Match both "widget_type" (quoted) and widget_type (unquoted, in case AI drops quotes)
  const markerRe = /["']?widget_type["']?\s*:/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let searchFrom = 0;

  while ((m = markerRe.exec(cleaned)) !== null) {
    const markerIdx = m.index;
    if (markerIdx < searchFrom) continue;

    // Walk back to find the opening {
    let braceStart = markerIdx;
    while (braceStart > lastIndex && cleaned[braceStart] !== '{') braceStart--;
    if (cleaned[braceStart] !== '{') { searchFrom = markerIdx + 1; continue; }

    const jsonStr = extractBalancedJSON(cleaned, braceStart);
    if (!jsonStr) {
      // Incomplete (likely streaming) — hide everything from braceStart onward
      const textBefore = cleaned.slice(lastIndex, braceStart).trim();
      if (textBefore) parts.push({ type: 'text', content: textBefore });
      lastIndex = cleaned.length;
      return parts.length ? parts : [{ type: 'text' as const, content: '' }];
    }

    let parsed: any = null;
    try { parsed = JSON.parse(jsonStr); } catch { /* fall through */ }

    // Try to recover from minor JSON issues (e.g. trailing commas, smart quotes)
    if (!parsed) {
      try {
        const repaired = jsonStr
          .replace(/[“”]/g, '"')
          .replace(/[‘’]/g, "'")
          .replace(/,(\s*[}\]])/g, '$1');
        parsed = JSON.parse(repaired);
      } catch { /* still bad */ }
    }

    if (parsed && (parsed.widget_type === 'interactive_quiz' || parsed.widget_type === 'document_generator')) {
      const textBefore = cleaned.slice(lastIndex, braceStart).trim();
      if (textBefore) parts.push({ type: 'text', content: textBefore });
      parts.push({ type: 'widget', data: parsed });
      lastIndex = braceStart + jsonStr.length;
      searchFrom = lastIndex;
      markerRe.lastIndex = lastIndex;
      continue;
    }

    // Could not parse but it clearly looks like a widget payload — hide it instead of showing raw JSON
    if (jsonStr.includes('widget_type')) {
      const textBefore = cleaned.slice(lastIndex, braceStart).trim();
      if (textBefore) parts.push({ type: 'text', content: textBefore });
      lastIndex = braceStart + jsonStr.length;
      searchFrom = lastIndex;
      markerRe.lastIndex = lastIndex;
      continue;
    }

    searchFrom = markerIdx + 1;
  }

  if (lastIndex < cleaned.length) {
    const remaining = cleaned.slice(lastIndex).trim();
    if (remaining) parts.push({ type: 'text', content: remaining });
  }

  return parts.length ? parts : [{ type: 'text' as const, content: cleaned }];
}

/* ─── Perplexity-style message (no bubbles) ─── */
function PerplexityMessage({ message, isTier3, isLast, isStreaming, onRetry, onSend, onSendSilent }: { 
  message: Message; 
  isTier3: boolean; 
  isLast: boolean;
  isStreaming: boolean;
  onRetry: () => void;
  onSend: (text: string) => void;
  onSendSilent: (text: string) => void;
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
    // Show clean visible text, strip any ---ATTACHED CONTENT--- markers
    const displayText = (message.visibleText || message.content)
      .replace(/\n*---ATTACHED CONTENT---[\s\S]*$/, '')
      .replace(/\n*---REFERENCE DOCUMENTS---[\s\S]*$/, '')
      .trim();

    return (
      <div className="pt-8 first:pt-0">
        {/* Attachment previews */}
        {message.attachmentMeta?.map((att, i) => (
          att.type === 'image' && att.preview ? (
            <img key={i} src={att.preview} alt="User uploaded image attachment" width="200" height="200" loading="lazy" className="max-w-[200px] rounded-lg mb-2 border border-border/20" />
          ) : (
            <div key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-2 mr-2 rounded-lg border border-border/30 bg-muted/30 text-xs text-muted-foreground">
              📄 {att.name}
            </div>
          )
        ))}
        <p className="text-lg font-semibold text-foreground">
          {displayText}
        </p>
      </div>
    );
  }

  // Assistant message
  const cleanContent = sanitizeAIResponse(message.content)
    .replace(/\[\d+\]/g, '');

  // Parse message into text + interactive widget parts
  const parts = parseMessageContent(cleanContent, isStreaming && isLast);

  // Detect citation patterns in AI response
  const citationPatterns = [
    /(?:based on|according to|from|in)\s+(?:the\s+)?(?:document|file|PDF)\s+(?:you\s+)?(?:shared|provided|uploaded|attached)/gi,
    /(?:based on|according to|from|in)\s+(?:the\s+)?(?:link|URL|website|page)\s+(?:you\s+)?(?:shared|provided)/gi,
    /(?:based on|according to|from)\s+(?:the\s+)?(?:text|content)\s+(?:you\s+)?(?:pasted|shared|provided)/gi,
  ];
  const hasCitations = citationPatterns.some(p => p.test(cleanContent));

  return (
    <div className="mt-4 pb-8 border-b border-border/30 last:border-b-0">
      <div className="ai-prose-perplexity max-w-none">
        {parts.map((part, i) => {
          if (part.type === 'widget') {
            if (part.data.widget_type === 'document_generator') {
              return <DocumentWidget key={i} type={part.data.doc_type} title={part.data.title} content={part.data.content} summary={part.data.summary} />;
            }
            return <QuestionWidget key={i} data={part.data} onSubmitFreeWrite={(payload) => onSendSilent(payload)} onNextQuestion={() => onSendSilent("Next question please — give me another interactive quiz question on the same topic.")} />;
          }
          return part.content ? <ReactMarkdown key={i}>{part.content}</ReactMarkdown> : null;
        })}
      </div>

      {/* Citation indicator */}
      {hasCitations && (
        <div className="mt-2 flex flex-wrap">
          <CitationChip name="Referenced source" type="document" />
        </div>
      )}

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

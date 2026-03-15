import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Send, 
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
  BarChart3,
  Mic,
  BookOpen,
  FileText,
  MessageSquare
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
import { useReferences, type Reference } from "@/hooks/useReferences";
import { ReferencesPanel } from "./ReferencesPanel";
import { ReferencesBadge } from "./ReferencesBadge";
import { CitationChip } from "./CitationChip";
import { getTierLimits, TRIAL_LIMITS } from "@/lib/tier-limits";
import { toast } from "sonner";
import { sanitizeAIResponse } from "@/utils/sanitizeAIResponse";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  "Which of my students needs help with algebra?",
  "What topics should I focus on for my next lesson?",
  "How can I help students struggling with reading comprehension?",
  "Create a study plan for a student behind on math",
];

const reportTypes = [
  { value: "individual", label: "Individual Progress Report" },
  { value: "class", label: "Class Performance Summary" },
  { value: "topic", label: "Topic Weakness Analysis" },
  { value: "intervention", label: "Intervention Recommendations" },
];

interface TeacherAICoachProps {
  conversationId?: string | null;
  onEnsureConversation?: () => Promise<string | null>;
  chatMode?: "text" | "voice";
  spaceReferences?: Reference[];
  activeSpace?: { name: string; description?: string | null; icon?: string | null } | null;
}

export function TeacherAICoach({ conversationId, onEnsureConversation, chatMode = "text", spaceReferences = [], activeSpace = null }: TeacherAICoachProps) {
  const [input, setInput] = useState("");
  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId || null);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [reportType, setReportType] = useState("");
  const [reportStudent, setReportStudent] = useState("all");
  const skipNextLoad = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { profile } = useAuth();
  const { messages, isLoading, streamChat, clearMessages, loadConversationMessages } = useAIChat(activeConvId);
  const isTier3 = profile?.tier === "tier_3";
  const roleLabel = profile?.role === "tutor" ? "Tutor" : "Teacher";

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

  useEffect(() => {
    if (spaceReferences.length > 0) {
      loadSpaceReferences(spaceReferences);
    }
  }, [spaceReferences, loadSpaceReferences]);

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
    const referenceContext = getReferenceContext();
    const fullInput = text + attachmentContext + referenceContext;

    const attachMeta = attachments
      .filter(a => !a.isUploading)
      .map(a => ({
        type: a.type,
        name: a.file_name || 'file',
        preview: a.type === 'image' ? a.file_url || undefined : undefined,
      }));
    
    setInput("");
    clearAttachments();
    setShowAttachments(false);
    setShowReferences(false);
    await streamChat(fullInput, { endpoint: "teacher-reports" }, text, attachMeta);
  };

  const handleChipClick = (prompt: string) => {
    handleSend(prompt);
  };

  const handleGenerateReport = async () => {
    if (!reportType || isLoading) return;
    const reportCost = 5;
    if ((profile?.credits_remaining || 0) < reportCost) return;

    const instruction = `Generate a ${reportTypes.find(r => r.value === reportType)?.label} for ${reportStudent === "all" ? "all my students" : "the selected student"}. Include specific metrics, actionable insights, and recommendations.`;
    
    await streamChat(instruction, { 
      endpoint: "teacher-reports",
      isReport: true,
      reportContext: {
        type: reportType,
        instructions: instruction,
      }
    });
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
      {/* Tabs — compact header */}
      <div className="max-w-[760px] mx-auto w-full px-4 pt-2">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Reports
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === "reports" ? (
        /* ── Reports Tab ── */
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-[760px] mx-auto px-4 py-4">
            <div className="p-6 rounded-2xl bg-card border border-border/30 mb-4">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Generate Report
                <span className="text-xs text-muted-foreground ml-auto">5 credits/report</span>
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Report Type</label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger><SelectValue placeholder="Select report type" /></SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Student(s)</label>
                  <Select value={reportStudent} onValueChange={setReportStudent}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Students</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  variant="hero" 
                  className="w-full"
                  onClick={handleGenerateReport}
                  disabled={!reportType || isLoading || creditsRemaining < 5}
                >
                  <FileText className="w-4 h-4" />
                  Generate Report
                </Button>
              </div>
            </div>

            {/* Report output — same Perplexity style */}
            <div className="py-2">
              {messages.filter(m => m.role === "assistant").length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground">
                  <FileText className="w-12 h-12 mb-4 opacity-30" />
                  <p className="text-sm">Generated reports will appear here</p>
                </div>
              ) : (
                messages.filter(m => m.role === "assistant").map((message) => (
                  <div key={message.id} className="mb-6 pb-6 border-b border-border/30 last:border-b-0">
                    <div className="ai-prose-perplexity max-w-none">
                      <ReactMarkdown>{sanitizeAIResponse(message.content)}</ReactMarkdown>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── Chat Tab — identical to StudentAICoach layout ── */
        <>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="max-w-[760px] mx-auto px-4">
              {messages.length === 0 ? (
                activeSpace ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-24">
                    <span className="text-[64px] leading-none mb-5">{activeSpace.icon || "📁"}</span>
                    <h1 className="text-[28px] font-bold text-foreground mb-2">{activeSpace.name}</h1>
                    {activeSpace.description && (
                      <p className="text-[15px] text-muted-foreground mb-4 max-w-md line-clamp-2">{activeSpace.description}</p>
                    )}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-xs text-muted-foreground mb-8">
                      <span>{activeSpace.icon || "📁"}</span>
                      This conversation is scoped to: <span className="font-medium text-foreground">{activeSpace.name}</span>
                    </div>
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
                  <div className="h-full flex flex-col items-center justify-center text-center py-24">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center mb-6">
                      <BarChart3 className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h1 className="text-[26px] font-bold text-foreground mb-2">
                      How can I assist you, {roleLabel}?
                    </h1>
                    <p className="text-sm text-muted-foreground mb-8">
                      Your teaching assistant — student insights, lesson planning, and strategies
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
                <div className="py-6">
                  {messages.map((message, index) => (
                    <TutorPerplexityMessage
                      key={message.id}
                      message={message}
                      isTier3={isTier3}
                      isLast={index === messages.length - 1}
                      onRetry={() => {
                        const prevUserMsg = messages.slice(0, index).reverse().find(m => m.role === "user");
                        if (prevUserMsg) handleSend(prevUserMsg.content);
                      }}
                    />
                  ))}
                  {isLoading && (!messages.length || messages[messages.length - 1]?.role !== "assistant" || messages[messages.length - 1]?.content === "") && (
                    <div className="mt-4 pt-2">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-muted-foreground/30 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-muted-foreground/30 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-muted-foreground/30 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
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
                    <p className="text-xs font-medium text-foreground">You've used your {dailyLimit} daily credits</p>
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
          <div className="pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 flex-shrink-0">
            <div className="max-w-[760px] mx-auto px-4">
              {showReferences && (
                <div className="mb-2">
                  <ReferencesPanel
                    references={references}
                    isProcessing={isRefProcessing}
                    onAddDocument={addRefDocument}
                    onAddUrl={addRefUrl}
                    onAddText={addRefText}
                    onRemove={removeReference}
                    onClose={() => setShowReferences(false)}
                  />
                </div>
              )}

              {!showReferences && references.length > 0 && (
                <div className="mb-2">
                  <ReferencesBadge count={references.length} onClick={() => setShowReferences(true)} />
                </div>
              )}

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
                <button
                  onClick={() => { setShowReferences(!showReferences); setShowAttachments(false); }}
                  disabled={noCredits || isLoading}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors disabled:opacity-40",
                    showReferences || references.length > 0
                      ? "text-primary hover:text-primary/80"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="References & Sources"
                >
                  <BookOpen className="w-4 h-4" />
                </button>

                <button
                  onClick={() => { setShowAttachments(!showAttachments); setShowReferences(false); }}
                  disabled={noCredits || isLoading}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                  title="Attach files"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder={noCredits ? "No credits remaining..." : "Ask about your students or teaching strategies..."}
                  disabled={noCredits}
                  className="flex-1 bg-transparent border-none text-foreground placeholder:text-muted-foreground/50 focus:outline-none text-sm h-10"
                />

                {isTier3 && (
                  <VoiceChat 
                    onTranscript={handleVoiceTranscript}
                    isDisabled={noCredits || isLoading}
                  />
                )}

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
        </>
      )}
    </div>
  );
}

/* ─── Perplexity-style message (no bubbles) — for tutor/teacher ─── */
function TutorPerplexityMessage({ message, isTier3, isLast, onRetry }: { 
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
    if (isPlaying) stop();
    else speak(message.content);
  };

  if (message.role === "user") {
    const displayText = (message.visibleText || message.content)
      .replace(/\n*---ATTACHED CONTENT---[\s\S]*$/, '')
      .replace(/\n*---REFERENCE DOCUMENTS---[\s\S]*$/, '')
      .trim();

    return (
      <div className="pt-8 first:pt-0">
        {message.attachmentMeta?.map((att, i) => (
          att.type === 'image' && att.preview ? (
            <img key={i} src={att.preview} alt={att.name} className="max-w-[200px] rounded-lg mb-2 border border-border/20" />
          ) : (
            <div key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-2 mr-2 rounded-lg border border-border/30 bg-muted/30 text-xs text-muted-foreground">
              📄 {att.name}
            </div>
          )
        ))}
        <p className="text-lg font-semibold text-foreground">{displayText}</p>
      </div>
    );
  }

  const cleanContent = sanitizeAIResponse(message.content).replace(/\[\d+\]/g, '');

  const citationPatterns = [
    /(?:based on|according to|from|in)\s+(?:the\s+)?(?:document|file|PDF)\s+(?:you\s+)?(?:shared|provided|uploaded|attached)/gi,
    /(?:based on|according to|from|in)\s+(?:the\s+)?(?:link|URL|website|page)\s+(?:you\s+)?(?:shared|provided)/gi,
    /(?:based on|according to|from)\s+(?:the\s+)?(?:text|content)\s+(?:you\s+)?(?:pasted|shared|provided)/gi,
  ];
  const hasCitations = citationPatterns.some(p => p.test(cleanContent));

  return (
    <div className="mt-4 pb-8 border-b border-border/30 last:border-b-0">
      <div className="ai-prose-perplexity max-w-none">
        <ReactMarkdown>{cleanContent}</ReactMarkdown>
      </div>

      {hasCitations && (
        <div className="mt-2 flex flex-wrap">
          <CitationChip name="Referenced source" type="document" />
        </div>
      )}

      {cleanContent && (
        <div className="mt-4 flex items-center gap-1">
          {isTier3 && (
            <button
              onClick={handleTTS}
              disabled={ttsLoading}
              className="group/btn p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors"
              title={isPlaying ? "Stop" : "Listen"}
            >
              {ttsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          )}
          <button onClick={handleCopy} className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors" title="Copy">
            {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors" title="Helpful">
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors" title="Not helpful">
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={onRetry} className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors" title="Retry">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

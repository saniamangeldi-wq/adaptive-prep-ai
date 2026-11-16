import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Copy, RotateCcw, Check, GraduationCap, X, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAIChat, type Message } from "@/hooks/useAIChat";
import { MarkdownMath as ReactMarkdown } from "@/components/ai/MarkdownMath";
import { ChartWidget } from "./ChartWidget";
import { toast } from "sonner";
import { sanitizeAIResponse } from "@/utils/sanitizeAIResponse";

const STARTER_PROMPTS = [
  "What is the difference between band 6 and band 7 in Task 2?",
  "How do I plan a Task 2 essay in 5 minutes?",
  "Give me a quick structure for a Task 1 report.",
  "What are the most common grammar mistakes in IELTS Writing?",
];

const REPORT_STARTER_PROMPTS = [
  "Why did I lose marks for coherence?",
  "Show me how to fix my introduction.",
  "What should I practise first?",
  "Explain my grammar mistakes in simple words.",
];

/** A writing report attached to the chat. */
export interface AttachedReport {
  id: string;
  /** e.g. "Task 2, opinion essay · estimated 6.0" */
  label: string;
}

interface StudentAICoachProps {
  conversationId?: string | null;
  onEnsureConversation?: () => Promise<string | null>;
  /** Report being discussed. While set, its id is sent with every message. */
  report?: AttachedReport | null;
  /** Called when the student removes the chip. */
  onDetachReport?: () => void;
  /** Language for the coach's answers. */
  lang?: "en" | "ru" | "kk";
}

const DRAFT_KEY = "adaptiveprep:coach-draft";

export function StudentAICoach({ conversationId, onEnsureConversation, report, onDetachReport, lang = "en" }: StudentAICoachProps) {
  // Draft survives reloads / tab restores so nothing typed is ever lost.
  const [input, setInput] = useState(() => {
    try {
      return sessionStorage.getItem(DRAFT_KEY) || "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    try {
      if (input.trim()) sessionStorage.setItem(DRAFT_KEY, input);
      else sessionStorage.removeItem(DRAFT_KEY);
    } catch { /* storage unavailable */ }
  }, [input]);

  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId || null);
  const skipNextLoad = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { messages, isLoading, streamChat, clearMessages, loadConversationMessages } = useAIChat(activeConvId);

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

  const handleSend = async (overrideInput?: string) => {
    const text = overrideInput ?? input;
    if (!text.trim() || isLoading) return;

    if (!activeConvId && onEnsureConversation) {
      const newId = await onEnsureConversation();
      if (newId) {
        skipNextLoad.current = true;
        setActiveConvId(newId);
      }
    }

    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    await streamChat(text, { extraBody: { lang, ...(report ? { reportId: report.id } : {}) } });
  };

  const visibleMessages = messages.filter(m => !m.hidden);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages area, centered */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-[760px] mx-auto px-4">
          {visibleMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 sm:py-24">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center mb-6">
                <GraduationCap className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl sm:text-[26px] font-bold text-foreground mb-2">
                Your IELTS Writing coach
              </h1>
              <p className="text-sm text-muted-foreground mb-8 max-w-md">
                Ask about task types, the four marking criteria, grammar, vocabulary or how to improve your essay.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {(report ? REPORT_STARTER_PROMPTS : STARTER_PROMPTS).map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSend(chip)}
                    disabled={isLoading}
                    className="px-4 py-2.5 text-[13px] text-left rounded-xl border border-border/30 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all duration-200 disabled:opacity-40"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-6">
              {visibleMessages.map((message, index) => (
                <ChatMessage
                  key={`${message.id}-${message.role}`}
                  message={message}
                  onRetry={() => {
                    const prevUserMsg = messages.slice(0, messages.indexOf(message)).reverse().find(m => m.role === "user");
                    if (prevUserMsg) handleSend(prevUserMsg.content);
                  }}
                  showActions={!(isLoading && index === visibleMessages.length - 1)}
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

      {/* Input bar */}
      <div className="pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 flex-shrink-0">
        <div className="max-w-[760px] mx-auto px-4">
          {report && (
            <div className="mb-2 flex items-center gap-1 max-w-full">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 pl-3 pr-1 py-1 text-xs text-foreground min-w-0">
                <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" aria-hidden="true" />
                <Link to={`/dashboard/writing/report/${report.id}`} className="truncate hover:underline" title="Open this report">
                  Discussing: {report.label}
                </Link>
                <button
                  type="button"
                  onClick={onDetachReport}
                  aria-label="Stop discussing this report"
                  className="ml-0.5 h-6 w-6 flex-shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            </div>
          )}
          <div
            className={cn(
              "relative flex items-center gap-2 rounded-2xl border border-border/30 bg-muted/30 backdrop-blur-sm px-3 py-2 transition-all duration-200",
              "focus-within:shadow-[0_0_24px_-6px_hsl(var(--primary)/0.35)] focus-within:border-primary/50"
            )}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask anything about IELTS Writing..."
              aria-label="Message"
              className="flex-1 min-w-0 bg-transparent border-none text-foreground placeholder:text-muted-foreground/50 focus:outline-none text-sm min-h-[40px] max-h-[160px] resize-none py-2"
            />

            <Button
              variant="ghost"
              size="icon"
              aria-label="Send message"
              className={cn(
                "h-9 w-9 rounded-xl transition-colors flex-shrink-0",
                input.trim()
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-muted-foreground"
              )}
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Parse chart widgets embedded as JSON in AI text ─── */
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

function parseMessageContent(content: string) {
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

    if (parsed && parsed.widget_type === 'chart_visual') {
      const textBefore = cleaned.slice(lastIndex, braceStart).trim();
      if (textBefore) parts.push({ type: 'text', content: textBefore });
      parts.push({ type: 'widget', data: parsed });
      lastIndex = braceStart + jsonStr.length;
      searchFrom = lastIndex;
      markerRe.lastIndex = lastIndex;
      continue;
    }

    // Other (or unparseable) widget payloads are never rendered — hide them instead of showing raw JSON
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

/* ─── Message (no bubbles) ─── */
function ChatMessage({ message, onRetry, showActions }: {
  message: Message;
  onRetry: () => void;
  showActions: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (message.role === "user") {
    return (
      <div className="pt-8 first:pt-0">
        <p className="text-lg font-semibold text-foreground whitespace-pre-wrap break-words">
          {message.visibleText || message.content}
        </p>
      </div>
    );
  }

  const cleanContent = sanitizeAIResponse(message.content);

  // Split into markdown text and chart parts
  const parts = parseMessageContent(cleanContent);

  return (
    <div className="mt-4 pb-8 border-b border-border/30 last:border-b-0">
      <div className="ai-prose-perplexity max-w-none">
        {parts.map((part, i) => {
          if (part.type === 'widget') {
            return <ChartWidget key={i} data={part.data} />;
          }
          return part.content ? <ReactMarkdown key={i}>{part.content}</ReactMarkdown> : null;
        })}
      </div>

      {cleanContent && showActions && (
        <div className="mt-4 flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Copy"
            aria-label="Copy"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onRetry}
            className="p-2 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Retry"
            aria-label="Retry"
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

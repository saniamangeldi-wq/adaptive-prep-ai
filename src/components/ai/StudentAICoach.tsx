import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, Check, Copy, FileText, Loader2, PenLine, RotateCcw, TriangleAlert, X } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAIChat, type Message } from "@/hooks/useAIChat";
import { MarkdownMath as ReactMarkdown } from "@/components/ai/MarkdownMath";
import { ChartWidget } from "./ChartWidget";
import { LogoMark } from "@/components/brand/Logo";
import { NEW_CHAT_EVENT } from "@/components/dashboard/events";
import { greetingFor } from "@/components/dashboard/conversationGroups";
import { toast } from "sonner";
import { sanitizeAIResponse } from "@/utils/sanitizeAIResponse";

const STARTER_PROMPTS = [
  "How do I plan a Task 2 essay in five minutes?",
  "What separates band 6 from band 7 in Task 2?",
  "Give me a structure for a Task 1 line graph report.",
  "Which grammar mistakes cost the most marks?",
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
  /** First name for the greeting on a new chat. */
  greetingName?: string | null;
}

const DRAFT_KEY = "adaptiveprep:coach-draft";
const MESSAGE_COLUMN = "w-full max-w-[46rem] mx-auto px-4 sm:px-6";

function prefersFinePointer() {
  try {
    return window.matchMedia("(pointer: fine)").matches;
  } catch {
    return true;
  }
}

export function StudentAICoach({ conversationId, onEnsureConversation, report, onDetachReport, lang = "en", greetingName }: StudentAICoachProps) {
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

  // "New chat" from the sidebar while already on a blank chat: clear what is on screen.
  useEffect(() => {
    const onNewChat = () => {
      if (!conversationId) clearMessages();
    };
    window.addEventListener(NEW_CHAT_EVENT, onNewChat);
    return () => window.removeEventListener(NEW_CHAT_EVENT, onNewChat);
  }, [conversationId, clearMessages]);

  // Give the composer focus back after an answer (not on touch screens, where that
  // would pop the keyboard up again).
  useEffect(() => {
    if (!isLoading && prefersFinePointer()) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  const visibleMessages = messages.filter((m) => !m.hidden);
  const isEmpty = visibleMessages.length === 0;

  // Follow the answer while it streams, unless the student has scrolled up to read.
  const shouldScrollRef = useRef(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      shouldScrollRef.current = scrollHeight - scrollTop - clientHeight < 100;
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isEmpty]);

  const prevMessageCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      shouldScrollRef.current = true;
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  const lastContent = messages[messages.length - 1]?.content;
  useEffect(() => {
    const container = chatContainerRef.current;
    if (isLoading && container && shouldScrollRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [lastContent, isLoading]);

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

    if (overrideInput === undefined) setInput("");
    await streamChat(text, { extraBody: { lang, ...(report ? { reportId: report.id } : {}) } });
  };

  const last = messages[messages.length - 1];
  const waitingForFirstToken = isLoading && (!last || last.role !== "assistant" || last.content === "");
  const streaming = isLoading && !waitingForFirstToken;

  const composer = (
    <Composer
      inputRef={inputRef}
      value={input}
      onChange={setInput}
      onSend={() => handleSend()}
      busy={isLoading}
      large={isEmpty}
      report={report}
      onDetachReport={onDetachReport}
    />
  );

  if (isEmpty) {
    const greeting = greetingFor();
    return (
      <div className="flex-1 h-full min-h-0 overflow-y-auto">
        <div className="min-h-full flex flex-col justify-center py-8 sm:py-12">
          <div className={MESSAGE_COLUMN}>
            <h1 className="text-center text-[1.75rem] leading-9 sm:text-[2.125rem] sm:leading-[2.5rem] font-semibold tracking-[-0.02em] text-foreground">
              {greetingName ? `${greeting}, ${greetingName}` : greeting}
            </h1>
            <p className="mt-2 text-center text-[15px] text-muted-foreground text-pretty">
              {report
                ? "Ask the coach anything about this report."
                : "Ask about IELTS Writing, or check an essay for an estimated band."}
            </p>
            <div className="mt-7 sm:mt-8">{composer}</div>
            <ul className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Suggestions">
              {!report && (
                <li>
                  <Link
                    to="/dashboard/writing"
                    className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/[0.07] px-3.5 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/[0.12]"
                  >
                    <PenLine className="h-4 w-4" aria-hidden="true" />
                    Check an essay
                  </Link>
                </li>
              )}
              {(report ? REPORT_STARTER_PROMPTS : STARTER_PROMPTS).map((chip) => (
                <li key={chip}>
                  <button
                    type="button"
                    onClick={() => handleSend(chip)}
                    disabled={isLoading}
                    className="rounded-[1.25rem] border border-border bg-card px-3.5 py-2 text-left text-sm text-foreground/90 transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                  >
                    {chip}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto min-h-0">
        <div className={cn(MESSAGE_COLUMN, "py-6 sm:py-8 space-y-7")}>
          {visibleMessages.map((message, index) => (
            <ChatMessage
              key={`${message.id}-${message.role}`}
              message={message}
              onRetry={() => {
                const prevUserMsg = messages.slice(0, messages.indexOf(message)).reverse().find((m) => m.role === "user");
                if (prevUserMsg) handleSend(prevUserMsg.content);
              }}
              showActions={!(isLoading && index === visibleMessages.length - 1)}
              streaming={streaming && index === visibleMessages.length - 1}
            />
          ))}
          {waitingForFirstToken && <LoadingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="flex-shrink-0 bg-background pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-[46rem] mx-auto px-3 sm:px-6">{composer}</div>
      </div>
    </div>
  );
}

/* ─── Composer ─── */
function Composer({
  inputRef,
  value,
  onChange,
  onSend,
  busy,
  large,
  report,
  onDetachReport,
}: {
  inputRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  busy: boolean;
  large: boolean;
  report?: AttachedReport | null;
  onDetachReport?: () => void;
}) {
  const maxHeight = large ? 240 : 180;
  const resize = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [inputRef, maxHeight]);

  // Fit the box to its text: on typing, on a restored draft, and when it is cleared.
  useEffect(() => {
    resize();
  }, [value, resize]);

  const canSend = value.trim().length > 0 && !busy;

  return (
    <div>
      {report && (
        <div className="mb-2 flex items-center gap-1 max-w-full">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/[0.07] pl-3 pr-1 py-1 text-xs text-foreground min-w-0">
            <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" aria-hidden="true" />
            <Link to={`/dashboard/writing/report/${report.id}`} className="truncate hover:underline" title="Open this report">
              Discussing: {report.label}
            </Link>
            <button
              type="button"
              onClick={onDetachReport}
              aria-label="Stop discussing this report"
              className="ml-0.5 h-6 w-6 flex-shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </span>
        </div>
      )}
      <div
        className={cn(
          "rounded-2xl border border-input bg-card shadow-float transition-[border-color,box-shadow]",
          "focus-within:border-primary/70 focus-within:ring-[3px] focus-within:ring-primary/15",
        )}
      >
        <div className={cn(large ? "" : "flex items-end gap-2 py-1.5 pl-1 pr-1.5")}>
          <textarea
            ref={inputRef}
            rows={large ? 3 : 1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={large ? "Ask about your writing, a task type or a band…" : "Reply to the coach…"}
            aria-label="Message"
            enterKeyHint="send"
            className={cn(
              "block w-full resize-none bg-transparent text-base leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none",
              large ? "px-4 pt-4 pb-1 min-h-[5.5rem]" : "flex-1 min-w-0 px-3 py-2 min-h-[2.5rem]",
            )}
          />
          {large ? (
            <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 pt-1">
              <p className="hidden sm:block pl-1.5 text-xs text-muted-foreground">Enter to send, Shift + Enter for a new line</p>
              <SendButton canSend={canSend} busy={busy} onSend={onSend} />
            </div>
          ) : (
            <SendButton canSend={canSend} busy={busy} onSend={onSend} />
          )}
        </div>
      </div>
    </div>
  );
}

function SendButton({ canSend, busy, onSend }: { canSend: boolean; busy: boolean; onSend: () => void }) {
  return (
    <button
      type="button"
      onClick={onSend}
      disabled={!canSend}
      aria-label={busy ? "The coach is answering" : "Send message"}
      className={cn(
        "ml-auto h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-xl transition-colors",
        canSend ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground",
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowUp className="h-[18px] w-[18px]" aria-hidden="true" />}
    </button>
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

/* ─── Messages ─── */
function ChatMessage({ message, onRetry, showActions, streaming }: {
  message: Message;
  onRetry: () => void;
  showActions: boolean;
  streaming: boolean;
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
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-[15px] leading-6 text-secondary-foreground whitespace-pre-wrap break-words">
          {message.visibleText || message.content}
        </p>
      </div>
    );
  }

  const cleanContent = sanitizeAIResponse(message.content);

  if (message.isError) {
    const text = cleanContent.replace(/^_+|_+$/g, "");
    return (
      <div className="flex gap-3">
        <span className="hidden sm:block w-7 flex-shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div role="alert" className="flex gap-2.5 rounded-xl border border-destructive/30 bg-destructive/[0.06] px-3.5 py-3 text-sm text-foreground">
            <TriangleAlert className="h-4 w-4 flex-shrink-0 mt-0.5 text-destructive" aria-hidden="true" />
            <span>{text}</span>
          </div>
          {showActions && (
            <div className="mt-2 flex items-center gap-1">
              <ActionButton label="Retry" onClick={onRetry}><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /></ActionButton>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Split into markdown text and chart parts
  const parts = parseMessageContent(cleanContent);

  return (
    <div className="flex gap-3">
      <LogoMark className="hidden sm:block h-7 w-7 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="chat-prose max-w-none">
          {parts.map((part, i) => {
            if (part.type === 'widget') {
              return <ChartWidget key={i} data={part.data} />;
            }
            return part.content ? <ReactMarkdown key={i}>{part.content}</ReactMarkdown> : null;
          })}
        </div>

        {streaming && (
          <p role="status" className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
            Writing…
          </p>
        )}

        {cleanContent && showActions && (
          <div className="mt-2 -ml-2 flex items-center gap-0.5">
            <ActionButton label={copied ? "Copied" : "Copy"} onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
            </ActionButton>
            <ActionButton label="Retry" onClick={onRetry}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            </ActionButton>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
    >
      {children}
    </button>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex gap-3" role="status">
      <LogoMark className="hidden sm:block h-7 w-7" />
      <div className="flex items-center gap-1.5 h-7">
        <span className="sr-only">The coach is answering</span>
        {[0, 150, 300].map((d) => (
          <span key={d} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: `${d}ms` }} aria-hidden="true" />
        ))}
      </div>
    </div>
  );
}

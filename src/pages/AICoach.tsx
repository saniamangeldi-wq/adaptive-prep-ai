import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { chatChipText, readReportRow, summarizeReport, type ReportRowLike } from "@/lib/ielts/reportRow";
import type { AttachedReport } from "@/components/ai/StudentAICoach";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StudentAICoach } from "@/components/ai/StudentAICoach";
import { ConversationSidebar } from "@/components/ai/ConversationSidebar";
import { useConversations, Conversation } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";
import { History, X, MessageSquarePlus, PenLine } from "lucide-react";
import { PageSeo } from "@/components/seo/PageSeo";

export default function AICoach() {
  const [showHistory, setShowHistory] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const { createConversation, deleteEmptyConversations } = useConversations();
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const reportId = searchParams.get("report");
  const [report, setReport] = useState<AttachedReport | null>(null);
  const lang = profile?.preferred_language === "ru" || profile?.preferred_language === "kk" ? profile.preferred_language : "en";

  // Load a small summary of the report the student came here to discuss.
  useEffect(() => {
    if (!reportId) {
      setReport(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.from("ielts_writing_reports").select("*").eq("id", reportId).maybeSingle();
        if (cancelled) return;
        if (!data) {
          setReport(null);
          return;
        }
        const parsed = readReportRow(data as unknown as ReportRowLike);
        if (parsed.kind === "invalid") {
          setReport(null);
          return;
        }
        setReport({ id: reportId, label: chatChipText(summarizeReport(parsed)) });
      } catch {
        if (!cancelled) setReport(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  const detachReport = () => {
    setReport(null);
    const next = new URLSearchParams(searchParams);
    next.delete("report");
    setSearchParams(next, { replace: true });
  };

  // "New Chat" simply resets to a blank chat. The conversation row is created
  // lazily on the first message (see ensureConversation), so unused chats never
  // pollute the history list.
  const handleNewConversation = () => {
    setCurrentConversation(null);
    setShowHistory(false);
    // Clean up any previously created but never-used conversations
    deleteEmptyConversations().catch(() => {});
    window.dispatchEvent(new CustomEvent("adaptiveprep:new-chat"));
  };

  // Sweep away leftover empty conversations from previous sessions
  useEffect(() => {
    deleteEmptyConversations(currentConversation?.id).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteEmptyConversations]);

  const ensureConversation = async (): Promise<string | null> => {
    if (currentConversation) return currentConversation.id;
    const conv = await createConversation();
    if (conv) {
      setCurrentConversation(conv);
      return conv.id;
    }
    return null;
  };

  const handleSelectConversation = (conversation: Conversation | null) => {
    setCurrentConversation(conversation);
    setShowHistory(false);
  };

  return (
    <>
      <PageSeo
        title="Chat | AdaptivePrep"
        description="Ask your IELTS Writing coach about task types, the marking criteria and how to improve your writing."
        path="/dashboard"
      />
      <DashboardLayout flush>
        <div className="flex flex-col flex-1 min-h-0 relative">
          {/* Top header bar */}
          <div className="h-12 flex items-center justify-between px-4 border-b border-border/50 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground flex-shrink-0"
                aria-label="Chat history"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-foreground truncate">
                {currentConversation?.title || "New Conversation"}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link to="/dashboard/writing">
                <PenLine className="h-4 w-4" aria-hidden="true" />
                Check an essay
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground flex-shrink-0"
              onClick={handleNewConversation}
            >
              <MessageSquarePlus className="h-4 w-4" />
              <span className="hidden sm:inline">New chat</span>
            </Button>
            </div>
          </div>

          {/* Conversation history overlay panel */}
          {showHistory && (
            <>
              <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setShowHistory(false)} />
              <div className="absolute top-0 left-0 z-40 h-full w-[280px] max-w-[85vw] animate-in slide-in-from-left duration-200">
                <div className="h-full bg-card border-r border-border flex flex-col">
                  <div className="flex items-center justify-between p-3 border-b border-border">
                    <span className="text-sm font-medium text-foreground">History</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Close history" onClick={() => setShowHistory(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ConversationSidebar
                      currentConversationId={currentConversation?.id}
                      onSelectConversation={handleSelectConversation}
                      onNewConversation={handleNewConversation}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Main content */}
          <div className="flex-1 overflow-hidden">
            <StudentAICoach
              conversationId={currentConversation?.id || null}
              onEnsureConversation={ensureConversation}
              report={report}
              onDetachReport={detachReport}
              lang={lang}
            />
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}

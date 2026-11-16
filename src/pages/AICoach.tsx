import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { chatChipText, readReportRow, summarizeReport, type ReportRowLike } from "@/lib/ielts/reportRow";
import type { AttachedReport } from "@/components/ai/StudentAICoach";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StudentAICoach } from "@/components/ai/StudentAICoach";
import { useConversations } from "@/hooks/useConversations";
import { NEW_CHAT_EVENT } from "@/components/dashboard/events";
import { firstName } from "@/components/dashboard/conversationGroups";
import { PageSeo } from "@/components/seo/PageSeo";

/**
 * The chat. The open conversation lives in the URL (`?c=<id>`) so the sidebar, the
 * back button and a reload all agree on it; `?report=<id>` attaches a writing report.
 */
export default function AICoach() {
  const { createConversation, deleteEmptyConversations, conversations } = useConversations();
  const { profile, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationId = searchParams.get("c");
  const reportId = searchParams.get("report");
  const [report, setReport] = useState<AttachedReport | null>(null);
  const lang = profile?.preferred_language === "ru" || profile?.preferred_language === "kk" ? profile.preferred_language : "en";
  const current = conversationId ? conversations.find((c) => c.id === conversationId) : undefined;
  const title = current?.title && current.title !== "New Conversation" ? current.title : undefined;
  const name = firstName(profile?.full_name || (user?.user_metadata?.full_name as string | undefined));

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

  // A conversation row is created lazily on the first message (ensureConversation), so
  // an unused new chat never reaches the history list. Starting a new chat sweeps away
  // any empty rows left behind, as does opening the page.
  useEffect(() => {
    const onNewChat = () => {
      deleteEmptyConversations().catch(() => {});
    };
    window.addEventListener(NEW_CHAT_EVENT, onNewChat);
    return () => window.removeEventListener(NEW_CHAT_EVENT, onNewChat);
  }, [deleteEmptyConversations]);

  useEffect(() => {
    deleteEmptyConversations(conversationId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteEmptyConversations]);

  const ensureConversation = async (): Promise<string | null> => {
    if (conversationId) return conversationId;
    const conv = await createConversation();
    if (!conv) return null;
    const next = new URLSearchParams(searchParams);
    next.set("c", conv.id);
    setSearchParams(next, { replace: true });
    return conv.id;
  };

  return (
    <>
      <PageSeo
        title="Chat | AdaptivePrep"
        description="Ask your IELTS Writing coach about task types, the marking criteria and how to improve your writing."
        path="/dashboard"
      />
      <DashboardLayout flush title={title}>
        <div className="flex flex-col flex-1 min-h-0">
          {title && (
            <div className="hidden md:flex h-12 flex-shrink-0 items-center px-6 border-b border-border/70">
              <h1 className="truncate text-sm font-medium text-foreground">{title}</h1>
            </div>
          )}
          <div className="flex-1 min-h-0 flex flex-col">
            <StudentAICoach
              conversationId={conversationId}
              onEnsureConversation={ensureConversation}
              report={report}
              onDetachReport={detachReport}
              lang={lang}
              greetingName={name}
            />
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { StudentAICoach } from "@/components/ai/StudentAICoach";
import { TeacherAICoach } from "@/components/ai/TeacherAICoach";
import { AdminAICoach } from "@/components/ai/AdminAICoach";
import { ConversationSidebar } from "@/components/ai/ConversationSidebar";
import { SpaceInterior } from "@/components/spaces/SpaceInterior";
import { SpaceDashboard } from "@/components/spaces/SpaceDashboard";
import { useConversations, Conversation, ConversationSpace } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";
import { History, X, Zap, Mic, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreditsInfoPopover } from "@/components/ai/CreditsInfoPopover";
import { getTierLimits, TRIAL_LIMITS } from "@/lib/tier-limits";
import type { Reference } from "@/hooks/useReferences";

const getTierCredits = (tier: string | undefined, isTrial: boolean | undefined) => {
  if (isTrial) return TRIAL_LIMITS.creditsPerDay;
  return getTierLimits(tier as any).creditsPerDay;
};

export default function AICoach() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showHistory, setShowHistory] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [chatMode, setChatMode] = useState<"text" | "voice">("text");
  const { spaces, createConversation } = useConversations();

  // Check if we're inside a space
  const spaceId = searchParams.get("space");
  const activeSpace = spaceId ? spaces.find((s) => s.id === spaceId) || null : null;

  const handleNewConversation = async (initialMessage?: string) => {
    const conv = await createConversation(undefined, spaceId);
    if (conv) {
      setCurrentConversation(conv);
      // If initialMessage provided, it will be sent by the chat component via the empty state
      if (initialMessage) {
        // Store the initial message to pass to the coach
        setInitialMessage(initialMessage);
      }
    }
  };

  const [initialMessage, setInitialMessage] = useState<string | null>(null);

  const ensureConversation = async (): Promise<string | null> => {
    if (currentConversation) return currentConversation.id;
    const conv = await createConversation(undefined, spaceId);
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

  const handleBackToSpaces = () => {
    setCurrentConversation(null);
    navigate("/dashboard/spaces");
  };

  // Parse space references
  const spaceRefs: Reference[] = useMemo(() => {
    if (!activeSpace) return [];
    try {
      const refs = (activeSpace as any).references;
      if (Array.isArray(refs)) return refs;
    } catch {}
    return [];
  }, [activeSpace]);

  const renderAICoach = () => {
    switch (profile?.role) {
      case "school_admin":
        return <AdminAICoach />;
      case "teacher":
      case "tutor":
        return (
          <TeacherAICoach
            conversationId={currentConversation?.id || null}
            onEnsureConversation={ensureConversation}
            chatMode={chatMode}
            spaceReferences={spaceRefs}
            activeSpace={activeSpace ? { name: activeSpace.name, description: activeSpace.description, icon: activeSpace.icon } : null}
          />
        );
      case "student":
      default:
        return (
          <StudentAICoach
            conversationId={currentConversation?.id || null}
            onEnsureConversation={ensureConversation}
            chatMode={chatMode}
            spaceReferences={spaceRefs}
            activeSpace={activeSpace ? { name: activeSpace.name, description: activeSpace.description, icon: activeSpace.icon } : null}
          />
        );
    }
  };

  const showConversationSidebar = profile?.role === "student" || profile?.role === "tutor" || profile?.role === "teacher";
  const dailyLimit = getTierCredits(profile?.tier, profile?.is_trial);
  const creditsRemaining = profile?.credits_remaining || 0;

  // If inside a space, show dashboard or chat
  if (activeSpace && showConversationSidebar) {
    // No conversation selected → show Space dashboard
    if (!currentConversation) {
      return (
        <DashboardLayout>
          <div className="flex flex-col h-[calc(100vh-6rem)] -m-4 lg:-m-6 relative">
            <SpaceDashboard
              space={activeSpace}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
              onBack={handleBackToSpaces}
            />
          </div>
        </DashboardLayout>
      );
    }

    // Conversation selected → show chat interior
    return (
      <DashboardLayout>
        <div className="flex flex-col h-[calc(100vh-6rem)] -m-4 lg:-m-6 relative">
          <SpaceInterior
            space={activeSpace}
            currentConversationId={currentConversation?.id}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onBack={() => setCurrentConversation(null)}
          >
            {renderAICoach()}
          </SpaceInterior>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-6rem)] -m-4 lg:-m-6 relative">
        {/* Top header bar */}
        {showConversationSidebar && (
          <div className="h-12 flex items-center justify-between px-4 border-b border-border/50 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                {currentConversation?.title || "New Conversation"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Text / Voice toggle */}
              <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
                <button
                  onClick={() => setChatMode("text")}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                    chatMode === "text"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MessageSquare className="w-3 h-3" />
                  Text
                </button>
                <button
                  onClick={() => setChatMode("voice")}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                    chatMode === "voice"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Mic className="w-3 h-3" />
                  Voice
                </button>
              </div>

              {/* Credit counter */}
              <CreditsInfoPopover creditsRemaining={creditsRemaining} dailyLimit={dailyLimit}>
                <button className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Zap className="w-3 h-3" />
                  <span>{creditsRemaining}</span>
                </button>
              </CreditsInfoPopover>
            </div>
          </div>
        )}

        {/* Conversation history overlay panel */}
        {showConversationSidebar && showHistory && (
          <>
            <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setShowHistory(false)} />
            <div className="absolute top-0 left-0 z-40 h-full w-[280px] animate-in slide-in-from-left duration-200">
              <div className="h-full bg-card border-r border-border flex flex-col">
                <div className="flex items-center justify-between p-3 border-b border-border">
                  <span className="text-sm font-medium text-foreground">History</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowHistory(false)}>
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
          {renderAICoach()}
        </div>
      </div>
    </DashboardLayout>
  );
}

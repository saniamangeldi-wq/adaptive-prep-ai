import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { StudentAICoach } from "@/components/ai/StudentAICoach";
import { TeacherAICoach } from "@/components/ai/TeacherAICoach";
import { AdminAICoach } from "@/components/ai/AdminAICoach";
import { ConversationSidebar } from "@/components/ai/ConversationSidebar";
import { VoiceChat } from "@/components/ai/VoiceChat";
import { useConversations, Conversation } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";
import { History, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AICoach() {
  const { profile } = useAuth();
  const [showHistory, setShowHistory] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const { createConversation } = useConversations();

  const handleNewConversation = async () => {
    const conv = await createConversation();
    if (conv) {
      setCurrentConversation(conv);
    }
  };

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

  const renderAICoach = () => {
    switch (profile?.role) {
      case "school_admin":
        return <AdminAICoach />;
      case "teacher":
      case "tutor":
        return <TeacherAICoach />;
      case "student":
      default:
        return <StudentAICoach conversationId={currentConversation?.id || null} onEnsureConversation={ensureConversation} />;
    }
  };

  const showConversationSidebar = profile?.role === "student";

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-6rem)] -m-4 lg:-m-6 relative">
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
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Top controls — minimal */}
          {showConversationSidebar && (
            <div className="flex items-center gap-2 px-4 pt-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-hidden p-4 pt-1">
            {renderAICoach()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

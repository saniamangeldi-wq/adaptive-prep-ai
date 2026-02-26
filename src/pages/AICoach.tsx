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
import { PanelLeftClose, PanelLeft, MessageSquare, Mic, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AICoach() {
  const { profile } = useAuth();
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [mode, setMode] = useState<"text" | "voice">("text");
  const { createConversation } = useConversations();

  const isTier3 = profile?.tier === "tier_3";

  const handleNewConversation = async () => {
    const conv = await createConversation();
    if (conv) {
      setCurrentConversation(conv);
    }
  };

  // Auto-create a conversation if none is selected (for students)
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
  };

  // Render role-specific AI coach
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

  // Only show sidebar for students
  const showConversationSidebar = profile?.role === "student";

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-6rem)] -m-6">
        {/* Conversation Sidebar */}
        {showConversationSidebar && showSidebar && mode === "text" && (
          <ConversationSidebar
            currentConversationId={currentConversation?.id}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
          />
        )}

        {/* Main Content */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0",
          showConversationSidebar ? "relative" : ""
        )}>
          {/* Top controls */}
          <div className="flex items-center gap-2 p-4">
            {showConversationSidebar && mode === "text" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                {showSidebar ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Mode toggle for students with Elite tier */}
            {profile?.role === "student" && isTier3 && (
              <div className="flex items-center gap-1 ml-auto bg-muted rounded-lg p-1">
                <Button
                  variant={mode === "text" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setMode("text")}
                  className="gap-1.5 h-7"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Text
                </Button>
                <Button
                  variant={mode === "voice" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setMode("voice")}
                  className="gap-1.5 h-7"
                >
                  <Mic className="w-3.5 h-3.5" />
                  Voice
                  <Crown className="w-3 h-3 text-warning" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto p-6 pt-0">
            {mode === "voice" && isTier3 ? (
              <VoiceChat fullMode className="h-full" />
            ) : (
              renderAICoach()
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

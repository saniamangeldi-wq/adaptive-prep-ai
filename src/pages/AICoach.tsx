import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { StudentAICoach } from "@/components/ai/StudentAICoach";
import { TeacherAICoach } from "@/components/ai/TeacherAICoach";
import { AdminAICoach } from "@/components/ai/AdminAICoach";
import { ConversationSidebar } from "@/components/ai/ConversationSidebar";
import { useConversations, Conversation } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AICoach() {
  const { profile } = useAuth();
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const { createConversation } = useConversations();

  const handleNewConversation = async () => {
    const conv = await createConversation();
    if (conv) {
      setCurrentConversation(conv);
    }
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
        return <StudentAICoach />;
    }
  };

  // Only show sidebar for students
  const showConversationSidebar = profile?.role === "student";

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-6rem)] -m-6">
        {/* Conversation Sidebar */}
        {showConversationSidebar && showSidebar && (
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
          {/* Toggle sidebar button */}
          {showConversationSidebar && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 left-4 z-10 h-8 w-8"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              {showSidebar ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </Button>
          )}

          <div className="flex-1 overflow-auto p-6">
            {renderAICoach()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

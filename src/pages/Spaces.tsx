import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SpacesHome } from "@/components/spaces/SpacesHome";
import { ConversationSpace } from "@/hooks/useConversations";
import { useAuth } from "@/contexts/AuthContext";
import { PageSeo } from "@/components/seo/PageSeo";

export default function Spaces() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const coachType = (profile?.role === "tutor" || profile?.role === "teacher") ? "tutor" as const : "student" as const;

  const handleOpenSpace = (space: ConversationSpace) => {
    navigate(`/dashboard/coach?space=${space.id}`);
  };

  return (
    <DashboardLayout>
      <PageSeo title="Conversation Spaces | AdaptivePrep" description="Organize AI study chats into focused Spaces for SAT prep, university planning and more." path="/dashboard/spaces" />
      <SpacesHome onOpenSpace={handleOpenSpace} coachType={coachType} />
    </DashboardLayout>
  );
}

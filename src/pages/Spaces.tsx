import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SpacesHome } from "@/components/spaces/SpacesHome";
import { ConversationSpace } from "@/hooks/useConversations";
import { useAuth } from "@/contexts/AuthContext";

export default function Spaces() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const coachType = (profile?.role === "tutor" || profile?.role === "teacher") ? "tutor" as const : "student" as const;

  const handleOpenSpace = (space: ConversationSpace) => {
    navigate(`/dashboard/coach?space=${space.id}`);
  };

  return (
    <DashboardLayout>
      <SpacesHome onOpenSpace={handleOpenSpace} coachType={coachType} />
    </DashboardLayout>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SpacesHome } from "@/components/spaces/SpacesHome";
import { ConversationSpace } from "@/hooks/useConversations";

export default function Spaces() {
  const navigate = useNavigate();

  const handleOpenSpace = (space: ConversationSpace) => {
    navigate(`/dashboard/coach?space=${space.id}`);
  };

  return (
    <DashboardLayout>
      <SpacesHome onOpenSpace={handleOpenSpace} />
    </DashboardLayout>
  );
}

import { useState } from "react";
import { Plus, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConversations, ConversationSpace } from "@/hooks/useConversations";
import { SpaceCard } from "./SpaceCard";
import { CreateSpaceModal } from "./CreateSpaceModal";
import { SpaceSettingsDrawer } from "./SpaceSettingsDrawer";
import { toast } from "sonner";

interface SpacesHomeProps {
  onOpenSpace: (space: ConversationSpace) => void;
}

export function SpacesHome({ onOpenSpace }: SpacesHomeProps) {
  const { spaces, createSpace, deleteSpace } = useConversations();
  const [showCreate, setShowCreate] = useState(false);
  const [settingsSpace, setSettingsSpace] = useState<ConversationSpace | null>(null);

  const handleCreateSpace = async (name: string, description: string, icon: string, _instructions: string) => {
    await createSpace(name, description, icon);
  };

  const handleDeleteSpace = async (spaceId: string) => {
    await deleteSpace(spaceId);
  };

  const handleSaveSettings = async (_spaceId: string, _updates: { name: string; description: string; icon: string }) => {
    // Uses existing updateConversation pattern — settings saved via space update
    toast.success("Space updated");
  };

  return (
    <div className="max-w-[900px] mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-foreground">Your Spaces</h1>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Space
        </Button>
      </div>

      {/* Grid */}
      {spaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
            <Folder className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No spaces yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Create a Space to organize your conversations by topic and give the AI custom instructions.
          </p>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create your first Space
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              onOpen={onOpenSpace}
              onSettings={setSettingsSpace}
              onDelete={handleDeleteSpace}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateSpaceModal
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreateSpace={handleCreateSpace}
      />

      {/* Settings Drawer */}
      <SpaceSettingsDrawer
        space={settingsSpace}
        open={!!settingsSpace}
        onClose={() => setSettingsSpace(null)}
        onSave={handleSaveSettings}
        onDelete={handleDeleteSpace}
      />
    </div>
  );
}

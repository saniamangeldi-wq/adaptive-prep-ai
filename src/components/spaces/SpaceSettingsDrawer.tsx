import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Trash2 } from "lucide-react";
import { ConversationSpace } from "@/hooks/useConversations";
import type { Reference } from "@/hooks/useReferences";
import { IconPicker } from "./IconPicker";
import { SpaceReferencesEditor } from "./SpaceReferencesEditor";



interface SpaceSettingsDrawerProps {
  space: ConversationSpace | null;
  open: boolean;
  onClose: () => void;
  onSave: (spaceId: string, updates: { name: string; description: string; icon: string; ai_instructions?: string; references?: Reference[] }) => void;
  onDelete: (spaceId: string) => void;
  spaceReferences?: Reference[];
}

export function SpaceSettingsDrawer({ space, open, onClose, onSave, onDelete, spaceReferences = [] }: SpaceSettingsDrawerProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🎓");
  const [aiInstructions, setAiInstructions] = useState("");
  const [refs, setRefs] = useState<Reference[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (space) {
      setName(space.name);
      setDescription(space.description || "");
      setIcon(space.icon);
      setAiInstructions((space as any).ai_instructions || "");
      setRefs(spaceReferences);
      setConfirmDelete(false);
    }
  }, [space, spaceReferences]);

  if (!open || !space) return null;

  const handleSave = () => {
    onSave(space.id, {
      name: name.trim(),
      description: description.trim(),
      icon,
      ai_instructions: aiInstructions.trim() || undefined,
      references: refs,
    });
    onClose();
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(space.id);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 z-50 h-full w-[360px] max-w-[90vw] bg-card border-l border-border/30 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <h2 className="text-base font-semibold text-foreground">Space Settings</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-muted/30 border-border/30" />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="bg-muted/30 border-border/30" />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Icon</label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">AI Instructions</label>
            <Textarea
              placeholder="Custom instructions for conversations in this space..."
              rows={4}
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              className="bg-muted/30 border-border/30 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">📚 Space References</label>
            <p className="text-xs text-muted-foreground mb-2">
              Always active for every conversation in this Space
            </p>
            <SpaceReferencesEditor value={refs} onChange={(next) => setRefs(next)} />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Visibility</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="radio" name="visibility" checked readOnly className="accent-primary" />
                Private
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground/50 cursor-not-allowed">
                <input type="radio" name="visibility" disabled className="accent-primary" />
                Shared <span className="text-xs">(coming soon)</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-border/30">
            <p className="text-xs font-medium text-destructive mb-3 uppercase tracking-wider">Danger Zone</p>
            <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-2">
              <Trash2 className="w-3.5 h-3.5" />
              {confirmDelete ? "Click again to confirm" : "Delete Space"}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/30 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={!name.trim()}>Save Changes</Button>
        </div>
      </div>
    </>
  );
}


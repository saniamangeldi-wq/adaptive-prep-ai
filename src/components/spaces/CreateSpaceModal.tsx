import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const ICON_OPTIONS = ["🎓", "📐", "📖", "🧪", "✍️", "🌍", "🚀", "💡", "📚", "📊", "🎨", "🔬", "💼", "🎯"];

interface CreateSpaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSpace: (name: string, description: string, icon: string, instructions: string) => void;
}

export function CreateSpaceModal({ open, onOpenChange, onCreateSpace }: CreateSpaceModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🎓");
  const [instructions, setInstructions] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreateSpace(name.trim(), description.trim(), icon, instructions.trim());
    setName("");
    setDescription("");
    setIcon("🎓");
    setInstructions("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] border-border/30 bg-card">
        <DialogHeader>
          <DialogTitle className="text-lg">Create a Space</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Space Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., SAT Math Prep"
              className="bg-muted/30 border-border/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this space"
              className="bg-muted/30 border-border/30"
            />
          </div>

          {/* Icon Picker */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Icon</label>
            <div className="flex gap-2 flex-wrap">
              {ICON_OPTIONS.map((ico) => (
                <button
                  key={ico}
                  onClick={() => setIcon(ico)}
                  className={cn(
                    "w-10 h-10 rounded-full text-lg flex items-center justify-center transition-all",
                    icon === ico
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-card bg-muted/50 scale-110"
                      : "bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  {ico}
                </button>
              ))}
            </div>
          </div>

          {/* AI Instructions */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Instructions for AI
            </label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="What should the AI focus on in this space?\ne.g. Only help me with SAT Math topics"
              rows={4}
              className="bg-muted/30 border-border/30 resize-none"
            />
            <p className="text-xs text-muted-foreground/60 mt-1.5">
              This scopes all conversations in this space to your instructions.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            Create Space →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

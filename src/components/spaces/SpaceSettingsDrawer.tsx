import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Trash2, FileText, Link2, ClipboardPaste, Loader2 } from "lucide-react";
import { ConversationSpace } from "@/hooks/useConversations";
import type { Reference } from "@/hooks/useReferences";
import { toast } from "sonner";

const ICON_OPTIONS = ["🎓", "📐", "📖", "🧪", "✍️", "🌍", "🚀", "💡", "📚", "📊", "🎨", "🔬", "💼", "🎯"];

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
  const [addRefMode, setAddRefMode] = useState<"none" | "url" | "paste">("none");
  const [urlValue, setUrlValue] = useState("");
  const [textValue, setTextValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (space) {
      setName(space.name);
      setDescription(space.description || "");
      setIcon(space.icon);
      setAiInstructions((space as any).ai_instructions || "");
      setRefs(spaceReferences);
      setConfirmDelete(false);
      setAddRefMode("none");
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      try {
        const content = await file.text();
        const wordCount = content.trim().split(/\s+/).length;
        setRefs(prev => [...prev, {
          id: `space-ref-${Date.now()}-${Math.random()}`,
          type: "document",
          name: file.name,
          content: content.substring(0, 15000),
          wordCount,
        }]);
        toast.success(`${file.name} added`);
      } catch {
        toast.error("Failed to read file");
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddUrl = () => {
    if (urlValue.trim()) {
      try {
        const domain = new URL(urlValue.trim()).hostname;
        setRefs(prev => [...prev, {
          id: `space-ref-${Date.now()}`,
          type: "url",
          name: domain,
          content: `[URL to be fetched: ${urlValue.trim()}]`,
        }]);
        setUrlValue("");
        setAddRefMode("none");
        toast.success("URL added");
      } catch {
        toast.error("Invalid URL");
      }
    }
  };

  const handleAddText = () => {
    if (textValue.trim()) {
      const wordCount = textValue.trim().split(/\s+/).length;
      setRefs(prev => [...prev, {
        id: `space-ref-${Date.now()}`,
        type: "text",
        name: `Pasted text (${wordCount} words)`,
        content: textValue.trim(),
        wordCount,
      }]);
      setTextValue("");
      setAddRefMode("none");
      toast.success("Text added");
    }
  };

  const getRefIcon = (type: string) => type === "document" ? "📄" : type === "url" ? "🔗" : "📝";

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
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-muted/30 border-border/30" />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="bg-muted/30 border-border/30" />
          </div>

          {/* Icon */}
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
            <label className="text-sm font-medium text-foreground mb-1.5 block">AI Instructions</label>
            <Textarea
              placeholder="Custom instructions for conversations in this space..."
              rows={4}
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              className="bg-muted/30 border-border/30 resize-none"
            />
          </div>

          {/* Space References */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">📚 Space References</label>
            <p className="text-xs text-muted-foreground mb-2">
              Always active for every conversation in this Space
            </p>

            {refs.length > 0 && (
              <div className="space-y-1 mb-2">
                {refs.map((ref) => (
                  <div
                    key={ref.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border-l-2 border-l-primary/40 bg-muted/20 group"
                  >
                    <span className="text-sm flex-shrink-0">{getRefIcon(ref.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{ref.name}</p>
                      {ref.wordCount && <p className="text-[10px] text-muted-foreground">{ref.wordCount} words</p>}
                    </div>
                    <button
                      onClick={() => setRefs(prev => prev.filter(r => r.id !== ref.id))}
                      className="p-1 rounded text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {addRefMode === "url" ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="https://..."
                    value={urlValue}
                    onChange={(e) => setUrlValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                    autoFocus
                    className="bg-muted/30 border-border/30 text-sm h-8"
                  />
                  <Button size="sm" className="h-8" onClick={handleAddUrl}>Add</Button>
                </div>
                <button onClick={() => setAddRefMode("none")} className="text-xs text-muted-foreground">← Back</button>
              </div>
            ) : addRefMode === "paste" ? (
              <div className="space-y-2">
                <Textarea
                  placeholder="Paste reference text..."
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  rows={3}
                  autoFocus
                  className="bg-muted/30 border-border/30 text-sm resize-none"
                />
                <div className="flex justify-between">
                  <button onClick={() => setAddRefMode("none")} className="text-xs text-muted-foreground">← Back</button>
                  <Button size="sm" className="h-7 text-xs" onClick={handleAddText}>Add</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 flex-1 border-border/20" onClick={() => fileInputRef.current?.click()}>
                  <FileText className="w-3 h-3" /> Upload
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 flex-1 border-border/20" onClick={() => setAddRefMode("url")}>
                  <Link2 className="w-3 h-3" /> URL
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 flex-1 border-border/20" onClick={() => setAddRefMode("paste")}>
                  <ClipboardPaste className="w-3 h-3" /> Paste
                </Button>
              </div>
            )}
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.md" className="hidden" onChange={handleFileUpload} />
          </div>

          {/* Visibility */}
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

          {/* Danger Zone */}
          <div className="pt-4 border-t border-border/30">
            <p className="text-xs font-medium text-destructive mb-3 uppercase tracking-wider">Danger Zone</p>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="gap-2"
            >
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

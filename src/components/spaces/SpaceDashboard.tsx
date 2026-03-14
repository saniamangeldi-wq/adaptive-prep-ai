import { useState, useMemo, useRef } from "react";
import { getResponsePreview } from "@/utils/sanitizeAIResponse";
import { Folder, Plus, MoreHorizontal, Clock, Upload, Link2, ClipboardPaste, FileText, Calendar, ArrowLeft, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ConversationSpace, Conversation, useConversations } from "@/hooks/useConversations";
import { SpaceSettingsDrawer } from "./SpaceSettingsDrawer";
import type { Reference } from "@/hooks/useReferences";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

interface SpaceDashboardProps {
  space: ConversationSpace;
  onSelectConversation: (conv: Conversation) => void;
  onNewConversation: (initialMessage?: string) => void;
  onBack: () => void;
}

export function SpaceDashboard({ space, onSelectConversation, onNewConversation, onBack }: SpaceDashboardProps) {
  const { conversations, deleteConversation, deleteSpace } = useConversations();
  const [showSettings, setShowSettings] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [addRefMode, setAddRefMode] = useState<"none" | "url" | "paste">("none");
  const [urlValue, setUrlValue] = useState("");
  const [textValue, setTextValue] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructionsValue, setInstructionsValue] = useState((space as any).ai_instructions || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const spaceConversations = useMemo(
    () => conversations.filter((c) => c.space_id === space.id),
    [conversations, space.id]
  );

  const spaceReferences: Reference[] = useMemo(() => {
    try {
      const refs = (space as any).references;
      if (Array.isArray(refs)) return refs;
    } catch {}
    return [];
  }, [space]);

  const [refs, setRefs] = useState<Reference[]>(spaceReferences);

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    onNewConversation(inputValue.trim());
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSaveSettings = async (spaceId: string, updates: { name: string; description: string; icon: string; ai_instructions?: string; references?: Reference[] }) => {
    const { error } = await supabase
      .from("conversation_spaces")
      .update({
        name: updates.name,
        description: updates.description,
        icon: updates.icon,
        ai_instructions: updates.ai_instructions || null,
        references: (updates.references || []) as any,
      })
      .eq("id", spaceId);

    if (error) {
      toast.error("Failed to update space");
      return;
    }
    toast.success("Space updated");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      try {
        const content = await file.text();
        const wordCount = content.trim().split(/\s+/).length;
        const newRef: Reference = {
          id: `space-ref-${Date.now()}-${Math.random()}`,
          type: "document",
          name: file.name,
          content: content.substring(0, 15000),
          wordCount,
        };
        setRefs(prev => [...prev, newRef]);
        // Save immediately
        await saveRefs([...refs, newRef]);
        toast.success(`${file.name} added`);
      } catch {
        toast.error("Failed to read file");
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddUrl = async () => {
    if (!urlValue.trim()) return;
    try {
      const domain = new URL(urlValue.trim()).hostname;
      const newRef: Reference = {
        id: `space-ref-${Date.now()}`,
        type: "url",
        name: domain,
        content: `[URL to be fetched: ${urlValue.trim()}]`,
      };
      setRefs(prev => [...prev, newRef]);
      await saveRefs([...refs, newRef]);
      setUrlValue("");
      setAddRefMode("none");
      toast.success("URL added");
    } catch {
      toast.error("Invalid URL");
    }
  };

  const handleAddText = async () => {
    if (!textValue.trim()) return;
    const wordCount = textValue.trim().split(/\s+/).length;
    const newRef: Reference = {
      id: `space-ref-${Date.now()}`,
      type: "text",
      name: `Pasted text (${wordCount} words)`,
      content: textValue.trim(),
      wordCount,
    };
    setRefs(prev => [...prev, newRef]);
    await saveRefs([...refs, newRef]);
    setTextValue("");
    setAddRefMode("none");
    toast.success("Text added");
  };

  const handleRemoveRef = async (refId: string) => {
    const updated = refs.filter(r => r.id !== refId);
    setRefs(updated);
    await saveRefs(updated);
  };

  const saveRefs = async (newRefs: Reference[]) => {
    await supabase
      .from("conversation_spaces")
      .update({ references: newRefs as any })
      .eq("id", space.id);
  };

  const handleSaveInstructions = async () => {
    const { error } = await supabase
      .from("conversation_spaces")
      .update({ ai_instructions: instructionsValue.trim() || null })
      .eq("id", space.id);
    if (error) {
      toast.error("Failed to save instructions");
    } else {
      toast.success("Instructions saved");
      setShowInstructions(false);
    }
  };

  const getRefIcon = (type: string) => type === "document" ? "📄" : type === "url" ? "🔗" : "📝";

  // Get first user message and first AI response for thread preview
  const getThreadPreview = (conv: Conversation) => {
    const userMsg = conv.messages.find(m => m.role === "user");
    const aiMsg = conv.messages.find(m => m.role === "assistant");
    return {
      userText: userMsg?.content || conv.title || "Untitled",
      aiText: aiMsg?.content || "",
    };
  };

  return (
    <div className="flex h-full">
      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="max-w-[720px] mx-auto px-6 py-8">
            {/* Breadcrumb */}
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-3 h-3" />
              Spaces
              <span className="text-muted-foreground/40">›</span>
              <span className="text-foreground">{space.name}</span>
            </button>

            {/* Space Header */}
            <div className="mb-8">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/20 flex items-center justify-center text-2xl flex-shrink-0 mt-0.5">
                    {space.icon}
                  </div>
                  <div>
                    <h1 className="text-[32px] font-bold text-foreground leading-tight">{space.name}</h1>
                    {space.description && (
                      <p className="text-sm text-muted-foreground mt-1 max-w-lg">{space.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Input Bar */}
            <div className="mb-10">
              <div className="rounded-xl border border-border/20 bg-card/40 overflow-hidden">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask anything about ${space.name}...`}
                  rows={3}
                  className="w-full bg-transparent px-4 pt-4 pb-2 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none"
                />
                <div className="flex items-center justify-between px-3 pb-3">
                  <button
                    className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/20 transition-colors"
                    onClick={() => onNewConversation()}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!inputValue.trim()}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      inputValue.trim()
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "text-muted-foreground/30 cursor-not-allowed"
                    )}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Threads List */}
            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-border/20 pb-3">
                <span className="text-sm font-medium text-foreground">My threads</span>
                <span className="text-xs text-muted-foreground">({spaceConversations.length})</span>
              </div>

              {spaceConversations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground/50">No threads yet. Ask a question above to get started.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {spaceConversations.map((conv) => {
                    const { userText, aiText } = getThreadPreview(conv);
                    return (
                      <button
                        key={conv.id}
                        onClick={() => onSelectConversation(conv)}
                        className="w-full text-left px-4 py-3.5 rounded-lg hover:bg-muted/10 transition-colors group"
                      >
                        <p className="text-sm font-medium text-foreground truncate">
                          {userText}
                        </p>
                        {aiText && (
                          <p className="text-[13px] text-muted-foreground/60 mt-1 line-clamp-2 leading-relaxed">
                            {aiText.replace(/[#*_`]/g, "").substring(0, 200)}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-2">
                          <Clock className="w-3 h-3 text-muted-foreground/30" />
                          <span className="text-[11px] text-muted-foreground/40">
                            {format(new Date(conv.updated_at), "MMM d, yyyy")}
                          </span>
                        </div>
                        {/* Hover actions */}
                        <div className="hidden group-hover:flex absolute right-4 top-1/2 -translate-y-1/2 items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conv.id);
                            }}
                            className="p-1 rounded text-muted-foreground/40 hover:text-destructive"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel */}
      <div className="hidden lg:flex w-[260px] flex-shrink-0 border-l border-border/20 flex-col">
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Files Section */}
            <div>
              <button className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1 hover:text-primary transition-colors">
                <FileText className="w-3.5 h-3.5" />
                Files
                <span className="text-muted-foreground/40 text-xs ml-auto">{refs.filter(r => r.type === "document").length}</span>
              </button>
              <p className="text-[11px] text-muted-foreground/50 mb-3">
                Files to use as context for searches
              </p>

              {/* File list */}
              {refs.filter(r => r.type === "document").length > 0 && (
                <div className="space-y-1 mb-3">
                  {refs.filter(r => r.type === "document").map(ref => (
                    <div key={ref.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md group hover:bg-muted/10">
                      <span className="text-xs">📄</span>
                      <span className="text-xs text-foreground truncate flex-1">{ref.name}</span>
                      <button
                        onClick={() => handleRemoveRef(ref.id)}
                        className="p-0.5 rounded text-muted-foreground/20 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-colors border border-dashed border-border/20"
                >
                  <Upload className="w-3 h-3" />
                  Upload files
                </button>
                <button
                  onClick={() => setAddRefMode("paste")}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-colors border border-dashed border-border/20"
                >
                  <ClipboardPaste className="w-3 h-3" />
                  Paste text
                </button>
              </div>
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.md" className="hidden" onChange={handleFileUpload} />

              {addRefMode === "paste" && (
                <div className="mt-2 space-y-2">
                  <Textarea
                    placeholder="Paste reference text..."
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    rows={3}
                    autoFocus
                    className="bg-muted/20 border-border/20 text-xs resize-none"
                  />
                  <div className="flex justify-between">
                    <button onClick={() => setAddRefMode("none")} className="text-[11px] text-muted-foreground">Cancel</button>
                    <Button size="sm" className="h-6 text-[11px] px-2" onClick={handleAddText}>Add</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border/10" />

            {/* Links Section */}
            <div>
              <button className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1 hover:text-primary transition-colors">
                <Link2 className="w-3.5 h-3.5" />
                Links
                <span className="text-muted-foreground/40 text-xs ml-auto">{refs.filter(r => r.type === "url").length}</span>
              </button>
              <p className="text-[11px] text-muted-foreground/50 mb-3">
                Websites to include in every search
              </p>

              {refs.filter(r => r.type === "url").length > 0 && (
                <div className="space-y-1 mb-3">
                  {refs.filter(r => r.type === "url").map(ref => (
                    <div key={ref.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md group hover:bg-muted/10">
                      <span className="text-xs">🔗</span>
                      <span className="text-xs text-foreground truncate flex-1">{ref.name}</span>
                      <button
                        onClick={() => handleRemoveRef(ref.id)}
                        className="p-0.5 rounded text-muted-foreground/20 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {addRefMode === "url" ? (
                <div className="space-y-2">
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="https://..."
                      value={urlValue}
                      onChange={(e) => setUrlValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                      autoFocus
                      className="bg-muted/20 border-border/20 text-xs h-7"
                    />
                    <Button size="sm" className="h-7 text-[11px] px-2" onClick={handleAddUrl}>Add</Button>
                  </div>
                  <button onClick={() => setAddRefMode("none")} className="text-[11px] text-muted-foreground">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setAddRefMode("url")}
                  className="flex items-center gap-2 text-xs text-primary/70 hover:text-primary transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add links
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border/10" />

            {/* Instructions */}
            <div>
              {showInstructions ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">AI Instructions</label>
                  <Textarea
                    value={instructionsValue}
                    onChange={(e) => setInstructionsValue(e.target.value)}
                    placeholder="Custom instructions for this space..."
                    rows={4}
                    className="bg-muted/20 border-border/20 text-xs resize-none"
                  />
                  <div className="flex justify-between">
                    <button onClick={() => setShowInstructions(false)} className="text-[11px] text-muted-foreground">Cancel</button>
                    <Button size="sm" className="h-6 text-[11px] px-2" onClick={handleSaveInstructions}>Save</Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowInstructions(true)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {(space as any).ai_instructions ? "Edit instructions" : "Add instructions"}
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border/10" />

            {/* Scheduled Tasks placeholder */}
            <div className="opacity-40">
              <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-1">
                <Calendar className="w-3.5 h-3.5" />
                Scheduled Tasks
              </div>
              <p className="text-[11px] text-muted-foreground/50">Coming soon</p>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Settings Drawer */}
      <SpaceSettingsDrawer
        space={space}
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveSettings}
        onDelete={(id) => { deleteSpace(id); onBack(); }}
        spaceReferences={spaceReferences}
      />
    </div>
  );
}

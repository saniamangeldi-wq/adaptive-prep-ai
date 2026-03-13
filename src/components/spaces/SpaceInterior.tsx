import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, MessageSquarePlus, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ConversationSpace, Conversation, useConversations } from "@/hooks/useConversations";
import { SpaceSettingsDrawer } from "./SpaceSettingsDrawer";
import { ReferencesBadge } from "@/components/ai/ReferencesBadge";
import type { Reference } from "@/hooks/useReferences";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const PANEL_KEY_PREFIX = "space-panel-collapsed-";

interface SpaceInteriorProps {
  space: ConversationSpace;
  currentConversationId?: string | null;
  onSelectConversation: (conv: Conversation | null) => void;
  onNewConversation: () => void;
  onBack: () => void;
  children: React.ReactNode;
}

export function SpaceInterior({
  space,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onBack,
  children,
}: SpaceInteriorProps) {
  const { conversations, deleteSpace } = useConversations();
  const [showSettings, setShowSettings] = useState(false);

  // Persist collapsed state per space
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(`${PANEL_KEY_PREFIX}${space.id}`) === "true";
    } catch {
      return false;
    }
  });

  const togglePanel = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(`${PANEL_KEY_PREFIX}${space.id}`, String(next)); } catch {}
      return next;
    });
  }, [space.id]);

  // Cmd/Ctrl + B shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        togglePanel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePanel]);

  const spaceConversations = conversations.filter((c) => c.space_id === space.id);

  const handleSaveSettings = async (_spaceId: string, _updates: { name: string; description: string; icon: string }) => {
    toast.success("Space updated");
  };

  return (
    <div className="flex h-full relative">
      {/* Left panel — conversation list */}
      <div
        className={cn(
          "border-r border-border/30 flex-col flex-shrink-0 hidden md:flex",
          collapsed ? "w-0 border-r-0 opacity-0" : "w-[260px] opacity-100"
        )}
        style={{ transition: "width 250ms ease, opacity 200ms ease", overflow: "hidden" }}
      >
        <div className="w-[260px] flex flex-col h-full">
          {/* Space header in panel */}
          <div className="p-3 border-b border-border/30">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-xs mb-0"
              onClick={onNewConversation}
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              New Chat in {space.name}
            </Button>
          </div>

          {/* Conversation list */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {spaceConversations.length === 0 ? (
                <p className="text-xs text-muted-foreground/50 text-center py-8">
                  No conversations yet
                </p>
              ) : (
                spaceConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => onSelectConversation(conv)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                      currentConversationId === conv.id
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    )}
                  >
                    <p className="truncate font-medium text-xs">
                      {conv.title || "Untitled"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                      {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                    </p>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Back link */}
          <div className="p-3 border-t border-border/30">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to All Spaces
            </button>
          </div>
        </div>
      </div>

      {/* Collapse/Expand toggle — always outside the overflow:hidden panel */}
      <button
        onClick={togglePanel}
        className={cn(
          "hidden md:flex absolute z-20 w-8 h-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-muted-foreground hover:bg-white/[0.12] hover:text-white transition-all duration-200",
          collapsed
            ? "left-1 top-1/2 -translate-y-1/2"
            : "left-[244px] top-1/2 -translate-y-1/2"
        )}
        title="Toggle panel (⌘B)"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Space header bar */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-border/30 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={onBack} className="md:hidden p-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-lg">{space.icon}</span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground truncate">{space.name}</h2>
              {space.description && (
                <p className="text-[10px] text-muted-foreground/60 truncate">{space.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSettings(true)}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs hidden sm:flex" onClick={onNewConversation}>
              <MessageSquarePlus className="w-3.5 h-3.5" />
              New Chat
            </Button>
          </div>
        </div>

        {/* Space scope banner */}
        {!currentConversationId && (
          <div className="px-4 pt-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
              <span>{space.icon}</span>
              This conversation is scoped to: <span className="font-medium text-foreground">{space.name}</span>
            </div>
          </div>
        )}

        {/* Chat content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>

      {/* Settings drawer */}
      <SpaceSettingsDrawer
        space={space}
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveSettings}
        onDelete={(id) => { deleteSpace(id); onBack(); }}
      />
    </div>
  );
}
